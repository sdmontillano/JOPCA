from django.utils.timezone import now
from django.db.models import Sum
from datetime import datetime
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.exceptions import ValidationError as DjangoValidationError
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
    queryset = Transaction.objects.all().order_by('-date')  # newest first
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Override create to convert Django ValidationError into a DRF 400 response
        with a helpful message instead of letting it bubble up as a 500.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except DjangoValidationError as e:
            messages = e.messages if hasattr(e, 'messages') else [str(e)]
            return Response({"detail": messages}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            import logging
            logging.getLogger(__name__).exception("Unexpected error creating transaction")
            return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class DailyCashPositionViewSet(viewsets.ModelViewSet):
    queryset = DailyCashPosition.objects.all().order_by('-date')
    serializer_class = DailyCashPositionSerializer
    permission_classes = [permissions.IsAuthenticated]

class TransactionListCreate(generics.ListCreateAPIView):
    queryset = Transaction.objects.all().order_by('-date')  # newest first
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Mirror the same defensive behavior for the generic ListCreate view.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except DjangoValidationError as e:
            messages = e.messages if hasattr(e, 'messages') else [str(e)]
            return Response({"detail": messages}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            import logging
            logging.getLogger(__name__).exception("Unexpected error creating transaction (ListCreate)")
            return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

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
def detailed_daily_report(request):
    """Return detailed breakdown of transactions by type + ending balances."""
    date_str = request.GET.get("date")
    report_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()

    # Group transactions by type for that date
    transactions = Transaction.objects.filter(date=report_date)
    grouped = transactions.values("type").annotate(total=Sum("amount"))

    # Per-account balances
    accounts = BankAccount.objects.all().values("name", "account_number", "balance")

    # Daily cash position (ending balance)
    daily = DailyCashPosition.objects.filter(date=report_date).first()
    ending_balance = daily.ending_balance if daily else 0

    return Response({
        "date": report_date,
        "line_items": list(grouped),
        "accounts": list(accounts),
        "grand_total": ending_balance
    })


@api_view(["GET"])
def detailed_monthly_report(request):
    """Return detailed breakdown of transactions by type for a given month."""
    month_str = request.GET.get("month")

    if not month_str:
        return Response({"detail": "Month parameter required (YYYY-MM)."}, status=400)

    try:
        month_date = datetime.strptime(month_str, "%Y-%m").date()
    except ValueError:
        return Response({"detail": "Invalid month format."}, status=400)

    # Group transactions by type for that month
    transactions = Transaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month
    )
    grouped = transactions.values("type").annotate(total=Sum("amount"))

    # Per-account balances (latest balance in month)
    accounts = BankAccount.objects.all().values("name", "account_number", "balance")

    # Monthly ending balance
    monthly = MonthlyReport.objects.filter(month=month_date).first()
    ending_balance = monthly.ending_balance if monthly else 0

    return Response({
        "month": month_date.strftime("%Y-%m"),
        "line_items": list(grouped),
        "accounts": list(accounts),
        "grand_total": ending_balance
    })