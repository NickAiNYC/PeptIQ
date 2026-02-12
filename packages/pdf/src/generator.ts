import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';
import { ClaudeService, TestResults as AITestResults } from '../../ai/src/claude';

export class PDFReportGenerator {
  private claude: ClaudeService;

  constructor() {
    this.claude = new ClaudeService();
  }

  /**
   * Generate branded PDF report from test results
   */
  async generateReport(sample: SampleData, results: TestResults): Promise<Buffer> {
    // Generate AI analysis before creating the PDF stream
    const aiResults: AITestResults = {
      peptideType: sample.peptideType,
      purity: results.purity,
      endotoxin: results.endotoxin,
      residualTfa: results.residualTfa,
      supplierName: sample.supplierName
    };
    const analysis = await this.claude.generateReportAnalysis(aiResults);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Peptide Quality Report - ${sample.trackingId}`,
            Author: 'PEPTIQ',
            Subject: `Analysis of ${sample.peptideType} from ${sample.supplierName}`
          }
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Cover Page
        doc.font('Helvetica-Bold').fontSize(24)
           .text('PEPTIQ', 50, 50)
           .fontSize(12)
           .font('Helvetica')
           .text('Peptide Quality Intelligence & Testing', 50, 80);

        doc.fontSize(10)
           .text(`Report Generated: ${new Date().toLocaleDateString()}`, 50, 120)
           .text(`Tracking ID: ${sample.trackingId}`, 50, 135);

        // Sample Information
        doc.moveDown(2)
           .fontSize(16).font('Helvetica-Bold')
           .text('Sample Information', 50, 180);

        doc.moveDown(0.5)
           .fontSize(11).font('Helvetica')
           .text(`Peptide: ${sample.peptideType}`, 70, 210)
           .text(`Supplier: ${sample.supplierName}`, 70, 225)
           .text(`Batch: ${sample.supplierBatch || 'Not provided'}`, 70, 240)
           .text(`Test Tier: ${sample.testTier}`, 70, 255);

        // Results Summary
        doc.moveDown(2)
           .fontSize(16).font('Helvetica-Bold')
           .text('Test Results', 50, 300);

        // Grade Circle
        const gradeColors: Record<string, string> = {
          'A': '#22c55e',
          'B': '#3b82f6',
          'C': '#eab308',
          'D': '#f97316',
          'F': '#ef4444'
        };

        doc.circle(400, 320, 30)
           .fill(gradeColors[analysis.grade] || '#94a3b8');

        doc.fillColor('white')
           .fontSize(28)
           .text(analysis.grade, 390, 305, { width: 30, align: 'center' });

        doc.fillColor('black')
           .fontSize(11);

        // Results Table
        doc.rect(50, 360, 500, 120).stroke();

        // Headers
        doc.font('Helvetica-Bold')
           .text('Parameter', 60, 375)
           .text('Result', 200, 375)
           .text('Threshold', 300, 375)
           .text('Status', 400, 375);

        doc.font('Helvetica');

        // Purity
        doc.text('Purity (HPLC)', 60, 405)
           .text(`${results.purity.toFixed(1)}%`, 200, 405)
           .text('≥95%', 300, 405)
           .text(results.purity >= 95 ? 'PASS' : 'FAIL', 400, 405);

        // Endotoxin
        doc.text('Endotoxin', 60, 435)
           .text(`${results.endotoxin.toFixed(2)} EU/mg`, 200, 435)
           .text('<0.5 EU/mg', 300, 435)
           .text(results.endotoxin < 0.5 ? 'PASS' : 'FAIL', 400, 435);

        // Residual TFA
        doc.text('Residual TFA', 60, 465)
           .text(`${results.residualTfa.toFixed(2)}%`, 200, 465)
           .text('<1.0%', 300, 465)
           .text(results.residualTfa < 1.0 ? 'PASS' : 'FAIL', 400, 465);

        // AI Analysis Section
        doc.moveDown(2)
           .fontSize(16).font('Helvetica-Bold')
           .text('Quality Assessment', 50, 520);

        doc.moveDown(0.5)
           .fontSize(11).font('Helvetica')
           .text('Safety Assessment:', 50, 560)
           .font('Helvetica')
           .text(analysis.safetyAssessment, 70, 580, { width: 460 });

        doc.moveDown(2)
           .font('Helvetica-Bold')
           .text('Comparison to Industry:', 50, 650)
           .font('Helvetica')
           .text(analysis.comparison, 70, 670, { width: 460 });

        doc.moveDown(2)
           .font('Helvetica-Bold')
           .text('Recommendation:', 50, 740)
           .font('Helvetica')
           .text(analysis.recommendation, 70, 760, { width: 460 });

        // Footer
        doc.fontSize(8)
           .fillColor('#64748b')
           .text('This report is for informational purposes only. Not medical advice.', 50, 800, { width: 500, align: 'center' })
           .text(`Report ID: ${sample.trackingId}-${Date.now()}`, 50, 815, { align: 'center' });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate supplier verification certificate
   */
  async generateCertificate(supplier: SupplierVerification): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 50,
          info: {
            Title: `Verification Certificate - ${supplier.name}`,
            Author: 'PEPTIQ'
          }
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Certificate border
        doc.rect(30, 30, 782, 532).stroke('#1e40af');
        doc.rect(35, 35, 772, 522).stroke('#1e40af');

        // Header
        doc.font('Helvetica-Bold').fontSize(36)
           .fillColor('#1e40af')
           .text('PEPTIQ', 0, 80, { align: 'center' });

        doc.fontSize(18)
           .fillColor('#334155')
           .text('Certificate of Verification', 0, 130, { align: 'center' });

        // Supplier name
        doc.fontSize(28)
           .fillColor('#0f172a')
           .text(supplier.name, 0, 200, { align: 'center' });

        // Tier
        doc.fontSize(14)
           .fillColor('#475569')
           .text(`${supplier.verificationTier} Verified Supplier`, 0, 250, { align: 'center' });

        // Products
        doc.fontSize(12)
           .text(`Verified Products: ${supplier.products.join(', ')}`, 0, 290, { align: 'center' });

        // Dates
        doc.fontSize(10)
           .text(`Verified: ${supplier.verificationDate.toLocaleDateString()}`, 0, 340, { align: 'center' })
           .text(`Valid Until: ${supplier.expiryDate.toLocaleDateString()}`, 0, 360, { align: 'center' });

        // Footer
        doc.fontSize(8)
           .fillColor('#94a3b8')
           .text('This certificate is issued by PeptIQ and validates ongoing quality testing compliance.', 0, 450, { align: 'center' });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

export interface SampleData {
  trackingId: string;
  peptideType: string;
  supplierName: string;
  supplierBatch?: string;
  testTier: string;
}

export interface TestResults {
  purity: number;
  endotoxin: number;
  residualTfa: number;
  massSpecMatch?: boolean;
}

export interface SupplierVerification {
  name: string;
  verificationTier: string;
  verificationDate: Date;
  expiryDate: Date;
  products: string[];
}
