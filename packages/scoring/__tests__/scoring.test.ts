// ============================================
// PeptIQ Scoring Engine — Unit Tests
// ============================================
// Tests cover the five scenarios specified in the requirements:
// 1. High purity / low risk
// 2. Low purity / high endotoxin
// 3. Old test date (time decay)
// 4. High batch variance
// 5. Low sample size (confidence drop)
//
// Additional tests cover edge cases and component-level validation.
// ============================================

import {
  calculateScore,
  calculatePurityComponent,
  calculateEndotoxinPenalty,
  calculateHeavyMetalPenalty,
  calculateVariancePenalty,
  calculateTimeDecayPenalty,
  calculateConfidence,
  generateRiskFlags,
} from '@peptiq/scoring';
import { getScoringConfig } from '@peptiq/config';
import { LabReport } from '@peptiq/types';

// Helper to create a base lab report with sensible defaults.
// Individual tests override specific fields to isolate the behavior under test.
function makeReport(overrides: Partial<LabReport> = {}): LabReport {
  return {
    id: 'RPT-test-001',
    batch_id: 'BATCH-001',
    supplier_id: 'SUP-001',
    lab_id: 'LAB-001',
    test_date: new Date().toISOString(), // Fresh test by default
    purity_percent: 98,
    endotoxin_level: 2.0,
    heavy_metals_ppm: 3.0,
    sample_size: 5,
    raw_json: '{}',
    ...overrides,
  };
}

