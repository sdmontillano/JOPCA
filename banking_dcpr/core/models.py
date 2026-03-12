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

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Helper sets / functions for transaction validation
# ---------------------------------------------------------------------
INFLOW_TYPES = {
    "deposit", "deposits", "collections", "collection",
    "local_deposits", "local_deposit",
    "fund_transfer", "fund_transfers",
    "interbank_transfer", "interbank_transfers",
    "transfer",  # if you treat transfer as inflow for the receiving account
}
OUTFLOW_TYPES = {
    "disbursement", "disbursements",
    "bank_charges", "bank_charge",
    "returned_check", "returned_checks",
    "adjustments",
    # "transfer" could be an outflow for the sending account; include variants if needed
}

def _safe_decimal(v):
    return Decimal(v or 0)

def _normalize_type(tx_type):
    return (tx_type or "").strip().lower()

def _is_inflow(tx_type):
    return _normalize_type(tx_type) in INFLOW_TYPES

def _is_outflow(tx_type):
    return _normalize_type(tx_type) in OUTFLOW_TYPES

def _compute_beginning_for_bank(bank, target_date, TransactionModel):
    """
    beginning = opening_balance + prior_inflows - prior_outflows
    TransactionModel must be the Transaction class to avoid circular imports.
    """
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
        Recalculate the bank's balance from opening_balance + inflows - outflows across all transactions.
        This centralizes balance computation and avoids incremental drift.
        """
        inflows = self.transaction_set.filter(
            type__in=[
                'deposit', 'deposits', 'collections', 'collection', 'local_deposits', 'local_deposit',
                'fund_transfer', 'fund_transfers', 'interbank_transfer', 'interbank_transfers', 'transfer'
            ]
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        outflows = self.transaction_set.filter(
            type__in=[
                'disbursement', 'disbursements', 'bank_charges', 'bank_charge',
                'returned_check', 'returned_checks', 'adjustments'
            ]
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        new_balance = (self.opening_balance or Decimal('0.00')) + _safe_decimal(inflows) - _safe_decimal(outflows)
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
        ('collections', 'Collections'),
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

    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE)
    date = models.DateField()
    type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, null=True)

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

        # determine sign of this transaction
        amt = _safe_decimal(self.amount)
        if _is_inflow(self.type):
            delta = amt
        elif _is_outflow(self.type):
            delta = -amt
        else:
            # default behavior for unknown types: treat as inflow
            # change to `delta = -amt` if you prefer unknown types to be outflows
            delta = amt

        prospective_ending = beginning + _safe_decimal(today_inflows) - _safe_decimal(today_outflows) + delta

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
    disbursements = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    transfers = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    returned_checks = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    pdc = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    ending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    def save(self, *args, **kwargs):
        prev_day = DailyCashPosition.objects.filter(date__lt=self.date).order_by("-date").first()
        self.beginning_balance = prev_day.ending_balance if prev_day else Decimal('0.00')

        transactions = Transaction.objects.filter(date=self.date)

        self.collections = transactions.filter(
            type__in=["collections", "deposit", "local_deposits"]
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        self.disbursements = transactions.filter(
            type__in=["disbursement", "bank_charges"]
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        self.transfers = transactions.filter(
            type__in=["transfer", "fund_transfer", "interbank_transfer"]
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        self.returned_checks = transactions.filter(
            type="returned_check"
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        self.pdc = transactions.filter(
            type="post_dated_check"
        ).aggregate(Sum("amount"))["amount__sum"] or Decimal('0.00')

        self.ending_balance = (
            self.beginning_balance + self.collections
            - self.disbursements - self.returned_checks - self.transfers
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
        self.ending_balance = positions.order_by("-date").first().ending_balance if positions.exists() else Decimal('0.00')

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Monthly Report {self.month}"


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