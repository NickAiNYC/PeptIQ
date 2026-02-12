// ============================================
// PeptIQ Scoring & Lab Ingestion Type Definitions
// ============================================
// These types support the scoring engine, lab report ingestion,
// and audit trail. They are molecule-agnostic — the scoring engine
// evaluates lab metrics only, not compound identity.
// ============================================

/**
 * LabReport represents a normalized lab test report ingested into the system.
 * Each report is tied to a specific batch, supplier, and lab.
 *
 * All numeric metrics (purity, endotoxin, heavy metals) are required
 * so scoring can produce deterministic results without null-handling ambiguity.
 */
export interface LabReport {
  /** Unique identifier for this lab report */
  id: string;

  /** Identifier for the batch tested */
  batch_id: string;

  /** Identifier of the supplier who provided the batch */
  supplier_id: string;

  /** Identifier of the lab that performed the test */
  lab_id: string;

  /** Date the test was performed (ISO 8601) */
  test_date: string;

  /** Purity percentage (0–100). Primary scoring factor. */
  purity_percent: number;

  /**
   * Endotoxin level in EU/mL.
   * FDA threshold for injectable products is typically 5 EU/kg.
   * Lower is better. High values trigger risk flags.
   */
  endotoxin_level: number;

  /**
   * Heavy metal concentration in ppm (parts per million).
   * USP <232> sets limits for elemental impurities.
   * Lower is better. High values trigger risk flags.
   */
  heavy_metals_ppm: number;

  /**
   * Number of independent samples tested in this report.
   * Higher sample sizes increase scoring confidence.
   * Minimum of 1 required.
   */
  sample_size: number;

  /** Original raw JSON payload as received from the lab or ingestion source */
  raw_json: string;
}

/**
 * ScoringConfig defines all weights, thresholds, and parameters
 * used by the scoring engine. Every value is explicit and documented
 * to support legal defensibility and regulatory audit.
 *
 * All weights and thresholds must be versioned. Historical scores
 * must be reproducible under the config version used at scoring time.
 */
export interface ScoringConfig {
  /** Semantic version of this scoring configuration (e.g., "1.0.0") */
  version: string;

  /**
   * Weight assigned to purity in the final score (0–1).
   * Purity is the primary quality indicator.
   * Business rationale: Purity directly correlates with compound efficacy.
   */
  purity_weight: number;

  /**
   * Endotoxin level (EU/mL) at or above which a penalty is applied.
   * Based on FDA/USP safety thresholds.
   */
  endotoxin_threshold: number;

  /**
   * Maximum penalty deducted for endotoxin violations (score points).
   * Applied proportionally when endotoxin exceeds threshold.
   */
  endotoxin_max_penalty: number;

  /**
   * Heavy metal concentration (ppm) at or above which a penalty is applied.
   * Based on USP <232> elemental impurities guidance.
   */
  heavy_metal_threshold: number;

  /**
   * Maximum penalty deducted for heavy metal violations (score points).
   * Applied proportionally when heavy metals exceed threshold.
   */
  heavy_metal_max_penalty: number;

  /**
   * Maximum penalty deducted for high batch variance (score points).
   * Batch variance is the standard deviation of purity across multiple
   * reports for the same batch. High variance indicates inconsistent manufacturing.
   */
  variance_max_penalty: number;

  /**
   * Number of days after which time decay begins reducing score confidence.
   * Lab results older than this are considered less reliable.
   * Business rationale: Compound stability degrades over time; older tests
   * may not reflect current batch quality.
   */
  time_decay_days: number;

  /**
   * Maximum penalty applied for test age exceeding time_decay_days (score points).
   * Linearly applied: tests at 2x time_decay_days receive full penalty.
   */
  time_decay_max_penalty: number;

  /**
   * Minimum sample size required for full confidence (1.0).
   * Reports with fewer samples receive proportionally reduced confidence.
   * Business rationale: Single-sample tests are less statistically reliable.
   */
  min_sample_size_for_full_confidence: number;
}

/**
 * ScoreBreakdown shows how each scoring component contributed to the final score.
 * This is critical for auditability — any score must be explainable
 * by showing the individual component values.
 */
export interface ScoreBreakdown {
  /** Points from purity evaluation (0 to purity_weight * 100) */
  purity_component: number;

  /** Points deducted for endotoxin levels (0 to -endotoxin_max_penalty) */
  endotoxin_component: number;

  /** Points deducted for heavy metal levels (0 to -heavy_metal_max_penalty) */
  heavy_metal_component: number;

  /** Points deducted for batch variance (0 to -variance_max_penalty) */
  variance_component: number;

  /** Points deducted for test age (0 to -time_decay_max_penalty) */
  time_decay_component: number;
}

/**
 * ScoreResult is the complete output of the scoring engine.
 * It includes the final score, confidence level, risk flags,
 * the scoring version used, and a full breakdown for audit purposes.
 */
export interface ScoreResult {
  /** Final quality score (0–100). Higher is better. */
  score: number;

  /**
   * Confidence in the score (0–1).
   * Reduced by low sample sizes and old test dates.
   */
  confidence: number;

  /**
   * Human-readable risk flags explaining score deductions.
   * Example: ["HIGH_ENDOTOXIN", "LOW_SAMPLE_SIZE", "STALE_TEST_DATA"]
   */
  risk_flags: string[];

  /** Version of the scoring config used to produce this result */
  scoring_version: string;

  /** Component-level breakdown for auditability */
  breakdown: ScoreBreakdown;
}

/**
 * AuditEntry records the ingestion and processing of a lab report.
 * Every report must have an audit trail for legal defensibility.
 */
export interface AuditEntry {
  /** Unique identifier for this audit record */
  id: string;

  /** ID of the lab report this audit entry refers to */
  report_id: string;

  /** SHA-256 hash of the raw report JSON for integrity verification */
  report_hash: string;

  /** ISO 8601 timestamp when the report was ingested */
  ingested_at: string;

  /** Identifier of the lab source */
  lab_source: string;

  /** The action performed (e.g., "INGESTED", "SCORED", "MODIFIED") */
  action: string;

  /** Original raw JSON preserved at ingestion time */
  raw_json: string;

  /** Optional metadata (e.g., scoring version, user who triggered action) */
  metadata?: Record<string, unknown>;
}

/**
 * AuditHistoryEntry represents a single change event in the
 * immutable change history of a report.
 */
export interface AuditHistoryEntry {
  /** The action that was taken */
  action: string;

  /** When the action occurred */
  timestamp: string;

  /** SHA-256 hash at time of action */
  report_hash: string;

  /** Additional context */
  metadata?: Record<string, unknown>;
}
