#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'banking_dcpr.settings')
django.setup()

from core.models import Transaction
from django.db.models import Count

# Check what transaction types exist
types = Transaction.objects.values('type').annotate(count=Count('id')).order_by('type')
print("Transaction types in database:")
for t in types:
    print(f'  {t["type"]}: {t["count"]} transactions')

# Check specifically for fund transfer types
print("\nFund transfer transactions:")
fund_transfers_in = Transaction.objects.filter(type='fund_transfer_in')
fund_transfers_out = Transaction.objects.filter(type='fund_transfer_out')
print(f"  fund_transfer_in: {fund_transfers_in.count()} transactions")
print(f"  fund_transfer_out: {fund_transfers_out.count()} transactions")

# Show recent transactions
print("\nRecent transactions (last 10):")
recent = Transaction.objects.all().order_by('-date', '-id')[:10]
for t in recent:
    print(f"  {t.date} - {t.type} - ₱{t.amount} - {t.bank_account.name if t.bank_account else 'No Bank'}")
