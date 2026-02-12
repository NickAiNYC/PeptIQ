// ============================================
// PeptIQ Shared Type Definitions
// ============================================

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  stripeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Role = 'CONSUMER' | 'VERIFIED_SUPPLIER' | 'CLINIC' | 'ADMIN';

// Sample types
export interface Sample {
  id: string;
  trackingId: string;
  userId?: string;
  peptideType: PeptideType;
  supplierName: string;
  supplierBatch?: string;
  purchaseDate?: Date;
  dateReceived?: Date;
  dateTested?: Date;
  testTier: TestTier;
  status: SampleStatus;
  purity?: number;
  endotoxin?: number;
  residualTfa?: number;
  massSpecMatch?: boolean;
  labReportUrl?: string;
  aiGrade?: string;
  aiSummary?: string;
  aiRecommendation?: string;
  createdAt: Date;
  updatedAt: Date;
  public: boolean;
  supplierId?: string;
}

export type PeptideType =
  | 'BPC157'
  | 'TB500'
  | 'SEMAGLUTIDE'
  | 'TIRZEPATIDE'
  | 'GHKCU'
  | 'NAD'
  | 'MOTSC'
  | 'EPITALON'
  | 'SEMAX'
  | 'SELANK'
  | 'CJC1295'
  | 'IPAMORELIN'
  | 'OTHER';

export type TestTier = 'TIER1' | 'TIER2' | 'TIER3';

export type SampleStatus =
  | 'SUBMITTED'
  | 'AWAITING_SAMPLE'
  | 'SAMPLE_RECEIVED'
  | 'AT_LAB'
  | 'IN_TESTING'
  | 'RESULTS_RECEIVED'
  | 'REPORT_GENERATED'
  | 'COMPLETED'
  | 'FAILED';

// Supplier types
export interface Supplier {
  id: string;
  name: string;
  website?: string;
  verified: boolean;
  verificationDate?: Date;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  verificationTier?: VerificationTier;
  annualFee?: number;
  lastPaymentDate?: Date;
  nextReviewDate?: Date;
  avgPurity?: number;
  avgEndotoxin?: number;
  sampleCount: number;
  passRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type VerificationTier = 'BASIC' | 'PREMIUM';

// Quality Alert types
export interface QualityAlert {
  id: string;
  supplierId: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  resolved: boolean;
  resolvedAt?: Date;
  detectionMethod: string;
  confidence?: number;
  createdAt: Date;
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

// Subscription types
export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  stripePriceId: string;
  stripeSubId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionTier = 'PASSPORT' | 'CLINIC_BASIC' | 'CLINIC_PRO';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED';

// API Key types
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  lastUsed?: Date;
  expiresAt?: Date;
  permissions: ApiPermissions;
  createdAt: Date;
}

export interface ApiPermissions {
  read: boolean;
  write: boolean;
  admin: boolean;
}

// API Request/Response types
export interface SampleSubmissionRequest {
  peptideType: PeptideType;
  supplierName: string;
  batchNumber?: string;
  purchaseDate?: string;
  testTier: TestTier;
}

export interface SampleSubmissionResponse {
  trackingId: string;
  sampleId: string;
  clientSecret: string;
  estimatedCompletionDate: string;
}

export interface TestResultsResponse {
  trackingId: string;
  peptideType: PeptideType;
  supplierName: string;
  purity?: number;
  endotoxin?: number;
  residualTfa?: number;
  massSpecMatch?: boolean;
  aiGrade?: string;
  aiSummary?: string;
  aiRecommendation?: string;
  reportUrl?: string;
  status: SampleStatus;
}

export interface SupplierListResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  pageSize: number;
}

// Test tier pricing (in cents)
export const TEST_PRICES: Record<TestTier, number> = {
  TIER1: 8900,
  TIER2: 14900,
  TIER3: 24900
};

// Peptide display names
export const PEPTIDE_DISPLAY_NAMES: Record<PeptideType, string> = {
  BPC157: 'BPC-157',
  TB500: 'TB-500',
  SEMAGLUTIDE: 'Semaglutide',
  TIRZEPATIDE: 'Tirzepatide',
  GHKCU: 'GHK-Cu',
  NAD: 'NAD+',
  MOTSC: 'MOTS-c',
  EPITALON: 'Epitalon',
  SEMAX: 'Semax',
  SELANK: 'Selank',
  CJC1295: 'CJC-1295',
  IPAMORELIN: 'Ipamorelin',
  OTHER: 'Other'
};
