import { PrismaClient } from '@prisma/client';
import { ClaudeService } from '../../packages/ai/src/claude';
import { PDFReportGenerator } from '../../packages/pdf/src/generator';

const prisma = new PrismaClient();
const claude = new ClaudeService();

/**
 * Report generation workflow - creates AI-powered analytical reports
 */
export class ReportGenerationWorkflow {

  /**
   * Generate a complete report for a sample with results
   */
  async generateFullReport(sampleId: string) {
    const sample = await prisma.sample.findUnique({
      where: { id: sampleId }
    });

    if (!sample) {
      throw new Error(`Sample not found: ${sampleId}`);
    }

    if (!sample.purity || !sample.endotoxin || !sample.residualTfa) {
      throw new Error(`Sample ${sampleId} does not have complete results`);
    }

    // Generate AI analysis
    const analysis = await claude.generateReportAnalysis({
      peptideType: sample.peptideType,
      purity: sample.purity,
      endotoxin: sample.endotoxin,
      residualTfa: sample.residualTfa,
      supplierName: sample.supplierName
    });

    // Update sample with AI analysis
    await prisma.sample.update({
      where: { id: sampleId },
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
        purity: sample.purity,
        endotoxin: sample.endotoxin,
        residualTfa: sample.residualTfa,
        massSpecMatch: sample.massSpecMatch || undefined
      }
    );

    return {
      analysis,
      reportBuffer,
      trackingId: sample.trackingId
    };
  }

  /**
   * Batch generate reports for all samples with results but no report
   */
  async batchGenerateReports() {
    const samplesNeedingReports = await prisma.sample.findMany({
      where: {
        status: 'RESULTS_RECEIVED',
        purity: { not: null },
        aiGrade: null
      }
    });

    const results = [];
    for (const sample of samplesNeedingReports) {
      try {
        const report = await this.generateFullReport(sample.id);
        results.push({ trackingId: report.trackingId, status: 'success' });
      } catch (error) {
        results.push({
          trackingId: sample.trackingId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}
