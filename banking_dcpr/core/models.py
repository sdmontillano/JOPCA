# core/models.py
from django.db import models, transaction
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from decimal import Decimal
import logging
from django.utils import timezone
from django.contrib.auth.models import User

from .constants import INFLOW_TYPES, OUTFLOW_TYPES, ADJUSTMENT_TYPES

def _is_inflow(tx_type):
    return (tx_type or "").strip().lower() in INFLOW_TYPES

def _is_outflow(tx_type):
    return (tx_type or "").strip().lower() in OUTFLOW_TYPES

def _is_adjustment(tx_type):
    return (tx_type or "").strip().lower() in ADJUSTMENT_TYPES

logger = logging.getLogger(__name__)


def _safe_decimal(v):
    return Decimal(v or 0)


def _compute_beginning_for_bank(bank, target_date, TransactionModel):
    prior_inflows = TransactionModel.objects.filter(
        bank_account=bank, date__lt=target_date, type__in=INFLOW_TYPES
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    prior_outflows = TransactionModel.objects.filter(
        bank_account=bank, date__lt=target_date, type__in=OUTFLOW_TYPES
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    return _safe_decimal(bank.opening_balance) + _safe_decimal(prior_inflows) - _safe_decimal(prior_outflows)


# ---------------------------------------------------------------------
# BankAccount model
# ---------------------------------------------------------------------
class BankAccount(models.Model):
    AREAS = [
        ('main_office', 'Main Office'),
        ('tagoloan_parts', 'Tagoloan Parts'),
        ('midsayap_parts', 'Midsayap Parts'),
        ('valencia_parts', 'Valencia Parts'),
    ]

    name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, unique=True, db_index=True)
    area = models.CharField(max_length=50, choices=AREAS, default='main_office')
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f"{self.name} ({self.account_number})"

    def recalc_balance(self):
        """
        Recalculate the bank's balance from opening_balance + inflows - outflows + adjustments across all transactions.
        This centralizes balance computation and avoids incremental drift.
        Note: Adjustments can be positive or negative.
        """
        inflows = self.transaction_set.filter(
            type__in=INFLOW_TYPES
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        outflows = self.transaction_set.filter(
            type__in=OUTFLOW_TYPES
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        adjustments = self.transaction_set.filter(
            type__in=ADJUSTMENT_TYPES
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        new_balance = (self.opening_balance or Decimal('0.00')) + _safe_decimal(inflows) - _safe_decimal(outflows) + _safe_decimal(adjustments)
        if new_balance < 0:
            raise ValidationError("Bank account balance cannot be negative.")
        self.balance = new_balance
        super().save(update_fields=['balance'])

    def save(self, *args, **kwargs):
        if not self.pk:
            if self.opening_balance is None:
                self.opening_balance = Decimal('0.00')
            self.balance = self.opening_balance
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------
# Transaction model
# ---------------------------------------------------------------------
class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('collection', 'Collection'),
        ('local_deposits', 'Local Deposits'),
        ('disbursement', 'Disbursement'),
        ('returned_check', 'Returned Check'),
        ('bank_charges', 'Bank Charges'),
        ('adjustments', 'Adjustments'),
        ('transfer', 'Transfer'),
        ('fund_transfer', 'Fund Transfer'),
        ('interbank_transfer', 'Interbank Transfer'),
        ('post_dated_check', 'Post-Dated Check'),
    ]

    COLLECTION_TYPE_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('check', 'Check/PDC'),
    ]

    PDC_STATUS_CHOICES = [
        ('outstanding', 'Outstanding'),
        ('cleared', 'Cleared'),
        ('bounced', 'Bounced'),
    ]

    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    date = models.DateField()
    type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    
    from_bank = models.ForeignKey(
        BankAccount, 
        on_delete=models.CASCADE, 
        related_name='transfers_out',
        null=True, 
        blank=True,
        help_text="Source bank for fund transfers"
    )
    to_bank = models.ForeignKey(
        BankAccount, 
        on_delete=models.CASCADE, 
        related_name='transfers_in',
        null=True, 
        blank=True,
        help_text="Destination bank for fund transfers"
    )
    
    collection_type = models.CharField(
        max_length=20, 
        choices=COLLECTION_TYPE_CHOICES, 
        blank=True, 
        null=True
    )
    check_no = models.CharField(max_length=128, blank=True, null=True)
    reference = models.CharField(max_length=255, blank=True, null=True)
    pdc_status = models.CharField(
        max_length=20, 
        choices=PDC_STATUS_CHOICES, 
        blank=True, 
        null=True
    )
    
    is_reconciled = models.BooleanField(default=False)
    reconciled_at = models.DateTimeField(blank=True, null=True)
    reconciled_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reconciled_transactions"
    )

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_transactions"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.date} - {self.bank_account} - {self.type} - {self.amount}"

    # -----------------------------------------------------------------
    # Validation: ensure the prospective daily ending balance is not negative
    # -----------------------------------------------------------------
    def clean(self):
        """
        Validate that saving this Transaction will not make the daily ending balance negative.
        Raises django.core.exceptions.ValidationError on failure.
        """
        # require bank_account and date to validate
        if not getattr(self, "bank_account", None) or not getattr(self, "date", None):
            return

        # Use the Transaction class itself for queries
        TransactionModel = Transaction

        bank = self.bank_account
        target_date = self.date

        # compute beginning balance for the bank on target_date
        beginning = _compute_beginning_for_bank(bank, target_date, TransactionModel)

        # sum today's existing transactions (exclude this instance if updating)
        qs = TransactionModel.objects.filter(bank_account=bank, date=target_date)
        if getattr(self, "pk", None):
            qs = qs.exclude(pk=self.pk)

        today_inflows = qs.filter(type__in=INFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        today_outflows = qs.filter(type__in=OUTFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        today_adjustments = qs.filter(type__in=ADJUSTMENT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # determine sign of this transaction
        amt = _safe_decimal(self.amount)
        if _is_inflow(self.type):
            delta = amt
        elif _is_outflow(self.type):
            delta = -amt
        elif _is_adjustment(self.type):
            # Adjustments can be positive or negative - use the amount as-is
            delta = amt
        else:
            # default behavior for unknown types: treat as inflow
            # change to `delta = -amt` if you prefer unknown types to be outflows
            delta = amt

        prospective_ending = beginning + _safe_decimal(today_inflows) - _safe_decimal(today_outflows) + _safe_decimal(today_adjustments) + delta

        if prospective_ending < Decimal("0"):
            raise ValidationError("This transaction would make the daily ending balance negative for the selected date.")

    def save(self, *args, **kwargs):
        """
        Run model validation before saving. Actual bank balance recalculation is handled
        by the post_save signal (recalc_balance) to keep balance logic centralized.
        """
        # Run model validation (this calls clean())
        self.full_clean()

        # Save the transaction record inside a DB transaction to keep things consistent.
        with transaction.atomic():
            super().save(*args, **kwargs)
            # Do not directly mutate bank.balance here; post_save signal will call recalc_balance()
            # and update DailyCashPosition. This avoids duplication and sign errors.


# ---------------------------------------------------------------------
# DailyCashPosition model
# ---------------------------------------------------------------------
class DailyCashPosition(models.Model):
    date = models.DateField(unique=True)
    beginning_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    collections = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    local_deposits = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    disbursements = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    pdc = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    ending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    def save(self, *args, **kwargs):
        prev_day = DailyCashPosition.objects.filter(date__lt=self.date).order_by("-date").first()
        self.beginning_balance = prev_day.ending_balance if prev_day else Decimal('0.00')

        transactions = Transaction.objects.filter(date=self.date)

        # Collections = Cash Received + Cleared PDCs + Bank Deposits + Other Receipts (POSITIVE)
        # Note: PDC deposits now create "collection" type transactions
        self.collections = transactions.filter(
            type="collection"
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        # Local Deposits = Cash moved to bank (tracking only)
        self.local_deposits = transactions.filter(
            type__in=["local_deposits", "local_deposit"]
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        # Disbursements = Payments + Fund Transfers + Other Outflows
        # Include both singular and plural forms
        DISBURSEMENT_TYPES = {"disbursement", "disbursements"}
        self.disbursements = transactions.filter(
            type__in=DISBURSEMENT_TYPES
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        # Adjustments = Bank Charges + Other Adjustments (not returned checks - those are outflows)
        # These are negative adjustments (reduce cash)
        bank_charges = transactions.filter(
            type__in=["bank_charges", "bank_charge"]
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')
        
        self.adjustments = -bank_charges

        # Returned Checks - handled as part of outflows
        returned_checks = transactions.filter(
            type__in=["returned_check", "returned_checks"]
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        # PDC = Post-dated checks (not yet matured/deposited)
        self.pdc = transactions.filter(
            type__in=["post_dated_check", "post_dated_checks"]
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        # DCP Formula: Beginning + Collections - Disbursements - Returned Checks + Adjustments
        # Note: Local Deposits is tracking only (NOT in formula)
        # Collections = Cash on Hand (not in bank)
        self.ending_balance = (
            self.beginning_balance + self.collections
            - self.disbursements - returned_checks + self.adjustments
        )
        if self.ending_balance < 0:
            raise ValidationError("Ending balance cannot be negative.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Daily Cash Position - {self.date}"


# ---------------------------------------------------------------------
# MonthlyReport model
# ---------------------------------------------------------------------
class MonthlyReport(models.Model):
    month = models.DateField()
    total_inflows = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_disbursements = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    ending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_pdc = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    def save(self, *args, **kwargs):
        from django.db.models.functions import TruncMonth
        positions = DailyCashPosition.objects.annotate(month_val=TruncMonth("date")).filter(month_val=self.month)

        self.total_inflows = sum(p.collections for p in positions)
        self.total_disbursements = sum(p.disbursements for p in positions)
        self.total_pdc = sum(p.pdc for p in positions)
        last_position = positions.order_by("-date").first()
        self.ending_balance = last_position.ending_balance if last_position else Decimal('0.00')

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Monthly Report {self.month}"


# ---------------------------------------------------------------------
# PettyCashFund model
# ---------------------------------------------------------------------
class PettyCashFund(models.Model):
    LOCATION_CHOICES = [
        ('office', 'Main Office'),
        ('quarry', 'Quarry'),
    ]

    name = models.CharField(max_length=100)
    location = models.CharField(max_length=50, choices=LOCATION_CHOICES, default='office')
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    note = models.TextField(blank=True, default='', help_text='Notes or description for this PCF')
    is_active = models.BooleanField(default=True)
    min_balance_threshold = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('1000.00'),
        help_text='Alert when balance falls below this amount'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Petty Cash Fund'
        verbose_name_plural = 'Petty Cash Funds'

    def __str__(self):
        return f"{self.name} ({self.get_location_display()})"

    def clean(self):
        if self.min_balance_threshold < 0:
            raise ValidationError({'min_balance_threshold': 'Minimum balance threshold must be non-negative.'})

    @property
    def current_balance(self):
        disbursements = self.transactions.filter(type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        replenishments = self.transactions.filter(type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return self.opening_balance + replenishments - disbursements

    @property
    def total_disbursements(self):
        return self.transactions.filter(type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    @property
    def total_replenishments(self):
        return self.transactions.filter(type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    @property
    def unreplenished_amount(self):
        total_disb = self.total_disbursements
        total_rep = self.total_replenishments
        return max(Decimal('0.00'), total_disb - total_rep)

    def touch(self):
        self.save(update_fields=['updated_at'])


# ---------------------------------------------------------------------
# PettyCashTransaction model
# ---------------------------------------------------------------------
class PettyCashTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('disbursement', 'Disbursement'),
        ('replenishment', 'Replenishment'),
    ]

    pcf = models.ForeignKey(PettyCashFund, on_delete=models.CASCADE, related_name='transactions')
    date = models.DateField()
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_pcf_transactions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.pcf.name} - {self.type} - {self.amount} ({self.date})"

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------
# CashCount model
# ---------------------------------------------------------------------
class CashCount(models.Model):
    pcf = models.ForeignKey(PettyCashFund, on_delete=models.CASCADE, related_name='cash_counts')
    count_date = models.DateField()
    system_balance = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='System balance at time of count'
    )
    actual_count = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Actual physical cash count'
    )
    variance = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Difference (actual - system)'
    )
    notes = models.TextField(blank=True, null=True)
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_cash_counts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cash Count'
        verbose_name_plural = 'Cash Counts'
        ordering = ['-count_date', '-created_at']

    def __str__(self):
        return f"Cash Count - {self.pcf.name} ({self.count_date})"

    def save(self, *args, **kwargs):
        actual = _safe_decimal(self.actual_count)
        system = _safe_decimal(self.system_balance)
        self.variance = actual - system
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------
# Signals: keep your existing handlers (they call recalc_balance and update daily)
# ---------------------------------------------------------------------
@receiver(post_save, sender=Transaction)
def update_balance_on_save(sender, instance, **kwargs):
    try:
        instance.bank_account.recalc_balance()
        daily, _ = DailyCashPosition.objects.get_or_create(date=instance.date)
        daily.save()
    except Exception:
        logger.exception("Error in post_save handler for Transaction")


@receiver(post_delete, sender=Transaction)
def update_balance_on_delete(sender, instance, **kwargs):
    try:
        try:
            instance.bank_account.recalc_balance()
        except ValidationError:
            logger.warning("recalc_balance raised ValidationError on delete for bank %s", instance.bank_account_id)
        daily, _ = DailyCashPosition.objects.get_or_create(date=instance.date)
        daily.save()
    except Exception:
        logger.exception("Error in post_delete handler for Transaction")


# ---------------------------------------------------------------------
# PCF Signals: auto-update PCF timestamps
# ---------------------------------------------------------------------
@receiver(post_save, sender=PettyCashTransaction)
def update_pcf_timestamp_on_save(sender, instance, **kwargs):
    try:
        instance.pcf.touch()
    except Exception:
        logger.exception("Error in post_save handler for PettyCashTransaction")


@receiver(post_delete, sender=PettyCashTransaction)
def update_pcf_timestamp_on_delete(sender, instance, **kwargs):
    try:
        instance.pcf.touch()
    except Exception:
        logger.exception("Error in post_delete handler for PettyCashTransaction")


# ---------------------------------------------------------------------
# Pdc model (unchanged)
# ---------------------------------------------------------------------
class Pdc(models.Model):
    STATUS_OUTSTANDING = "outstanding"
    STATUS_MATURED = "matured"
    STATUS_DEPOSITED = "deposited"
    STATUS_RETURNED = "returned"
    STATUS_CHOICES = [
        (STATUS_OUTSTANDING, "Outstanding"),
        (STATUS_MATURED, "Matured"),
        (STATUS_DEPOSITED, "Deposited"),
        (STATUS_RETURNED, "Returned"),
    ]

    customer_name = models.CharField(max_length=255, blank=True, null=True)
    check_no = models.CharField(max_length=128, blank=True, null=True)
    maturity_date = models.DateField(blank=True, null=True)
    amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_OUTSTANDING)

    deposit_bank = models.ForeignKey(
        BankAccount,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="pdc_deposits",
    )
    date_deposited = models.DateField(blank=True, null=True)
    returned_date = models.DateField(blank=True, null=True)
    returned_reason = models.TextField(blank=True, null=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_pdcs",
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-maturity_date", "-id"]
        verbose_name = "Post Dated Check"
        verbose_name_plural = "Post Dated Checks"

    def __str__(self):
        label = f"{self.customer_name or 'Unknown'} - {self.check_no or 'No#'}"
        return f"{label} ₱{self.amount:.2f} ({self.status})"


# ---------------------------------------------------------------------
# Bank Reconciliation Model
# ---------------------------------------------------------------------
class BankReconciliation(models.Model):
    bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.CASCADE,
        related_name='reconciliations'
    )
    date = models.DateField()
    per_bank = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Balance per bank statement'
    )
    outstanding_checks = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Outstanding checks (deduct from bank)'
    )
    deposit_in_transit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Deposits in transit (add to bank)'
    )
    returned_checks = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Returned checks (deduct from DCPR)'
    )
    bank_charges = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Bank charges not yet recorded'
    )
    unbooked_transfers = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Unbooked fund transfers (add to DCPR)'
    )
    remarks = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_reconciliations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bank Reconciliation'
        verbose_name_plural = 'Bank Reconciliations'
        ordering = ['-date', '-bank_account']
        unique_together = ['bank_account', 'date']

    def __str__(self):
        return f"{self.bank_account} - {self.date}"

    @property
    def per_dcpr(self):
        return self.bank_account.balance

    @property
    def dcpr_reconciled(self):
        base = _safe_decimal(self.per_dcpr)
        add = _safe_decimal(self.deposit_in_transit) + _safe_decimal(self.unbooked_transfers)
        deduct = _safe_decimal(self.outstanding_checks) + _safe_decimal(self.returned_checks) + _safe_decimal(self.bank_charges)
        return base + add - deduct

    @property
    def bank_reconciled(self):
        base = _safe_decimal(self.per_bank)
        add = _safe_decimal(self.deposit_in_transit)
        deduct = _safe_decimal(self.outstanding_checks) + _safe_decimal(self.returned_checks) + _safe_decimal(self.bank_charges)
        return base + add - deduct

    @property
    def is_balanced(self):
        return abs(self.dcpr_reconciled - self.bank_reconciled) < Decimal('0.01')


# ---------------------------------------------------------------------
# Audit Log model - Track all user actions
# ---------------------------------------------------------------------
class AuditLog(models.Model):
    ACTION_TYPES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('export', 'Export'),
        ('deposit', 'Deposit'),
        ('withdraw', 'Withdraw'),
        ('replenish', 'Replenish'),
    ]

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    username = models.CharField(max_length=150, blank=True, help_text="Username at time of action")
    action = models.CharField(max_length=20, choices=ACTION_TYPES, db_index=True)
    entity = models.CharField(max_length=50, db_index=True, help_text="e.g., Transaction, BankAccount, PCF, PDC", default="unknown")
    entity_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True, help_text="Additional details as JSON")

    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['entity', 'entity_id']),
        ]

    def __str__(self):
        return f"{self.timestamp} - {self.user} - {self.action} {self.entity}"


