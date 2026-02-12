# PeptIQ Email

Email templates and sending via Resend.

## Features

- Sample status notifications
- Report delivery
- Supplier outreach sequences
- Welcome and onboarding emails
- Quality alert notifications

## Usage

```typescript
import { sendEmail } from '@peptiq/email';

await sendEmail({
  to: 'user@example.com',
  template: 'sample-received',
  data: { trackingId: 'PTQ-2026-0001' }
});
```