describe('Scoring Engine — calculateScore', () => {
  // -----------------------------------------------
  // Scenario 1: High purity / low risk
  // -----------------------------------------------
  test('high purity, low risk report produces a high score with full confidence', () => {
    const report = makeReport({
      purity_percent: 99,
      endotoxin_level: 1.0,
      heavy_metals_ppm: 2.0,
      sample_size: 5,
    });

    const result = calculateScore(report);

    // Score should be high (purity component: 99 * 0.6 = 59.4, no penalties)
    expect(result.score).toBeGreaterThanOrEqual(59);
    expect(result.score).toBeLessThanOrEqual(60);
    expect(result.confidence).toBe(1);
    expect(result.risk_flags).toEqual([]);
    expect(result.scoring_version).toBe('1.0.0');
    expect(result.breakdown.purity_component).toBeCloseTo(59.4, 1);
    expect(result.breakdown.endotoxin_component).toBe(0);
    expect(result.breakdown.heavy_metal_component).toBe(0);
    expect(result.breakdown.variance_component).toBe(0);
    expect(result.breakdown.time_decay_component).toBe(0);
  });

  // -----------------------------------------------
  // Scenario 2: Low purity / high endotoxin
  // -----------------------------------------------
  test('low purity with high endotoxin produces a low score with risk flags', () => {
    const report = makeReport({
      purity_percent: 75,
      endotoxin_level: 8.0, // Above 5.0 threshold
      sample_size: 5,
    });

    const result = calculateScore(report);

    // Purity component: 75 * 0.6 = 45
    // Endotoxin penalty: (8 - 5) / 5 = 0.6 → 0.6 * 15 = -9
    expect(result.score).toBeLessThan(45);
    expect(result.risk_flags).toContain('LOW_PURITY');
    expect(result.risk_flags).toContain('HIGH_ENDOTOXIN');
    expect(result.breakdown.endotoxin_component).toBeLessThan(0);
  });

  // -----------------------------------------------
  // Scenario 3: Old test date (time decay)
  // -----------------------------------------------
  test('old test date applies time decay penalty and STALE_TEST_DATA flag', () => {
    // Test from 270 days ago (90 days past the 180-day threshold)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 270);

    const report = makeReport({
      test_date: oldDate.toISOString(),
      sample_size: 5,
    });

    const result = calculateScore(report);

    // Time decay: (270 - 180) / 180 = 0.5 → 0.5 * 10 = -5
    expect(result.breakdown.time_decay_component).toBeCloseTo(-5, 0);
    expect(result.risk_flags).toContain('STALE_TEST_DATA');
    expect(result.score).toBeLessThan(59.4); // Less than the pure purity component
  });

  // -----------------------------------------------
  // Scenario 4: High batch variance
  // -----------------------------------------------
  test('high batch variance applies variance penalty and risk flag', () => {
    const report = makeReport({ sample_size: 5 });
    const highVariance = 4.0; // 4% std dev, near the 5% max

    const result = calculateScore(report, highVariance);

    // Variance penalty: (4 / 5) * 5 = -4
    expect(result.breakdown.variance_component).toBeCloseTo(-4, 1);
    expect(result.risk_flags).toContain('HIGH_BATCH_VARIANCE');
    expect(result.score).toBeLessThan(59.4);
  });

  // -----------------------------------------------
  // Scenario 5: Low sample size (confidence drop)
  // -----------------------------------------------
  test('low sample size reduces confidence below 1.0', () => {
    const report = makeReport({
      sample_size: 1, // Below the minimum of 3 for full confidence
    });

    const result = calculateScore(report);

    // Confidence: 1 / 3 ≈ 0.33
    expect(result.confidence).toBeCloseTo(0.33, 2);
    expect(result.risk_flags).toContain('LOW_SAMPLE_SIZE');
  });

  test('sample size at minimum threshold gives full confidence', () => {
    const report = makeReport({
      sample_size: 3,
    });

    const result = calculateScore(report);
    expect(result.confidence).toBe(1);
    expect(result.risk_flags).not.toContain('LOW_SAMPLE_SIZE');
  });

  // -----------------------------------------------
  // Edge cases
  // -----------------------------------------------
  test('score is clamped to minimum of 0', () => {
    const report = makeReport({
      purity_percent: 10,
      endotoxin_level: 15, // Max penalty
      heavy_metals_ppm: 25, // Max penalty
    });

    const result = calculateScore(report, 5.0); // Max variance penalty

    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  test('score is clamped to maximum of 100', () => {
    const report = makeReport({
      purity_percent: 100,
    });

    const result = calculateScore(report);

    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('scoring version is included in output', () => {
    const report = makeReport();
    const result = calculateScore(report, 0, '1.0.0');
    expect(result.scoring_version).toBe('1.0.0');
  });

  test('requesting unknown scoring version throws error', () => {
    const report = makeReport();
    expect(() => calculateScore(report, 0, '99.0.0')).toThrow(
      'Scoring config version "99.0.0" not found'
    );
  });
});

describe('Scoring Engine — Individual Components', () => {
  const config = getScoringConfig('1.0.0');

  test('purity component scales linearly with purity_weight', () => {
    expect(calculatePurityComponent(100, config)).toBe(60);
    expect(calculatePurityComponent(50, config)).toBe(30);
    expect(calculatePurityComponent(0, config)).toBe(0);
  });

  test('purity component clamps values above 100', () => {
    expect(calculatePurityComponent(110, config)).toBe(60);
  });

  test('endotoxin below threshold yields no penalty', () => {
    expect(calculateEndotoxinPenalty(4.9, config)).toBe(0);
    expect(calculateEndotoxinPenalty(0, config)).toBe(0);
  });

  test('endotoxin at 2x threshold yields max penalty', () => {
    expect(calculateEndotoxinPenalty(10, config)).toBe(-15);
  });

  test('endotoxin above 2x threshold is capped at max penalty', () => {
    expect(calculateEndotoxinPenalty(50, config)).toBe(-15);
  });

  test('heavy metals below threshold yields no penalty', () => {
    expect(calculateHeavyMetalPenalty(9.9, config)).toBe(0);
    expect(calculateHeavyMetalPenalty(0, config)).toBe(0);
  });

  test('heavy metals at 2x threshold yields max penalty', () => {
    expect(calculateHeavyMetalPenalty(20, config)).toBe(-10);
  });

  test('variance of 0 yields no penalty', () => {
    expect(calculateVariancePenalty(0, config)).toBe(0);
  });

  test('variance at max threshold yields full penalty', () => {
    expect(calculateVariancePenalty(5.0, config)).toBe(-5);
  });

  test('recent test yields no time decay penalty', () => {
    const recent = new Date().toISOString();
    expect(calculateTimeDecayPenalty(recent, config)).toBe(0);
  });

  test('test at exactly time_decay_days yields no penalty', () => {
    const exactly180 = new Date();
    exactly180.setDate(exactly180.getDate() - 180);
    // At exactly the threshold, should be 0 (not penalized yet)
    const penalty = calculateTimeDecayPenalty(exactly180.toISOString(), config);
    expect(penalty).toBeCloseTo(0, 0);
  });

  test('confidence scales linearly with sample size', () => {
    expect(calculateConfidence(0, config)).toBe(0);
    expect(calculateConfidence(1, config)).toBeCloseTo(0.33, 2);
    expect(calculateConfidence(2, config)).toBeCloseTo(0.67, 2);
    expect(calculateConfidence(3, config)).toBe(1);
    expect(calculateConfidence(10, config)).toBe(1); // Capped at 1
  });
});

describe('Scoring Engine — Risk Flags', () => {
  const config = getScoringConfig('1.0.0');

  test('no flags for a clean report', () => {
    const report = makeReport();
    expect(generateRiskFlags(report, 0, config)).toEqual([]);
  });

  test('LOW_PURITY flag when purity < 90', () => {
    const report = makeReport({ purity_percent: 85 });
    expect(generateRiskFlags(report, 0, config)).toContain('LOW_PURITY');
  });

  test('HIGH_ENDOTOXIN flag when above threshold', () => {
    const report = makeReport({ endotoxin_level: 6.0 });
    expect(generateRiskFlags(report, 0, config)).toContain('HIGH_ENDOTOXIN');
  });

  test('HIGH_HEAVY_METALS flag when above threshold', () => {
    const report = makeReport({ heavy_metals_ppm: 12.0 });
    expect(generateRiskFlags(report, 0, config)).toContain('HIGH_HEAVY_METALS');
  });

  test('HIGH_BATCH_VARIANCE flag when variance > 2.5', () => {
    const report = makeReport();
    expect(generateRiskFlags(report, 3.0, config)).toContain('HIGH_BATCH_VARIANCE');
  });

  test('LOW_SAMPLE_SIZE flag when below minimum', () => {
    const report = makeReport({ sample_size: 2 });
    expect(generateRiskFlags(report, 0, config)).toContain('LOW_SAMPLE_SIZE');
  });

  test('multiple flags for multiple issues', () => {
    const report = makeReport({
      purity_percent: 80,
      endotoxin_level: 7.0,
      sample_size: 1,
    });
    const flags = generateRiskFlags(report, 0, config);
    expect(flags).toContain('LOW_PURITY');
    expect(flags).toContain('HIGH_ENDOTOXIN');
    expect(flags).toContain('LOW_SAMPLE_SIZE');
  });
});
