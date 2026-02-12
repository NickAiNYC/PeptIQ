/**
 * PeptIQ Database Seed Script
 *
 * Populates the database with initial data for development and testing.
 * Run with: npx ts-node scripts/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PeptIQ database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@peptiq.io' },
    update: {},
    create: {
      email: 'admin@peptiq.io',
      name: 'PeptIQ Admin',
      role: 'ADMIN'
    }
  });
  console.log(`  ✅ Admin user: ${admin.email}`);

  // Create test consumer
  const consumer = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test Consumer',
      role: 'CONSUMER'
    }
  });
  console.log(`  ✅ Test consumer: ${consumer.email}`);

  // Create suppliers
  const suppliers = [
    {
      name: 'PeptidePure Labs',
      website: 'https://peptidepure.example.com',
      verified: true,
      verificationTier: 'PREMIUM' as const,
      contactName: 'Dr. Sarah Chen',
      contactEmail: 'sarah@peptidepure.example.com',
      avgPurity: 97.8,
      sampleCount: 24,
      passRate: 95.8
    },
    {
      name: 'BioSynth Research',
      website: 'https://biosynth.example.com',
      verified: true,
      verificationTier: 'BASIC' as const,
      contactName: 'Mike Johnson',
      contactEmail: 'mike@biosynth.example.com',
      avgPurity: 96.2,
      sampleCount: 12,
      passRate: 91.7
    },
    {
      name: 'NovaPeptide Co',
      website: 'https://novapeptide.example.com',
      verified: false,
      contactName: 'Lisa Wang',
      contactEmail: 'lisa@novapeptide.example.com',
      avgPurity: 93.1,
      sampleCount: 8,
      passRate: 75.0
    },
    {
      name: 'QualityPep Inc',
      website: 'https://qualitypep.example.com',
      verified: true,
      verificationTier: 'PREMIUM' as const,
      contactName: 'James Miller',
      contactEmail: 'james@qualitypep.example.com',
      avgPurity: 98.1,
      sampleCount: 31,
      passRate: 96.8
    },
    {
      name: 'PharmaGrade Solutions',
      website: 'https://pharmagrade.example.com',
      verified: false,
      contactName: 'Ana Martinez',
      contactEmail: 'ana@pharmagrade.example.com',
      avgPurity: 89.5,
      sampleCount: 5,
      passRate: 60.0
    }
  ];

  for (const supplierData of suppliers) {
    const supplier = await prisma.supplier.upsert({
      where: { name: supplierData.name },
      update: supplierData,
      create: supplierData
    });
    console.log(`  ✅ Supplier: ${supplier.name} (verified: ${supplier.verified})`);
  }

  // Create sample test records
  const samples = [
    {
      trackingId: 'PTQ-2026-0001',
      userId: consumer.id,
      peptideType: 'BPC157' as const,
      supplierName: 'PeptidePure Labs',
      supplierBatch: 'LOT-2026-001',
      testTier: 'TIER2' as const,
      status: 'COMPLETED' as const,
      purity: 98.2,
      endotoxin: 0.12,
      residualTfa: 0.34,
      massSpecMatch: true,
      aiGrade: 'A',
      aiSummary: 'Excellent quality sample with purity well above industry standards.',
      aiRecommendation: 'This sample meets all quality benchmarks. Safe for research use.',
      public: true
    },
    {
      trackingId: 'PTQ-2026-0002',
      userId: consumer.id,
      peptideType: 'TB500' as const,
      supplierName: 'BioSynth Research',
      supplierBatch: 'BS-2026-047',
      testTier: 'TIER1' as const,
      status: 'COMPLETED' as const,
      purity: 96.5,
      endotoxin: 0.08,
      residualTfa: 0.56,
      massSpecMatch: true,
      aiGrade: 'A',
      aiSummary: 'Good quality with purity above industry average.',
      aiRecommendation: 'Sample passes all basic quality checks.',
      public: true
    },
    {
      trackingId: 'PTQ-2026-0003',
      userId: consumer.id,
      peptideType: 'SEMAGLUTIDE' as const,
      supplierName: 'NovaPeptide Co',
      supplierBatch: 'NP-SEM-003',
      testTier: 'TIER3' as const,
      status: 'COMPLETED' as const,
      purity: 91.3,
      endotoxin: 0.45,
      residualTfa: 1.12,
      massSpecMatch: true,
      aiGrade: 'C',
      aiSummary: 'Below industry average purity. Elevated residual TFA levels.',
      aiRecommendation: 'Consider alternative suppliers for this peptide.',
      public: true
    },
    {
      trackingId: 'PTQ-2026-0004',
      peptideType: 'BPC157' as const,
      supplierName: 'PharmaGrade Solutions',
      testTier: 'TIER1' as const,
      status: 'IN_TESTING' as const,
      public: false
    },
    {
      trackingId: 'PTQ-2026-0005',
      userId: consumer.id,
      peptideType: 'GHKCU' as const,
      supplierName: 'QualityPep Inc',
      supplierBatch: 'QP-GHK-012',
      testTier: 'TIER2' as const,
      status: 'COMPLETED' as const,
      purity: 97.1,
      endotoxin: 0.05,
      residualTfa: 0.21,
      massSpecMatch: true,
      aiGrade: 'A',
      aiSummary: 'Outstanding quality. Among the highest purity scores in our database.',
      aiRecommendation: 'Highly recommended supplier for GHK-Cu.',
      public: true
    }
  ];

  for (const sampleData of samples) {
    const sample = await prisma.sample.upsert({
      where: { trackingId: sampleData.trackingId },
      update: sampleData,
      create: sampleData
    });
    console.log(`  ✅ Sample: ${sample.trackingId} (${sample.status})`);
  }

  // Create a quality alert
  const novaPeptide = await prisma.supplier.findUnique({
    where: { name: 'NovaPeptide Co' }
  });

  if (novaPeptide) {
    const alert = await prisma.qualityAlert.create({
      data: {
        supplierId: novaPeptide.id,
        severity: 'WARNING',
        title: 'Below-average Semaglutide purity',
        description: 'NovaPeptide Co semaglutide sample tested at 91.3% purity, below the 96.8% industry average. Elevated TFA residuals also detected.',
        detectionMethod: 'batch_failure',
        confidence: 0.92
      }
    });
    console.log(`  ✅ Quality alert: ${alert.title}`);
  }

  console.log('');
  console.log('✅ Database seeded successfully!');
  console.log(`   Users: 2`);
  console.log(`   Suppliers: ${suppliers.length}`);
  console.log(`   Samples: ${samples.length}`);
  console.log(`   Quality Alerts: 1`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
