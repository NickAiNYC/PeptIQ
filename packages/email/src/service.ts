export interface EmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

export type EmailTemplate =
  | 'sample-submitted'
  | 'sample-received'
  | 'results-ready'
  | 'quality-alert'
  | 'supplier-outreach'
  | 'welcome'
  | 'subscription-confirmed';

/**
 * Email sending service using Resend
 */
export class EmailService {
  private apiKey: string;
  private fromAddress: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@peptiq.io';
  }

  /**
   * Send an email using the Resend API
   */
  async sendEmail(options: EmailOptions): Promise<{ id: string }> {
    const html = this.renderTemplate(options.template, options.data);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Render email template with data
   */
  private renderTemplate(template: EmailTemplate, data: Record<string, any>): string {
    const templates: Record<EmailTemplate, (data: Record<string, any>) => string> = {
      'sample-submitted': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e40af;">Sample Submitted Successfully</h1>
          <p>Your peptide sample has been submitted for testing.</p>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Tracking ID:</strong> ${d.trackingId}</p>
            <p><strong>Peptide:</strong> ${d.peptideType}</p>
            <p><strong>Test Tier:</strong> ${d.testTier}</p>
          </div>
          <p>Next steps: Ship your sample to our facility using the provided label.</p>
          <p>— The PeptIQ Team</p>
        </div>
      `,
      'sample-received': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e40af;">Sample Received</h1>
          <p>We've received your sample <strong>${d.trackingId}</strong> and it's being sent to the lab.</p>
          <p>Estimated turnaround: 5-7 business days.</p>
          <p>— The PeptIQ Team</p>
        </div>
      `,
      'results-ready': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e40af;">Your Results Are Ready</h1>
          <p>Testing for sample <strong>${d.trackingId}</strong> is complete.</p>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Grade:</strong> ${d.grade}</p>
            <p><strong>Purity:</strong> ${d.purity}%</p>
          </div>
          <a href="${d.reportUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Full Report</a>
          <p>— The PeptIQ Team</p>
        </div>
      `,
      'quality-alert': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">⚠️ Quality Alert</h1>
          <p><strong>${d.title}</strong></p>
          <p>${d.description}</p>
          <p>Severity: <strong>${d.severity}</strong></p>
          <p>— The PeptIQ Team</p>
        </div>
      `,
      'supplier-outreach': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          ${d.body}
        </div>
      `,
      'welcome': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e40af;">Welcome to PeptIQ</h1>
          <p>Hi ${d.name || 'there'},</p>
          <p>Thanks for joining PeptIQ. We're committed to transparency in peptide quality.</p>
          <a href="${d.dashboardUrl || 'https://peptiq.io/dashboard'}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Go to Dashboard</a>
          <p>— The PeptIQ Team</p>
        </div>
      `,
      'subscription-confirmed': (d) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e40af;">Subscription Confirmed</h1>
          <p>You're now subscribed to <strong>${d.tier}</strong>.</p>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Plan:</strong> ${d.tier}</p>
            <p><strong>Next billing date:</strong> ${d.nextBillingDate}</p>
          </div>
          <p>— The PeptIQ Team</p>
        </div>
      `
    };

    const templateFn = templates[template];
    return templateFn ? templateFn(data) : '<p>Template not found</p>';
  }
}
