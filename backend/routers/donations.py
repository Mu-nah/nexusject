from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr

from backend.core.database import get_db
from backend.core.security import get_current_user, require_finance
from backend.models.donor import Donor, Donation, DonationCampaign, RecurringDonation
from backend.models.user import User

router = APIRouter(prefix="/donations", tags=["Donations"])

GIFT_AID_RATE = Decimal("0.25")  # 25% top-up


class DonorCreate(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_anonymous: bool = False
    gift_aid_eligible: bool = False
    source: Optional[str] = None


class DonationCreate(BaseModel):
    donor_id: Optional[int] = None
    campaign_id: Optional[int] = None
    amount: float
    donation_date: datetime
    payment_method: str = "stripe"
    payment_reference: Optional[str] = None
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None
    notes: Optional[str] = None


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    programme_id: Optional[int] = None


class StripePaymentIntent(BaseModel):
    amount: int  # pence
    campaign_id: Optional[int] = None
    donor_email: Optional[str] = None
    donor_name: Optional[str] = None
    gift_aid: bool = False


# ── Donors ────────────────────────────────────────────────────────────────────

@router.post("/donors", status_code=201)
async def create_donor(
    data: DonorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    donor = Donor(
        organisation_id=current_user.organisation_id,
        **data.model_dump()
    )
    db.add(donor)
    db.commit()
    db.refresh(donor)
    return {"id": donor.id, "full_name": donor.full_name}


@router.get("/donors")
async def list_donors(
    skip: int = 0,
    limit: int = 50,
    gift_aid_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Donor).filter(Donor.organisation_id == current_user.organisation_id)
    if gift_aid_only:
        q = q.filter(Donor.gift_aid_eligible == True)
    total = q.count()
    donors = q.order_by(desc(Donor.total_donated)).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": d.id,
                "full_name": d.full_name if not d.is_anonymous else "Anonymous",
                "email": d.email,
                "gift_aid_eligible": d.gift_aid_eligible,
                "total_donated": float(d.total_donated or 0),
                "last_donation": d.last_donation.isoformat() if d.last_donation else None,
                "source": d.source,
            }
            for d in donors
        ],
    }


# ── Donations ─────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def record_donation(
    data: DonationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    amount = Decimal(str(data.amount))

    gift_aid = Decimal("0")
    if data.donor_id:
        donor = db.query(Donor).filter(Donor.id == data.donor_id).first()
        if donor and donor.gift_aid_eligible:
            gift_aid = (amount * GIFT_AID_RATE).quantize(Decimal("0.01"))
        if donor:
            donor.total_donated = (donor.total_donated or Decimal("0")) + amount
            donor.last_donation = data.donation_date
            if not donor.first_donation:
                donor.first_donation = data.donation_date

    donation = Donation(
        organisation_id=current_user.organisation_id,
        donor_id=data.donor_id,
        campaign_id=data.campaign_id,
        amount=amount,
        gift_aid_amount=gift_aid,
        donation_date=data.donation_date,
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        is_recurring=data.is_recurring,
        recurring_frequency=data.recurring_frequency if data.is_recurring else None,
        notes=data.notes,
        status="completed",
    )
    db.add(donation)

    if data.campaign_id:
        campaign = db.query(DonationCampaign).filter(DonationCampaign.id == data.campaign_id).first()
        if campaign:
            campaign.raised_amount = (campaign.raised_amount or Decimal("0")) + amount

    db.commit()
    db.refresh(donation)
    return {
        "id": donation.id,
        "amount": float(donation.amount),
        "gift_aid_amount": float(donation.gift_aid_amount),
        "total_with_gift_aid": float(donation.amount + donation.gift_aid_amount),
        "status": donation.status,
    }


