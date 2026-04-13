# core/utils/summary.py
from decimal import Decimal
from django.db.models import Sum
from ..models import BankAccount, Transaction
from ..constants import (
    INFLOW_TYPES, OUTFLOW_TYPES, TRANSFER_TYPES, RETURNED_TYPES, 
    ADJUSTMENT_TYPES, PDC_TYPES, LOCAL_DEPOSIT_TYPES,
    COLLECTION_TYPE_CASH, COLLECTION_TYPE_BANK_TRANSFER, COLLECTION_TYPE_CHECK,
    PDC_STATUS_CLEARED, PDC_STATUS_BOUNCED,
)

ALL_INFLOW_TYPES = INFLOW_TYPES
ALL_OUTFLOW_TYPES = OUTFLOW_TYPES

def _safe_decimal(value):
    return Decimal(value or 0)

def _to_float(dec):
    return float(dec.quantize(Decimal("0.01")))

def compute_cash_daily_summary(target_date):
    """
    Returns cash position summary for target_date.
    
    Formula:
    Ending_Cash = Beginning_Cash + Cash_Collections - Cash_Deposits - Cash_Disbursements
    
    Cash collections: collection_type == 'cash'
    Cash deposits: type == 'deposit' (money moved to bank)
    Cash disbursements: collection_type == 'cash' + type in outflows
    """
    from ..models import PettyCashFund
    
    beginning = Decimal("0.00")
    cash_collections = Decimal("0.00")
    cash_deposits = Decimal("0.00")
    cash_disbursements = Decimal("0.00")
    
    pcfs = PettyCashFund.objects.all()
    for pcf in pcfs:
        pcf_beginning = pcf.balance or Decimal("0.00")
        beginning += pcf_beginning
    
    today_qs = Transaction.objects.filter(date=target_date)
    
    cash_collections = today_qs.filter(
        collection_type=COLLECTION_TYPE_CASH
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    
    cash_deposits = today_qs.filter(
        type__in=["deposit", "deposits"]
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    
    cash_disbursements = today_qs.filter(
        type__in=ALL_OUTFLOW_TYPES,
        collection_type=COLLECTION_TYPE_CASH
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    
    ending = beginning + cash_collections - cash_deposits - cash_disbursements
    
    return {
        "beginning": _to_float(beginning),
        "cash_collections": _to_float(cash_collections),
        "cash_deposits": _to_float(cash_deposits),
        "cash_disbursements": _to_float(cash_disbursements),
        "ending": _to_float(ending),
    }

def compute_bank_daily_summary(target_date):
    """
    Returns list of dicts for each BankAccount with beginning, breakdown for target_date, and ending.
    Numeric fields are returned as floats.
    
    Formula (SIMPLE - uses type field only):
    Ending_Bank = Beginning_Bank + Collections + Local_Deposits - Disbursements
    
    Collections: type in INFLOW_TYPES (includes deposits, collections, fund transfers)
    Local Deposits: type in LOCAL_DEPOSIT_TYPES (tracking only, now includes deposit!)
    Disbursements: type in OUTFLOW_TYPES
    
    Note: deposit type now adds directly to bank balance (money coming IN)
    """
    rows = []
    banks = BankAccount.objects.all().order_by("name", "account_number")

    for bank in banks:
        # Beginning balance: ALL prior transactions from opening to day before target date
        prior_inflows = (
            Transaction.objects.filter(
                bank_account=bank, 
                date__lt=target_date, 
                type__in=ALL_INFLOW_TYPES
            )
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        prior_outflows = (
            Transaction.objects.filter(
                bank_account=bank, 
                date__lt=target_date, 
                type__in=ALL_OUTFLOW_TYPES.union(ADJUSTMENT_TYPES)
            )
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )

        beginning_raw = _safe_decimal(bank.opening_balance) + _safe_decimal(prior_inflows) - _safe_decimal(prior_outflows)
        beginning = max(beginning_raw, Decimal("0"))

        today_qs = Transaction.objects.filter(bank_account=bank, date=target_date)

        # Simple formula using type field only
        collections = today_qs.filter(type__in=ALL_INFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        local_deposits = today_qs.filter(type__in=LOCAL_DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        disbursements = today_qs.filter(type__in=ALL_OUTFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        fund_transfers = today_qs.filter(type__in={"fund_transfer", "fund_transfers", "interbank_transfer", "interbank_transfers"}).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        transfers = today_qs.filter(type__in=TRANSFER_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        returned_checks = today_qs.filter(type__in=RETURNED_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        adjustments = today_qs.filter(type__in=ADJUSTMENT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        pdc = today_qs.filter(type__in=PDC_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        ending = beginning + _safe_decimal(collections) + _safe_decimal(local_deposits) - _safe_decimal(disbursements) + _safe_decimal(adjustments) - _safe_decimal(returned_checks)

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