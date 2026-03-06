# core/serializers.py
from rest_framework import serializers
from decimal import Decimal
from django.db.models import Sum
from .models import MonthlyReport, DailyCashPosition, Transaction, BankAccount, Pdc

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ["id", "name", "account_number", "area", "opening_balance", "balance"]


class TransactionSerializer(serializers.ModelSerializer):
    bank_account = BankAccountSerializer(read_only=True)
    bank_account_id = serializers.PrimaryKeyRelatedField(
        queryset=BankAccount.objects.all(), source="bank_account", write_only=True
    )
    created_by_username = serializers.ReadOnlyField(source="created_by.username")

    class Meta:
        model = Transaction
        fields = [
            "id", "bank_account", "bank_account_id", "date", "type", "amount",
            "description", "created_by", "created_by_username", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by", "created_by_username", "created_at", "updated_at"]

    def validate(self, data):
        bank = data.get("bank_account") or getattr(self.instance, "bank_account", None)
        amount = data.get("amount") if "amount" in data else getattr(self.instance, "amount", None)
        tx_type = (data.get("type") or getattr(self.instance, "type", "")).lower()
        date = data.get("date") if "date" in data else getattr(self.instance, "date", None)

        if bank is None or amount is None:
            return data

        amount = Decimal(amount)
        current_balance = Decimal(bank.balance or 0)

        if tx_type in ["disbursement", "returned_check", "bank_charges", "adjustments"]:
            resulting_balance = current_balance - amount
        else:
            resulting_balance = current_balance + amount

        if resulting_balance < 0:
            raise serializers.ValidationError("Insufficient funds: this transaction would make the bank balance negative.")

        if date:
            txs_for_date = Transaction.objects.filter(date=date)
            if self.instance:
                txs_for_date = txs_for_date.exclude(pk=self.instance.pk)

            inflows = txs_for_date.filter(
                type__in=["deposit", "collections", "local_deposits", "fund_transfer", "interbank_transfer"]
            ).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00")

            outflows = txs_for_date.filter(
                type__in=["disbursement", "bank_charges", "returned_check", "adjustments"]
            ).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00")

            if tx_type in ["disbursement", "returned_check", "bank_charges", "adjustments"]:
                outflows += amount
            else:
                inflows += amount

            prev_day = DailyCashPosition.objects.filter(date__lt=date).order_by("-date").first()
            beginning = prev_day.ending_balance if prev_day else Decimal("0.00")

            ending = beginning + inflows - outflows

            if ending < 0:
                raise serializers.ValidationError("This transaction would make the daily ending balance negative for the selected date.")

        return data


class DailyCashPositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyCashPosition
        fields = [
            'id', 'date', 'beginning_balance', 'collections', 'disbursements',
            'transfers', 'returned_checks', 'pdc', 'ending_balance',
        ]
        read_only_fields = ['beginning_balance', 'ending_balance']


class MonthlyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyReport
        fields = ['id', 'month', 'total_inflows', 'total_disbursements', 'total_pdc', 'ending_balance']
        read_only_fields = ['ending_balance']


class PdcSerializer(serializers.ModelSerializer):
    deposit_bank = BankAccountSerializer(read_only=True)
    deposit_bank_id = serializers.PrimaryKeyRelatedField(
        queryset=BankAccount.objects.all(),
        source="deposit_bank",
        write_only=True,
        required=False,
        allow_null=True
    )

    # Canonical aliases (map to model fields)
    customer = serializers.CharField(source="customer_name", required=False, allow_null=True)
    check_number = serializers.CharField(source="check_no", required=False, allow_null=True)

    maturity_date = serializers.DateField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=20, decimal_places=2)
    date_deposited = serializers.DateField(required=False, allow_null=True)
    returned_date = serializers.DateField(required=False, allow_null=True)
    returned_reason = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model = Pdc
        fields = [
            "id",
            "customer",          # maps to customer_name in model
            "check_number",      # maps to check_no in model
            "maturity_date",
            "amount",
            "status",
            "deposit_bank",
            "deposit_bank_id",
            "date_deposited",
            "returned_date",
            "returned_reason",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "deposit_bank", "created_by", "created_at", "updated_at"]