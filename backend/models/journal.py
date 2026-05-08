# Journal models are defined in account.py (JournalEntry, JournalLine)
# This file exists for import resolution
from backend.models.account import JournalEntry, JournalLine

__all__ = ["JournalEntry", "JournalLine"]
