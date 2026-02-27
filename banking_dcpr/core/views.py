from django.utils.timezone import now
from django.db.models import Sum
from datetime import datetime
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport
from .serializers import (
    BankAccountSerializer,
    TransactionSerializer,
    DailyCashPositionSerializer,
    MonthlyReportSerializer,
    DailySummarySerializer,
    CashPositionSummarySerializer,
)

# -----------------------------
# ViewSets (CRUD endpoints)
# -----------------------------

class MonthlyReportViewSet(viewsets.ModelViewSet):
    queryset = MonthlyReport.objects.all().order_by('-month')
    serializer_class = MonthlyReportSerializer

class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.all()
    serializer_class = BankAccountSerializer

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by('-date')
    serializer_class = TransactionSerializer

class DailyCashPositionViewSet(viewsets.ModelViewSet):
    queryset = DailyCashPosition.objects.all().order_by('-date')
    serializer_class = DailyCashPositionSerializer

# -----------------------------
# Summary Endpoints
# -----------------------------

@api_view(["GET"])
def daily_summary(request):
    """Return totals for a given date (default today)."""
    date_str = request.GET.get("date")
    report_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()

    daily = DailyCashPosition.objects.filter(date=report_date).first()
    if not daily:
        return Response({"detail": "No daily cash position found."}, status=404)

    data = {
        "date": daily.date,
        "total_collections": daily.collections,
        "total_disbursements": daily.disbursements,
        "ending_balance": daily.ending_balance,
        "pdc": daily.pdc,  # ✅ include PDC
    }
    serializer = DailySummarySerializer(data)
    return Response(serializer.data)


@api_view(["GET"])
def monthly_summary(request):
    """Return totals for a given month (YYYY-MM)."""
    month_str = request.GET.get("month")
    if not month_str:
        return Response({"detail": "Month parameter required (YYYY-MM)."}, status=400)

    try:
        month_date = datetime.strptime(month_str, "%Y-%m").date()
    except ValueError:
        return Response({"detail": "Invalid month format."}, status=400)

    monthly = MonthlyReport.objects.filter(month=month_date).first()
    if not monthly:
        return Response({"detail": "No monthly report found."}, status=404)

    serializer = MonthlyReportSerializer(monthly)
    return Response(serializer.data)


@api_view(["GET"])
def cash_position_summary(request):
    """Return balances grouped by area for a given date."""
    date_str = request.GET.get("date")
    report_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()

    accounts = BankAccount.objects.all()
    results = []
    for area in BankAccount.AREAS:
        area_key = area[0]
        area_accounts = accounts.filter(area=area_key)

        # Sum balances for accounts in this area
        total_balance = sum(
            DailyCashPosition.objects.filter(date=report_date, transaction__bank_account__in=area_accounts)
            .values_list("ending_balance", flat=True)
        ) or 0

        results.append({"area": area[1], "total_balance": total_balance})

    serializer = CashPositionSummarySerializer(results, many=True)
    return Response(serializer.data)

