# PeptIQ - Peptide Quality Intelligence & Testing

A production-ready platform for peptide quality verification, third-party testing, and supplier certification.

## Overview

PeptIQ enables consumers to submit peptide samples for independent laboratory testing, generates AI-powered analytical reports, and maintains a public database of supplier quality metrics.

## Architecture

```
peptiq/
├── apps/
│   ├── web/              # Next.js customer portal
│   ├── api/              # FastAPI backend
│   ├── admin/            # Next.js admin dashboard
│   └── docs/             # Documentation site
│
├── packages/
│   ├── database/         # Prisma schema & migrations
│   ├── ai/              # Claude/OpenAI integration
│   ├── pdf/             # PDF generation engine
│   ├── email/           # Email templates & sending
│   └── shared/          # Shared TypeScript types
│
├── workflows/
│   ├── sample-intake/   # Sample submission automation
│   ├── lab-processing/  # Lab communication automation
│   ├── report-generation/ # AI report pipeline
│   ├── supplier-outreach/ # Automated email sequences
│   └── trend-detection/ # Python analytics scripts
│
├── infrastructure/
│   ├── terraform/       # AWS/GCP infrastructure
│   ├── monitoring/      # Observability setup
│   └── backups/         # Database backup configs
│
└── scripts/
    ├── setup.sh         # Initial setup script
    ├── deploy.sh        # Deployment script
    └── seed.ts          # Database seed data
```

## Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.11
- PostgreSQL 16
- Docker & Docker Compose (optional)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/NickAiNYC/PeptIQ.git
   cd PeptIQ
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Or run manually**
   ```bash
   # Install dependencies
   npm install
   pip install -r requirements.txt

   # Generate Prisma client and run migrations
   npm run db:generate
   npm run db:migrate

   # Seed the database
   npm run db:seed

   # Start services
   npm run dev:api   # FastAPI on :8000
   npm run dev:web   # Next.js on :3000
   npm run dev:admin # Admin on :3001
   ```

## Database

The database schema is managed with Prisma ORM. Key models include:

- **User** - Consumer, clinic, and supplier accounts
- **Sample** - Peptide test samples with tracking IDs
- **Supplier** - Supplier profiles and quality metrics
- **QualityAlert** - AI-generated quality alerts
- **Subscription** - Stripe subscription management
- **ApiKey** - B2B API access keys

### Test Tiers

| Tier | Tests Included | Price |
|------|---------------|-------|
| Tier 1 | Identity + Purity + TFA | Base |
| Tier 2 | + Endotoxin + Sterility | Mid |
| Tier 3 | Full validation + Impurity profile | Premium |

## Subscription Plans

| Plan | Price | Features |
|------|-------|----------|
| Passport | $39/mo | 1 free test/month |
| Clinic Basic | $500/mo | Read-only API access |
| Clinic Pro | $2,500/mo | Full submission API |

## Supplier Verification

| Tier | Annual Fee | Includes |
|------|-----------|----------|
| Basic | $3,500/yr | Quarterly testing |
| Premium | $8,500/yr | Monthly testing + featured listing |

## License

Proprietary - All rights reserved.
