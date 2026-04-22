#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'banking_dcpr.settings')
django.setup()

from core.models import BankAccount
from core.serializers import FundTransferInputSerializer

# Test the serializer with sample data
sample_data = {
    'from_bank': 1,  # Replace with actual bank ID
    'to_bank': 2,    # Replace with actual bank ID
    'date': '2024-04-20',
    'amount': '1000.00',
    'description': 'Test fund transfer'
}

print("Testing FundTransferInputSerializer...")
try:
    serializer = FundTransferInputSerializer(data=sample_data)
    if serializer.is_valid():
        print("✅ Serializer is valid")
        print(f"Validated data: {serializer.validated_data}")
    else:
        print("❌ Serializer errors:")
        print(serializer.errors)
except Exception as e:
    print(f"❌ Serializer error: {e}")
    import traceback
    traceback.print_exc()

# Test bank account access
print("\nTesting bank account access...")
try:
    from_bank = BankAccount.objects.get(id=1)
    to_bank = BankAccount.objects.get(id=2)
    print(f"✅ From bank: {from_bank.name}")
    print(f"✅ To bank: {to_bank.name}")
except Exception as e:
    print(f"❌ Bank access error: {e}")
    import traceback
    traceback.print_exc()
