from rest_framework import serializers
from .models import BankAccount

from rest_framework import serializers
from .models import BankAccount

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'name', 'account_number', 'opening_balance', 'balance']