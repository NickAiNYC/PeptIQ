// ============================================
// PeptIQ Scoring Engine — Pure Functions
// ============================================
// All scoring logic lives here. No side effects, no I/O.
// Every function is deterministic: same inputs → same outputs.
//
// Design principles:
// - Molecule-agnostic: Scores lab metrics, not compound identity.
// - Fully auditable: Every component is individually inspectable.
// - Legally defensible: No opaque AI/ML. All math is explicit.
// - Version-aware: Uses versioned config for reproducibility.
// ============================================

import { LabReport, ScoringConfig, ScoreResult, ScoreBreakdown } from '@peptiq/types';
import { getScoringConfig } from '@peptiq/config';

/**
 * calculateScore produces a deterministic quality score for a lab report.
 *
 * This is the main entry point of the scoring engine.
 * It delegates to individual component calculators and assembles the result.
 *
 * @param report - The lab report to score
 * @param batchVariance - Standard deviation of purity across reports for the same batch.
 *                        Pass 0 if this is the only report for the batch.
 * @param scoringVersion - Optional version string. Defaults to the current default version.
 * @returns A complete ScoreResult with score, confidence, risk flags, and breakdown.
 */
export function calculateScore(
  report: LabReport,
  batchVariance: number = 0,
  scoringVersion?: string
): ScoreResult {
  const config = getScoringConfig(scoringVersion);

  // Calculate each scoring component independently.
  // Each component is a pure function that returns a number.
  const purity_component = calculatePurityComponent(report.purity_percent, config);
  const endotoxin_component = calculateEndotoxinPenalty(report.endotoxin_level, config);
  const heavy_metal_component = calculateHeavyMetalPenalty(report.heavy_metals_ppm, config);
  const variance_component = calculateVariancePenalty(batchVariance, config);
  const time_decay_component = calculateTimeDecayPenalty(report.test_date, config);

  const breakdown: ScoreBreakdown = {
    purity_component,
    endotoxin_component,
    heavy_metal_component,
    variance_component,
    time_decay_component,
  };

  // Final score is the sum of all components, clamped to [0, 100].
  // Purity provides the base; penalties subtract from it.
  const rawScore =
    purity_component +
    endotoxin_component +
    heavy_metal_component +
    variance_component +
    time_decay_component;

  const score = clamp(rawScore, 0, 100);

  // Confidence is based on sample size relative to the configured minimum.
  const confidence = calculateConfidence(report.sample_size, config);

  // Risk flags are human-readable indicators of quality concerns.
  const risk_flags = generateRiskFlags(report, batchVariance, config);

  return {
    score: roundTo(score, 2),
    confidence: roundTo(confidence, 2),
    risk_flags,
    scoring_version: config.version,
    breakdown: {
      purity_component: roundTo(purity_component, 2),
      endotoxin_component: roundTo(endotoxin_component, 2),
      heavy_metal_component: roundTo(heavy_metal_component, 2),
      variance_component: roundTo(variance_component, 2),
      time_decay_component: roundTo(time_decay_component, 2),
    },
  };
}

// ============================================
// Individual Component Calculators
// ============================================

/**
 * calculatePurityComponent converts purity percentage to score points.
 *
 * Formula: purity_percent * purity_weight
 * Example: 98% purity * 0.6 weight = 58.8 points
 *
 * This is the primary positive contributor to the score.
 * A perfect 100% purity yields the maximum purity component.
 */
export function calculatePurityComponent(
  purityPercent: number,
  config: ScoringConfig
): number {
  // Clamp purity to valid range to prevent scores above 100
  const clamped = clamp(purityPercent, 0, 100);
  return clamped * config.purity_weight;
}

/**
 * calculateEndotoxinPenalty applies a penalty for endotoxin levels above threshold.
 *
 * Formula: If endotoxin > threshold, penalty is proportional to how far above threshold.
 * The penalty reaches max when endotoxin is 2x the threshold.
 *
 * Returns a negative number (penalty) or 0 (no penalty).
 *
 * Example with default config:
 * - Endotoxin = 3.0 EU/mL (below 5.0 threshold): 0 penalty
 * - Endotoxin = 7.5 EU/mL (50% above threshold): -7.5 penalty
 * - Endotoxin = 10.0 EU/mL (2x threshold): -15 penalty (max)
 */
export function calculateEndotoxinPenalty(
  endotoxinLevel: number,
  config: ScoringConfig
): number {
  if (endotoxinLevel <= config.endotoxin_threshold) {
    return 0;
  }

  // How far above the threshold, as a ratio of the threshold itself.
  // At 2x threshold, ratio = 1.0 → full penalty.
  const excessRatio = (endotoxinLevel - config.endotoxin_threshold) / config.endotoxin_threshold;
  const penalty = Math.min(excessRatio, 1.0) * config.endotoxin_max_penalty;
  return -penalty;
}

