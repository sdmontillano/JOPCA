# banking_dcpr/core/constants.py
"""
Centralized transaction type definitions for JOPCA-DCPR.
Import from this module instead of redefining sets in multiple files.
"""

# DEPOSIT_TYPES - The ONLY types that ADD to bank balance directly
DEPOSIT_TYPES = frozenset([
    "deposit", "deposits",
])

# FUND_TRANSFER_IN - Money transferred INTO this bank account
FUND_TRANSFER_IN = frozenset([
    "fund_transfer_in",
])

# FUND_TRANSFER_OUT - Money transferred OUT of this bank account
FUND_TRANSFER_OUT = frozenset([
    "fund_transfer_out",
])

# INFLOW_TYPES = DEPOSIT_TYPES (only deposit adds to bank balance)
INFLOW_TYPES = DEPOSIT_TYPES

# OUTFLOW_TYPES - Types that SUBTRACT from bank balance
OUTFLOW_TYPES = frozenset([
    "disbursement", "disbursements",
    "bank_charges", "bank_charge",
    "returned_check", "returned_checks",
])

# LOCAL_DEPOSIT_TYPES - Tracking only (do NOT affect ending balance)
# These show in Local Deposits column but don't calculate in ending balance
LOCAL_DEPOSIT_TYPES = frozenset([
    "local_deposits", "local_deposit",
])

# TRANSFER_TYPES - For reporting (neutral in balance)
TRANSFER_TYPES = frozenset([
    "transfer", "fund_transfer", "fund_transfers",
    "interbank_transfer", "interbank_transfers",
    "fund_transfer_in", "fund_transfer_out",
])

# RETURNED_TYPES
RETURNED_TYPES = frozenset([
    "returned_check", "returned_checks",
])

# ADJUSTMENT_TYPES
ADJUSTMENT_TYPES = frozenset([
    "adjustments", "adjustment",
])

# PDC_TYPES
PDC_TYPES = frozenset([
    "post_dated_check", "post_dated_checks",
])

# COLLECTION TYPE CONSTANTS - New system using collection_type field
COLLECTION_TYPE_CASH = "cash"
COLLECTION_TYPE_BANK_TRANSFER = "bank_transfer"
COLLECTION_TYPE_CHECK = "check"

COLLECTION_TYPES = frozenset([
    COLLECTION_TYPE_CASH,
    COLLECTION_TYPE_BANK_TRANSFER,
    COLLECTION_TYPE_CHECK,
])

# PDC STATUS CONSTANTS
PDC_STATUS_OUTSTANDING = "outstanding"
PDC_STATUS_CLEARED = "cleared"
PDC_STATUS_BOUNCED = "bounced"


def is_inflow(tx_type):
    """Check if transaction type is an inflow."""
    return (tx_type or "").strip().lower() in INFLOW_TYPES


def is_outflow(tx_type):
    """Check if transaction type is an outflow."""
    return (tx_type or "").strip().lower() in OUTFLOW_TYPES


def is_transfer(tx_type):
    """Check if transaction type is a transfer."""
    return (tx_type or "").strip().lower() in TRANSFER_TYPES


def is_local_deposit(tx_type):
    """Check if transaction type is a local deposit (tracking only, neutral in formula)."""
    return (tx_type or "").strip().lower() in LOCAL_DEPOSIT_TYPES


def is_returned_check(tx_type):
    """Check if transaction type is a returned check."""
    return (tx_type or "").strip().lower() in RETURNED_TYPES


def is_pdc(tx_type):
    """Check if transaction type is a post-dated check."""
    return (tx_type or "").strip().lower() in PDC_TYPES


def is_adjustment(tx_type):
    """Check if transaction type is an adjustment."""
    return (tx_type or "").strip().lower() in ADJUSTMENT_TYPES


def is_collection_type_cash(collection_type):
    """Check if collection type is Cash (goes to cash on hand)."""
    return (collection_type or "").strip().lower() == COLLECTION_TYPE_CASH


def is_collection_type_bank_transfer(collection_type):
    """Check if collection type is Bank Transfer (goes directly to bank)."""
    return (collection_type or "").strip().lower() == COLLECTION_TYPE_BANK_TRANSFER


def is_collection_type_check(collection_type):
    """Check if collection type is Check/PDC."""
    return (collection_type or "").strip().lower() == COLLECTION_TYPE_CHECK


def is_pdc_cleared(pdc_status):
    """Check if PDC status is cleared (affects bank balance)."""
    return (pdc_status or "").strip().lower() == PDC_STATUS_CLEARED


def is_pdc_bounced(pdc_status):
    """Check if PDC status is bounced (reversed, excluded from totals)."""
    return (pdc_status or "").strip().lower() == PDC_STATUS_BOUNCED


def get_all_transaction_types():
    """Return all known transaction types as a frozenset."""
    return INFLOW_TYPES | OUTFLOW_TYPES | RETURNED_TYPES | ADJUSTMENT_TYPES | LOCAL_DEPOSIT_TYPES | PDC_TYPES