import { PrismaClient } from '@prisma/client';
import { ClaudeService } from '../../packages/ai/src/claude';

const prisma = new PrismaClient();
const claude = new ClaudeService();

/**
 * Supplier outreach workflow - automated email sequences
 * for supplier verification program enrollment
 */
export class SupplierOutreachWorkflow {

  /**
   * Identify suppliers eligible for outreach
   */
  async findOutreachCandidates() {
    // Find suppliers with good results but not yet verified
    const candidates = await prisma.supplier.findMany({
      where: {
        verified: false,
        sampleCount: { gte: 2 },
        avgPurity: { gte: 90 }
      },
      orderBy: { avgPurity: 'desc' }
    });

    return candidates;
  }

  /**
   * Generate personalized outreach email for a supplier
   */
  async generateOutreachEmail(supplierId: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      throw new Error(`Supplier not found: ${supplierId}`);
    }

    // Get their test results
    const samples = await prisma.sample.findMany({
      where: {
        supplierName: supplier.name,
        status: 'COMPLETED',
        purity: { not: null }
      }
    });

    if (samples.length === 0) {
      throw new Error(`No completed samples for supplier: ${supplier.name}`);
    }

    const testResults = samples
      .filter(s => s.purity !== null)
      .map(s => ({
        peptideType: s.peptideType,
        purity: s.purity!,
        endotoxin: s.endotoxin || 0,
        residualTfa: s.residualTfa || 0,
        supplierName: s.supplierName
      }));

    const emailContent = await claude.generateSupplierEmail(
      {
        name: supplier.name,
        contactName: supplier.contactName || undefined,
        contactEmail: supplier.contactEmail || undefined
      },
      testResults
    );

    return {
      to: supplier.contactEmail,
      subject: `Your peptide quality results - ${supplier.name}`,
      body: emailContent
    };
  }

  /**
   * Run the complete outreach sequence
   */
  async runOutreachSequence() {
    const candidates = await this.findOutreachCandidates();

    const results = [];
    for (const candidate of candidates) {
      try {
        const email = await this.generateOutreachEmail(candidate.id);
        results.push({
          supplier: candidate.name,
          email: email.to,
          status: 'generated'
        });
      } catch (error) {
        results.push({
          supplier: candidate.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}
