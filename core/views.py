from django.shortcuts import render, redirect
from django.utils.timezone import now
from django.db.models import Sum
from .models import DailyCashPosition, Transaction, BankAccount
from .forms import TransactionForm

def dashboard(request):
    today = now().date()

    # Get today's daily report (if exists)
    daily_report = DailyCashPosition.objects.filter(date=today).first()

    # Fetch all bank accounts
    bank_accounts = BankAccount.objects.all()

    # Prepare data for cash on hand and cash in bank
    cash_on_hand = {}
    cash_in_bank = {}
    total = {"beginning_balance": 0, "collections": 0, "ending_balance": 0}

    for account in bank_accounts:
        account_data = {
            "beginning_balance": account.opening_balance or 0,
            "collections": Transaction.objects.filter(
                bank_account=account, date=today, type="collections"
            ).aggregate(total=Sum("amount"))["total"] or 0,
            "ending_balance": account.balance,
        }
        if "PCF" in account.name:
            cash_on_hand[account.name] = account_data
        else:
            cash_in_bank[account.name] = account_data

        # Update totals
        total["beginning_balance"] += account_data["beginning_balance"]
        total["collections"] += account_data["collections"]
        total["ending_balance"] += account_data["ending_balance"]

    # Prepare PDC on hand data
    pdc_on_hand = {
        "total": 3619450.00,  # Example value, replace with actual calculation
        "matured_for_dep": 3619450.00,
        "this_month": 0,
        "next_month": 0,
        "two_months": 0,
        "over_two_months": 0,
    }

    return render(request, "dashboard.html", {
        "daily_report": daily_report,
        "cash_on_hand": cash_on_hand,
        "cash_in_bank": cash_in_bank,
        "total": total,
        "pdc_on_hand": pdc_on_hand,
        "today": today,
    })

def add_transaction(request):
    if request.method == "POST":
        form = TransactionForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("dashboard")
    else:
        form = TransactionForm()

    return render(request, "add_transaction.html", {"form": form})

