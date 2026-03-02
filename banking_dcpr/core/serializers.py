from rest_framework import serializers
from .models import MonthlyReport, DailyCashPosition, Transaction, BankAccount

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = [
            'id',
            'name',
            'account_number',
            'area',
            'opening_balance',
            'balance',
        ]

class TransactionSerializer(serializers.ModelSerializer):
    bank_account = BankAccountSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'bank_account',
            'date',
            'type',
            'amount',
            'description',
        ]

class DailyCashPositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyCashPosition
        fields = [
            'id',
            'date',
            'beginning_balance',
            'collections',
            'disbursements',
            'transfers',
            'returned_checks',
            'pdc',
            'ending_balance',
        ]

class MonthlyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyReport
        fields = [
            'id',
            'month',
            'total_inflows',
            'total_disbursements',
            'total_pdc',
            'ending_balance',
        ]

class DailySummarySerializer(serializers.Serializer):
    date = serializers.DateField()
    total_collections = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_disbursements = serializers.DecimalField(max_digits=12, decimal_places=2)
    ending_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    pdc = serializers.DecimalField(max_digits=12, decimal_places=2)

class CashPositionSummarySerializer(serializers.Serializer):
    area = serializers.CharField()
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2)

    