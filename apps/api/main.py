"""
PeptIQ FastAPI Backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

app = FastAPI(
    title="PeptIQ API",
    description="Peptide Quality Intelligence & Testing API",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Enums
class PeptideType(str, Enum):
    BPC157 = "BPC157"
    TB500 = "TB500"
    SEMAGLUTIDE = "SEMAGLUTIDE"
    TIRZEPATIDE = "TIRZEPATIDE"
    GHKCU = "GHKCU"
    NAD = "NAD"
    MOTSC = "MOTSC"
    EPITALON = "EPITALON"
    SEMAX = "SEMAX"
    SELANK = "SELANK"
    CJC1295 = "CJC1295"
    IPAMORELIN = "IPAMORELIN"
    OTHER = "OTHER"


class TestTier(str, Enum):
    TIER1 = "TIER1"
    TIER2 = "TIER2"
    TIER3 = "TIER3"


class SampleStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    AWAITING_SAMPLE = "AWAITING_SAMPLE"
    SAMPLE_RECEIVED = "SAMPLE_RECEIVED"
    AT_LAB = "AT_LAB"
    IN_TESTING = "IN_TESTING"
    RESULTS_RECEIVED = "RESULTS_RECEIVED"
    REPORT_GENERATED = "REPORT_GENERATED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# Request/Response Models
class SampleSubmission(BaseModel):
    peptide_type: PeptideType = Field(..., alias="peptideType")
    supplier_name: str = Field(..., alias="supplierName")
    batch_number: Optional[str] = Field(None, alias="batchNumber")
    purchase_date: Optional[date] = Field(None, alias="purchaseDate")
    test_tier: TestTier = Field(..., alias="testTier")

    class Config:
        populate_by_name = True


class SampleResponse(BaseModel):
    id: str
    tracking_id: str = Field(..., alias="trackingId")
    peptide_type: PeptideType = Field(..., alias="peptideType")
    supplier_name: str = Field(..., alias="supplierName")
    status: SampleStatus
    purity: Optional[float] = None
    endotoxin: Optional[float] = None
    residual_tfa: Optional[float] = Field(None, alias="residualTfa")
    ai_grade: Optional[str] = Field(None, alias="aiGrade")
    ai_summary: Optional[str] = Field(None, alias="aiSummary")
    ai_recommendation: Optional[str] = Field(None, alias="aiRecommendation")
    created_at: datetime = Field(..., alias="createdAt")

    class Config:
        populate_by_name = True


class SupplierResponse(BaseModel):
    id: str
    name: str
    verified: bool
    avg_purity: Optional[float] = Field(None, alias="avgPurity")
    sample_count: int = Field(..., alias="sampleCount")
    pass_rate: Optional[float] = Field(None, alias="passRate")

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


# Routes
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        timestamp=datetime.now()
    )


@app.post("/api/v1/samples", response_model=dict)
async def submit_sample(sample: SampleSubmission):
    """Submit a new peptide sample for testing"""
    # In production, this would use the SampleWorkflow
    return {
        "trackingId": f"PTQ-{datetime.now().year}-0001",
        "status": "SUBMITTED",
        "message": "Sample submitted successfully"
    }


@app.get("/api/v1/samples/{tracking_id}")
async def get_sample(tracking_id: str):
    """Get sample status and results by tracking ID"""
    # In production, this would query the database
    raise HTTPException(status_code=404, detail="Sample not found")


@app.get("/api/v1/suppliers", response_model=List[dict])
async def list_suppliers(
    verified_only: bool = False,
    page: int = 1,
    page_size: int = 20
):
    """List suppliers with quality metrics"""
    # In production, this would query the database
    return []


@app.get("/api/v1/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str):
    """Get detailed supplier information"""
    raise HTTPException(status_code=404, detail="Supplier not found")


@app.get("/api/v1/reports/{tracking_id}")
async def get_report(tracking_id: str):
    """Get test report by tracking ID"""
    raise HTTPException(status_code=404, detail="Report not found")


@app.post("/api/v1/webhooks/stripe")
async def stripe_webhook():
    """Handle Stripe webhook events"""
    return {"received": True}


@app.post("/api/v1/webhooks/lab")
async def lab_webhook():
    """Handle lab result webhook events"""
    return {"received": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
