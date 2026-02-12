#!/bin/bash
set -e

# PEPTIQ - Complete System Setup
echo "🚀 Setting up PeptIQ - Peptide Quality Platform..."

# 1. Check prerequisites
echo "🔍 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org/"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required."; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js >= 18 is required. Current: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ Python $(python3 --version)"

# 2. Install Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
npm install

# 3. Install Python dependencies
echo ""
echo "🐍 Installing Python dependencies..."
pip install -r requirements.txt

# 4. Set up environment variables
echo ""
echo "🔧 Configuring environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Created .env from .env.example"
    echo "   Please edit .env with your API keys before running the app."
else
    echo "✅ .env file already exists"
fi

# 5. Initialize database
echo ""
echo "🗄️  Setting up database..."
cd packages/database
npx prisma generate
echo "✅ Prisma client generated"

# Check if DATABASE_URL is configured
if grep -q "password@localhost" ../../.env 2>/dev/null; then
    echo "⚠️  DATABASE_URL appears to use default credentials."
    echo "   Update .env before running migrations."
else
    echo "Running database migrations..."
    npx prisma migrate dev --name init 2>/dev/null || echo "⚠️  Migration skipped (database may not be running)"
fi
cd ../..

# 6. Create required directories
echo ""
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p reports
mkdir -p temp

# 7. Summary
echo ""
echo "============================================"
echo "✅ PeptIQ setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your API keys"
echo "  2. Start PostgreSQL (docker-compose up db -d)"
echo "  3. Run migrations: npm run db:migrate"
echo "  4. Seed data: npm run db:seed"
echo "  5. Start development:"
echo "     npm run dev:api   # FastAPI on :8000"
echo "     npm run dev:web   # Next.js on :3000"
echo "     npm run dev:admin # Admin on :3001"
echo ""
