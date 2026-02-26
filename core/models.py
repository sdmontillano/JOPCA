from django.db import models
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from datetime import timedelta


class BankAccount(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} ({self.account_number})"

    def recalc_balance(self):
        inflows = self.transaction_set.filter(
            type__in=['deposit', 'collections', 'local_deposits']
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        outflows = self.transaction_set.filter(
            type__in=['disbursement', 'returned_checks', 'bank_charges']
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        # Neutral transfers don’t change total balance
        self.balance = (self.opening_balance or 0) + inflows - outflows
        super().save(update_fields=['balance'])

    def save(self, *args, **kwargs):
        if not self.pk:  # only when creating new account
            if self.opening_balance is None:
                self.opening_balance = 0
            self.balance = self.opening_balance
        super().save(*args, **kwargs)


class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('collections', 'Collections'),
        ('local_deposits', 'Local Deposits'),
        ('disbursement', 'Disbursement'),
        ('returned_checks', 'Returned Checks'),
        ('bank_charges', 'Bank Charges'),
        ('adjustments', 'Adjustments'),
        ('transfer', 'Transfer'),
        ('fund_transfers', 'Fund Transfers'),
        ('interbank_transfers', 'Interbank Transfers'),
    ]
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE)
    date = models.DateField()
    type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.date} - {self.bank_account.name} - {self.type} - {self.amount}"


class DailyCashPosition(models.Model):
    date = models.DateField(unique=True)
    beginning_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    collections = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    disbursements = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transfers = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def calculate_balances(self):
        # Carry forward yesterday’s ending balance
        yesterday = self.date - timedelta(days=1)
        prev_day = DailyCashPosition.objects.filter(date=yesterday).first()
        if prev_day:
            self.beginning_balance = prev_day.ending_balance
        else:
            self.beginning_balance = 0

        # Get all transactions for the day
        transactions = Transaction.objects.filter(date=self.date)

        # Calculate totals
        self.collections = sum(t.amount for t in transactions.filter(type__in=["collections", "deposit", "local_deposits"]))
        self.disbursements = sum(t.amount for t in transactions.filter(type__in=["disbursement", "returned_checks", "bank_charges"]))
        self.transfers = sum(t.amount for t in transactions.filter(type__in=["transfer", "fund_transfers", "interbank_transfers"]))

        # Calculate ending balance
        self.ending_balance = (
            self.beginning_balance
            + self.collections
            - self.disbursements
            # transfers are neutral, so not added/subtracted here
        )
        self.save()

    def __str__(self):
        return f"Daily Cash Position - {self.date}"


class MonthlyReport(models.Model):
    month = models.CharField(max_length=20)   # e.g., "February 2026"
    total_inflows = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_disbursements = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"Monthly Report {self.month}"


@receiver(post_save, sender=Transaction)
def update_balance_on_save(sender, instance, **kwargs):
    instance.bank_account.recalc_balance()


@receiver(post_delete, sender=Transaction)
def update_balance_on_delete(sender, instance, **kwargs):
    instance.bank_account.recalc_balance()
    