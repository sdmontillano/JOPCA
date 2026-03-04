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
    queryset = Transaction.objects.all().order_by('-created_at')  # ✅ newest first by timestamp
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        bank_id = self.request.query_params.get("bank_account_id")
        if bank_id:
            qs = qs.filter(bank_account_id=bank_id)
        return qs

    def create(self, request, *args, **kwargs):
        """Convert Django ValidationError into a DRF 400 response."""
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
    queryset = Transaction.objects.all().order_by('-created_at')
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        bank_id = self.request.query_params.get("bank_account_id")
        account_number = self.request.query_params.get("account_number")
        tx_type = self.request.query_params.get("type")
        date = self.request.query_params.get("date")

        if bank_id:
            qs = qs.filter(bank_account_id=bank_id)
        if account_number:
            qs = qs.filter(bank_account__account_number=account_number)
        if tx_type:
            qs = qs.filter(type=tx_type)
        if date:
            qs = qs.filter(date=date)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except DjangoValidationError as e:
            messages = e.messages if hasattr(e, 'messages') else [str(e)]
            return Response({"detail": messages}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Unexpected error creating transaction (ListCreate)"
            )
            return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# -----------------------------
# Summary Endpoints
# -----------------------------

@api_view(["GET"])
def detailed_daily_report(request):
    """Return detailed breakdown of transactions by account + type + ending balances."""
    date_str = request.GET.get("date")
    report_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()

    transactions = Transaction.objects.filter(date=report_date)
    grouped = transactions.values(
        "bank_account__name",
        "bank_account__account_number",
        "type"
    ).annotate(total=Sum("amount"))

    accounts = BankAccount.objects.all().values("name", "account_number", "balance")

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
    """Return detailed breakdown of transactions by account + type for a given month."""
    month_str = request.GET.get("month")
    if not month_str:
        return Response({"detail": "Month parameter required (YYYY-MM)."}, status=400)

    try:
        month_date = datetime.strptime(month_str, "%Y-%m").date()
    except ValueError:
        return Response({"detail": "Invalid month format."}, status=400)

    transactions = Transaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month
    )
    grouped = transactions.values(
        "bank_account__name",
        "bank_account__account_number",
        "type"
    ).annotate(total=Sum("amount"))

    accounts = BankAccount.objects.all().values("name", "account_number", "balance")

    monthly = MonthlyReport.objects.filter(month=month_date).first()
    ending_balance = monthly.ending_balance if monthly else 0

    return Response({
        "month": month_date.strftime("%Y-%m"),
        "line_items": list(grouped),
        "accounts": list(accounts),
        "grand_total": ending_balance
    })

