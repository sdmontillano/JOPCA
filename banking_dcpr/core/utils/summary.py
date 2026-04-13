# core/utils/summary.py
from decimal import Decimal
from django.db.models import Sum
from ..models import BankAccount, Transaction
from ..constants import (
    DEPOSIT_TYPES, INFLOW_TYPES, OUTFLOW_TYPES, TRANSFER_TYPES, RETURNED_TYPES, 
    ADJUSTMENT_TYPES, PDC_TYPES, LOCAL_DEPOSIT_TYPES,
    FUND_TRANSFER_IN, FUND_TRANSFER_OUT,
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
    
    Formula (CORRECT DCPR):
    Ending_Bank = Beginning_Bank + Deposits - Disbursements + Fund_Transfers_In - Fund_Transfers_Out
    
    - deposit = ONLY type that adds to bank balance
    - disbursement = ONLY type that subtracts from bank balance  
    - fund_transfer_in/out = neutral (moves between accounts)
    - collection = tracking only, NOT in balance formula
    """
    rows = []
    banks = BankAccount.objects.all().order_by("name", "account_number")

    for bank in banks:
        # Beginning balance: prior deposits only (NOT collections)
        prior_deposits = (
            Transaction.objects.filter(
                bank_account=bank, 
                date__lt=target_date, 
                type__in=DEPOSIT_TYPES
            )
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        prior_disbursements = (
            Transaction.objects.filter(
                bank_account=bank, 
                date__lt=target_date, 
                type__in=OUTFLOW_TYPES
            )
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        prior_transfers_in = (
            Transaction.objects.filter(
                bank_account=bank,
                date__lt=target_date,
                type__in=FUND_TRANSFER_IN
            )
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        prior_transfers_out = (
            Transaction.objects.filter(
                bank_account=bank,
                date__lt=target_date,
                type__in=FUND_TRANSFER_OUT
            )
            .aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )

        beginning = max(bank.opening_balance + prior_deposits - prior_disbursements + prior_transfers_in - prior_transfers_out, Decimal("0"))

        today_qs = Transaction.objects.filter(bank_account=bank, date=target_date)

        # CORRECT DCPR FORMULA: Deposit only, Disbursement only
        deposits = today_qs.filter(type__in=DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        disbursements = today_qs.filter(type__in=OUTFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        fund_transfers_in = today_qs.filter(type__in=FUND_TRANSFER_IN).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        fund_transfers_out = today_qs.filter(type__in=FUND_TRANSFER_OUT).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        # For reporting only (not in balance formula)
        collections = today_qs.filter(type="collection").aggregate(total=Sum("amount"))["total"] or Decimal("0")
        local_deposits = today_qs.filter(type__in=LOCAL_DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        adjustments = today_qs.filter(type__in=ADJUSTMENT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        returned_checks = today_qs.filter(type__in=RETURNED_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        pdc = today_qs.filter(type__in=PDC_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # CORRECT FORMULA: Ending = Beginning + Deposits - Disbursements + TransfersIn - TransfersOut
        ending = beginning + _safe_decimal(deposits) - _safe_decimal(disbursements) + _safe_decimal(fund_transfers_in) - _safe_decimal(fund_transfers_out)

        rows.append({
            "bank_id": bank.id,
            "particulars": bank.name or "",
            "account_number": bank.account_number,
            "beginning": _to_float(beginning),
            "deposits": _to_float(_safe_decimal(deposits)),
            "disbursements": _to_float(_safe_decimal(disbursements)),
            "fund_transfers_in": _to_float(_safe_decimal(fund_transfers_in)),
            "fund_transfers_out": _to_float(_safe_decimal(fund_transfers_out)),
            "collections": _to_float(_safe_decimal(collections)),  # reporting only
            "local_deposits": _to_float(_safe_decimal(local_deposits)),  # reporting only
            "returned_checks": _to_float(_safe_decimal(returned_checks)),
            "adjustments": _to_float(_safe_decimal(adjustments)),
            "pdc": _to_float(_safe_decimal(pdc)),
            "ending": _to_float(ending),
        })

    return rows