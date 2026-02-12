// ============================================
// PeptIQ Scoring Configuration — Version Registry
// ============================================
// All scoring weights and thresholds are defined here.
// Every parameter is documented with its business rationale.
//
// LEGAL DEFENSIBILITY:
// - All weights are explicit, not derived from ML/AI.
// - All thresholds reference industry standards (FDA, USP).
// - Historical configs are immutable — never modify a released version.
// - New versions must be registered with a new version string.
// ============================================

import { ScoringConfig } from '@peptiq/types';

/**
 * Scoring Configuration v1.0.0
 *
 * Baseline configuration for Phase 1.
 * All values chosen based on FDA/USP guidance and
 * industry-standard quality thresholds for research compounds.
 */
export const SCORING_CONFIG_V1: ScoringConfig = {
  version: '1.0.0',

  /**
   * Purity weight: 0.6 (60% of base score).
   * Rationale: Purity is the single most important quality indicator.
   * A 98% pure compound scores 0.6 * 98 = 58.8 base points.
   */
  purity_weight: 0.6,

  /**
   * Endotoxin threshold: 5.0 EU/mL.
   * Based on FDA guidance for injectable products.
   * Compounds below this threshold receive no penalty.
   */
  endotoxin_threshold: 5.0,

  /**
   * Maximum endotoxin penalty: 15 points.
   * Applied proportionally when endotoxin exceeds threshold.
   * At 2x threshold (10 EU/mL), full 15-point penalty applied.
   */
  endotoxin_max_penalty: 15,

  /**
   * Heavy metal threshold: 10.0 ppm.
   * Based on USP <232> elemental impurities limits.
   * Compounds below this threshold receive no penalty.
   */
  heavy_metal_threshold: 10.0,

  /**
   * Maximum heavy metal penalty: 10 points.
   * Applied proportionally when heavy metals exceed threshold.
   * At 2x threshold (20 ppm), full 10-point penalty applied.
   */
  heavy_metal_max_penalty: 10,

  /**
   * Maximum batch variance penalty: 5 points.
   * High variance across batches from the same supplier
   * indicates inconsistent manufacturing quality.
   */
  variance_max_penalty: 5,

  /**
   * Time decay begins after 180 days (6 months).
   * Lab results older than 6 months are considered less reliable
   * because compound stability may degrade over time.
   */
  time_decay_days: 180,

  /**
   * Maximum time decay penalty: 10 points.
   * Applied linearly: at 360 days (2x threshold), full penalty applied.
   * Tests older than 360 days receive the maximum penalty.
   */
  time_decay_max_penalty: 10,

  /**
   * Minimum sample size for full confidence: 3.
   * Single-sample tests receive confidence of 1/3 ≈ 0.33.
   * Two samples: 2/3 ≈ 0.67. Three or more: 1.0.
   * Rationale: Statistical reliability requires multiple independent measurements.
   */
  min_sample_size_for_full_confidence: 3,
};

/**
 * VERSION_REGISTRY maps version strings to their scoring configurations.
 * This enables:
 * 1. Running historical scores under the config that was active at scoring time.
 * 2. Comparing scores across versions (v1 vs v2).
 * 3. Never rewriting historical scores — they remain immutable.
 *
 * To add a new version:
 * 1. Create a new const (e.g., SCORING_CONFIG_V2).
 * 2. Register it here with its version string.
 * 3. Update DEFAULT_SCORING_VERSION.
 * 4. NEVER modify an existing registered config.
 */
export const VERSION_REGISTRY: Record<string, ScoringConfig> = {
  '1.0.0': SCORING_CONFIG_V1,
};

/**
 * The default scoring version used when no version is explicitly specified.
 * Update this when a new version becomes the active default.
 */
export const DEFAULT_SCORING_VERSION = '1.0.0';

/**
 * getScoringConfig retrieves a scoring configuration by version string.
 * Throws if the requested version does not exist in the registry.
 *
 * @param version - Semantic version string (e.g., "1.0.0")
 * @returns The scoring configuration for the requested version
 * @throws Error if version is not registered
 */
export function getScoringConfig(version?: string): ScoringConfig {
  const v = version ?? DEFAULT_SCORING_VERSION;
  const config = VERSION_REGISTRY[v];
  if (!config) {
    throw new Error(
      `Scoring config version "${v}" not found. Available versions: ${Object.keys(VERSION_REGISTRY).join(', ')}`
    );
  }
  return config;
}

/**
 * listAvailableVersions returns all registered scoring config versions.
 * Useful for admin interfaces and audit reports.
 */
export function listAvailableVersions(): string[] {
  return Object.keys(VERSION_REGISTRY);
}
