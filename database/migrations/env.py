from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.core.database import Base
from backend.core.settings import settings

# Import all models so Alembic can detect them
from backend.models.user import User, Organisation
from backend.models.account import Account, JournalEntry, JournalLine, BankAccount, BankTransaction
from backend.models.transaction import Transaction
from backend.models.expense import Expense, Receipt, ExpenseCategory, ExpenseApproval
from backend.models.employee import Employee, PayrollRun, PayrollRecord, PensionScheme
from backend.models.grant import Grant, GrantAllocation, GrantSpending, GrantReport, Programme, ProgrammeExpense
from backend.models.donor import Donor, Donation, DonationCampaign, RecurringDonation

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, target_metadata=target_metadata, literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
