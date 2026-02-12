// ============================================
// PeptIQ Audit Module
// ============================================
// Provides an immutable audit trail for every ingested lab report.
//
// Every report is:
// - Hashed with SHA-256 for integrity verification
// - Timestamped at ingestion
// - Stored with its original raw JSON
// - Tracked through an immutable change history
//
// This module uses an in-memory store for Phase 1.
// In production, this would be backed by an append-only database table.
// ============================================

import { createHash } from 'crypto';
import { AuditEntry, AuditHistoryEntry, LabReport } from '@peptiq/types';

/**
 * In-memory audit store.
 * In production, replace with an append-only database table.
 * Entries are keyed by report_id and stored as ordered arrays
 * to maintain the full history of each report.
 */
const auditStore: Map<string, AuditEntry[]> = new Map();

/**
 * hashReport generates a SHA-256 hash of the raw report JSON.
 *
 * This hash is stored at ingestion time and can be used later
 * to verify that the report data has not been tampered with.
 *
 * @param rawJson - The original raw JSON string of the report
 * @returns Hex-encoded SHA-256 hash
 */
export function hashReport(rawJson: string): string {
  return createHash('sha256').update(rawJson).digest('hex');
}

/**
 * createAuditEntry records a new audit event for a lab report.
 *
 * Called at ingestion time and whenever a report is scored or modified.
 * Each call creates a new, immutable entry in the report's history.
 *
 * @param report - The lab report being audited
 * @param action - The action being recorded (e.g., "INGESTED", "SCORED")
 * @param metadata - Optional additional context for the audit entry
 * @returns The created AuditEntry
 */
export function createAuditEntry(
  report: LabReport,
  action: string,
  metadata?: Record<string, unknown>
): AuditEntry {
  const entry: AuditEntry = {
    id: generateAuditId(),
    report_id: report.id,
    report_hash: hashReport(report.raw_json),
    ingested_at: new Date().toISOString(),
    lab_source: report.lab_id,
    action,
    raw_json: report.raw_json,
    metadata,
  };

  // Append to the report's audit history (never overwrite).
  const existing = auditStore.get(report.id) ?? [];
  existing.push(entry);
  auditStore.set(report.id, existing);

  return entry;
}

/**
 * verifyReportIntegrity checks whether a report's raw JSON
 * matches its stored hash from the initial ingestion.
 *
 * This detects any tampering or corruption of report data.
 *
 * @param report - The lab report to verify
 * @returns true if the report's raw JSON matches the original hash
 */
export function verifyReportIntegrity(report: LabReport): boolean {
  const entries = auditStore.get(report.id);
  if (!entries || entries.length === 0) {
    return false;
  }

  // Compare against the hash from the first (ingestion) entry.
  const originalHash = entries[0].report_hash;
  const currentHash = hashReport(report.raw_json);
  return originalHash === currentHash;
}

/**
 * getReportHistory returns the full, ordered audit history for a report.
 *
 * Each entry in the history represents a single action (ingestion, scoring, etc.)
 * with its timestamp and hash at that point in time.
 *
 * Returns an empty array if no history exists for the given report ID.
 *
 * @param reportId - The ID of the report to look up
 * @returns Ordered list of audit history entries
 */
export function getReportHistory(reportId: string): AuditHistoryEntry[] {
  const entries = auditStore.get(reportId);
  if (!entries) {
    return [];
  }

  return entries.map((entry) => ({
    action: entry.action,
    timestamp: entry.ingested_at,
    report_hash: entry.report_hash,
    metadata: entry.metadata,
  }));
}

/**
 * clearAuditStore resets the in-memory audit store.
 * Used only in testing. In production, audit data is never deleted.
 */
export function clearAuditStore(): void {
  auditStore.clear();
}

/**
 * generateAuditId creates a unique identifier for an audit entry.
 */
function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AUD-${timestamp}-${random}`;
}
