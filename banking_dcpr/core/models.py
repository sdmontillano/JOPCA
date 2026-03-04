from django.db import models, transaction
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from decimal import Decimal
import logging
from django.utils import timezone



logger = logging.getLogger(__name__)


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
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} ({self.account_number})"

    def recalc_balance(self):
        inflows = self.transaction_set.filter(
            type__in=[
                'deposit', 'collections', 'local_deposits',
                'fund_transfer', 'interbank_transfer'
            ]
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        outflows = self.transaction_set.filter(
            type__in=[
                'disbursement', 'bank_charges',
                'returned_check', 'adjustments'
            ]
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        new_balance = (self.opening_balance or Decimal('0.00')) + inflows - outflows
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
    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"{self.date} - {self.bank_account} - {self.type} - {self.amount}"

    def save(self, *args, **kwargs):
        amount = Decimal(self.amount or 0)
        tx_type = (self.type or "").lower()

        with transaction.atomic():
            bank = BankAccount.objects.select_for_update().get(pk=self.bank_account.pk)
            current_balance = Decimal(bank.balance or 0)

            if 'disbursement' in tx_type or 'returned_check' in tx_type or 'bank_charges' in tx_type or 'adjustments' in tx_type:
                ending = current_balance - amount
            else:
                ending = current_balance + amount

            if ending < 0:
                raise ValidationError("Ending balance cannot be negative.")

            bank.balance = ending
            bank.save(update_fields=['balance'])

            self.bank_account = bank
            super().save(*args, **kwargs)


class DailyCashPosition(models.Model):
    date = models.DateField(unique=True)
    beginning_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    collections = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    disbursements = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transfers = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    returned_checks = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pdc = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

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


class MonthlyReport(models.Model):
    month = models.DateField()
    total_inflows = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_disbursements = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_pdc = models.DecimalField(max_digits=12, decimal_places=2, default=0)

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


@receiver(post_save, sender=Transaction)
def update_balance_on_save(sender, instance, **kwargs):
    try:
        instance.bank_account.recalc_balance()
        daily, _ = DailyCashPosition.objects.get_or_create(date=instance.date)
        daily.save()  # trigger recalculation
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
        daily.save()  # trigger recalculation
    except Exception:
        logger.exception("Error in post_delete handler for Transaction")