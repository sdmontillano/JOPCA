# core/views.py
from django.utils.timezone import now
from django.db.models import Sum
from datetime import datetime
from datetime import date as _date
from datetime import timedelta
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
    PettyCashFundSerializer,
    PettyCashFundMinimalSerializer,
    PettyCashTransactionSerializer,
    CashCountSerializer,
)
from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport, Pdc, PettyCashFund, PettyCashTransaction, CashCount
from .utils.summary import compute_bank_daily_summary
from .export_views import pcf_export_excel, pcf_export_pdf


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
    Returns cash_in_bank rows, accounts list, and cash_on_hand (PCF) for the Dashboard.
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

    cash_on_hand = []
    for pcf in PettyCashFund.objects.filter(is_active=True):
        beginning = pcf.opening_balance
        previous_txns = PettyCashTransaction.objects.filter(pcf=pcf, date__lt=target_date)
        for t in previous_txns:
            if t.type == 'disbursement':
                beginning -= t.amount
            elif t.type == 'replenishment':
                beginning += t.amount

        daily_txns = PettyCashTransaction.objects.filter(pcf=pcf, date=target_date)
        disbursements = daily_txns.filter(type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        replenishments = daily_txns.filter(type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        total_disb = PettyCashTransaction.objects.filter(pcf=pcf, date__lte=target_date, type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_rep = PettyCashTransaction.objects.filter(pcf=pcf, date__lte=target_date, type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        unreplenished = max(Decimal('0.00'), total_disb - total_rep)
        ending = beginning - disbursements + replenishments

        cash_on_hand.append({
            "id": pcf.id,
            "name": pcf.name,
            "location": pcf.location,
            "location_display": pcf.get_location_display(),
            "beginning": float(beginning),
            "disbursements": float(disbursements),
            "replenishments": float(replenishments),
            "ending": float(ending),
            "unreplenished": float(unreplenished),
            "current_balance": float(pcf.current_balance),
            "unreplenished_amount": float(pcf.unreplenished_amount),
        })

    return Response({
        "date": target_date.isoformat(),
        "cash_in_bank": bank_rows,
        "accounts": accounts,
        "cash_on_hand": cash_on_hand,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def detailed_daily_summary_range(request):
    """
    GET /summary/detailed-daily-range/?start=YYYY-MM-DD&end=YYYY-MM-DD
    Returns a mapping of date -> { cash_in_bank: [...], accounts: [...] } for each date in the inclusive range.
    """
    start_str = request.query_params.get("start")
    end_str = request.query_params.get("end")

    if not start_str or not end_str:
        return Response({"detail": "start and end parameters required (YYYY-MM-DD)."}, status=400)

    try:
        start_date = _date.fromisoformat(start_str)
        end_date = _date.fromisoformat(end_str)
    except ValueError:
        return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)

    if end_date < start_date:
        return Response({"detail": "end must be >= start"}, status=400)

    result = {}
    cur = start_date
    while cur <= end_date:
        bank_rows = compute_bank_daily_summary(cur)

        accounts = []
        for b in BankAccount.objects.all().order_by("name", "account_number"):
            accounts.append({
                "id": b.id,
                "name": b.name or "",
                "account_number": b.account_number,
                "balance": float((b.balance or Decimal("0.00")).quantize(Decimal("0.01"))),
            })

        result[cur.isoformat()] = {
            "cash_in_bank": bank_rows,
            "accounts": accounts,
        }
        cur = cur + timedelta(days=1)

    return Response(result)


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


# ---------------------------------------------------------------------
# PCF ViewSets
# ---------------------------------------------------------------------
class PettyCashFundViewSet(viewsets.ModelViewSet):
    queryset = PettyCashFund.objects.all().order_by('name')
    serializer_class = PettyCashFundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PettyCashFundMinimalSerializer
        return PettyCashFundSerializer

    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        pcf = self.get_object()
        return Response({
            'pcf_id': pcf.id,
            'pcf_name': pcf.name,
            'current_balance': float(pcf.current_balance),
            'total_disbursements': float(pcf.total_disbursements),
            'total_replenishments': float(pcf.total_replenishments),
            'unreplenished_amount': float(pcf.unreplenished_amount),
        })

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def add_balance(self, request, pk=None):
        pcf = self.get_object()
        amount = request.data.get('amount')
        date_str = request.data.get('date')
        description = request.data.get('description', '')

        if not amount:
            return Response({'detail': 'amount is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
        except Exception:
            return Response({'detail': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

        tx_date = parse_date(date_str) if date_str else now().date()

        txn = PettyCashTransaction.objects.create(
            pcf=pcf,
            date=tx_date,
            type='replenishment',
            amount=amount,
            description=description,
            created_by=request.user if request.user.is_authenticated else None
        )

        serializer = PettyCashTransactionSerializer(txn, context={'request': request})
        return Response({
            'message': 'Balance added successfully',
            'transaction': serializer.data,
            'new_balance': float(pcf.current_balance),
        }, status=status.HTTP_201_CREATED)


class PettyCashTransactionViewSet(viewsets.ModelViewSet):
    queryset = PettyCashTransaction.objects.all().order_by('-date', '-created_at')
    serializer_class = PettyCashTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        pcf_id = self.request.query_params.get('pcf_id')
        if pcf_id:
            qs = qs.filter(pcf_id=pcf_id)
        return qs


class CashCountViewSet(viewsets.ModelViewSet):
    queryset = CashCount.objects.all().order_by('-count_date', '-created_at')
    serializer_class = CashCountSerializer
    permission_classes = [permissions.IsAuthenticated]


# ---------------------------------------------------------------------
# Summary Endpoints
# ---------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def bank_reconciliation_summary(request):
    """
    GET /summary/bank-reconciliation/
    Returns PCF breakdown, Bank breakdown, and reconciliation totals.
    """
    pcfs = PettyCashFund.objects.filter(is_active=True)
    pcf_breakdown = []
    total_available = Decimal('0.00')
    total_unreplenished = Decimal('0.00')

    for pcf in pcfs:
        available = pcf.current_balance
        unrep = pcf.unreplenished_amount
        pcf_breakdown.append({
            'pcf_id': pcf.id,
            'pcf_name': pcf.name,
            'location': pcf.location,
            'location_display': pcf.get_location_display(),
            'available_balance': float(available),
            'unreplenished': float(unrep),
        })
        total_available += available
        total_unreplenished += unrep

    banks = BankAccount.objects.all()
    bank_breakdown = []
    bank_total = Decimal('0.00')
    for bank in banks:
        bank_breakdown.append({
            'bank_id': bank.id,
            'bank_name': bank.name or '',
            'account_number': bank.account_number,
            'balance': float(bank.balance),
        })
        bank_total += bank.balance or Decimal('0.00')

    expected_bank = bank_total + total_unreplenished
    total_cash = total_available + bank_total
    variance = total_cash - expected_bank

    return Response({
        'pcf': {
            'breakdown': pcf_breakdown,
            'total_available': float(total_available),
            'total_unreplenished': float(total_unreplenished),
        },
        'bank': {
            'breakdown': bank_breakdown,
            'total': float(bank_total),
        },
        'reconciliation': {
            'expected_bank_after_replenishment': float(expected_bank),
            'total_cash': float(total_cash),
            'variance': float(variance),
            'is_balanced': abs(variance) < Decimal('0.01'),
        }
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cash_counts_summary(request):
    """
    GET /summary/cash-counts/
    Returns latest cash count for each PCF and summary.
    """
    pcfs = PettyCashFund.objects.filter(is_active=True)
    summary = []

    for pcf in pcfs:
        last_count = pcf.cash_counts.first()
        summary.append({
            'pcf_id': pcf.id,
            'pcf_name': pcf.name,
            'location': pcf.location,
            'location_display': pcf.get_location_display(),
            'system_balance': float(pcf.current_balance),
            'last_count_date': last_count.count_date.isoformat() if last_count else None,
            'last_actual_count': float(last_count.actual_count) if last_count else None,
            'last_variance': float(last_count.variance) if last_count else None,
        })

    return Response({'summary': summary})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pcf_alerts(request):
    """
    GET /summary/pcf-alerts/
    Returns alerts for PCFs below threshold or with unreplenished amounts.
    """
    pcfs = PettyCashFund.objects.filter(is_active=True)
    alerts = []

    for pcf in pcfs:
        if pcf.current_balance < pcf.min_balance_threshold:
            alerts.append({
                'id': f'low_balance_{pcf.id}',
                'pcf_id': pcf.id,
                'pcf_name': pcf.name,
                'type': 'low_balance',
                'severity': 'warning',
                'message': f'{pcf.name} balance ({float(pcf.current_balance):,.2f}) is below threshold ({float(pcf.min_balance_threshold):,.2f})',
            })

        if pcf.unreplenished_amount > Decimal('0.00'):
            alerts.append({
                'id': f'unreplenished_{pcf.id}',
                'pcf_id': pcf.id,
                'pcf_name': pcf.name,
                'type': 'unreplenished',
                'severity': 'warning',
                'message': f'{pcf.name} has unreplenished amount of {float(pcf.unreplenished_amount):,.2f}',
            })

    return Response({'alerts': alerts})


# ---------------------------------------------------------------------
# PCF Report Endpoints
# ---------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pcf_daily_report(request):
    """
    GET /api/reports/pcf-daily/?date=YYYY-MM-DD
    Returns daily PCF report.
    """
    date_str = request.query_params.get('date')
    target_date = parse_date(date_str) if date_str else now().date()

    pcfs = PettyCashFund.objects.filter(is_active=True)
    pcf_data = []
    totals = {'beginning': Decimal('0.00'), 'disbursements': Decimal('0.00'),
              'replenishments': Decimal('0.00'), 'unreplenished': Decimal('0.00'), 'ending': Decimal('0.00')}

    for pcf in pcfs:
        beginning = pcf.opening_balance
        previous_txns = PettyCashTransaction.objects.filter(pcf=pcf, date__lt=target_date)
        for t in previous_txns:
            if t.type == 'disbursement':
                beginning -= t.amount
            elif t.type == 'replenishment':
                beginning += t.amount

        daily_txns = PettyCashTransaction.objects.filter(pcf=pcf, date=target_date)
        disbursements = daily_txns.filter(type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        replenishments = daily_txns.filter(type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        total_disb = PettyCashTransaction.objects.filter(pcf=pcf, date__lte=target_date, type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_rep = PettyCashTransaction.objects.filter(pcf=pcf, date__lte=target_date, type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        unreplenished = max(Decimal('0.00'), total_disb - total_rep)
        ending = beginning - disbursements + replenishments

        pcf_data.append({
            'pcf_id': pcf.id,
            'pcf_name': pcf.name,
            'location': pcf.location,
            'location_display': pcf.get_location_display(),
            'beginning': float(beginning),
            'disbursements': float(disbursements),
            'replenishments': float(replenishments),
            'unreplenished': float(unreplenished),
            'ending': float(ending),
        })

        totals['beginning'] += beginning
        totals['disbursements'] += disbursements
        totals['replenishments'] += replenishments
        totals['unreplenished'] += unreplenished
        totals['ending'] += ending

    return Response({
        'date': target_date.isoformat(),
        'pufs': pcf_data,
        'totals': {k: float(v) for k, v in totals.items()}
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pcf_weekly_report(request):
    """
    GET /api/reports/pcf-weekly/?start=YYYY-MM-DD&end=YYYY-MM-DD
    Returns weekly PCF report.
    """
    start_str = request.query_params.get('start')
    end_str = request.query_params.get('end')
    start_date = parse_date(start_str) if start_str else now().date() - timedelta(days=7)
    end_date = parse_date(end_str) if end_str else now().date()

    pcfs = PettyCashFund.objects.filter(is_active=True)
    pcf_data = []
    totals = {'disbursements': Decimal('0.00'), 'replenishments': Decimal('0.00'), 'unreplenished': Decimal('0.00')}

    for pcf in pcfs:
        txns = PettyCashTransaction.objects.filter(pcf=pcf, date__gte=start_date, date__lte=end_date)
        disbursements = txns.filter(type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        replenishments = txns.filter(type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        total_disb = PettyCashTransaction.objects.filter(pcf=pcf, date__lte=end_date, type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_rep = PettyCashTransaction.objects.filter(pcf=pcf, date__lte=end_date, type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        unreplenished = max(Decimal('0.00'), total_disb - total_rep)

        pcf_data.append({
            'pcf_id': pcf.id,
            'pcf_name': pcf.name,
            'location': pcf.location,
            'location_display': pcf.get_location_display(),
            'disbursements': float(disbursements),
            'replenishments': float(replenishments),
            'unreplenished': float(unreplenished),
        })

        totals['disbursements'] += disbursements
        totals['replenishments'] += replenishments
        totals['unreplenished'] += unreplenished

    return Response({
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'report_type': 'weekly',
        'pufs': pcf_data,
        'totals': {k: float(v) for k, v in totals.items()}
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pcf_monthly_report(request):
    """
    GET /api/reports/pcf-monthly/?year=YYYY&month=MM
    Returns monthly PCF report.
    """
    year = request.query_params.get('year', now().year)
    month = request.query_params.get('month', now().month)

    try:
        year = int(year)
        month = int(month)
    except ValueError:
        return Response({'detail': 'Invalid year or month'}, status=400)

    from calendar import monthrange
    import calendar
    start_date = _date(year, month, 1)
    end_date = _date(year, month, monthrange(year, month)[1])

    pcfs = PettyCashFund.objects.filter(is_active=True)
    pcf_data = []
    totals = {'disbursements': Decimal('0.00'), 'replenishments': Decimal('0.00'), 'unreplenished': Decimal('0.00')}

    for pcf in pcfs:
        txns = PettyCashTransaction.objects.filter(pcf=pcf, date__gte=start_date, date__lte=end_date)
        disbursements = txns.filter(type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        replenishments = txns.filter(type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        total_disb = PettyCashTransaction.objects.filter(pcf=pcf, date__lte=end_date, type='disbursement').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_rep = PettyCashTransaction.objects.filter(pcf=pcf, date__lte=end_date, type='replenishment').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        unreplenished = max(Decimal('0.00'), total_disb - total_rep)

        pcf_data.append({
            'pcf_id': pcf.id,
            'pcf_name': pcf.name,
            'location': pcf.location,
            'location_display': pcf.get_location_display(),
            'disbursements': float(disbursements),
            'replenishments': float(replenishments),
            'unreplenished': float(unreplenished),
        })

        totals['disbursements'] += disbursements
        totals['replenishments'] += replenishments
        totals['unreplenished'] += unreplenished

    return Response({
        'year': year,
        'month': month,
        'month_name': calendar.month_name[month],
        'report_type': 'monthly',
        'pufs': pcf_data,
        'totals': {k: float(v) for k, v in totals.items()}
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pcf_unreplenished_aging(request):
    """
    GET /api/reports/pcf-unreplenished-aging/
    Returns aging of unreplenished disbursements.
    """
    from datetime import timedelta as td

    pcfs = PettyCashFund.objects.filter(is_active=True)
    today = now().date()
    all_disbursements = []

    for pcf in pcfs:
        disbs = PettyCashTransaction.objects.filter(pcf=pcf, type='disbursement')
        for d in disbs:
            replenished = PettyCashTransaction.objects.filter(
                pcf=pcf, type='replenishment', date__gte=d.date
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            total_rep_for_pcf = PettyCashTransaction.objects.filter(
                pcf=pcf, type='replenishment', date__lte=today
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            total_disb_for_pcf = PettyCashTransaction.objects.filter(
                pcf=pcf, type='disbursement', date__lte=today
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            cumulative_unrep = max(Decimal('0.00'), total_disb_for_pcf - total_rep_for_pcf)
            if cumulative_unrep > 0:
                all_disbursements.append({
                    'id': d.id,
                    'pcf_id': pcf.id,
                    'pcf_name': pcf.name,
                    'location': pcf.location,
                    'location_display': pcf.get_location_display(),
                    'date': d.date.isoformat(),
                    'amount': float(d.amount),
                    'days_outstanding': (today - d.date).days,
                })

    buckets = {
        '0_15_days': {'label': '0-15 Days', 'total': Decimal('0.00'), 'count': 0, 'transactions': []},
        '16_30_days': {'label': '16-30 Days', 'total': Decimal('0.00'), 'count': 0, 'transactions': []},
        '31_60_days': {'label': '31-60 Days', 'total': Decimal('0.00'), 'count': 0, 'transactions': []},
        '61_plus_days': {'label': '61+ Days', 'total': Decimal('0.00'), 'count': 0, 'transactions': []},
    }

    for d in all_disbursements:
        days = d['days_outstanding']
        amt = Decimal(str(d['amount']))

        if days <= 15:
            bucket = buckets['0_15_days']
        elif days <= 30:
            bucket = buckets['16_30_days']
        elif days <= 60:
            bucket = buckets['31_60_days']
        else:
            bucket = buckets['61_plus_days']

        bucket['transactions'].append(d)
        bucket['count'] += 1
        bucket['total'] += amt

    for bucket in buckets.values():
        bucket['total'] = float(bucket['total'])

    total_outstanding = sum(Decimal(str(b['total'])) for b in buckets.values())

    return Response({
        'as_of_date': today.isoformat(),
        'total_outstanding': float(total_outstanding),
        'aging_buckets': buckets,
    })


# ---------------------------------------------------------------------
# Export Views (connected to API)
# ---------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_pcf_excel(request):
    """
    GET /api/reports/export/excel/?type=daily&date=YYYY-MM-DD
    """
    return pcf_export_excel(request)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_pcf_pdf(request):
    """
    GET /api/reports/export/pdf/?type=daily&date=YYYY-MM-DD
    """
    return pcf_export_pdf(request)