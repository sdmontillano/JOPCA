#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'banking_dcpr.settings')
django.setup()

from core.utils.summary import compute_bank_daily_summary
from datetime import date

# Test:: API response for today
today = date.today()
result = compute_bank_daily_summary(today)

print("API Response Structure:")
for row in result:
    print(f"Bank: {row['particulars']}")
    print(f"  fund_transfers_in: {row.get('fund_transfers_in', 'MISSING')}")
    print(f"  fund_transfers_out: {row.get('fund_transfers_out', 'MISSING')}")
    print(f"  fund_transfers: {row.get('fund_transfers', 'MISSING')}")
    print()
