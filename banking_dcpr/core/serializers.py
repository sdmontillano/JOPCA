from rest_framework import serializers
from decimal import Decimal
from django.db.models import Sum
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
        read_only_fields = ['balance']


class TransactionSerializer(serializers.ModelSerializer):
    bank_account = BankAccountSerializer(read_only=True)
    bank_account_id = serializers.PrimaryKeyRelatedField(
        queryset=BankAccount.objects.all(),
        source='bank_account',
        write_only=True
    )

    class Meta:
        model = Transaction
        fields = [
            'id',
            'bank_account',
            'bank_account_id',
            'date',
            'type',
            'amount',
            'description',
            'created_at',  # ✅ NEW FIELD for frontend sorting
        ]

    def validate(self, data):
        bank = data.get('bank_account') or getattr(self.instance, 'bank_account', None)
        amount = data.get('amount') if 'amount' in data else getattr(self.instance, 'amount', None)
        tx_type = (data.get('type') or getattr(self.instance, 'type', '')).lower()
        date = data.get('date') if 'date' in data else getattr(self.instance, 'date', None)

        if bank is None or amount is None:
            return data

        amount = Decimal(amount)
        current_balance = Decimal(bank.balance or 0)

        # ✅ Balance validation
        if 'disbursement' in tx_type or 'returned_check' in tx_type or 'bank_charges' in tx_type or 'adjustments' in tx_type:
            resulting_balance = current_balance - amount
        else:
            resulting_balance = current_balance + amount

        if resulting_balance < 0:
            raise serializers.ValidationError("Insufficient funds: this transaction would make the bank balance negative.")

        # ✅ Daily ending balance validation
        if date:
            txs_for_date = Transaction.objects.filter(date=date)
            if self.instance:
                txs_for_date = txs_for_date.exclude(pk=self.instance.pk)

            inflows = txs_for_date.filter(
                type__in=['deposit', 'collections', 'local_deposits', 'fund_transfer', 'interbank_transfer']
            ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

            outflows = txs_for_date.filter(
                type__in=['disbursement', 'bank_charges', 'returned_check', 'adjustments']
            ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

            if 'disbursement' in tx_type or 'returned_check' in tx_type or 'bank_charges' in tx_type or 'adjustments' in tx_type:
                outflows += amount
            else:
                inflows += amount

            prev_day = DailyCashPosition.objects.filter(date__lt=date).order_by('-date').first()
            beginning = prev_day.ending_balance if prev_day else Decimal('0.00')

            ending = beginning + inflows - outflows

            if ending < 0:
                raise serializers.ValidationError("This transaction would make the daily ending balance negative for the selected date.")

        return data


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
        read_only_fields = ['beginning_balance', 'ending_balance']


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
        read_only_fields = ['ending_balance']


class DailySummarySerializer(serializers.Serializer):
    date = serializers.DateField()
    total_collections = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_disbursements = serializers.DecimalField(max_digits=12, decimal_places=2)
    ending_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    pdc = serializers.DecimalField(max_digits=12, decimal_places=2)


class CashPositionSummarySerializer(serializers.Serializer):
    area = serializers.CharField()
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2)