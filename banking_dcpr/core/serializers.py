# core/serializers.py
from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Sum
from rest_framework import serializers

from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport, Pdc, PettyCashFund, PettyCashTransaction, CashCount, AuditLog, Collection
from .constants import INFLOW_TYPES, OUTFLOW_TYPES, LOCAL_DEPOSIT_TYPES, COLLECTION_TYPE_CHECK

INFLOW_TYPE_LIST = list(INFLOW_TYPES)
OUTFLOW_TYPE_LIST = list(OUTFLOW_TYPES)
LOCAL_DEPOSIT_TYPE_LIST = list(LOCAL_DEPOSIT_TYPES)


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
    unfunded_warning = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "bank_account",
            "bank_account_id",
            "date",
            "type",
            "amount",
            "description",
            "collection_type",
            "check_no",
            "reference",
            "pdc_status",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
            "unfunded_warning",
        ]
        read_only_fields = ["created_by", "created_by_username", "created_at", "updated_at", "unfunded_warning"]

    def get_unfunded_warning(self, obj):
        collection_type = (obj.collection_type or "").strip().lower()
        if collection_type == COLLECTION_TYPE_CHECK:
            check_no = (obj.check_no or "").strip()
            reference = (obj.reference or "").strip()
            if not check_no and not reference:
                return "UNFUNDED: Check/PDC without reference"
        return None

    def validate(self, data):
        """
        Validate:
         - immediate bank balance (prevent negative bank.balance)
         - daily ending for the selected bank on the given date (prevent negative per-bank daily ending)
        """
        # Resolve values from incoming data or existing instance (for updates)
        bank = data.get("bank_account") or getattr(self.instance, "bank_account", None)
        amount = data.get("amount") if "amount" in data else getattr(self.instance, "amount", None)
        tx_type = (data.get("type") or getattr(self.instance, "type", "")).lower()
        date = data.get("date") if "date" in data else getattr(self.instance, "date", None)

        # If bank or amount missing, skip further checks (field validators will catch missing required fields)
        if bank is None or amount is None:
            return data

        # Normalize amount to Decimal
        amount = Decimal(amount)

        # 1) Immediate bank balance check (current stored balance)
        current_balance = Decimal(bank.balance or 0)

        if tx_type in OUTFLOW_TYPE_LIST:
            resulting_balance = current_balance - amount
        else:
            resulting_balance = current_balance + amount

        if resulting_balance < 0:
            raise serializers.ValidationError({"non_field_errors": ["Insufficient funds: this transaction would make the bank balance negative."]})

        # 2) Per-bank daily ending check (compute beginning for this bank, not global)
        if date:
            # Exclude instance when updating
            txs_for_date = Transaction.objects.filter(bank_account=bank, date=date)
            if self.instance:
                txs_for_date = txs_for_date.exclude(pk=self.instance.pk)

            # Today's inflows/outflows for this bank
            inflows_today = txs_for_date.filter(type__in=INFLOW_TYPE_LIST).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00")
            outflows_today = txs_for_date.filter(type__in=OUTFLOW_TYPE_LIST).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00")

            # Add the prospective transaction to the appropriate side
            if tx_type in OUTFLOW_TYPE_LIST:
                outflows_today += amount
            else:
                inflows_today += amount

            # Compute beginning for this bank on the target date:
            # beginning = opening_balance + prior_inflows - prior_outflows
            prior_inflows = Transaction.objects.filter(
                bank_account=bank, date__lt=date, type__in=INFLOW_TYPE_LIST
            ).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00")

            prior_outflows = Transaction.objects.filter(
                bank_account=bank, date__lt=date, type__in=OUTFLOW_TYPE_LIST
            ).aggregate(Sum("amount"))["amount__sum"] or Decimal("0.00")

            beginning = (bank.opening_balance or Decimal("0.00")) + Decimal(prior_inflows) - Decimal(prior_outflows)

            # prospective ending for this bank on that date
            ending = beginning + Decimal(inflows_today) - Decimal(outflows_today)

            if ending < 0:
                raise serializers.ValidationError({"non_field_errors": ["This transaction would make the daily ending balance negative for the selected date."]})

        return data

    def create(self, validated_data):
        """
        Construct Transaction instance, run model validation (full_clean -> clean), set created_by from request,
        then save. Convert Django ValidationError into DRF ValidationError for proper API response.
        """
        tx = Transaction(**validated_data)

        # set created_by from request context if available
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user and request.user.is_authenticated:
            tx.created_by = request.user

        try:
            tx.full_clean()
        except DjangoValidationError as e:
            # Convert to DRF ValidationError with non_field_errors key to match frontend expectations
            raise serializers.ValidationError({"non_field_errors": list(e.messages)})

        tx.save()
        return tx

    def update(self, instance, validated_data):
        # apply incoming changes to the instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # preserve created_by if request user present and instance has no created_by
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user and request.user.is_authenticated and not instance.created_by:
            instance.created_by = request.user

        try:
            instance.full_clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError({"non_field_errors": list(e.messages)})

        instance.save()
        return instance


class DailyCashPositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyCashPosition
        fields = [
            "id",
            "date",
            "beginning_balance",
            "collections",
            "disbursements",
            "transfers",
            "returned_checks",
            "pdc",
            "ending_balance",
        ]
        read_only_fields = ["beginning_balance", "ending_balance"]


class MonthlyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyReport
        fields = ["id", "month", "total_inflows", "total_disbursements", "total_pdc", "ending_balance"]
        read_only_fields = ["ending_balance"]


class PdcSerializer(serializers.ModelSerializer):
    deposit_bank = BankAccountSerializer(read_only=True)
    deposit_bank_id = serializers.PrimaryKeyRelatedField(
        queryset=BankAccount.objects.all(),
        source="deposit_bank",
        write_only=True,
        required=False,
        allow_null=True,
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


# ---------------------------------------------------------------------
# PCF Serializers
# ---------------------------------------------------------------------
class PettyCashFundSerializer(serializers.ModelSerializer):
    current_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_disbursements = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_replenishments = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    unreplenished_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    location_display = serializers.CharField(source='get_location_display', read_only=True)

    class Meta:
        model = PettyCashFund
        fields = [
            'id', 'name', 'location', 'location_display', 'opening_balance', 'note',
            'current_balance', 'total_disbursements', 'total_replenishments',
            'unreplenished_amount', 'is_active', 'min_balance_threshold',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_balance', 'total_disbursements', 'total_replenishments', 'unreplenished_amount', 'created_at', 'updated_at']


class PettyCashFundMinimalSerializer(serializers.ModelSerializer):
    current_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    unreplenished_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    location_display = serializers.CharField(source='get_location_display', read_only=True)

    class Meta:
        model = PettyCashFund
        fields = ['id', 'name', 'location', 'location_display', 'note', 'current_balance', 'unreplenished_amount', 'created_at']


class PettyCashTransactionSerializer(serializers.ModelSerializer):
    pcf_name = serializers.CharField(source='pcf.name', read_only=True)
    location_display = serializers.CharField(source='pcf.get_location_display', read_only=True)
    created_by_username = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = PettyCashTransaction
        fields = [
            'id', 'pcf', 'pcf_name', 'location_display',
            'date', 'type', 'amount', 'description',
            'created_by', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'pcf_name', 'location_display', 'created_by', 'created_by_username', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        tx = PettyCashTransaction(**validated_data)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            tx.created_by = request.user
        try:
            tx.full_clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError({"non_field_errors": list(e.messages)})
        tx.save()
        return tx


class CashCountSerializer(serializers.ModelSerializer):
    pcf_name = serializers.CharField(source='pcf.name', read_only=True)
    location_display = serializers.CharField(source='pcf.get_location_display', read_only=True)
    verified_by_username = serializers.ReadOnlyField(source='verified_by.username')

    class Meta:
        model = CashCount
        fields = [
            'id', 'pcf', 'pcf_name', 'location_display',
            'count_date', 'system_balance', 'actual_count', 'variance',
            'notes', 'verified_by', 'verified_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'pcf_name', 'location_display', 'variance', 'verified_by_username', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        count = CashCount(**validated_data)
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            count.verified_by = request.user
        try:
            count.full_clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError({"non_field_errors": list(e.messages)})
        count.save()
        return count


class PcfSummarySerializer(serializers.Serializer):
    pcf_id = serializers.IntegerField()
    pcf_name = serializers.CharField()
    location = serializers.CharField()
    location_display = serializers.CharField()
    beginning = serializers.DecimalField(max_digits=12, decimal_places=2)
    disbursements = serializers.DecimalField(max_digits=12, decimal_places=2)
    replenishments = serializers.DecimalField(max_digits=12, decimal_places=2)
    unreplenished = serializers.DecimalField(max_digits=12, decimal_places=2)
    ending = serializers.DecimalField(max_digits=12, decimal_places=2)


class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'timestamp', 'user', 'user_username', 'username', 
            'action', 'entity', 'entity_id', 'description', 
            'ip_address', 'details'
        ]
        read_only_fields = ['timestamp', 'user', 'username']


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ['id', 'amount', 'status', 'date', 'created_at', 'transaction', 'description']
        read_only_fields = ['id', 'created_at']