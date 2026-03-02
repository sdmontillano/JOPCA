from django.utils.timezone import now
from django.db.models import Sum
from datetime import datetime
from rest_framework import viewsets, generics, permissions
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .serializers import (
    BankAccountSerializer,
    TransactionSerializer,
    DailyCashPositionSerializer,
    MonthlyReportSerializer,
    DailySummarySerializer,
    CashPositionSummarySerializer,
)
from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport

# -----------------------------
# ViewSets (CRUD endpoints)
# -----------------------------

class MonthlyReportViewSet(viewsets.ModelViewSet):
    queryset = MonthlyReport.objects.all().order_by('-month')
    serializer_class = MonthlyReportSerializer
    permission_classes = [permissions.IsAuthenticated]

class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.all()
    serializer_class = BankAccountSerializer
    permission_classes = [permissions.IsAuthenticated]

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by('-date')
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

class DailyCashPositionViewSet(viewsets.ModelViewSet):
    queryset = DailyCashPosition.objects.all().order_by('-date')
    serializer_class = DailyCashPositionSerializer
    permission_classes = [permissions.IsAuthenticated]

class TransactionListCreate(generics.ListCreateAPIView):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

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
        "pdc": daily.pdc,
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
    """Return aggregated cash position across all accounts."""
    totals = Transaction.objects.aggregate(
        total_debits=Sum("debit"),
        total_credits=Sum("credit"),
    )
    serializer = CashPositionSummarySerializer(totals)
    return Response(serializer.data)

