import Anthropic from '@anthropic-ai/sdk';

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Extract structured data from lab PDF
   */
  async extractLabData(pdfBase64: string): Promise<LabExtractionResult> {
    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [{
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64
          }
        }, {
          type: 'text',
          text: `Extract the following data from this peptide lab report and return as JSON:
            - purity_percentage (number)
            - endotoxin_level (number, units: EU/mg)
            - residual_tfa (number, percentage)
            - mass_spec_confirmed (boolean)
            - batch_number (string)
            - test_date (YYYY-MM-DD)
            - any_failure_notes (string or null)
            
            If any value is missing, use null. Do not make up data.`
        }]
      }]
    });

    const text = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return JSON.parse(this.extractJson(text));
  }

  /**
   * Generate AI analysis for test results
   */
  async generateReportAnalysis(results: TestResults): Promise<ReportAnalysis> {
    const prompt = `
      You are a peptide quality analyst. Analyze these test results and provide:
      
      1. Overall quality grade (A/B/C/D/F)
      2. Safety assessment (2-3 sentences)
      3. Comparison to industry standards
      4. Specific concerns or red flags
      5. Clear recommendation for the consumer
      
      Results:
      - Peptide: ${results.peptideType}
      - Purity: ${results.purity}% (industry avg: ${this.getIndustryAvg(results.peptideType)}%)
      - Endotoxin: ${results.endotoxin} EU/mg (threshold: <0.5)
      - Residual TFA: ${results.residualTfa}% (threshold: <1.0)
      - Supplier: ${results.supplierName}
      
      Write for educated consumers, not scientists. Be direct, honest, and helpful.
      Return as JSON with keys: grade, safetyAssessment, comparison, concerns, recommendation
    `;

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return JSON.parse(this.extractJson(text));
  }

  /**
   * Generate personalized supplier outreach email
   */
  async generateSupplierEmail(supplier: SupplierData, testResults: TestResults[]): Promise<string> {
    const avgPurity = testResults.reduce((sum, r) => sum + r.purity, 0) / testResults.length;
    const rank = await this.getSupplierRank(supplier.name, testResults[0].peptideType);

    const prompt = `
      Write a personalized outreach email to a peptide supplier.
      
      Supplier: ${supplier.name}
      Contact: ${supplier.contactName || 'there'}
      Product tested: ${testResults[0].peptideType}
      Their avg purity: ${avgPurity.toFixed(1)}%
      Their rank: #${rank} out of ${testResults.length + 5} tested suppliers
      
      Industry average: ${this.getIndustryAvg(testResults[0].peptideType)}%
      
      Value proposition:
      - We've tested ${testResults.length} of their competitors
      - They rank in top ${Math.ceil((rank / (testResults.length + 5)) * 100)}%
      - Our verification program includes badge, directory placement, co-marketing
      
      Tone: Professional, data-driven, complimentary but not desperate
      Length: 150-200 words
      Subject line: Include their specific test result
      
      Include specific numbers and their competitive position.
    `;

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    return message.content[0].type === 'text'
      ? message.content[0].text
      : '';
  }

  /**
   * Analyze weekly trends and detect quality issues
   */
  async detectTrends(recentTests: TestResults[]): Promise<TrendAnalysis> {
    const prompt = `
      Analyze these ${recentTests.length} peptide test results from the past 7 days.
      
      Data: ${JSON.stringify(recentTests)}
      
      Identify:
      1. Suppliers with declining quality (purity drop >2% over 3+ batches)
      2. Emerging safety concerns (endotoxin spikes, TFA issues)
      3. Batch variance problems (same supplier, different results)
      4. Market trends (overall purity changes, new suppliers)
      5. Opportunities (suppliers performing well)
      
      Flag anything requiring immediate action.
      
      Return as JSON with keys: 
      - decliningSuppliers (array with names, drop amounts)
      - safetyConcerns (array with descriptions, severity)
      - batchVariance (array with details)
      - marketTrends (array with observations)
      - opportunities (array with recommendations)
      - urgentActions (array with priority items)
    `;

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return JSON.parse(this.extractJson(text));
  }

  private extractJson(text: string): string {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : '{}';
  }

  private getIndustryAvg(peptideType: string): number {
    const avgs: Record<string, number> = {
      'BPC157': 94.2,
      'TB500': 94.1,
      'SEMAGLUTIDE': 96.8,
      'TIRZEPATIDE': 95.3,
      'GHKCU': 91.2
    };
    return avgs[peptideType] || 93.0;
  }

  private async getSupplierRank(_supplierName: string, _peptideType: string): Promise<number> {
    // This would query the database for supplier rankings
    // Placeholder implementation
    return 3;
  }
}

// Type definitions
export interface LabExtractionResult {
  purity_percentage: number;
  endotoxin_level: number;
  residual_tfa: number;
  mass_spec_confirmed: boolean;
  batch_number: string;
  test_date: string;
  any_failure_notes: string | null;
}

export interface TestResults {
  peptideType: string;
  purity: number;
  endotoxin: number;
  residualTfa: number;
  supplierName: string;
  batchNumber?: string;
  testDate?: string;
}

export interface ReportAnalysis {
  grade: string;
  safetyAssessment: string;
  comparison: string;
  concerns: string;
  recommendation: string;
}

export interface SupplierData {
  name: string;
  contactName?: string;
  contactEmail?: string;
}

export interface TrendAnalysis {
  decliningSuppliers: Array<{ name: string; dropAmount: number }>;
  safetyConcerns: Array<{ description: string; severity: string }>;
  batchVariance: Array<{ supplier: string; details: string }>;
  marketTrends: string[];
  opportunities: string[];
  urgentActions: string[];
}
