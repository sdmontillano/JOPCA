# core/utils/summary.py
from decimal import Decimal
from datetime import date as _date
from django.db.models import Sum, Q
from ..models import BankAccount, Transaction, Collection, Pdc, PettyCashFund, PettyCashTransaction
from ..constants import (
    DEPOSIT_TYPES, INFLOW_TYPES, OUTFLOW_TYPES, BANK_BALANCE_OUTFLOW, TRANSFER_TYPES, RETURNED_TYPES, 
    ADJUSTMENT_TYPES, PDC_TYPES, LOCAL_DEPOSIT_TYPES,
    FUND_TRANSFER_IN, FUND_TRANSFER_OUT,
    COLLECTION_TYPE_CASH, COLLECTION_TYPE_BANK_TRANSFER, COLLECTION_TYPE_CHECK,
    PDC_STATUS_CLEARED, PDC_STATUS_BOUNCED,
)

ALL_INFLOW_TYPES = INFLOW_TYPES
ALL_OUTFLOW_TYPES = BANK_BALANCE_OUTFLOW

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
        pcf_beginning = pcf.current_balance or Decimal("0.00")
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
    from django.db.models import Sum, Q
    from ..constants import (
        DEPOSIT_TYPES, OUTFLOW_TYPES, BANK_BALANCE_OUTFLOW, DISBURSEMENT_TYPES, FUND_TRANSFER_IN, FUND_TRANSFER_OUT, 
        LOCAL_DEPOSIT_TYPES, ADJUSTMENT_TYPES, RETURNED_TYPES, PDC_TYPES
    )
    
    # Bulk aggregate all prior transactions (date < target_date) grouped by bank_account
    prior_qs = Transaction.objects.filter(date__lt=target_date)
    prior_agg = prior_qs.values('bank_account').annotate(
        deposits=Sum('amount', filter=Q(type__in=DEPOSIT_TYPES)),
        disbursements=Sum('amount', filter=Q(type__in=DISBURSEMENT_TYPES)),
        ft_in=Sum('amount', filter=Q(type__in=FUND_TRANSFER_IN)),
        ft_out=Sum('amount', filter=Q(type__in=FUND_TRANSFER_OUT)),
        adj_in=Sum('amount', filter=Q(type='adjustment_in')),
        adj_out=Sum('amount', filter=Q(type='adjustment_out')),
        bank_charges=Sum('amount', filter=Q(type__in=['bank_charges', 'bank_charge'])),
        returned=Sum('amount', filter=Q(type__in=RETURNED_TYPES)),
    )
    prior_map = {r['bank_account']: r for r in prior_agg}

    # Bulk aggregate all today's transactions (date = target_date) grouped by bank_account
    today_qs = Transaction.objects.filter(date=target_date)
    today_agg = today_qs.values('bank_account').annotate(
        deposits=Sum('amount', filter=Q(type__in=DEPOSIT_TYPES)),
        disbursements=Sum('amount', filter=Q(type__in=DISBURSEMENT_TYPES)),
        ft_in=Sum('amount', filter=Q(type__in=FUND_TRANSFER_IN)),
        ft_out=Sum('amount', filter=Q(type__in=FUND_TRANSFER_OUT)),
        adj_in=Sum('amount', filter=Q(type='adjustment_in')),
        adj_out=Sum('amount', filter=Q(type='adjustment_out')),
        collections=Sum('amount', filter=Q(type='collection') & ~Q(type__in=DEPOSIT_TYPES)),
        bank_charges=Sum('amount', filter=Q(type__in=['bank_charges', 'bank_charge'])),
        local_deposits_all=Sum('amount', filter=Q(type__in=DEPOSIT_TYPES | LOCAL_DEPOSIT_TYPES)),
        adjustments=Sum('amount', filter=Q(type__in=ADJUSTMENT_TYPES)),
        returned=Sum('amount', filter=Q(type__in=RETURNED_TYPES)),
        pdc=Sum('amount', filter=Q(type__in=PDC_TYPES)),
    )
    today_map = {r['bank_account']: r for r in today_agg}
    
    rows = []
    banks = BankAccount.objects.all().order_by("name", "account_number")
    
    for bank in banks:
        p = prior_map.get(bank.id, {})
        t = today_map.get(bank.id, {})
        
        beginning = max(
            bank.opening_balance
            + _safe_decimal(p.get('deposits'))
            - _safe_decimal(p.get('disbursements'))
            + _safe_decimal(p.get('ft_in'))
            - _safe_decimal(p.get('ft_out'))
            + _safe_decimal(p.get('adj_in'))
            - _safe_decimal(p.get('adj_out'))
            - _safe_decimal(p.get('bank_charges'))
            - _safe_decimal(p.get('returned')),
            Decimal("0")
        )
        
        deposits = _safe_decimal(t.get('deposits'))
        disbursements = _safe_decimal(t.get('disbursements'))
        fund_transfers_in = _safe_decimal(t.get('ft_in'))
        fund_transfers_out = _safe_decimal(t.get('ft_out'))
        adjustment_in = _safe_decimal(t.get('adj_in'))
        adjustment_out = _safe_decimal(t.get('adj_out'))
        collections = _safe_decimal(t.get('collections'))
        bank_charges = _safe_decimal(t.get('bank_charges'))
        local_deposits_all = _safe_decimal(t.get('local_deposits_all'))
        adjustments = _safe_decimal(t.get('adjustments'))
        transactions_returned = _safe_decimal(t.get('returned'))
        
        pdcs_returned = _safe_decimal(
            Pdc.objects.filter(
                deposit_bank=bank,
                status=Pdc.STATUS_RETURNED,
                returned_date=target_date
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        )
        returned_checks = max(transactions_returned, pdcs_returned)
        
        pdc = _safe_decimal(t.get('pdc'))
        
        # CORRECT FORMULA: Beginning + Deposits - Disbursements + TransfersIn - TransfersOut + AdjustmentIn - AdjustmentOut - BankCharges - ReturnedChecks
        ending = beginning + deposits - disbursements + fund_transfers_in - fund_transfers_out + adjustment_in - adjustment_out - bank_charges - returned_checks
        
        net_adjustments = adjustment_in - adjustment_out
        
        rows.append({
            "bank_id": bank.id,
            "particulars": bank.name or "",
            "account_number": bank.account_number,
            "beginning": _to_float(beginning),
            "deposits": _to_float(deposits),
            "disbursements": _to_float(disbursements),
            "fund_transfers_in": _to_float(fund_transfers_in),
            "fund_transfers_out": _to_float(fund_transfers_out),
            "collections": _to_float(collections),
            "local_deposits": _to_float(local_deposits_all),
            "returned_checks": _to_float(returned_checks),
            "adjustment_in": _to_float(adjustment_in),
            "adjustment_out": _to_float(adjustment_out),
            "adjustments": _to_float(net_adjustments),
            "bank_charges": _to_float(bank_charges),
            "pdc": _to_float(pdc),
            "ending": _to_float(ending),
        })
    
    return rows


def compute_pcf_summary(pcfs, target_date, month_date=None):
    """
    Compute PCF (Petty Cash Fund) summary with batch aggregation (no N+1).
    
    If month_date is provided, includes all transactions for that month.
    Otherwise only includes transactions on target_date.
    
    Returns list of dicts with cash_on_hand data.
    """
    pcf_ids = [p.id for p in pcfs]

    if month_date:
        month_start = _date(month_date.year, month_date.month, 1)
        period_txns = PettyCashTransaction.objects.filter(
            pcf_id__in=pcf_ids,
            date__year=month_date.year,
            date__month=month_date.month
        )
        prior_cutoff = month_start
    else:
        period_txns = PettyCashTransaction.objects.filter(
            pcf_id__in=pcf_ids, date=target_date
        )
        prior_cutoff = target_date

    period_txns_map = {}
    for t in period_txns:
        period_txns_map.setdefault(t.pcf_id, []).append(t)

    # Bulk aggregate prior transactions (before cutoff) - replaces per-PCF N+1 queries
    disb_prior_qs = PettyCashTransaction.objects.filter(
        pcf_id__in=pcf_ids, date__lt=prior_cutoff, type='disbursement'
    ).values('pcf_id').annotate(total=Sum('amount'))
    disb_prior = {r['pcf_id']: r['total'] or Decimal('0.00') for r in disb_prior_qs}

    rep_prior_qs = PettyCashTransaction.objects.filter(
        pcf_id__in=pcf_ids, date__lt=prior_cutoff, type='replenishment'
    ).values('pcf_id').annotate(total=Sum('amount'))
    rep_prior = {r['pcf_id']: r['total'] or Decimal('0.00') for r in rep_prior_qs}

    # Bulk aggregate cumulative totals up to target_date
    disb_cum_qs = PettyCashTransaction.objects.filter(
        pcf_id__in=pcf_ids, date__lte=target_date, type='disbursement'
    ).values('pcf_id').annotate(total=Sum('amount'))
    disb_cumulative = {r['pcf_id']: r['total'] or Decimal('0.00') for r in disb_cum_qs}

    rep_cum_qs = PettyCashTransaction.objects.filter(
        pcf_id__in=pcf_ids, date__lte=target_date, type='replenishment'
    ).values('pcf_id').annotate(total=Sum('amount'))
    rep_cumulative = {r['pcf_id']: r['total'] or Decimal('0.00') for r in rep_cum_qs}

    cash_on_hand = []
    for pcf in pcfs:
        pcf_id = pcf.id
        beginning = (
            pcf.opening_balance
            - disb_prior.get(pcf_id, Decimal('0.00'))
            + rep_prior.get(pcf_id, Decimal('0.00'))
        )

        txns = period_txns_map.get(pcf_id, [])
        disbursements = sum(t.amount for t in txns if t.type == 'disbursement')
        replenishments = sum(t.amount for t in txns if t.type == 'replenishment')

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
            for t in sorted(txns, key=lambda x: (x.date, x.id), reverse=True)
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

    return cash_on_hand
