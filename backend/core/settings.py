from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Realtouch Financial ERP"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/realtouch_erp"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Storage (Supabase / S3)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_BUCKET: str = "receipts"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_BUCKET_NAME: Optional[str] = None
    AWS_REGION: str = "eu-west-2"

    # AI
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    AI_MODEL: str = "claude-sonnet-4-6"

    # Payments
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    PAYPAL_CLIENT_ID: Optional[str] = None
    PAYPAL_CLIENT_SECRET: Optional[str] = None
    PAYPAL_MODE: str = "sandbox"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # Organisation defaults
    DEFAULT_ORG_NAME: str = "Harvest Touch Youth & Skills Community Hub CIC"
    DEFAULT_CURRENCY: str = "GBP"
    DEFAULT_TAX_YEAR_START: str = "04-06"  # 6 April
    HMRC_PAYE_REFERENCE: Optional[str] = None

    # Multi-tenancy
    MULTI_TENANT: bool = True
    DEFAULT_TENANT_SLUG: str = "harvest-touch"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
