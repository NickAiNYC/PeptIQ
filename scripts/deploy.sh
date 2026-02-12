#!/bin/bash
set -e

# PEPTIQ - Deployment Script
echo "🚀 Deploying PeptIQ..."

ENVIRONMENT=${1:-production}

echo "Environment: ${ENVIRONMENT}"

# 1. Run tests
echo ""
echo "🧪 Running tests..."
npm test

# 2. Build applications
echo ""
echo "🔨 Building applications..."
npm run build

# 3. Run database migrations
echo ""
echo "🗄️  Running database migrations..."
npm run db:migrate

# 4. Build Docker images
echo ""
echo "🐳 Building Docker images..."
docker build -t peptiq-api:latest -f apps/api/Dockerfile .
docker build -t peptiq-web:latest -f apps/web/Dockerfile .
docker build -t peptiq-admin:latest -f apps/admin/Dockerfile .

# 5. Push to container registry
echo ""
echo "📦 Pushing images..."
REGISTRY=${DOCKER_REGISTRY:-"peptiq"}

docker tag peptiq-api:latest "${REGISTRY}/peptiq-api:latest"
docker tag peptiq-web:latest "${REGISTRY}/peptiq-web:latest"
docker tag peptiq-admin:latest "${REGISTRY}/peptiq-admin:latest"

docker push "${REGISTRY}/peptiq-api:latest"
docker push "${REGISTRY}/peptiq-web:latest"
docker push "${REGISTRY}/peptiq-admin:latest"

# 6. Deploy to ECS
echo ""
echo "☁️  Updating ECS services..."
aws ecs update-service \
  --cluster "peptiq-cluster-${ENVIRONMENT}" \
  --service peptiq-api \
  --force-new-deployment

aws ecs update-service \
  --cluster "peptiq-cluster-${ENVIRONMENT}" \
  --service peptiq-web \
  --force-new-deployment

aws ecs update-service \
  --cluster "peptiq-cluster-${ENVIRONMENT}" \
  --service peptiq-admin \
  --force-new-deployment

echo ""
echo "✅ Deployment complete!"
echo "   Monitor at: https://console.aws.amazon.com/ecs"