/**
 * calculateHeavyMetalPenalty applies a penalty for heavy metals above threshold.
 *
 * Same proportional logic as endotoxin penalty.
 * Penalty reaches max at 2x the threshold.
 *
 * Returns a negative number (penalty) or 0 (no penalty).
 */
export function calculateHeavyMetalPenalty(
  heavyMetalsPpm: number,
  config: ScoringConfig
): number {
  if (heavyMetalsPpm <= config.heavy_metal_threshold) {
    return 0;
  }

  const excessRatio = (heavyMetalsPpm - config.heavy_metal_threshold) / config.heavy_metal_threshold;
  const penalty = Math.min(excessRatio, 1.0) * config.heavy_metal_max_penalty;
  return -penalty;
}

/**
 * calculateVariancePenalty penalizes high batch-to-batch purity variance.
 *
 * Variance is the standard deviation of purity across multiple reports
 * for the same batch. High variance indicates inconsistent manufacturing.
 *
 * Penalty is linearly proportional to variance, maxing out at 5% std dev.
 * A variance of 0 yields no penalty.
 *
 * Returns a negative number (penalty) or 0 (no penalty).
 */
export function calculateVariancePenalty(
  batchVariance: number,
  config: ScoringConfig
): number {
  if (batchVariance <= 0) {
    return 0;
  }

  // Variance of 5% purity std dev = full penalty.
  // This threshold is hardcoded as a reasonable quality baseline.
  const MAX_VARIANCE_THRESHOLD = 5.0;
  const ratio = Math.min(batchVariance / MAX_VARIANCE_THRESHOLD, 1.0);
  return -(ratio * config.variance_max_penalty);
}

/**
 * calculateTimeDecayPenalty reduces the score for old test results.
 *
 * Tests within the decay window (default: 180 days) receive no penalty.
 * After that, penalty increases linearly up to the max at 2x the decay window.
 *
 * Business rationale: Compound stability degrades over time.
 * A 6-month-old test may not reflect current batch quality.
 *
 * Returns a negative number (penalty) or 0 (no penalty).
 */
export function calculateTimeDecayPenalty(
  testDate: string,
  config: ScoringConfig
): number {
  const testTime = new Date(testDate).getTime();
  const now = Date.now();
  const daysSinceTest = (now - testTime) / (1000 * 60 * 60 * 24);

  if (daysSinceTest <= config.time_decay_days) {
    return 0;
  }

  // Penalty increases linearly from 0 at time_decay_days to max at 2x time_decay_days.
  const excessDays = daysSinceTest - config.time_decay_days;
  const ratio = Math.min(excessDays / config.time_decay_days, 1.0);
  return -(ratio * config.time_decay_max_penalty);
}

/**
 * calculateConfidence determines how reliable the score is based on sample size.
 *
 * Confidence = min(sample_size / min_sample_size_for_full_confidence, 1.0)
 *
 * A single sample produces low confidence.
 * Meeting or exceeding the minimum sample size yields full confidence (1.0).
 */
export function calculateConfidence(
  sampleSize: number,
  config: ScoringConfig
): number {
  if (sampleSize <= 0) {
    return 0;
  }
  return Math.min(sampleSize / config.min_sample_size_for_full_confidence, 1.0);
}

/**
 * generateRiskFlags produces human-readable risk indicators.
 *
 * These flags are included in the score output so that any stakeholder
 * can immediately understand the concerns without reading the raw numbers.
 */
export function generateRiskFlags(
  report: LabReport,
  batchVariance: number,
  config: ScoringConfig
): string[] {
  const flags: string[] = [];

  if (report.purity_percent < 90) {
    flags.push('LOW_PURITY');
  }

  if (report.endotoxin_level > config.endotoxin_threshold) {
    flags.push('HIGH_ENDOTOXIN');
  }

  if (report.heavy_metals_ppm > config.heavy_metal_threshold) {
    flags.push('HIGH_HEAVY_METALS');
  }

  if (batchVariance > 2.5) {
    flags.push('HIGH_BATCH_VARIANCE');
  }

  if (report.sample_size < config.min_sample_size_for_full_confidence) {
    flags.push('LOW_SAMPLE_SIZE');
  }

  const daysSinceTest =
    (Date.now() - new Date(report.test_date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceTest > config.time_decay_days) {
    flags.push('STALE_TEST_DATA');
  }

  return flags;
}

// ============================================
// Utility Functions
// ============================================

/** Clamp a number to a range [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Round a number to N decimal places. */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
