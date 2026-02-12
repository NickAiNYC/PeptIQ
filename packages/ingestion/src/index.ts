// ============================================
// PeptIQ Lab Report Ingestion Layer
// ============================================
// Responsible for validating and normalizing incoming lab reports.
// No scoring logic lives here — this module only handles data intake.
//
// Every ingested report is validated, assigned an ID, and passed
// to the audit module for integrity tracking before any scoring occurs.
// ============================================

import { LabReport } from '@peptiq/types';

/**
 * RawLabInput represents the shape of data received from external
 * lab sources or API consumers. This is the "untrusted" boundary.
 * All fields are validated before conversion to a LabReport.
 */
export interface RawLabInput {
  batch_id?: unknown;
  supplier_id?: unknown;
  lab_id?: unknown;
  test_date?: unknown;
  purity_percent?: unknown;
  endotoxin_level?: unknown;
  heavy_metals_ppm?: unknown;
  sample_size?: unknown;
  [key: string]: unknown;
}

/**
 * IngestionResult wraps the outcome of a report ingestion attempt.
 * On success, provides the validated LabReport.
 * On failure, provides a list of human-readable validation errors.
 */
export interface IngestionResult {
  success: boolean;
  report?: LabReport;
  errors?: string[];
}

/**
 * ingestLabReport validates and normalizes a raw lab input into a LabReport.
 *
 * Validation checks:
 * - All required fields present
 * - Numeric fields are valid numbers
 * - Purity is within [0, 100]
 * - Endotoxin and heavy metals are non-negative
 * - Sample size is a positive integer
 * - Test date is a valid ISO 8601 date string
 *
 * The raw JSON is preserved for audit purposes.
 * A unique ID is generated for the report.
 *
 * @param input - Raw data from external source
 * @returns IngestionResult with validated report or validation errors
 */
export function ingestLabReport(input: RawLabInput): IngestionResult {
  const errors: string[] = [];
  const rawJson = JSON.stringify(input);

  // --- Required string fields ---
  if (typeof input.batch_id !== 'string' || input.batch_id.trim() === '') {
    errors.push('batch_id is required and must be a non-empty string');
  }
  if (typeof input.supplier_id !== 'string' || input.supplier_id.trim() === '') {
    errors.push('supplier_id is required and must be a non-empty string');
  }
  if (typeof input.lab_id !== 'string' || input.lab_id.trim() === '') {
    errors.push('lab_id is required and must be a non-empty string');
  }

  // --- Test date validation ---
  if (typeof input.test_date !== 'string' || input.test_date.trim() === '') {
    errors.push('test_date is required and must be a non-empty string');
  } else {
    const parsed = new Date(input.test_date as string);
    if (isNaN(parsed.getTime())) {
      errors.push('test_date must be a valid ISO 8601 date string');
    }
  }

  // --- Numeric field validations ---
  const purity = Number(input.purity_percent);
  if (isNaN(purity)) {
    errors.push('purity_percent is required and must be a number');
  } else if (purity < 0 || purity > 100) {
    errors.push('purity_percent must be between 0 and 100');
  }

  const endotoxin = Number(input.endotoxin_level);
  if (isNaN(endotoxin)) {
    errors.push('endotoxin_level is required and must be a number');
  } else if (endotoxin < 0) {
    errors.push('endotoxin_level must be non-negative');
  }

  const heavyMetals = Number(input.heavy_metals_ppm);
  if (isNaN(heavyMetals)) {
    errors.push('heavy_metals_ppm is required and must be a number');
  } else if (heavyMetals < 0) {
    errors.push('heavy_metals_ppm must be non-negative');
  }

  const sampleSize = Number(input.sample_size);
  if (isNaN(sampleSize)) {
    errors.push('sample_size is required and must be a number');
  } else if (!Number.isInteger(sampleSize) || sampleSize < 1) {
    errors.push('sample_size must be a positive integer (>= 1)');
  }

  // If there are validation errors, return them without creating a report.
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Build the validated LabReport.
  const report: LabReport = {
    id: generateReportId(),
    batch_id: (input.batch_id as string).trim(),
    supplier_id: (input.supplier_id as string).trim(),
    lab_id: (input.lab_id as string).trim(),
    test_date: (input.test_date as string).trim(),
    purity_percent: purity,
    endotoxin_level: endotoxin,
    heavy_metals_ppm: heavyMetals,
    sample_size: sampleSize,
    raw_json: rawJson,
  };

  return { success: true, report };
}

/**
 * generateReportId creates a unique identifier for a lab report.
 * Format: "RPT-{timestamp}-{random}" for readability and uniqueness.
 */
function generateReportId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `RPT-${timestamp}-${random}`;
}
