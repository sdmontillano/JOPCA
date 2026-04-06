# core/management/commands/reset_all_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import (
    BankAccount, Transaction, DailyCashPosition, 
    PettyCashFund, PettyCashTransaction, Pdc, 
    MonthlyReport, BankReconciliation, PCFCount
)


class Command(BaseCommand):
    help = 'Reset all transaction data but keep bank accounts and users'

    def handle(self, *args, **options):
        self.stdout.write('Clearing all transaction data...')
        
        # Clear all transaction-related data
        Transaction.objects.all().delete()
        PettyCashTransaction.objects.all().delete()
        Pdc.objects.all().delete()
        DailyCashPosition.objects.all().delete()
        MonthlyReport.objects.all().delete()
        BankReconciliation.objects.all().delete()
        PCFCount.objects.all().delete()
        
        # Reset bank account balances
        BankAccount.objects.update(
            balance=0,
            opening_balance=0
        )
        
        # Reset PCF balances
        PettyCashFund.objects.update(
            current_balance=0,
            opening_balance=0
        )
        
        self.stdout.write(self.style.SUCCESS('Successfully cleared all transaction data!'))
        self.stdout.write(self.style.WARNING('Bank accounts and users are preserved.'))