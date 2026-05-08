from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class Donor(Base):
    __tablename__ = "donors"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    is_anonymous = Column(Boolean, default=False)
    gift_aid_eligible = Column(Boolean, default=False)
    gift_aid_declaration_date = Column(DateTime, nullable=True)
    total_donated = Column(Numeric(15, 2), default=0)
    first_donation = Column(DateTime, nullable=True)
    last_donation = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(50), nullable=True)  # stripe, paypal, cheque, cash, bank_transfer
    stripe_customer_id = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organisation = relationship("Organisation", back_populates="donors")
    donations = relationship("Donation", back_populates="donor")


class DonationCampaign(Base):
    __tablename__ = "donation_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_amount = Column(Numeric(15, 2), nullable=True)
    raised_amount = Column(Numeric(15, 2), default=0)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    donations = relationship("Donation", back_populates="campaign")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("donation_campaigns.id"), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    gift_aid_amount = Column(Numeric(15, 2), default=0)
    donation_date = Column(DateTime, nullable=False)
    payment_method = Column(String(50), nullable=True)  # stripe, paypal, cheque, cash, bank_transfer
    payment_reference = Column(String(100), nullable=True)
    stripe_payment_intent = Column(String(100), nullable=True)
    paypal_transaction_id = Column(String(100), nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurring_frequency = Column(String(20), nullable=True)  # monthly, quarterly, annual
    recurring_id = Column(Integer, ForeignKey("recurring_donations.id"), nullable=True)
    status = Column(String(20), default="pending")  # pending, completed, refunded, failed
    notes = Column(Text, nullable=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    donor = relationship("Donor", back_populates="donations")
    campaign = relationship("DonationCampaign", back_populates="donations")


class RecurringDonation(Base):
    __tablename__ = "recurring_donations"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    frequency = Column(String(20), nullable=False)  # monthly, quarterly, annual
    next_charge_date = Column(DateTime, nullable=True)
    payment_method = Column(String(50), nullable=True)
    stripe_subscription_id = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    donor = relationship("Donor")
    donations = relationship("Donation", foreign_keys="Donation.recurring_id")
