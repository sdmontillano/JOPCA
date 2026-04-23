# core/utils/summary.py
from decimal import Decimal
from django.db.models import Sum
from ..models import BankAccount, Transaction, Collection, Pdc
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
    Compute daily summary for each bank account.
    Returns list of dicts with bank_id, particulars, account_number, beginning, deposits, disbursements, fund_transfers_in, fund_transfers_out, collections, local_deposits, returned_checks, adjustments, pdc, ending.
    
    CORRECT DCPR FORMULA: Beginning + Deposits - Disbursements + TransfersIn - TransfersOut
    
    Uses start_date to determine which transactions to include.
    """
    from decimal import Decimal
    from django.db.models import Sum
    from ..constants import (
        DEPOSIT_TYPES, OUTFLOW_TYPES, FUND_TRANSFER_IN, FUND_TRANSFER_OUT, 
        LOCAL_DEPOSIT_TYPES, ADJUSTMENT_TYPES, RETURNED_TYPES, PDC_TYPES
    )
    
    rows = []
    banks = BankAccount.objects.all().order_by("name", "account_number")
    
    for bank in banks:
        # Get the effective start date for this bank (default to very early date if not set)
        effective_start = bank.start_date if bank.start_date else None
        
        # Beginning balance: prior deposits only (NOT collections)
        # Only count transactions from start_date onwards
        prior_deposits_qs = Transaction.objects.filter(
            bank_account=bank, 
            date__lt=target_date, 
            type__in=DEPOSIT_TYPES
        )
        if effective_start:
            prior_deposits_qs = prior_deposits_qs.filter(date__gte=effective_start)
        prior_deposits = prior_deposits_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        prior_disbursements_qs = Transaction.objects.filter(
            bank_account=bank, 
            date__lt=target_date, 
            type__in=OUTFLOW_TYPES
        )
        if effective_start:
            prior_disbursements_qs = prior_disbursements_qs.filter(date__gte=effective_start)
        prior_disbursements = prior_disbursements_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        prior_transfers_in_qs = Transaction.objects.filter(
            bank_account=bank,
            date__lt=target_date,
            type__in=FUND_TRANSFER_IN
        )
        if effective_start:
            prior_transfers_in_qs = prior_transfers_in_qs.filter(date__gte=effective_start)
        prior_transfers_in = prior_transfers_in_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        prior_transfers_out_qs = Transaction.objects.filter(
            bank_account=bank,
            date__lt=target_date,
            type__in=FUND_TRANSFER_OUT
        )
        if effective_start:
            prior_transfers_out_qs = prior_transfers_out_qs.filter(date__gte=effective_start)
        prior_transfers_out = prior_transfers_out_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")

        beginning = max(bank.opening_balance + prior_deposits - prior_disbursements + prior_transfers_in - prior_transfers_out, Decimal("0"))

        today_qs = Transaction.objects.filter(bank_account=bank, date=target_date)

        # CORRECT DCPR FORMULA: Deposit only, Disbursement only
        deposits = today_qs.filter(type__in=DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        disbursements = today_qs.filter(type__in=OUTFLOW_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        fund_transfers_in = today_qs.filter(type__in=FUND_TRANSFER_IN).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        fund_transfers_out = today_qs.filter(type__in=FUND_TRANSFER_OUT).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        # For reporting only (not in balance formula)
        collections = today_qs.filter(type="collection").exclude(type__in=DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        # Calculate local deposits (both deposit and local_deposit types)
        deposit_total = today_qs.filter(type__in=DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        local_deposit_total = today_qs.filter(type__in=LOCAL_DEPOSIT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        local_deposits = deposit_total + local_deposit_total
        
        adjustments = today_qs.filter(type__in=ADJUSTMENT_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        
        # Get returned from transactions (old data, if any)
        transactions_returned = today_qs.filter(type__in=RETURNED_TYPES).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        # ALSO get returned PDC amounts for this bank (new way - no transaction needed)
        pdcs_returned = Pdc.objects.filter(
            deposit_bank=bank,
            status=Pdc.STATUS_RETURNED,
            returned_date=target_date
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        returned_checks = _safe_decimal(transactions_returned) + _safe_decimal(pdcs_returned)
        
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
