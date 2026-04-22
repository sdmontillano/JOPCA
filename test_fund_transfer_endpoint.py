#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'banking_dcpr.settings')
django.setup()

from core.models import BankAccount, Transaction
from core.serializers import FundTransferInputSerializer
from decimal import Decimal

print("=== Testing Fund Transfer Functionality ===")

# Check if bank accounts exist
banks = BankAccount.objects.all()
print(f"Found {banks.count()} bank accounts:")
for bank in banks[:3]:  # Show first 3
    print(f"  - {bank.name} (ID: {bank.id})")

if banks.count() < 2:
    print("ERROR: Need at least 2 bank accounts to test fund transfer")
    exit()

# Test serializer
from_bank = banks.first()
to_bank = banks.last()

test_data = {
    'from_bank': from_bank.id,
    'to_bank': to_bank.id,
    'date': '2024-04-20',
    'amount': '1000.00',
    'description': 'Test fund transfer'
}

print(f"\nTesting serializer with data:")
print(f"  From: {from_bank.name} (ID: {from_bank.id})")
print(f"  To: {to_bank.name} (ID: {to_bank.id})")

try:
    serializer = FundTransferInputSerializer(data=test_data)
    if serializer.is_valid():
        print("  Serializer validation: PASSED")
        validated_data = serializer.validated_data
        print(f"  Validated amount: {validated_data['amount']}")
        print(f"  Validated date: {validated_data['date']}")
    else:
        print("  Serializer validation: FAILED")
        print(f"  Errors: {serializer.errors}")
except Exception as e:
    print(f"  Serializer error: {e}")
    import traceback
    traceback.print_exc()

# Test transaction creation
print("\nTesting transaction creation...")
try:
    with django.db.transaction.atomic():
        # Create outgoing transaction
        out_tx = Transaction.objects.create(
            bank_account=from_bank,
            date='2024-04-20',
            type='fund_transfer_out',
            amount=Decimal('1000.00'),
            description=f"Test fund transfer to {to_bank.name}",
        )
        print(f"  Outgoing transaction created: ID {out_tx.id}")
        
        # Create incoming transaction  
        in_tx = Transaction.objects.create(
            bank_account=to_bank,
            date='2024-04-20',
            type='fund_transfer_in',
            amount=Decimal('1000.00'),
            description=f"Test fund transfer from {from_bank.name}",
        )
        print(f"  Incoming transaction created: ID {in_tx.id}")
        
        # Clean up test transactions
        out_tx.delete()
        in_tx.delete()
        print("  Test transactions cleaned up")
        
    print("  Transaction creation test: PASSED")
    
except Exception as e:
    print(f"  Transaction creation error: {e}")
    import traceback
    traceback.print_exc()

print("\n=== Test Complete ===")