@router.get("")
async def list_donations(
    skip: int = 0,
    limit: int = 50,
    campaign_id: Optional[int] = None,
    payment_method: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Donation).filter(Donation.organisation_id == current_user.organisation_id)
    if campaign_id:
        q = q.filter(Donation.campaign_id == campaign_id)
    if payment_method:
        q = q.filter(Donation.payment_method == payment_method)

    total = q.count()
    total_amount = db.query(func.sum(Donation.amount)).filter(
        Donation.organisation_id == current_user.organisation_id,
        Donation.status == "completed"
    ).scalar() or 0
    total_gift_aid = db.query(func.sum(Donation.gift_aid_amount)).filter(
        Donation.organisation_id == current_user.organisation_id,
        Donation.status == "completed"
    ).scalar() or 0

    donations = q.order_by(desc(Donation.donation_date)).offset(skip).limit(limit).all()
    return {
        "total_count": total,
        "total_amount": float(total_amount),
        "total_gift_aid_claimable": float(total_gift_aid),
        "items": [
            {
                "id": d.id,
                "donor": d.donor.full_name if d.donor and not d.donor.is_anonymous else "Anonymous",
                "amount": float(d.amount),
                "gift_aid": float(d.gift_aid_amount),
                "donation_date": d.donation_date.isoformat(),
                "payment_method": d.payment_method,
                "campaign": d.campaign.name if d.campaign else None,
                "is_recurring": d.is_recurring,
                "status": d.status,
            }
            for d in donations
        ],
    }


# ── Campaigns ─────────────────────────────────────────────────────────────────

@router.post("/campaigns", status_code=201)
async def create_campaign(
    data: CampaignCreate,
    current_user: User = Depends(require_finance),
    db: Session = Depends(get_db),
):
    campaign = DonationCampaign(
        organisation_id=current_user.organisation_id,
        **data.model_dump()
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return {"id": campaign.id, "name": campaign.name}


@router.get("/campaigns")
async def list_campaigns(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(DonationCampaign).filter(
        DonationCampaign.organisation_id == current_user.organisation_id
    )
    if active_only:
        q = q.filter(DonationCampaign.is_active == True)
    campaigns = q.order_by(desc(DonationCampaign.raised_amount)).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "target_amount": float(c.target_amount) if c.target_amount else None,
            "raised_amount": float(c.raised_amount or 0),
            "pct_complete": round(float(c.raised_amount or 0) / float(c.target_amount) * 100, 1) if c.target_amount else None,
            "is_active": c.is_active,
            "end_date": c.end_date.isoformat() if c.end_date else None,
        }
        for c in campaigns
    ]


# ── Stripe Integration ────────────────────────────────────────────────────────

@router.post("/stripe/create-payment-intent")
async def create_stripe_payment_intent(
    data: StripePaymentIntent,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        import stripe
        from backend.core.settings import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY

        metadata = {
            "organisation_id": str(current_user.organisation_id),
            "campaign_id": str(data.campaign_id) if data.campaign_id else "",
            "gift_aid": str(data.gift_aid),
        }

        intent = stripe.PaymentIntent.create(
            amount=data.amount,
            currency="gbp",
            metadata=metadata,
            receipt_email=data.donor_email,
        )
        return {"client_secret": intent.client_secret, "payment_intent_id": intent.id}
    except ImportError:
        raise HTTPException(status_code=501, detail="Stripe not configured")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events to record completed donations."""
    try:
        import stripe
        from backend.core.settings import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY

        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

        if event["type"] == "payment_intent.succeeded":
            intent = event["data"]["object"]
            org_id = int(intent["metadata"].get("organisation_id", 0))
            campaign_id = intent["metadata"].get("campaign_id")
            amount = Decimal(str(intent["amount"])) / 100

            donation = Donation(
                organisation_id=org_id,
                amount=amount,
                donation_date=datetime.utcnow(),
                payment_method="stripe",
                payment_reference=intent["id"],
                stripe_payment_intent=intent["id"],
                campaign_id=int(campaign_id) if campaign_id else None,
                status="completed",
            )
            db.add(donation)
            db.commit()

        return {"received": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/gift-aid/summary")
async def gift_aid_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    claimable = db.query(func.sum(Donation.gift_aid_amount)).filter(
        Donation.organisation_id == org_id,
        Donation.status == "completed",
        Donation.gift_aid_amount > 0,
    ).scalar() or 0

    eligible_donors = db.query(func.count(Donor.id)).filter(
        Donor.organisation_id == org_id,
        Donor.gift_aid_eligible == True,
    ).scalar() or 0

    return {
        "total_claimable": float(claimable),
        "eligible_donors": eligible_donors,
        "rate": float(GIFT_AID_RATE),
    }
