# core/views.py
from django.utils.timezone import now
from django.db.models import Sum
from datetime import datetime
from datetime import date as _date
from decimal import Decimal

from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils.dateparse import parse_date

from .serializers import (
    BankAccountSerializer,
    TransactionSerializer,
    DailyCashPositionSerializer,
    MonthlyReportSerializer,
    PdcSerializer,
)
from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport, Pdc
from .utils.summary import compute_bank_daily_summary


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
    queryset = Transaction.objects.all().order_by('-created_at')  # newest first by timestamp
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def detailed_daily_summary(request):
    """
    GET /summary/detailed-daily/?date=YYYY-MM-DD
    Returns cash_in_bank rows and accounts list for Banks table.
    """
    date_str = request.query_params.get("date")
    if date_str:
        try:
            target_date = _date.fromisoformat(date_str)
        except ValueError:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)
    else:
        target_date = now().date()

    bank_rows = compute_bank_daily_summary(target_date)

    accounts = []
    for b in BankAccount.objects.all().order_by("name", "account_number"):
        accounts.append({
            "id": b.id,
            "name": b.name or "",
            "account_number": b.account_number,
            "balance": float((b.balance or Decimal("0.00")).quantize(Decimal("0.01"))),
        })

    return Response({
        "date": target_date.isoformat(),
        "cash_in_bank": bank_rows,
        "accounts": accounts,
    })


# -----------------------------
# PDC ViewSet (new)
# -----------------------------
class PdcViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Post Dated Checks (PDC).
    Provides:
      - list/retrieve/update via standard ModelViewSet
      - mark_matured: POST /pdc/{id}/mark_matured/
      - deposit: POST /pdc/{id}/deposit/
      - record_returned: POST /pdc/{id}/record_returned/
    """
    queryset = Pdc.objects.all().order_by("-id")
    serializer_class = PdcSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def mark_matured(self, request, pk=None):
        """
        Mark a PDC as matured.
        Payload (optional): { "maturity_date": "YYYY-MM-DD" }
        """
        pdc = get_object_or_404(Pdc, pk=pk)
        maturity_date = request.data.get("maturity_date")
        if maturity_date:
            parsed = parse_date(maturity_date)
            if parsed is None:
                return Response({"detail": "invalid maturity_date format, expected YYYY-MM-DD"},
                                status=status.HTTP_400_BAD_REQUEST)
            pdc.maturity_date = parsed

        pdc.status = Pdc.STATUS_MATURED
        pdc.save(update_fields=["status", "maturity_date"] if maturity_date else ["status"])

        serializer = self.get_serializer(pdc)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def deposit(self, request, pk=None):
        """
        Deposit a matured PDC into a bank account.
        Expected payload:
          { "bank_account_id": 123, "deposit_date": "YYYY-MM-DD", "reference": "DEP-001" }
        """
        pdc = get_object_or_404(Pdc, pk=pk)
        bank_account_id = request.data.get("bank_account_id")
        deposit_date = request.data.get("deposit_date")
        reference = request.data.get("reference", "")

        if not bank_account_id:
            return Response({"detail": "bank_account_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            bank = BankAccount.objects.get(pk=bank_account_id)
        except BankAccount.DoesNotExist:
            return Response({"detail": "bank account not found"}, status=status.HTTP_400_BAD_REQUEST)

        deposit_date_parsed = None
        if deposit_date:
            deposit_date_parsed = parse_date(deposit_date)
            if deposit_date_parsed is None:
                return Response({"detail": "invalid deposit_date format, expected YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        # Create a Transaction record for the deposit so bank balances and daily positions update
        Transaction.objects.create(
            bank_account=bank,
            date=deposit_date_parsed or now().date(),
            type="deposit",
            amount=pdc.amount,
            description=f"PDC deposit ref:{reference} pdc_id:{pdc.id}",
            created_by=request.user if request.user.is_authenticated else None
        )

        pdc.deposit_bank = bank
        pdc.date_deposited = deposit_date_parsed
        pdc.status = Pdc.STATUS_DEPOSITED
        pdc.save(update_fields=["deposit_bank", "date_deposited", "status"])

        serializer = self.get_serializer(pdc)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def record_returned(self, request, pk=None):
        """
        Mark a PDC as returned.
        Expected payload:
          { "returned_date": "YYYY-MM-DD", "returned_reason": "Insufficient funds" }
        """
        pdc = get_object_or_404(Pdc, pk=pk)
        returned_date = request.data.get("returned_date")
        returned_reason = request.data.get("returned_reason", "")

        returned_date_parsed = None
        if returned_date:
            returned_date_parsed = parse_date(returned_date)
            if returned_date_parsed is None:
                return Response({"detail": "invalid returned_date format, expected YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        # Choose a bank for the returned transaction: prefer deposit_bank, otherwise first bank
        bank_for_return = pdc.deposit_bank if pdc.deposit_bank else BankAccount.objects.first()

        if bank_for_return is None:
            return Response({"detail": "no bank account available to record returned check"}, status=status.HTTP_400_BAD_REQUEST)

        Transaction.objects.create(
            bank_account=bank_for_return,
            date=returned_date_parsed or now().date(),
            type="returned_check",
            amount=pdc.amount,
            description=f"PDC returned pdc_id:{pdc.id} reason:{returned_reason}",
            created_by=request.user if request.user.is_authenticated else None
        )

        pdc.status = Pdc.STATUS_RETURNED
        pdc.returned_date = returned_date_parsed
        pdc.returned_reason = returned_reason
        pdc.save(update_fields=["status", "returned_date", "returned_reason"])

        serializer = self.get_serializer(pdc)
        return Response(serializer.data, status=status.HTTP_200_OK)