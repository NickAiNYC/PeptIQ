import { PrismaClient } from '@prisma/client';
import { ClaudeService } from '../../packages/ai/src/claude';
import { PDFReportGenerator } from '../../packages/pdf/src/generator';

const prisma = new PrismaClient();
const claude = new ClaudeService();

/**
 * Complete sample intake and processing workflow
 */
export class SampleWorkflow {

  /**
   * 1. Customer submits sample form
   */
  async handleSampleSubmission(data: SampleSubmission) {
    // Generate tracking ID: PTQ-2026-0001
    const year = new Date().getFullYear();
    const count = await prisma.sample.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } }
    });
    const trackingId = `PTQ-${year}-${String(count + 1).padStart(4, '0')}`;

    // Create sample record
    const sample = await prisma.sample.create({
      data: {
        trackingId,
        userId: data.userId,
        peptideType: data.peptideType as any,
        supplierName: data.supplierName,
        supplierBatch: data.batchNumber,
        purchaseDate: data.purchaseDate,
        testTier: data.testTier as any,
        status: 'SUBMITTED'
      }
    });

    // Trigger Slack notification
    await this.notifySlack(`📦 New sample submitted: ${trackingId} - ${data.peptideType}`);

    return { sample, trackingId };
  }

  /**
   * 2. Customer ships sample - update tracking
   */
  // TODO: Use trackingInfo to store carrier/tracking number when shipping integration is added
  async handleSampleShipped(sampleId: string, _trackingInfo: TrackingInfo) {
    const sample = await prisma.sample.update({
      where: { id: sampleId },
      data: {
        status: 'AWAITING_SAMPLE',
      }
    });

    return sample;
  }

  /**
   * 3. Lab receives and tests sample
   */
  async handleLabResults(labResults: LabResults) {
    // Parse lab email/PDF
    const sample = await prisma.sample.findUnique({
      where: { trackingId: labResults.trackingId }
    });

    if (!sample) throw new Error(`Sample not found: ${labResults.trackingId}`);

    // Update sample with results
    const updatedSample = await prisma.sample.update({
      where: { id: sample.id },
      data: {
        purity: labResults.purity,
        endotoxin: labResults.endotoxin,
        residualTfa: labResults.residualTfa,
        massSpecMatch: labResults.massSpecMatch,
        labReportUrl: labResults.reportUrl,
        status: 'RESULTS_RECEIVED',
        dateTested: new Date()
      }
    });

    // Generate AI analysis
    const analysis = await claude.generateReportAnalysis({
      peptideType: sample.peptideType,
      purity: labResults.purity,
      endotoxin: labResults.endotoxin,
      residualTfa: labResults.residualTfa,
      supplierName: sample.supplierName
    });

    // Update with AI analysis
    await prisma.sample.update({
      where: { id: sample.id },
      data: {
        aiGrade: analysis.grade,
        aiSummary: analysis.safetyAssessment,
        aiRecommendation: analysis.recommendation,
        status: 'REPORT_GENERATED'
      }
    });

    // Generate PDF report
    const pdfGenerator = new PDFReportGenerator();
    const reportBuffer = await pdfGenerator.generateReport(
      {
        trackingId: sample.trackingId,
        peptideType: sample.peptideType,
        supplierName: sample.supplierName,
        supplierBatch: sample.supplierBatch || undefined,
        testTier: sample.testTier
      },
      {
        purity: labResults.purity,
        endotoxin: labResults.endotoxin,
        residualTfa: labResults.residualTfa
      }
    );

    // Upload to S3 and get URL
    const reportUrl = await this.uploadToS3(reportBuffer, `${sample.trackingId}.pdf`);

    // Update sample with report URL
    await prisma.sample.update({
      where: { id: sample.id },
      data: {
        labReportUrl: reportUrl,
        status: 'COMPLETED'
      }
    });

    // Update supplier statistics
    await this.updateSupplierMetrics(sample.supplierName);

    // Check for quality alerts
    await this.checkForQualityAlerts(sample);

    return updatedSample;
  }

  /**
   * 4. Monitor for quality trends and generate alerts
   */
  async checkForQualityAlerts(sample: any) {
    // Get supplier's recent samples
    const recentSamples = await prisma.sample.findMany({
      where: {
        supplierName: sample.supplierName,
        peptideType: sample.peptideType,
        status: 'COMPLETED',
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Check for declining quality trend
    if (recentSamples.length >= 3) {
      const purities = recentSamples
        .map(s => s.purity)
        .filter((p): p is number => p !== null);

      if (purities.length >= 6) {
        const oldestThreeAvg = purities.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const newestThreeAvg = purities.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

        if (oldestThreeAvg - newestThreeAvg > 2) {
          // Create quality alert
          const supplier = await prisma.supplier.findUnique({
            where: { name: sample.supplierName }
          });

          if (supplier) {
            await prisma.qualityAlert.create({
              data: {
                supplierId: supplier.id,
                severity: 'WARNING',
                title: `Declining ${sample.peptideType} quality`,
                description: `${sample.supplierName} purity dropped from ${oldestThreeAvg.toFixed(1)}% to ${newestThreeAvg.toFixed(1)}% over last 3 batches`,
                detectionMethod: 'trend_analysis',
                confidence: 0.85
              }
            });

            // Notify admin
            await this.notifySlack(`⚠️ Quality alert: ${sample.supplierName} - ${sample.peptideType} declining`);
          }
        }
      }
    }
  }

  /**
   * 5. Update supplier performance metrics
   */
  async updateSupplierMetrics(supplierName: string) {
    const samples = await prisma.sample.findMany({
      where: {
        supplierName,
        status: 'COMPLETED',
        purity: { not: null }
      }
    });

    if (samples.length === 0) return;

    const purities = samples
      .map(s => s.purity)
      .filter((p): p is number => p !== null);

    const avgPurity = purities.reduce((sum, p) => sum + p, 0) / purities.length;
    const passRate = purities.filter(p => p >= 95).length / purities.length * 100;

    await prisma.supplier.upsert({
      where: { name: supplierName },
      update: {
        avgPurity,
        sampleCount: samples.length,
        passRate
      },
      create: {
        name: supplierName,
        avgPurity,
        sampleCount: samples.length,
        passRate
      }
    });
  }

  private async uploadToS3(_buffer: Buffer, filename: string): Promise<string> {
    // S3 implementation - would use AWS SDK
    return `https://reports.peptiq.com/${filename}`;
  }

  private async notifySlack(message: string) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message })
      });
    } catch {
      console.error('Failed to send Slack notification');
    }
  }
}

// Type definitions
interface SampleSubmission {
  userId?: string;
  peptideType: string;
  supplierName: string;
  batchNumber?: string;
  purchaseDate?: Date;
  testTier: string;
}

interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: Date;
}

interface LabResults {
  trackingId: string;
  purity: number;
  endotoxin: number;
  residualTfa: number;
  massSpecMatch: boolean;
  reportUrl?: string;
}
