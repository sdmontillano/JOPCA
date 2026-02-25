from django.shortcuts import render
from django.utils.timezone import now
from django.db.models import Sum
from .models import DailyCashPosition, Transaction
from .forms import TransactionForm

def dashboard(request):
    today = now().date()

    # Get today's daily report (if exists)
    daily_report = DailyCashPosition.objects.filter(date=today).first()

    # Compute totals directly from transactions
    collections_total = Transaction.objects.filter(
        date=today, type="collection"
    ).aggregate(total=Sum("amount"))["total"] or 0

    disbursements_total = Transaction.objects.filter(
        date=today, type__in=["disbursement", "withdrawal"]
    ).aggregate(total=Sum("amount"))["total"] or 0

    transfers_total = Transaction.objects.filter(
        date=today, type="transfer"
    ).aggregate(total=Sum("amount"))["total"] or 0

    # Get all transactions of the day
    transactions = Transaction.objects.filter(date=today)

    return render(request, "dashboard.html", {
        "daily_report": daily_report,
        "transactions": transactions,
        "collections_total": collections_total,
        "disbursements_total": disbursements_total,
        "transfers_total": transfers_total,
    })


# NEW: Add Transaction view
def add_transaction(request):
    if request.method == "POST":
        form = TransactionForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("dashboard")
    else:
        form = TransactionForm()

    return render(request, "add_transaction.html", {"form": form})