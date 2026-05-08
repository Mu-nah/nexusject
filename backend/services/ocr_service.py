"""
Receipt OCR Service
Uses pytesseract for local OCR + Claude AI for intelligent data extraction
"""
import re
import io
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)

AMOUNT_PATTERNS = [
    r'(?:total|amount|due|pay|grand total|sum)[:\s]*£?\s*(\d+[.,]\d{2})',
    r'£\s*(\d+[.,]\d{2})',
    r'\b(\d+\.\d{2})\b',
]

DATE_PATTERNS = [
    r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
    r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})',
]

MERCHANT_PATTERNS = [
    r'^([A-Z][A-Z\s&\'\-\.]+(?:LTD|LIMITED|PLC|CIC|CO|CORP|INC)?)',
]

CATEGORY_KEYWORDS = {
    'travel': ['train', 'bus', 'taxi', 'uber', 'fuel', 'petrol', 'parking', 'oyster', 'tfl', 'national rail'],
    'catering': ['cafe', 'restaurant', 'food', 'lunch', 'dinner', 'breakfast', 'coffee', 'tesco', 'sainsbury', 'asda', 'morrisons'],
    'stationery': ['print', 'staples', 'ryman', 'paper', 'ink', 'toner', 'stationery'],
    'venue': ['hire', 'venue', 'hall', 'room', 'meeting', 'conference'],
    'equipment': ['laptop', 'computer', 'phone', 'tablet', 'monitor', 'keyboard'],
    'utilities': ['electric', 'gas', 'water', 'broadband', 'internet', 'phone bill'],
}


def extract_amount(text: str) -> Optional[Decimal]:
    text_lower = text.lower()
    for pattern in AMOUNT_PATTERNS:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(',', '.')
            try:
                return Decimal(amount_str)
            except:
                continue
    return None


def extract_date(text: str) -> Optional[datetime]:
    for pattern in DATE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            for m in matches:
                for fmt in ['%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y', '%d-%m-%y',
                            '%d.%m.%Y', '%d %B %Y', '%d %b %Y']:
                    try:
                        return datetime.strptime(m.strip(), fmt)
                    except:
                        continue
    return None


def guess_category(text: str) -> str:
    text_lower = text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return category
    return 'other'


def extract_merchant(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if lines:
        first_line = lines[0].strip()
        if len(first_line) > 2 and len(first_line) < 100:
            return first_line
    return None


def extract_vat(text: str) -> Optional[Decimal]:
    vat_patterns = [
        r'vat[:\s]*£?\s*(\d+[.,]\d{2})',
        r'tax[:\s]*£?\s*(\d+[.,]\d{2})',
    ]
    text_lower = text.lower()
    for pattern in vat_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                return Decimal(match.group(1).replace(',', '.'))
            except:
                continue
    return None


async def extract_receipt_data_with_ocr(image_path: str) -> dict:
    """
    Primary OCR extraction using pytesseract.
    Falls back gracefully if tesseract is not installed.
    """
    raw_text = ""
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(image_path)
        raw_text = pytesseract.image_to_string(img)
        logger.info(f"OCR extraction successful for {image_path}")
    except ImportError:
        logger.warning("pytesseract not available. Using placeholder extraction.")
        raw_text = f"[OCR placeholder for {Path(image_path).name}]"
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raw_text = ""

    return {
        "raw_text": raw_text,
        "merchant": extract_merchant(raw_text),
        "amount": extract_amount(raw_text),
        "date": extract_date(raw_text),
        "vat": extract_vat(raw_text),
        "category": guess_category(raw_text),
        "confidence": 0.75 if raw_text else 0.0,
    }


async def extract_receipt_data_with_ai(image_path: str, raw_ocr: str) -> dict:
    """
    Enhanced extraction using Claude AI to interpret OCR text.
    """
    try:
        import anthropic
        from backend.core.settings import settings

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        prompt = f"""You are a receipt data extraction specialist for a UK charity.

Extract the following from this receipt OCR text and return ONLY valid JSON:
- merchant: business name
- amount: total amount as number (GBP)
- date: date as YYYY-MM-DD string
- vat: VAT amount as number (if present)
- category: one of [travel, catering, stationery, venue, equipment, utilities, other]
- confidence: 0.0 to 1.0

OCR Text:
{raw_ocr}

Return only JSON, no other text."""

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        result = json.loads(response.content[0].text)
        result["confidence"] = min(1.0, float(result.get("confidence", 0.85)))
        return result

    except Exception as e:
        logger.error(f"AI extraction error: {e}")
        return {}
