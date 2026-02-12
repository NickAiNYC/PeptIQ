// ============================================
// PeptIQ Audit Module — Unit Tests
// ============================================

import {
  createAuditEntry,
  verifyReportIntegrity,
  getReportHistory,
  hashReport,
  clearAuditStore,
} from '@peptiq/audit';
import { LabReport } from '@peptiq/types';

function makeReport(overrides: Partial<LabReport> = {}): LabReport {
  return {
    id: 'RPT-test-audit-001',
    batch_id: 'BATCH-001',
    supplier_id: 'SUP-001',
    lab_id: 'LAB-001',
    test_date: new Date().toISOString(),
    purity_percent: 98,
    endotoxin_level: 2.0,
    heavy_metals_ppm: 3.0,
    sample_size: 5,
    raw_json: JSON.stringify({ purity: 98, endotoxin: 2.0 }),
    ...overrides,
  };
}

beforeEach(() => {
  clearAuditStore();
});

describe('Audit Module — hashReport', () => {
  test('produces consistent SHA-256 hash for same input', () => {
    const json = '{"test": "data"}';
    const hash1 = hashReport(json);
    const hash2 = hashReport(json);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  test('produces different hashes for different inputs', () => {
    const hash1 = hashReport('{"a": 1}');
    const hash2 = hashReport('{"a": 2}');
    expect(hash1).not.toBe(hash2);
  });
});

describe('Audit Module — createAuditEntry', () => {
  test('creates an audit entry with correct fields', () => {
    const report = makeReport();
    const entry = createAuditEntry(report, 'INGESTED');

    expect(entry.report_id).toBe(report.id);
    expect(entry.action).toBe('INGESTED');
    expect(entry.lab_source).toBe(report.lab_id);
    expect(entry.raw_json).toBe(report.raw_json);
    expect(entry.report_hash).toBe(hashReport(report.raw_json));
    expect(entry.id).toMatch(/^AUD-/);
    expect(entry.ingested_at).toBeTruthy();
  });

  test('stores metadata when provided', () => {
    const report = makeReport();
    const meta = { scoring_version: '1.0.0', user: 'system' };
    const entry = createAuditEntry(report, 'SCORED', meta);

    expect(entry.metadata).toEqual(meta);
  });

  test('creates multiple entries for the same report', () => {
    const report = makeReport();

    createAuditEntry(report, 'INGESTED');
    createAuditEntry(report, 'SCORED', { version: '1.0.0' });

    const history = getReportHistory(report.id);
    expect(history).toHaveLength(2);
    expect(history[0].action).toBe('INGESTED');
    expect(history[1].action).toBe('SCORED');
  });
});

describe('Audit Module — verifyReportIntegrity', () => {
  test('returns true for unmodified report', () => {
    const report = makeReport();
    createAuditEntry(report, 'INGESTED');

    expect(verifyReportIntegrity(report)).toBe(true);
  });

  test('returns false if raw_json was tampered with', () => {
    const report = makeReport();
    createAuditEntry(report, 'INGESTED');

    // Simulate tampering
    const tampered = { ...report, raw_json: '{"tampered": true}' };
    expect(verifyReportIntegrity(tampered)).toBe(false);
  });

  test('returns false for report with no audit history', () => {
    const report = makeReport({ id: 'RPT-unknown' });
    expect(verifyReportIntegrity(report)).toBe(false);
  });
});

describe('Audit Module — getReportHistory', () => {
  test('returns empty array for unknown report', () => {
    expect(getReportHistory('RPT-nonexistent')).toEqual([]);
  });

  test('returns ordered history entries', () => {
    const report = makeReport();

    createAuditEntry(report, 'INGESTED');
    createAuditEntry(report, 'SCORED');
    createAuditEntry(report, 'REVIEWED');

    const history = getReportHistory(report.id);
    expect(history).toHaveLength(3);
    expect(history[0].action).toBe('INGESTED');
    expect(history[1].action).toBe('SCORED');
    expect(history[2].action).toBe('REVIEWED');

    // Each entry should have a hash and timestamp
    for (const entry of history) {
      expect(entry.report_hash).toHaveLength(64);
      expect(entry.timestamp).toBeTruthy();
    }
  });
});
