# core/views.py
import logging
from django.utils.timezone import now, timezone
from django.db.models import Sum, Count, F
from django.db import transaction
from datetime import datetime
from datetime import date as _date
from datetime import timedelta
from decimal import Decimal
import calendar

from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.utils.dateparse import parse_date


class TransactionPagination(PageNumberPagination):
    page_size = 7
    page_size_query_param = 'page_size'
    max_page_size = 100


logger = logging.getLogger(__name__)


# -----------------------------
# User Management
# -----------------------------
from django.contrib.auth.models import User
from rest_framework import serializers


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'is_superuser', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'destroy', 'partial_update', 'update']:
            # Only staff users can modify users
            if not self.request.user.is_staff:
                return [permissions.IsAdminUser()]
        return super().get_permissions()
    
    def create(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')
        is_staff = request.data.get('is_staff', False)
        is_superuser = request.data.get('is_superuser', False)
        
        if not username or not password:
            return Response(
                {'detail': 'Username and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(username=username).exists():
            return Response(
                {'detail': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email
        )
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        
        # Handle password change
        if 'password' in data and data['password']:
            instance.set_password(data['password'])
            data.pop('password', None)
        
        serializer = self.get_serializer(instance, data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_superuser:
            return Response(
                {'detail': 'Cannot delete superuser account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


# -----------------------------
# Auth Endpoints
# -----------------------------
@csrf_exempt
@api_view(['POST'])
@permission_classes([])
def obtain_auth_token_with_role(request):
    """
    Custom auth token view that returns user role (is_staff) along with token.
    CSRF handled via settings - allow any origin for token auth.
    """
    from django.contrib.auth import authenticate
    from rest_framework.authtoken.models import Token
    
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
    
    token, created = Token.objects.get_or_create(user=user)
    
    # TEMPORARILY DISABLED: Audit logging causing DB issues
    # from .models import log_audit
    # log_audit(
    #     user=user,
    #     action='login',
    #     entity='User',
    #     entity_id=user.id,
    #     description=f"User logged in: {username}",
    #     ip_address=request.META.get('REMOTE_ADDR'),
    # )
    
    return Response({
        'token': token.key,
        'user_id': user.pk,
        'username': user.username,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_admin': user.is_superuser,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_token(request):
    """Verify if the auth token is valid and return user role info."""
    return Response({
        "valid": True,
        "user_id": request.user.pk,
        "username": request.user.username,
        "is_staff": request.user.is_staff,
        "is_superuser": request.user.is_superuser,
    })


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Log user logout and delete token."""
    from rest_framework.authtoken.models import Token
    
    user = request.user
    
    # DISABLED: log_audit was causing DB errors - re-enable after fixing AuditLog model
    # from .models import log_audit
    # log_audit(
    #     user=user,
    #     action='logout',
    #     entity='User',
    #     entity_id=user.id,
    #     description=f"User logged out: {user.username}",
    #     ip_address=request.META.get('REMOTE_ADDR'),
    # )
    
    # Delete the token
    Token.objects.filter(user=user).delete()
    
    return Response({'status': 'logged_out', 'message': 'Successfully logged out'})

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
    AuditLogSerializer,
    CollectionSerializer,
)
from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport, Pdc, PettyCashFund, PettyCashTransaction, CashCount, AuditLog, Collection
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

    def _log_audit(self, action, instance, description=''):
        """Helper to create audit log entry"""
        from .models import log_audit
        log_audit(
            user=self.request.user,
            action=action,
            entity='BankAccount',
            entity_id=instance.id if instance else None,
            description=description,
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_audit('create', instance, f"Created bank account: {instance.name} ({instance.account_number})")

    @action(detail=True, methods=['post'])
    def update_balance(self, request, pk=None):
        """
        POST /api/bankaccounts/{id}/update_balance/
        Manually trigger balance recalculation for this bank account
        """
        try:
            bank_account = self.get_object()
            
            # Debug: Get transaction details
            from ..constants import INFLOW_TYPES, OUTFLOW_TYPES, ADJUSTMENT_TYPES
            all_transactions = bank_account.transaction_set.all()
            inflow_transactions = bank_account.transaction_set.filter(type__in=INFLOW_TYPES)
            outflow_transactions = bank_account.transaction_set.filter(type__in=OUTFLOW_TYPES)
            
            debug_info = {
                'bank_account': bank_account.name,
                'opening_balance': float(bank_account.opening_balance or 0),
                'current_balance': float(bank_account.balance),
                'total_transactions': all_transactions.count(),
                'inflow_transactions': inflow_transactions.count(),
                'outflow_transactions': outflow_transactions.count(),
                'inflow_total': float(inflow_transactions.aggregate(Sum('amount'))['amount__sum'] or 0),
                'outflow_total': float(outflow_transactions.aggregate(Sum('amount'))['amount__sum'] or 0),
                'recent_deposits': [
                    {
                        'id': t.id,
                        'amount': float(t.amount),
                        'type': t.type,
                        'date': str(t.date),
                        'description': t.description
                    } for t in all_transactions.filter(type='deposit').order_by('-created_at')[:5]
                ]
            }
            
            bank_account.recalc_balance()
            
            return Response({
                'success': True,
                'message': f'Balance updated for {bank_account.name}',
                'new_balance': float(bank_account.balance),
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Balance update failed'
            }, status=400)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log_audit('update', instance, f"Updated bank account: {instance.name}")

    def perform_destroy(self, instance):
        self._log_audit('delete', instance, f"Deleted bank account: {instance.name}")
        instance.delete()


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by('-date', '-id')  # newest first by date
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        bank_id = self.request.query_params.get("bank_account_id")
        if bank_id:
            qs = qs.filter(bank_account_id=bank_id)
        return qs

    def _log_audit(self, action, instance, description=''):
        """Helper to create audit log entry"""
        from .models import log_audit
        log_audit(
            user=self.request.user,
            action=action,
            entity='Transaction',
            entity_id=instance.id if instance else None,
            description=description,
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_audit('create', instance, f"Created transaction: {instance.type} - {instance.amount} for {instance.bank_account}")

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log_audit('update', instance, f"Updated transaction: {instance.type} - {instance.amount}")

    def perform_destroy(self, instance):
        self._log_audit('delete', instance, f"Deleted transaction: {instance.type} - {instance.amount}")
        instance.delete()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if this is a deposit transaction - create both collection and deposit
        if serializer.validated_data.get('type') == 'deposit':
            try:
                # Create collection transaction first
                collection_data = serializer.validated_data.copy()
                collection_data['type'] = 'collection'
                # Handle bank_account field mapping
                if 'bank_account' in collection_data:
                    collection_data['bank_account_id'] = collection_data['bank_account'].id
                collection_serializer = self.get_serializer(data=collection_data)
                collection_serializer.is_valid(raise_exception=True)
                collection_instance = collection_serializer.save()
                self._log_audit('create', collection_instance, f"Created collection transaction: {collection_instance.type} - {collection_instance.amount}")
                
                # Create deposit transaction
                deposit_instance = serializer.save()
                self._log_audit('create', deposit_instance, f"Created deposit transaction: {deposit_instance.type} - {deposit_instance.amount}")
                
                # Return both transactions
                headers = self.get_success_headers(serializer.data)
                return Response({
                    'collection_transaction': self.get_serializer(collection_instance).data,
                    'deposit_transaction': self.get_serializer(deposit_instance).data
                }, status=status.HTTP_201_CREATED, headers=headers)
                
            except DjangoValidationError as e:
                messages = e.messages if hasattr(e, 'messages') else [str(e)]
                return Response({"detail": messages}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                logger.exception("Unexpected error creating deposit transaction")
                return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Non-deposit transactions - create normally
            try:
                self.perform_create(serializer)
            except DjangoValidationError as e:
                messages = e.messages if hasattr(e, 'messages') else [str(e)]
                return Response({"detail": messages}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                logger.exception("Unexpected error creating transaction")
                return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class DailyCashPositionViewSet(viewsets.ModelViewSet):
    queryset = DailyCashPosition.objects.all().order_by('-date')
    serializer_class = DailyCashPositionSerializer
    permission_classes = [permissions.IsAuthenticated]


class FundTransferViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        try:
            from .serializers import FundTransferInputSerializer
            serializer = FundTransferInputSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

            from_bank = data['from_bank']
            to_bank = data['to_bank']
            date = data.get('date') or now().date()
            amount = data['amount']
            description = data.get('description', '')

            # Validate banks are different
            if from_bank.id == to_bank.id:
                return Response(
                    {"detail": "Cannot transfer funds to the same bank account"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                out_tx = Transaction.objects.create(
                    bank_account=from_bank,
                    date=date,
                    type='fund_transfer_out',
                    amount=amount,
                    description=f"Fund transfer to {to_bank.name if to_bank else 'Unknown Bank'}: {description}",
                    created_by=request.user if request.user.is_authenticated else None
                )
                in_tx = Transaction.objects.create(
                    bank_account=to_bank,
                    date=date,
                    type='fund_transfer_in',
                    amount=amount,
                    description=f"Fund transfer from {from_bank.name if from_bank else 'Unknown Bank'}: {description}",
                    created_by=request.user if request.user.is_authenticated else None
                )

            return Response({"outgoing_transaction": out_tx.id, "incoming_transaction": in_tx.id}, status=201)
            
        except Exception as e:
            print(f"FundTransferViewSet Error: {e}")
            return Response(
                {"detail": "Fund transfer failed"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CollectionViewSet(viewsets.ModelViewSet):
    queryset = Collection.objects.all().order_by('-created_at')
    serializer_class = CollectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        from decimal import Decimal
        total = Collection.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        undeposited = Collection.objects.filter(status=Collection.STATUS_UNDEPOSITED).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        deposited = Collection.objects.filter(status=Collection.STATUS_DEPOSITED).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        return Response({
            'total': total,
            'undeposited': undeposited,
            'deposited': deposited,
        })


class TransactionListCreate(generics.ListCreateAPIView):
    queryset = Transaction.objects.all().order_by('-date', '-id')
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = TransactionPagination

    def get_queryset(self):
        qs = super().get_queryset()
        bank_id = self.request.query_params.get("bank_account_id")
        account_number = self.request.query_params.get("account_number")
        tx_type = self.request.query_params.get("type")
        date = self.request.query_params.get("date")
        search = self.request.query_params.get("search")

        if bank_id:
            qs = qs.filter(bank_account_id=bank_id)
        if account_number:
            qs = qs.filter(bank_account__account_number__icontains=account_number)
        if tx_type:
            qs = qs.filter(type=tx_type)
        if date:
            qs = qs.filter(date=date)
        if search:
            qs = qs.filter(
                models.Q(description__icontains=search) |
                models.Q(bank_account__name__icontains=search) |
                models.Q(bank_account__account_number__icontains=search) |
                models.Q(type__icontains=search)
            )

        return qs.order_by('-date', '-id')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except DjangoValidationError as e:
            messages = e.messages if hasattr(e, 'messages') else [str(e)]
            return Response({"detail": messages}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Unexpected error creating transaction (ListCreate)")
            return Response({"detail": "Server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# -----------------------------
# Summary Endpoints
# -----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def detailed_daily_report(request):
    """Return detailed breakdown of transactions by account + type + ending balances."""
    date_str = request.GET.get("date")
    try:
        report_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()
    except ValueError:
        report_date = now().date()

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
@permission_classes([IsAuthenticated])
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

    grand_total = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    return Response({
        "month": month_date.strftime("%Y-%m"),
        "line_items": list(grouped),
        "accounts": list(accounts),
        "grand_total": float(grand_total)
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def detailed_monthly_summary(request):
    """
    GET /summary/detailed-monthly/?month=YYYY-MM
    Returns monthly summary with cash_in_bank, accounts, cash_on_hand, and cash_collections
    Compatible with dashboard expectations
    """
    month_str = request.query_params.get("month")
    if not month_str:
        return Response({"detail": "Month parameter required (YYYY-MM)."}, status=400)
    
    try:
        month_date = datetime.strptime(month_str, "%Y-%m").date()
    except ValueError:
        return Response({"detail": "Invalid month format. Use YYYY-MM."}, status=400)

    # Get the last day of the month for calculations
    last_day = calendar.monthrange(month_date.year, month_date.month)[1]
    target_date = _date(month_date.year, month_date.month, last_day)

    # Compute bank summary for the entire month
    bank_rows = compute_bank_daily_summary(target_date)

    # Get accounts
    accounts = []
    for b in BankAccount.objects.all().order_by("name", "account_number"):
        accounts.append({
            "id": b.id,
            "name": b.name or "",
            "account_number": b.account_number,
            "balance": float((b.balance or Decimal("0.00")).quantize(Decimal("0.01"))),
        })

    # Get PCF data for the month - optimized with prefetch
    cash_on_hand = []
    pcfs = list(PettyCashFund.objects.filter(is_active=True))
    pcf_ids = [p.id for p in pcfs]
    month_start = _date(month_date.year, month_date.month, 1)

    # Bulk fetch all transactions for the month
    monthly_txns_map = {}
    for t in PettyCashTransaction.objects.filter(pcf_id__in=pcf_ids, date__year=month_date.year, date__month=month_date.month):
        if t.pcf_id not in monthly_txns_map:
            monthly_txns_map[t.pcf_id] = []
        monthly_txns_map[t.pcf_id].append(t)

    # Bulk fetch cumulative totals up to target_date
    disb_cumulative = {
        r['pcf_id']: r['total'] or Decimal('0.00')
        for r in PettyCashTransaction.objects.filter(pcf_id__in=pcf_ids, date__lte=target_date, type='disbursement')
        .values('pcf_id').annotate(total=Sum('amount'))
    }
    rep_cumulative = {
        r['pcf_id']: r['total'] or Decimal('0.00')
        for r in PettyCashTransaction.objects.filter(pcf_id__in=pcf_ids, date__lte=target_date, type='replenishment')
        .values('pcf_id').annotate(total=Sum('amount'))
    }

    for pcf in pcfs:
        beginning = pcf.opening_balance
        pcf_id = pcf.id

        # Calculate beginning from transactions before month
        prev_txns = PettyCashTransaction.objects.filter(pcf_id=pcf_id, date__lt=month_start)
        for t in prev_txns:
            if t.type == 'disbursement':
                beginning -= t.amount
            elif t.type == 'replenishment':
                beginning += t.amount

        monthly_txns = monthly_txns_map.get(pcf_id, [])
        disbursements = sum(t.amount for t in monthly_txns if t.type == 'disbursement')
        replenishments = sum(t.amount for t in monthly_txns if t.type == 'replenishment')

        total_disb = disb_cumulative.get(pcf_id, Decimal('0.00'))
        total_rep = rep_cumulative.get(pcf_id, Decimal('0.00'))
        unreplenished = max(Decimal('0.00'), total_disb - total_rep)
        ending = beginning - disbursements + replenishments

        transactions = [
            {
                "id": t.id,
                "type": t.type,
                "amount": float(t.amount),
                "description": t.description or "",
                "date": str(t.date)
            }
            for t in sorted(monthly_txns, key=lambda x: (x.date, x.id), reverse=True)
        ]

        cash_on_hand.append({
            "id": pcf.id,
            "name": pcf.name,
            "location": pcf.location,
            "location_display": pcf.get_location_display(),
            "note": pcf.note or "",
            "beginning": float(beginning),
            "disbursements": float(disbursements),
            "replenishments": float(replenishments),
            "ending": float(ending),
            "unreplenished": float(unreplenished),
            "current_balance": float(pcf.current_balance),
            "unreplenished_amount": float(pcf.unreplenished_amount),
            "transactions": transactions,
        })

    # PDC Summary for the month
    active_pdcs = Pdc.objects.exclude(status__in=['deposited', 'returned'])
    this_month_pdcs = active_pdcs.filter(
        maturity_date__year=month_date.year,
        maturity_date__month=month_date.month
    )
    matured_pdcs = Pdc.objects.filter(status='matured')
    
    this_month_total = this_month_pdcs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    total_active_total = active_pdcs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    matured_total = matured_pdcs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    pdc_summary = {
        'this_month': float(this_month_total),
        'total': float(total_active_total),
        'matured': float(matured_total),
    }

    # Compute collections summary for the month
    cash_collections = compute_collections_summary(target_date)

    return Response({
        "month": month_date.strftime("%Y-%m"),
        "cash_in_bank": bank_rows,
        "accounts": accounts,
        "cash_on_hand": cash_on_hand,
        "cash_collections": cash_collections,
        "pdc_summary": pdc_summary,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def monthly_full_report(request):
    """
    GET /summary/monthly-full/?month=YYYY-MM
    Returns complete monthly report with all transactions
    """
    month_str = request.GET.get("month")
    if not month_str:
        return Response({"detail": "Month parameter required (YYYY-MM)."}, status=400)
    
    try:
        month_date = datetime.strptime(month_str, "%Y-%m").date()
    except ValueError:
        return Response({"detail": "Invalid month format."}, status=400)
    
    # 1. BANK TRANSACTIONS
    bank_transactions = Transaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month
    ).select_related('bank_account').order_by('date', '-id')
    
    bank_txn_list = [
        {
            "id": t.id,
            "date": str(t.date),
            "bank_name": t.bank_account.name if t.bank_account else "N/A",
            "account_number": t.bank_account.account_number if t.bank_account else "N/A",
            "type": t.type,
            "description": t.description or "",
            "amount": float(t.amount),
        }
        for t in bank_transactions
    ]
    
    # 2. PCF TRANSACTIONS
    pcf_transactions = PettyCashTransaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month
    ).select_related('pcf').order_by('date', '-id')
    
    pcf_txn_list = [
        {
            "id": t.id,
            "date": str(t.date),
            "pcf_name": t.pcf.name if t.pcf else "N/A",
            "location": t.pcf.get_location_display() if t.pcf else (t.pcf.location if t.pcf else "N/A"),
            "type": t.type,
            "description": t.description or "",
            "amount": float(t.amount),
        }
        for t in pcf_transactions
    ]
    
    # 3. PDC FOR MONTH
    pdc_this_month = Pdc.objects.filter(
        maturity_date__year=month_date.year,
        maturity_date__month=month_date.month
    ).values(
        "id", "check_no", "amount", "status", "maturity_date"
    ).annotate(bank_name=F('deposit_bank__name'))
    
    # 4. GROUPED SUMMARIES - BY ACCOUNT
    bank_by_account = Transaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month
    ).values(
        "bank_account__name", "bank_account__account_number"
    ).annotate(
        total=Sum('amount'),
        count=Count('id')
    )
    
    # 5. GROUPED SUMMARIES - BY TYPE (with signed amounts)
    bank_by_type_query = Transaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month
    ).values("type").annotate(
        total=Sum('amount'),
        count=Count('id')
    )
    
    # Apply signed amounts based on transaction type - import from constants
    from .constants import INFLOW_TYPES, OUTFLOW_TYPES
    
    bank_by_type = []
    for item in bank_by_type_query:
        item_type = item['type'].lower()
        if item_type in OUTFLOW_TYPES:
            item['total'] = -abs(float(item['total']))  # Make negative
        else:
            item['total'] = abs(float(item['total']))  # Keep positive
        bank_by_type.append(item)
    
    # 6. TOTALS - Split inflows and outflows
    bank_total_query = Transaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month
    )
    
    inflows = Decimal('0.00')
    outflows = Decimal('0.00')
    for t in bank_total_query:
        if t.type.lower() in INFLOW_TYPES:
            inflows += t.amount
        elif t.type.lower() in OUTFLOW_TYPES:
            outflows += t.amount
    
    bank_net = inflows - outflows
    
    pcf_total_disb = PettyCashTransaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month,
        type='disbursement'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    pcf_total_rep = PettyCashTransaction.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month,
        type='replenishment'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    pdc_total = pdc_this_month.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # 7. UNDEPOSITED CASH (from Collection model - only undeposited for THIS MONTH)
    month_undeposited = Collection.objects.filter(
        status=Collection.STATUS_UNDEPOSITED,
        date__year=month_date.year,
        date__month=month_date.month
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    # Keep all-time undeposited for display (optional)
    undeposited_total = Collection.objects.filter(status=Collection.STATUS_UNDEPOSITED).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # 8. COLLECTIONS VS DEPOSITS BREAKDOWN (like daily reports)
    from .constants import DEPOSIT_TYPES, LOCAL_DEPOSIT_TYPES
    
    # Calculate collections and deposits separately for monthly report
    # collections = bank transactions + THIS MONTH's collection records only
    bank_collection_txns = bank_transactions.filter(type="collection").exclude(type__in=DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    monthly_collections_from_model = Collection.objects.filter(
        date__year=month_date.year,
        date__month=month_date.month
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    monthly_collections = bank_collection_txns + monthly_collections_from_model
    monthly_deposits = bank_transactions.filter(type__in=DEPOSIT_TYPES | LOCAL_DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    
    # 8. BANK BALANCE SUMMARY BY BANK (like daily reports)
    bank_balance_summary = []
    banks = BankAccount.objects.all().order_by("name", "account_number")
    
    for bank in banks:
        # Monthly transactions for this bank
        bank_monthly_txns = bank_transactions.filter(bank_account=bank)
        
        # Collections and deposits for this bank
        bank_collections = bank_monthly_txns.filter(type="collection").exclude(type__in=DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        bank_deposits = bank_monthly_txns.filter(type__in=DEPOSIT_TYPES | LOCAL_DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        # Monthly inflows and outflows for this bank
        bank_monthly_inflows = bank_monthly_txns.filter(type__in=INFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        bank_monthly_outflows = bank_monthly_txns.filter(type__in=OUTFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        # Get monthly adjustments
        monthly_adjustment_in = bank_monthly_txns.filter(type="adjustment_in").aggregate(total=Sum("amount"))["total"] or Decimal("0")
        monthly_adjustment_out = bank_monthly_txns.filter(type="adjustment_out").aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        # Monthly net change
        bank_monthly_net = bank_monthly_inflows - bank_monthly_outflows + monthly_adjustment_in - monthly_adjustment_out
        
        bank_balance_summary.append({
            "bank_name": bank.name,
            "account_number": bank.account_number,
            "location": bank.area or "",
            "beginning_balance": float(bank.balance - bank_monthly_net),
            "collections": float(bank_collections),
            "local_deposits": float(bank_deposits),
            "inflows": float(bank_monthly_inflows),
            "outflows": float(bank_monthly_outflows),
            "adjustment_in": float(monthly_adjustment_in),
            "adjustment_out": float(monthly_adjustment_out),
            "net_change": float(bank_monthly_net),
            "ending_balance": float(bank.balance),
            "transaction_count": bank_monthly_txns.count()
        })
    
    return Response({
        "month": month_date.strftime("%Y-%m"),
        "bank_transactions": bank_txn_list,
        "pcf_transactions": pcf_txn_list,
        "pdc_this_month": list(pdc_this_month),
        "bank_balance_summary": bank_balance_summary,
        "summary": {
            "bank_txn_count": bank_transactions.count(),
            "bank_inflows": float(inflows),
            "bank_outflows": float(outflows),
            "bank_net": float(bank_net),
            "monthly_collections": float(monthly_collections),
            "monthly_deposits": float(monthly_deposits),
            "undeposited_total": float(month_undeposited),
            "pcf_txn_count": pcf_transactions.count(),
            "pcf_total_disbursements": float(pcf_total_disb),
            "pcf_total_replenishments": float(pcf_total_rep),
            "pcf_net": float(pcf_total_rep - pcf_total_disb),
            "pdc_count": pdc_this_month.count(),
            "pdc_total": float(pdc_total),
        },
        "grouped_by_account": list(bank_by_account),
        "grouped_by_type": list(bank_by_type),
    })


def compute_collections_summary(target_date):
    """
    Compute collections summary grouped by bank, similar to PCF.
    Returns list of dicts with: bank_name, location, beginning, collections, local_deposits, ending, transactions.
    
    CORRECT FORMULA: Ending = Beginning + Deposits - Disbursements
    (collection is tracking only, NOT in balance formula)
    """
    from django.db.models import Sum
    from .constants import DEPOSIT_TYPES, LOCAL_DEPOSIT_TYPES, OUTFLOW_TYPES, FUND_TRANSFER_IN, FUND_TRANSFER_OUT
    
    rows = []
    banks = BankAccount.objects.all().order_by("name", "account_number")

    for bank in banks:
        # Beginning: opening + prior deposits only (NOT collections)
        prior_deposits = (
            Transaction.objects.filter(bank_account=bank, date__lt=target_date, type__in=DEPOSIT_TYPES)
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        prior_disbursements = (
            Transaction.objects.filter(bank_account=bank, date__lt=target_date, type__in=OUTFLOW_TYPES)
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        prior_transfers_in = (
            Transaction.objects.filter(bank_account=bank, date__lt=target_date, type__in=FUND_TRANSFER_IN)
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        prior_transfers_out = (
            Transaction.objects.filter(bank_account=bank, date__lt=target_date, type__in=FUND_TRANSFER_OUT)
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        beginning = max(bank.opening_balance + prior_deposits - prior_disbursements + prior_transfers_in - prior_transfers_out, Decimal("0"))

        # Today's transactions
        today_txns = Transaction.objects.filter(bank_account=bank, date=target_date)
        
        # For report columns (tracking)
        collections = today_txns.filter(type="collection").aggregate(total=Sum("amount"))["total"] or Decimal("0")
        local_deposits = today_txns.filter(type__in=DEPOSIT_TYPES | LOCAL_DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        # For balance formula
        deposits = today_txns.filter(type__in=DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        disbursements = today_txns.filter(type__in=OUTFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        transfers_in = today_txns.filter(type__in=FUND_TRANSFER_IN).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        transfers_out = today_txns.filter(type__in=FUND_TRANSFER_OUT).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # CORRECT FORMULA: Ending = Beginning + Deposits - Disbursements + TransfersIn - TransfersOut
        ending = beginning + deposits - disbursements + transfers_in - transfers_out

        # Get today's transactions with descriptions (collections and deposits for reporting)
        transactions = [
            {
                "id": t.id,
                "type": t.type,
                "amount": float(t.amount),
                "description": t.description or "",
                "date": str(t.date)
            }
            for t in today_txns.filter(type="collection").order_by("-date", "-id")
        ]
        # Also add deposit transactions
        deposit_txns = [
            {
                "id": t.id,
                "type": t.type,
                "amount": float(t.amount),
                "description": t.description or "",
                "date": str(t.date)
            }
            for t in today_txns.filter(type__in=DEPOSIT_TYPES).order_by("-date", "-id")
        ]
        transactions.extend(deposit_txns)
        # Local deposits
        local_deposit_txns = [
            {
                "id": t.id,
                "type": t.type,
                "amount": float(t.amount),
                "description": t.description or "",
                "date": str(t.date)
            }
            for t in today_txns.filter(type__in=LOCAL_DEPOSIT_TYPES).order_by("-date", "-id")
        ]
        transactions.extend(local_deposit_txns)

        rows.append({
            "bank_id": bank.id,
            "name": bank.name,
            "account_number": bank.account_number,
            "location": "BANK",
            "beginning": float(beginning),
            "collections": float(collections),  # tracking only
            "local_deposits": float(local_deposits),  # tracking only
            "ending": float(ending),
            "transactions": transactions,
        })

    return rows


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def detailed_daily_summary(request):
    """
    GET /summary/detailed-daily/?date=YYYY-MM-DD
    Returns cash_in_bank rows, accounts list, cash_on_hand (PCF), and cash_collections for the Dashboard.
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
    pcfs = list(PettyCashFund.objects.filter(is_active=True))
    pcf_ids = [p.id for p in pcfs]

    # Bulk fetch daily transactions
    daily_txns_map = {}
    for t in PettyCashTransaction.objects.filter(pcf_id__in=pcf_ids, date=target_date):
        if t.pcf_id not in daily_txns_map:
            daily_txns_map[t.pcf_id] = []
        daily_txns_map[t.pcf_id].append(t)

    # Bulk fetch cumulative totals
    disb_cumulative = {
        r['pcf_id']: r['total'] or Decimal('0.00')
        for r in PettyCashTransaction.objects.filter(pcf_id__in=pcf_ids, date__lte=target_date, type='disbursement')
        .values('pcf_id').annotate(total=Sum('amount'))
    }
    rep_cumulative = {
        r['pcf_id']: r['total'] or Decimal('0.00')
        for r in PettyCashTransaction.objects.filter(pcf_id__in=pcf_ids, date__lte=target_date, type='replenishment')
        .values('pcf_id').annotate(total=Sum('amount'))
    }

    for pcf in pcfs:
        beginning = pcf.opening_balance
        pcf_id = pcf.id

        previous_txns = PettyCashTransaction.objects.filter(pcf_id=pcf_id, date__lt=target_date)
        for t in previous_txns:
            if t.type == 'disbursement':
                beginning -= t.amount
            elif t.type == 'replenishment':
                beginning += t.amount

        daily_txns = daily_txns_map.get(pcf_id, [])
        disbursements = sum(t.amount for t in daily_txns if t.type == 'disbursement')
        replenishments = sum(t.amount for t in daily_txns if t.type == 'replenishment')

        total_disb = disb_cumulative.get(pcf_id, Decimal('0.00'))
        total_rep = rep_cumulative.get(pcf_id, Decimal('0.00'))
        unreplenished = max(Decimal('0.00'), total_disb - total_rep)
        ending = beginning - disbursements + replenishments

        current_balance = pcf.current_balance or Decimal('0.00')
        unreplenished_amount = pcf.unreplenished_amount or Decimal('0.00')

        transactions = [
            {
                "id": t.id,
                "type": t.type,
                "amount": float(t.amount),
                "description": t.description or "",
                "date": str(t.date)
            }
            for t in sorted(daily_txns, key=lambda x: (x.date, x.id), reverse=True)
        ]

        cash_on_hand.append({
            "id": pcf.id,
            "name": pcf.name,
            "location": pcf.location,
            "location_display": pcf.get_location_display(),
            "note": pcf.note or "",
            "beginning": float(beginning),
            "disbursements": float(disbursements),
            "replenishments": float(replenishments),
            "ending": float(ending),
            "unreplenished": float(unreplenished),
            "current_balance": float(pcf.current_balance),
            "unreplenished_amount": float(pcf.unreplenished_amount),
            "transactions": transactions,
        })

    # PDC Summary - Calculate from Pdc model, excluding returned PDCs
    # "this_month" = Outstanding + Matured PDCs maturing this month
    # "total" = All Outstanding + Matured PDCs (not deposited, not returned)
    current_month = target_date.month
    current_year = target_date.year
    
    active_pdcs = Pdc.objects.exclude(status__in=['deposited', 'returned'])
    
    this_month_pdcs = active_pdcs.filter(
        maturity_date__year=current_year,
        maturity_date__month=current_month
    )
    
    total_active_pdcs = active_pdcs
    
    this_month_total = this_month_pdcs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    total_active_total = total_active_pdcs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    matured_pdcs = Pdc.objects.filter(status='matured')
    matured_total = matured_pdcs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    pdc_summary = {
        'this_month': float(this_month_total),
        'total': float(total_active_total),
        'matured': float(matured_total),
    }

    # Compute collections summary (grouped by bank)
    cash_collections = compute_collections_summary(target_date)
    
    # Get individual collection records for Collections KPI
    individual_collections = []
    try:
        # Try filtering by date, but also include collections with null dates
        collections_qs = Collection.objects.filter(
            models.Q(date=target_date) | models.Q(date__isnull=True)
        )
        print(f"DEBUG: Found {collections_qs.count()} collections for date {target_date}")
        
        for collection in collections_qs:
            collection_data = {
                "id": collection.id,
                "amount": float(collection.amount),
                "description": collection.description or "",
                "date": str(collection.date) if collection.date else None,
                "status": collection.status,
            }
            individual_collections.append(collection_data)
            print(f"DEBUG: Collection {collection.id}: amount={collection.amount}, date={collection.date}")
            
    except Exception as e:
        # Fallback if Collection model has different structure
        logger.warning(f"Could not fetch individual collections: {e}")
        print(f"DEBUG: Error fetching collections: {e}")
        individual_collections = []

    return Response({
        "date": target_date.isoformat(),
        "cash_in_bank": bank_rows,
        "accounts": accounts,
        "cash_on_hand": cash_on_hand,
        "cash_collections": cash_collections,
        "individual_collections": individual_collections,  # New field for KPI
        "pdc_summary": pdc_summary,
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

    # Limit date range to prevent DoS (max 31 days)
    max_days = 31
    date_diff = (end_date - start_date).days
    if date_diff > max_days:
        return Response(
            {"detail": f"Date range cannot exceed {max_days} days. Requested {date_diff} days."},
            status=400
        )

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

        # Compute collections for this date
        cash_collections = compute_collections_summary(cur)

        result[cur.isoformat()] = {
            "cash_in_bank": bank_rows,
            "accounts": accounts,
            "cash_collections": cash_collections,
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

    def _log_audit(self, action, instance, description=''):
        """Helper to create audit log entry"""
        from .models import log_audit
        log_audit(
            user=self.request.user,
            action=action,
            entity='Pdc',
            entity_id=instance.id if instance else None,
            description=description,
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_audit('create', instance, f"Created PDC: {instance.check_no} - {instance.amount}")

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log_audit('update', instance, f"Updated PDC: {instance.check_no} - {instance.status}")

    def perform_destroy(self, instance):
        self._log_audit('delete', instance, f"Deleted PDC: {instance.check_no}")
        instance.delete()

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def mark_matured(self, request, pk=None):
        """
        Mark a PDC as matured.
        Payload (optional): { "maturity_date": "YYYY-MM-DD" }
        """
        pdc = get_object_or_404(Pdc, pk=pk)
        
        if pdc.status not in (Pdc.STATUS_OUTSTANDING,):
            return Response(
                {"detail": f"Cannot mark as matured: PDC is already {pdc.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
        
        if pdc.status not in (Pdc.STATUS_MATURED,):
            return Response(
                {"detail": f"Cannot deposit: PDC is {pdc.status}, only matured PDCs can be deposited"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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

        # Create TWO Transaction records for the deposit (double-entry):
        # 1. Collections - cash received (inflow +)
        # 2. Local Deposits - cash moved to bank (outflow from cash on hand -)
        
        # Transaction 1: Collections (inflow +)
        Transaction.objects.create(
            bank_account=bank,
            date=deposit_date_parsed or now().date(),
            type="collection",
            amount=pdc.amount,
            description=f"PDC deposit ref:{reference} pdc_id:{pdc.id}",
            created_by=request.user if request.user.is_authenticated else None
        )

        # Transaction 2: Deposit (THIS adds to bank balance!)
        # deposit is the ONLY type that affects ending balance
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
        NOTE: Returned checks do NOT create transactions and do NOT affect bank balances.
        They simply mark the PDC status as 'returned' for tracking purposes.
        Expected payload:
          { "returned_date": "YYYY-MM-DD", "returned_reason": "Insufficient funds" }
        """
        pdc = get_object_or_404(Pdc, pk=pk)
        
        if pdc.status in (Pdc.STATUS_DEPOSITED, Pdc.STATUS_RETURNED):
            return Response(
                {"detail": f"Cannot mark as returned: PDC is already {pdc.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        returned_date = request.data.get("returned_date")
        returned_reason = request.data.get("returned_reason", "")

        returned_date_parsed = None
        if returned_date:
            returned_date_parsed = parse_date(returned_date)
            if returned_date_parsed is None:
                return Response({"detail": "invalid returned_date format, expected YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        # Just update PDC status - NO transaction, NO balance impact
        # Returned PDC is a failed payment attempt, not a financial transaction
        pdc.status = Pdc.STATUS_RETURNED
        pdc.returned_date = returned_date_parsed or now().date()
        pdc.returned_reason = returned_reason
        pdc.save(update_fields=["status", "returned_date", "returned_reason"])

        serializer = self.get_serializer(pdc)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def by_bank(self, request):
        """Get all returned PDC for a specific bank"""
        bank_id = request.query_params.get("bank_id")
        if not bank_id:
            return Response({"detail": "bank_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        pdcs = Pdc.objects.filter(
            deposit_bank_id=bank_id,
            status=Pdc.STATUS_RETURNED
        ).order_by("-returned_date")
        
        serializer = self.get_serializer(pdcs, many=True)
        return Response(serializer.data)


# ---------------------------------------------------------------------
# PCF ViewSets
# ---------------------------------------------------------------------
class PettyCashFundViewSet(viewsets.ModelViewSet):
    queryset = PettyCashFund.objects.all().order_by('name')
    serializer_class = PettyCashFundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _log_audit(self, action, instance, description=''):
        """Helper to create audit log entry"""
        from .models import log_audit
        log_audit(
            user=self.request.user,
            action=action,
            entity='PettyCashFund',
            entity_id=instance.id if instance else None,
            description=description,
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_audit('create', instance, f"Created PCF: {instance.name} at {instance.get_location_display()}")

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log_audit('update', instance, f"Updated PCF: {instance.name}")

    def perform_destroy(self, instance):
        self._log_audit('delete', instance, f"Deleted PCF: {instance.name}")
        instance.delete()

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

        if amount <= 0:
            return Response({'detail': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

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


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for Audit Logs.
    Provides filtering and search capabilities.
    """
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        
        # Filter by entity
        entity = self.request.query_params.get('entity')
        if entity:
            qs = qs.filter(entity=entity)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)
        
        # Search in description
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(description__icontains=search)
        
        return qs


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
# PDC Alert Endpoints
# ---------------------------------------------------------------------
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def pdc_alerts(request):
    """
    GET /summary/pdc-alerts/
    Returns alerts for PDCs maturing soon or auto-maturing today.
    Auto-matures outstanding PDCs when maturity date is reached.
    """
    alerts = []
    today = now().date()
    days_before_warning = 3
    
    # Auto-update: outstanding PDCs that reached maturity (use individual save instead of bulk update)
    matured_pdcs = list(Pdc.objects.filter(
        status='outstanding',
        maturity_date__lte=today
    ))
    for pdc in matured_pdcs:
        pdc.status = 'matured'
        pdc.save(update_fields=['status'])
        alerts.append({
            'id': f'pdc_{pdc.id}_matured',
            'pdc_id': pdc.id,
            'check_no': pdc.check_no,
            'type': 'pdc_matured_auto',
            'severity': 'success',
            'message': f'PDC {pdc.check_no} auto-matured on {pdc.maturity_date.strftime("%b %d, %Y")}',
        })
    
    # Get PDCs maturing in the next X days (warning) - exclude already matured
    warning_date = today + timedelta(days=days_before_warning)
    upcoming_pdcs = Pdc.objects.filter(
        status='outstanding',
        maturity_date__gte=today,
        maturity_date__lte=warning_date
    ).order_by('maturity_date')
    
    for pdc in upcoming_pdcs:
        days_until = (pdc.maturity_date - today).days
        
        # Dynamic warning label based on days until maturity
        if days_until == 3:
            warning_label = "3 days warning"
        elif days_until == 2:
            warning_label = "2 days warning"
        elif days_until == 1:
            warning_label = "1 day warning"
        else:
            warning_label = f"{days_until} days warning"
            
        alerts.append({
            'id': f'pdc_{pdc.id}_maturing',
            'pdc_id': pdc.id,
            'check_no': pdc.check_no,
            'maturity_date': pdc.maturity_date.strftime('%Y-%m-%d'),
            'days_until': days_until,
            'type': 'pdc_maturing_soon',
            'severity': 'warning' if days_until > 1 else ('warning' if days_until == 1 else 'error'),
            'message': f'PDC {pdc.check_no} matures in {days_until} day(s) ({pdc.maturity_date.strftime("%b %d, %Y")}) - {warning_label}',
        })
    
    # Also get overdue PDCs (past maturity but still outstanding) - exclude already matured
    overdue_pdcs = Pdc.objects.filter(
        status='outstanding',
        maturity_date__lt=today
    )
    for pdc in overdue_pdcs:
        days_overdue = (today - pdc.maturity_date).days
        alerts.append({
            'id': f'pdc_{pdc.id}_overdue',
            'pdc_id': pdc.id,
            'check_no': pdc.check_no,
            'maturity_date': pdc.maturity_date.strftime('%Y-%m-%d'),
            'days_until': -days_overdue,
            'type': 'pdc_overdue',
            'severity': 'error',
            'message': f'PDC {pdc.check_no} is {days_overdue} day(s) overdue (was due {pdc.maturity_date.strftime("%b %d, %Y")})',
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

    from calendar import monthrange, month_name
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
        'month_name': month_name[month],
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
    OPTIMIZED: Uses batch queries to avoid N+1 problem.
    """
    today = now().date()
    
    # Fetch all PCFs with their transactions in ONE query
    pcfs = PettyCashFund.objects.filter(is_active=True).prefetch_related(
        'transactions'
    )
    
    # Pre-calculate totals for each PCF (single query per aggregation)
    pcf_totals = {}
    for pcf in pcfs:
        total_rep = pcf.transactions.filter(type='replenishment', date__lte=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_disb = pcf.transactions.filter(type='disbursement', date__lte=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        pcf_totals[pcf.id] = {
            'replenishments': total_rep,
            'disbursements': total_disb,
            'unreplenished': max(Decimal('0.00'), total_disb - total_rep)
        }
    
    # Build unreplenished disbursements list
    all_disbursements = []
    for pcf in pcfs:
        totals = pcf_totals.get(pcf.id, {'unreplenished': Decimal('0.00')})
        
        # Only include if PCF has unreplenished amount
        if totals['unreplenished'] > 0:
            for d in pcf.transactions.filter(type='disbursement'):
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

    # Bucket by age
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


# ---------------------------------------------------------------------
# User Management
# ---------------------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change the current user's password.
    
    POST /api/change-password/
    Body: { "current_password": "...", "new_password": "...", "confirm_password": "..." }
    """
    from django.contrib.auth import authenticate
    
    user = request.user
    current_password = request.data.get("current_password", "")
    new_password = request.data.get("new_password", "")
    confirm_password = request.data.get("confirm_password", "")
    
    if not current_password or not new_password or not confirm_password:
        return Response(
            {"detail": "All fields are required."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if new_password != confirm_password:
        return Response(
            {"detail": "New password and confirmation do not match."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(new_password) < 8:
        return Response(
            {"detail": "Password must be at least 8 characters long."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.check_password(current_password):
        return Response(
            {"detail": "Current password is incorrect."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user.set_password(new_password)
    user.save()
    
    return Response({"detail": "Password changed successfully."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get current user profile.
    
    GET /api/user/profile/
    """
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def audit_log(request):
    """
    Get audit log entries.
    
    GET /api/audit-log/?page=1&limit=50&user_id=1
    """
    from .models import AuditLog
    
    try:
        page = int(request.GET.get("page", 1))
        if page < 1:
            page = 1
    except (ValueError, TypeError):
        page = 1
    
    try:
        limit = min(int(request.GET.get("limit", 50)), 100)
        if limit < 1:
            limit = 50
    except (ValueError, TypeError):
        limit = 50
    user_id = request.GET.get("user_id")
    
    queryset = AuditLog.objects.select_related('user').order_by('-created_at')
    
    if user_id:
        queryset = queryset.filter(user_id=user_id)
    
    total = queryset.count()
    offset = (page - 1) * limit
    entries = queryset[offset:offset + limit]
    
    return Response({
        "count": total,
        "page": page,
        "limit": limit,
        "results": [
            {
                "id": entry.id,
                "user": entry.user.username if entry.user else "System",
                "action": entry.action,
                "details": entry.details,
                "model_name": entry.model_name,
                "object_id": entry.object_id,
                "ip_address": entry.ip_address,
                "created_at": entry.created_at.isoformat(),
            }
            for entry in entries
        ]
    })


# ---------------------------------------------------------------------
# Scheduled Reports
# ---------------------------------------------------------------------
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def email_reports_config(request):
    """
    Get or update email report configuration.
    
    GET /api/reports/email-config/
    POST /api/reports/email-config/
    """
    from django.conf import settings
    
    config = {
        "email_enabled": getattr(settings, 'EMAIL_REPORT_ENABLED', False),
        "email_recipients": getattr(settings, 'EMAIL_REPORT_RECIPIENTS', []),
        "report_frequency": getattr(settings, 'EMAIL_REPORT_FREQUENCY', 'daily'),
        "include_cash_in_bank": getattr(settings, 'EMAIL_REPORT_INCLUDE_CASH_IN_BANK', True),
        "include_pcf": getattr(settings, 'EMAIL_REPORT_INCLUDE_PCF', True),
        "include_pdc": getattr(settings, 'EMAIL_REPORT_INCLUDE_PDC', True),
    }
    
    if request.method == "GET":
        return Response(config)
    
    # For now, just return success (actual email sending requires more setup)
    return Response({
        "detail": "Email report configuration updated (requires server restart to take effect)",
        "config": config
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_test_report(request):
    """
    Send a test report email.
    
    POST /api/reports/send-test/
    """
    # This would send an actual email if configured
    # For now, just return a mock response
    return Response({
        "detail": "Test report email would be sent to configured recipients",
        "note": "Configure EMAIL settings in settings.py to enable actual email sending"
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cash_summary(request):
    """
    GET /api/summary/cash-summary/?date=YYYY-MM-DD
    Returns cash position summary grouped by area (Main Office, Tagoloan Parts, Midsayap Parts, Valencia Parts)
    with bank account balances, disbursements, outstanding checks, and net balance.
    """
    from .models import Transaction, Pdc
    from django.db.models import Sum as DbSum
    
    date_str = request.GET.get("date")
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()
    except ValueError:
        target_date = now().date()
    
    AREAS = [
        ('main_office', 'Main Office'),
        ('tagoloan_parts', 'Tagoloan Parts'),
        ('midsayap_parts', 'Midsayap Parts'),
        ('valencia_parts', 'Valencia Parts'),
    ]
    
    PART_AREAS = {'tagoloan_parts', 'midsayap_parts', 'valencia_parts'}
    
    result = {
        'date': target_date.strftime('%Y-%m-%d'),
        'areas': {},
        'parts': {'banks': [], 'total': Decimal('0.00')},
        'main_office_total': Decimal('0.00'),
        'parts_total': Decimal('0.00'),
        'grand_total': Decimal('0.00'),
        'payables': {
            'main_office': {'disbursements_today': Decimal('0.00'), 'outstanding_checks': Decimal('0.00')},
            'parts': {'disbursements_today': Decimal('0.00'), 'outstanding_checks': Decimal('0.00')},
        },
        'net_balance': Decimal('0.00'),
    }
    
    for area_code, area_display in AREAS:
        banks = BankAccount.objects.filter(area=area_code).order_by('name', 'account_number')
        area_total = Decimal('0.00')
        banks_data = []
        
        for bank in banks:
            bank_data = {
                'id': bank.id,
                'name': bank.name or '',
                'account_number': bank.account_number,
                'balance': float(bank.balance or Decimal('0.00')),
                'balance_raw': bank.balance or Decimal('0.00'),
            }
            banks_data.append(bank_data)
            area_total += bank.balance or Decimal('0.00')
        
        is_part = area_code in PART_AREAS
        
        result['areas'][area_code] = {
            'display_name': area_display,
            'banks': banks_data,
            'total': float(area_total),
            'total_raw': area_total,
            'is_part': is_part,
        }
        
        if is_part:
            result['parts']['banks'].extend(banks_data)
            result['parts']['total'] += area_total
            result['parts_total'] += area_total
        else:
            result['main_office_total'] += area_total
    
    result['grand_total'] = result['main_office_total'] + result['parts_total']
    result['parts']['total'] = float(result['parts']['total'])
    result['main_office_total'] = float(result['main_office_total'])
    result['parts_total'] = float(result['parts_total'])
    result['grand_total'] = float(result['grand_total'])
    
    today_disbursements = Transaction.objects.filter(
        date=target_date,
        type__in=['disbursement', 'bank_charges']
    ).values('bank_account__area').annotate(total=DbSum('amount'))
    
    for item in today_disbursements:
        area = item['bank_account__area']
        amount = item['total'] or Decimal('0.00')
        if area in PART_AREAS:
            result['payables']['parts']['disbursements_today'] += amount
        else:
            result['payables']['main_office']['disbursements_today'] += amount
    
    main_office_bank_ids = list(BankAccount.objects.filter(area='main_office').values_list('id', flat=True))
    parts_bank_ids = list(BankAccount.objects.filter(area__in=PART_AREAS).values_list('id', flat=True))
    
    outstanding_pdcs = Pdc.objects.exclude(status__in=['deposited', 'returned'])
    
    main_office_pdcs_total = outstanding_pdcs.filter(
        deposit_bank_id__in=main_office_bank_ids
    ).aggregate(total=DbSum('amount'))['total'] or Decimal('0.00')
    
    parts_pdcs_total = outstanding_pdcs.filter(
        deposit_bank_id__in=parts_bank_ids
    ).aggregate(total=DbSum('amount'))['total'] or Decimal('0.00')
    
    result['payables']['main_office']['outstanding_checks'] = float(main_office_pdcs_total)
    result['payables']['parts']['outstanding_checks'] = float(parts_pdcs_total)
    result['payables']['main_office']['disbursements_today'] = float(result['payables']['main_office']['disbursements_today'])
    result['payables']['parts']['disbursements_today'] = float(result['payables']['parts']['disbursements_today'])
    
    main_office_net = result['main_office_total'] - result['payables']['main_office']['disbursements_today'] - result['payables']['main_office']['outstanding_checks']
    parts_net = result['parts_total'] - result['payables']['parts']['disbursements_today'] - result['payables']['parts']['outstanding_checks']
    
    result['net_balance'] = {
        'main_office': float(main_office_net),
        'parts': float(parts_net),
        'total': float(main_office_net + parts_net),
    }
    
    return Response(result)


@api_view(["GET", "POST", "PUT"])
@permission_classes([IsAuthenticated])
def bank_analysis(request):
    """
    GET /api/summary/bank-analysis/?date=YYYY-MM-DD
    Returns bank reconciliation data for all bank accounts with AUTO-COMPUTED values.
    
    Auto-computed values are calculated from transaction history:
    - Outstanding Checks: from PDC not yet deposited/returned
    - Deposit in Transit: from collections/deposits transactions
    - Returned Checks: from returned_check transactions
    - Bank Charges: from bank_charges transactions
    - Unbooked Transfers: from fund_transfer/interbank_transfer transactions
    
    POST/PUT /api/summary/bank-analysis/
    Save or update bank reconciliation data (only per_bank is manual entry).
    """
    from .models import BankReconciliation, Pdc
    
    if request.method == "GET":
        date_str = request.GET.get("date")
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()
        except ValueError:
            target_date = now().date()
        
        banks = BankAccount.objects.all().order_by('area', 'name', 'account_number')
        result = {
            'date': target_date.strftime('%Y-%m-%d'),
            'banks': []
        }
        
        for bank in banks:
            reconciliation = BankReconciliation.objects.filter(
                bank_account=bank,
                date=target_date
            ).first()
            
            # AUTO-COMPUTE values from transactions and PDC
            # Outstanding Checks: PDC not deposited/returned for this bank
            outstanding_pdcs = Pdc.objects.filter(
                deposit_bank=bank
            ).exclude(status__in=['deposited', 'returned'])
            outstanding_checks = outstanding_pdcs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Deposit in Transit: collections, deposit transactions for this bank (up to target date)
            deposit_in_transit = Transaction.objects.filter(
                bank_account=bank,
                date__lte=target_date,
                type__in=['collection', 'deposit', 'local_deposits']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Returned Checks: returned_check transactions
            returned_checks = Transaction.objects.filter(
                bank_account=bank,
                date__lte=target_date,
                type='returned_check'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Bank Charges: bank_charges transactions
            bank_charges = Transaction.objects.filter(
                bank_account=bank,
                date__lte=target_date,
                type='bank_charges'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Unbooked Transfers: fund_transfer, interbank_transfer transactions
            unbooked_transfers = Transaction.objects.filter(
                bank_account=bank,
                date__lte=target_date,
                type__in=['fund_transfer', 'interbank_transfer']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Per Bank defaults to the bank's opening balance (actual bank statement balance)
            # This is pre-filled automatically - user updates when they get new bank statement
            per_bank = reconciliation.per_bank if reconciliation else (bank.opening_balance or Decimal('0.00'))
            
            # Calculate reconciled balances
            per_dcpr = bank.balance or Decimal('0.00')
            dcpr_reconciled = (
                per_dcpr 
                + deposit_in_transit 
                + unbooked_transfers
                - outstanding_checks 
                - returned_checks 
                - bank_charges
            )
            bank_reconciled = per_bank + deposit_in_transit - outstanding_checks - returned_checks - bank_charges
            
            bank_data = {
                'id': bank.id,
                'name': bank.name or '',
                'account_number': bank.account_number,
                'area': bank.area,
                'per_dcpr': float(per_dcpr),
                'auto_computed': {
                    'outstanding_checks': float(outstanding_checks),
                    'deposit_in_transit': float(deposit_in_transit),
                    'returned_checks': float(returned_checks),
                    'bank_charges': float(bank_charges),
                    'unbooked_transfers': float(unbooked_transfers),
                },
                'reconciliation': None
            }
            
            if reconciliation:
                bank_data['reconciliation'] = {
                    'id': reconciliation.id,
                    'per_bank': float(reconciliation.per_bank),
                    'outstanding_checks': float(reconciliation.outstanding_checks),
                    'deposit_in_transit': float(reconciliation.deposit_in_transit),
                    'returned_checks': float(reconciliation.returned_checks),
                    'bank_charges': float(reconciliation.bank_charges),
                    'unbooked_transfers': float(reconciliation.unbooked_transfers),
                    'remarks': reconciliation.remarks or '',
                    'dcpr_reconciled': float(reconciliation.dcpr_reconciled),
                    'bank_reconciled': float(reconciliation.bank_reconciled),
                    'is_balanced': reconciliation.is_balanced,
                }
            
            # If no saved reconciliation, use auto-computed values
            if not reconciliation:
                bank_data['reconciliation'] = {
                    'id': None,
                    'per_bank': float(per_bank),
                    'outstanding_checks': float(outstanding_checks),
                    'deposit_in_transit': float(deposit_in_transit),
                    'returned_checks': float(returned_checks),
                    'bank_charges': float(bank_charges),
                    'unbooked_transfers': float(unbooked_transfers),
                    'remarks': '',
                    'dcpr_reconciled': float(dcpr_reconciled),
                    'bank_reconciled': float(bank_reconciled),
                    'is_balanced': abs(dcpr_reconciled - bank_reconciled) < Decimal('0.01'),
                }
            
            result['banks'].append(bank_data)
        
        return Response(result)
    
    else:
        data = request.data
        bank_id = data.get('bank_id')
        date_str = data.get('date')
        
        if not bank_id or not date_str:
            return Response({'detail': 'bank_id and date are required'}, status=400)
        
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({'detail': 'Invalid date format'}, status=400)
        
        try:
            bank = BankAccount.objects.get(id=bank_id)
        except BankAccount.DoesNotExist:
            return Response({'detail': 'Bank account not found'}, status=404)
        
        reconciliation, created = BankReconciliation.objects.get_or_create(
            bank_account=bank,
            date=target_date,
            defaults={'created_by': request.user}
        )
        
        reconciliation.per_bank = Decimal(str(data.get('per_bank', 0)))
        reconciliation.outstanding_checks = Decimal(str(data.get('outstanding_checks', 0)))
        reconciliation.deposit_in_transit = Decimal(str(data.get('deposit_in_transit', 0)))
        reconciliation.returned_checks = Decimal(str(data.get('returned_checks', 0)))
        reconciliation.bank_charges = Decimal(str(data.get('bank_charges', 0)))
        reconciliation.unbooked_transfers = Decimal(str(data.get('unbooked_transfers', 0)))
        reconciliation.remarks = data.get('remarks', '')
        reconciliation.save()
        
        return Response({
            'id': reconciliation.id,
            'bank_id': bank.id,
            'date': target_date.strftime('%Y-%m-%d'),
            'per_bank': float(reconciliation.per_bank),
            'outstanding_checks': float(reconciliation.outstanding_checks),
            'deposit_in_transit': float(reconciliation.deposit_in_transit),
            'returned_checks': float(reconciliation.returned_checks),
            'bank_charges': float(reconciliation.bank_charges),
            'unbooked_transfers': float(reconciliation.unbooked_transfers),
            'remarks': reconciliation.remarks,
            'dcpr_reconciled': float(reconciliation.dcpr_reconciled),
            'bank_reconciled': float(reconciliation.bank_reconciled),
            'is_balanced': reconciliation.is_balanced,
            'created': created,
        })


# API endpoint to create default admin user
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def create_default_admin(request):
    """
    Simple endpoint to create a default admin user.
    Usage: Visit /api/create-admin/ in browser or make GET request.
    Runs migrations automatically if needed.
    """
    from django.core.management import call_command
    from django.contrib.auth.models import User
    
    # Run migrations first to ensure tables exist
    try:
        call_command('migrate', verbosity=0)
    except Exception as e:
        pass  # Ignore if migrations fail - might already be done
    
    username = os.environ.get('ADMIN_USERNAME', 'admin')
    password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    email = os.environ.get('ADMIN_EMAIL', 'admin@jopca.local')
    
    try:
        if User.objects.filter(username=username).exists():
            return Response({
                'status': 'already_exists',
                'message': f'User "{username}" already exists.',
                'username': username
            })
        
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        
        return Response({
            'status': 'success',
            'message': f'Admin user "{username}" created successfully!',
            'username': username,
            'password': password
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e),
            'note': 'Migrations may have run, try logging in now!'
        })


# API endpoint to create regular user
@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def create_user(request):
    """
    Create a user via POST.
    Usage: POST /api/create-user/ with username, password, is_staff (optional), email (optional)
    """
    from django.contrib.auth.models import User
    
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    email = request.data.get('email', '')
    
    # Handle string "true"/"false" or boolean
    is_staff_raw = request.data.get('is_staff', False)
    is_superuser_raw = request.data.get('is_superuser', False)
    
    is_staff = str(is_staff_raw).lower() in ('true', '1', 'yes', 'on') if is_staff_raw else False
    is_superuser = str(is_superuser_raw).lower() in ('true', '1', 'yes', 'on') if is_superuser_raw else False
    
    if not username or not password:
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(username=username).exists():
        return Response({
            'error': f'User "{username}" already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = User.objects.create_user(
        username=username,
        password=password,
        email=email if email else f'{username}@jopca.local'
    )
    user.is_staff = is_staff
    user.is_superuser = is_superuser
    user.save()
    
    return Response({
        'status': 'success',
        'message': f'User "{username}" created successfully',
        'user_id': user.pk,
        'username': user.username,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser
    })


# API endpoint to reset all data (admin only for security)
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def reset_all_data(request):
    """
    Reset all transaction data but keep bank accounts and users.
    Usage: /api/reset-data/ (requires admin authentication)
    """
    from .models import (
        BankAccount, Transaction, DailyCashPosition,
        PettyCashFund, PettyCashTransaction, Pdc,
        MonthlyReport, BankReconciliation
    )
    from django.contrib.auth.models import User
    
    with transaction.atomic():
        # Clear all transaction-related data
        Transaction.objects.all().delete()
        PettyCashTransaction.objects.all().delete()
        Pdc.objects.all().delete()
        DailyCashPosition.objects.all().delete()
        MonthlyReport.objects.all().delete()
        BankReconciliation.objects.all().delete()
        
        # Reset bank account balances
        BankAccount.objects.update(
            balance=Decimal('0'),
            opening_balance=Decimal('0')
        )
        
        # Reset PCF balances
        PettyCashFund.objects.update(
            current_balance=Decimal('0'),
            opening_balance=Decimal('0')
        )
    
    return Response({
        'status': 'success',
        'message': 'All transaction data has been reset. Bank accounts and users are preserved.',
        'reset_items': [
            'Transactions',
            'Petty Cash Transactions',
            'PDC Records',
            'Daily Cash Positions',
            'Monthly Reports',
            'Bank Reconciliations',
        ],
        'preserved': [
            'Bank Accounts',
            'Users',
            'PCF Funds'
        ]
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def recalc_bank_balance(request, bank_id):
    """
    POST /api/bankaccounts/{bank_id}/recalc_balance/
    Manually trigger bank balance recalculation
    """
    try:
        bank = BankAccount.objects.get(id=bank_id)
        bank.recalc_balance()
        return Response({
            "success": True,
            "message": f"Balance recalculated for {bank.name}",
            "new_balance": float(bank.balance)
        })
    except BankAccount.DoesNotExist:
        return Response({"error": "Bank account not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