def log_audit(user, action, entity, entity_id=None, description='', ip_address=None, **details):
    """Helper function to create audit log entries"""
    # TEMPORARILY DISABLED: Database has old schema that causes errors
    # AuditLog.objects.create(
    #     user=user,
    #     username=user.username if user else 'anonymous',
    #     action=action,
    #     entity=entity,
    #     entity_id=entity_id,
    #     description=description,
    #     ip_address=ip_address,
    #     details=details
#     )
    pass


# ---------------------------------------------------------------------
# Collection model - unified collections as single source of truth
# ---------------------------------------------------------------------
class Collection(models.Model):
    STATUS_UNDEPOSITED = 'UNDEPOSITED'
    STATUS_DEPOSITED = 'DEPOSITED'
    STATUS_CHOICES = [
        (STATUS_UNDEPOSITED, 'Undeposited'),
        (STATUS_DEPOSITED, 'Deposited'),
    ]

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UNDEPOSITED)
    date = models.DateField(null=True, blank=True, help_text="Date when cash was collected")
    created_at = models.DateTimeField(auto_now_add=True)
    transaction = models.ForeignKey('Transaction', on_delete=models.CASCADE, null=True, blank=True, related_name='collections')
    description = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Collection #{self.id} - ₱{self.amount} - {self.status}"