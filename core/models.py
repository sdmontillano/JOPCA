from django.db import models
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


class BankAccount(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} ({self.account_number})"

    def recalc_balance(self):
        inflows = self.transaction_set.filter(type='deposit').aggregate(Sum('amount'))['amount__sum'] or 0
        outflows = self.transaction_set.exclude(type='deposit').aggregate(Sum('amount'))['amount__sum'] or 0
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
        ('withdrawal', 'Withdrawal'),
        ('transfer', 'Transfer'),
        ('disbursement', 'Disbursement'),
    ]
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE)
    date = models.DateField()
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.date} - {self.bank_account.name} - {self.type} - {self.amount}"
    
    
class DailyCashPosition(models.Model):
    date = models.DateField(unique=True)
    beginning_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def calculate_balances(self):
        transactions = Transaction.objects.filter(date=self.date)
        total_collections = sum(t.amount for t in transactions.filter(type="collection"))
        total_disbursements = sum(t.amount for t in transactions.filter(type="disbursement"))
        total_transfers = sum(t.amount for t in transactions.filter(type="transfer"))

        self.ending_balance = (
            self.beginning_balance
            + total_collections
            - total_disbursements
            + total_transfers
        )
        self.save()


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


