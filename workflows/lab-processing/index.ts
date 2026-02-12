import { PrismaClient } from '@prisma/client';
import { ClaudeService } from '../../packages/ai/src/claude';

const prisma = new PrismaClient();
const claude = new ClaudeService();

/**
 * Lab processing workflow - handles communication with testing labs
 * and processing of incoming results
 */
export class LabProcessingWorkflow {

  /**
   * Process incoming lab report PDF via email or API
   */
  async processLabReport(trackingId: string, pdfBase64: string) {
    // Extract data from lab PDF using Claude
    const extractedData = await claude.extractLabData(pdfBase64);

    const sample = await prisma.sample.findUnique({
      where: { trackingId }
    });

    if (!sample) {
      throw new Error(`Sample not found: ${trackingId}`);
    }

    // Update sample with extracted results
    await prisma.sample.update({
      where: { id: sample.id },
      data: {
        purity: extractedData.purity_percentage,
        endotoxin: extractedData.endotoxin_level,
        residualTfa: extractedData.residual_tfa,
        massSpecMatch: extractedData.mass_spec_confirmed,
        status: 'RESULTS_RECEIVED',
        dateTested: extractedData.test_date ? new Date(extractedData.test_date) : new Date()
      }
    });

    return extractedData;
  }

  /**
   * Send sample to lab for testing
   */
  async submitToLab(sampleId: string) {
    const sample = await prisma.sample.findUnique({
      where: { id: sampleId }
    });

    if (!sample) {
      throw new Error(`Sample not found: ${sampleId}`);
    }

    // Update status to AT_LAB
    await prisma.sample.update({
      where: { id: sampleId },
      data: { status: 'AT_LAB' }
    });

    // In production, this would send a request to the lab's API
    // or generate a submission form for the lab
    return {
      sampleId,
      trackingId: sample.trackingId,
      status: 'AT_LAB'
    };
  }

  /**
   * Mark sample as received at facility
   */
  async markSampleReceived(sampleId: string) {
    return prisma.sample.update({
      where: { id: sampleId },
      data: {
        status: 'SAMPLE_RECEIVED',
        dateReceived: new Date()
      }
    });
  }

  /**
   * Check for overdue lab results
   */
  async checkOverdueResults() {
    const overdueThresholdDays = 14;
    const overdueDate = new Date(Date.now() - overdueThresholdDays * 24 * 60 * 60 * 1000);

    const overdueSamples = await prisma.sample.findMany({
      where: {
        status: { in: ['AT_LAB', 'IN_TESTING'] },
        updatedAt: { lt: overdueDate }
      }
    });

    return overdueSamples;
  }
}
