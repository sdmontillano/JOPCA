# core/utils/summary.py
from decimal import Decimal
from django.db.models import Sum
from ..models import BankAccount, Transaction
from ..constants import INFLOW_TYPES, OUTFLOW_TYPES, TRANSFER_TYPES, RETURNED_TYPES, ADJUSTMENT_TYPES, PDC_TYPES, LOCAL_DEPOSIT_TYPES

def _safe_decimal(value):
    return Decimal(value or 0)

def _to_float(dec):
    return float(dec.quantize(Decimal("0.01")))

def compute_bank_daily_summary(target_date):
    """
    Returns list of dicts for each BankAccount with beginning, breakdown for target_date, and ending.
    Numeric fields are returned as floats.
    target_date: a date object (datetime.date)
    """
    rows = []
    banks = BankAccount.objects.all().order_by("name", "account_number")

    for bank in banks:
        # Beginning balance: ALL prior transactions from opening to day before target date
        # Prior Inflows = Collections + Fund Transfers + All Deposits
        # Prior Outflows = Disbursements + Bank Charges + Returned Checks + Adjustments
        COLLECTION_TYPES = frozenset(["collections", "collection", "deposit", "deposits"])
        
        prior_inflows = (
            Transaction.objects.filter(
                bank_account=bank, 
                date__lt=target_date, 
                type__in=INFLOW_TYPES.union(COLLECTION_TYPES)
            )
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        prior_outflows = (
            Transaction.objects.filter(
                bank_account=bank, 
                date__lt=target_date, 
                type__in=OUTFLOW_TYPES.union(ADJUSTMENT_TYPES)
            )
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )

        # Beginning = Opening Balance + All Prior Inflows - All Prior Outflows
        beginning_raw = _safe_decimal(bank.opening_balance) + _safe_decimal(prior_inflows) - _safe_decimal(prior_outflows)
        beginning = max(beginning_raw, Decimal("0"))

        today_qs = Transaction.objects.filter(bank_account=bank, date=target_date)

        # Use frozensets that include both singular and plural forms
        # Include BOTH collections AND deposits in the Collections column
        COLLECTION_TYPES = frozenset(["collections", "collection", "deposit", "deposits"])
        DISBURSEMENT_TYPES = frozenset(["disbursement", "disbursements"])
        
        collections = today_qs.filter(type__in=COLLECTION_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        local_deposits = today_qs.filter(type__in=LOCAL_DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        disbursements = today_qs.filter(type__in=DISBURSEMENT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        fund_transfers = today_qs.filter(type__in={"fund_transfer", "fund_transfers", "interbank_transfer", "interbank_transfers"}).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        transfers = today_qs.filter(type__in=TRANSFER_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        returned_checks = today_qs.filter(type__in=RETURNED_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        adjustments = today_qs.filter(type__in=ADJUSTMENT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        pdc = today_qs.filter(type__in=PDC_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # Bank Account Formula: Beginning + Collections - Disbursements + Adjustments - Returned Checks
        # Note: Local Deposits are NOT included in ending balance formula - they are tracking only
        # Collections = Cash received and deposited to bank (affects ending balance)
        # Local Deposits = tracking column only (for audit/reconciliation)
        # Returned checks = money returned (decreases bank balance)
        # Ensure ending balance doesn't go negative
        ending_raw = beginning + _safe_decimal(collections) - _safe_decimal(disbursements) + _safe_decimal(adjustments) - _safe_decimal(returned_checks)
        ending = max(ending_raw, Decimal("0"))

        rows.append({
            "bank_id": bank.id,
            "particulars": bank.name or "",
            "account_number": bank.account_number,
            "beginning": _to_float(beginning),
            "collections": _to_float(_safe_decimal(collections)),
            "local_deposits": _to_float(_safe_decimal(local_deposits)),
            "disbursements": _to_float(_safe_decimal(disbursements)),
            "fund_transfers": _to_float(_safe_decimal(fund_transfers)),
            "transfers": _to_float(_safe_decimal(transfers)),
            "returned_checks": _to_float(_safe_decimal(returned_checks)),
            "adjustments": _to_float(_safe_decimal(adjustments)),
            "pdc": _to_float(_safe_decimal(pdc)),
            "ending": _to_float(ending),
        })

    return rows