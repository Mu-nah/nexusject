from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from sqlalchemy import text

from backend.core.settings import settings
from backend.core.database import init_db

# Routers
from backend.routers import auth, accounting, expenses, payroll, grants, donations, dashboard, ai, admin, reports, planning, ops

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## Realtouch Financial ERP
    
    A comprehensive financial operating system built for Harvest Touch Youth & Skills Community Hub CIC.
    
    ### Modules
    - **Authentication** — JWT, role-based access (CFO, Finance Manager, Programme Manager, Admin)
    - **Accounting** — Double-entry bookkeeping, chart of accounts, journal entries, bank reconciliation
    - **Expenses** — Receipt upload, OCR extraction, approval workflow, grant coding
    - **Payroll** — Full UK PAYE/NI/pension engine, payslip PDF generation, RTI-ready
    - **Grants** — Multi-grant management, spending tracker, AI-generated reports
    - **Donations** — Donor management, Stripe/PayPal, Gift Aid tracking
    - **Dashboard** — CFO-level metrics, cashflow charts, compliance calendar
    - **AI Intelligence** — Claude-powered financial analysis, forecasting, trustee reports
    
    Built for multi-tenancy — ready to serve multiple organisations.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.BACKEND_CORS_ORIGINS.split(",")
        if origin.strip()
    ],
    allow_origin_regex=settings.CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(f"{request.method} {request.url.path} — {response.status_code} ({duration:.3f}s)")
    return response


# ── Global Exception Handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )


# ── Startup / Shutdown ────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    try:
        init_db()
        logger.info("Database initialised successfully")
    except Exception as e:
        logger.error(f"Database init failed: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(accounting.router)
app.include_router(expenses.router)
app.include_router(payroll.router)
app.include_router(grants.router)
app.include_router(donations.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(reports.router)
app.include_router(planning.router)
app.include_router(ops.router)


# ── Health & Info ─────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs",
        "environment": settings.ENVIRONMENT,
    }


@app.head("/", tags=["Health"])
async def root_head():
    return


@app.get("/health", tags=["Health"])
async def health_check():
    from backend.core.database import SessionLocal
    db_status = "ok"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "database": db_status,
        "version": settings.APP_VERSION,
        "timestamp": time.time(),
    }
