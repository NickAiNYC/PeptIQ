# PeptIQ API

FastAPI backend providing REST API endpoints for the PeptIQ platform.

## Setup

```bash
pip install -r ../../requirements.txt
uvicorn main:app --reload
```

## Endpoints

- `POST /api/v1/samples` - Submit a new sample
- `GET /api/v1/samples/{id}` - Get sample status
- `GET /api/v1/suppliers` - List suppliers
- `GET /api/v1/reports/{id}` - Get test report
- `POST /api/v1/webhooks/stripe` - Stripe webhook handler
- `POST /api/v1/webhooks/lab` - Lab result webhook handler
