from django.shortcuts import render
from django.utils.timezone import now
from django.db.models import Sum
from datetime import timedelta, datetime
from .models import Transaction, BankAccount, DailyCashPosition
from .serializers import BankAccountSerializer
from rest_framework import viewsets   # ✅ correct import


class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.all()
    serializer_class = BankAccountSerializer



def dashboard(request):
    # Allow user to pick a date, default to today
    date_str = request.GET.get("date")
    if date_str:
        try:
            report_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            report_date = now().date()
    else:
        report_date = now().date()

    daily_report = DailyCashPosition.objects.filter(date=report_date).first()
    bank_accounts = BankAccount.objects.all()

    cash_on_hand = {}
    cash_in_bank = {}
    returned_checks = {"beginning_balance": 0, "collections": 0, "ending_balance": 0}
    total = {
        "beginning_balance": 0,
        "collections": 0,
        "fund_transfers": 0,
        "fund_transfer_receipts": 0,
        "local_deposits": 0,
        "disbursements": 0,
        "ending_balance": 0,
    }

    for account in bank_accounts:
        yesterday = report_date - timedelta(days=1)
        prev_day = DailyCashPosition.objects.filter(date=yesterday).first()
        beginning_balance = prev_day.ending_balance if prev_day else (account.opening_balance or 0)

        collections = Transaction.objects.filter(
            bank_account=account, date=report_date, type__in=["collections"]
        ).aggregate(total=Sum("amount"))["total"] or 0

        fund_transfers = Transaction.objects.filter(
            bank_account=account, date=report_date, type__in=["fund_transfer"]
        ).aggregate(total=Sum("amount"))["total"] or 0

        fund_transfer_receipts = Transaction.objects.filter(
            bank_account=account, date=report_date, type__in=["fund_transfer_receipt"]
        ).aggregate(total=Sum("amount"))["total"] or 0

        local_deposits = Transaction.objects.filter(
            bank_account=account, date=report_date, type__in=["local_deposits"]
        ).aggregate(total=Sum("amount"))["total"] or 0

        disbursements = Transaction.objects.filter(
            bank_account=account, date=report_date, type__in=["disbursement", "returned_checks", "bank_charges"]
        ).aggregate(total=Sum("amount"))["total"] or 0

        ending_balance = beginning_balance + collections + fund_transfer_receipts + local_deposits - (fund_transfers + disbursements)

        account_data = {
            "beginning_balance": beginning_balance,
            "collections": collections,
            "fund_transfers": fund_transfers,
            "fund_transfer_receipts": fund_transfer_receipts,
            "local_deposits": local_deposits,
            "disbursements": disbursements,
            "ending_balance": ending_balance,
        }

        # ✅ Show both name and account number
        label = f"{account.name} ({account.account_number})"

        if "PCF" in account.name or "BDO SA-722" in account.name:
            cash_on_hand[label] = account_data
        else:
            cash_in_bank[label] = account_data

        total["beginning_balance"] += beginning_balance
        total["collections"] += collections
        total["fund_transfers"] += fund_transfers
        total["fund_transfer_receipts"] += fund_transfer_receipts
        total["local_deposits"] += local_deposits
        total["disbursements"] += disbursements
        total["ending_balance"] += ending_balance

    returned_checks_transactions = Transaction.objects.filter(date=report_date, type="returned_checks")
    returned_checks = {
        "beginning_balance": 0,
        "collections": returned_checks_transactions.aggregate(total=Sum("amount"))["total"] or 0,
        "ending_balance": returned_checks_transactions.aggregate(total=Sum("amount"))["total"] or 0,
    }

    pdc_on_hand = {
        "total": 0,
        "collections": 0,
        "ending_balance": 0,
    }

    return render(request, "dashboard.html", {
        "daily_report": daily_report,
        "cash_on_hand": cash_on_hand,
        "cash_in_bank": cash_in_bank,
        "returned_checks": returned_checks,
        "total": total,
        "pdc_on_hand": pdc_on_hand,
        "today": report_date,
    })

