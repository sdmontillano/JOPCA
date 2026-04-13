# banking_dcpr/core/constants.py
"""
Centralized transaction type definitions for JOPCA-DCPR.
Import from this module instead of redefining sets in multiple files.
"""

# INFLOW_TYPES - Types that ADD to bank balance (affect ending balance)
INFLOW_TYPES = frozenset([
    "collections", "collection",
    "fund_transfer", "fund_transfers",
    "interbank_transfer", "interbank_transfers",
    "transfer",
])

# OUTFLOW_TYPES - Types that SUBTRACT from bank balance (affect ending balance)
OUTFLOW_TYPES = frozenset([
    "disbursement", "disbursements",
    "bank_charges", "bank_charge",
    "returned_check", "returned_checks",
])

# LOCAL_DEPOSIT_TYPES - Tracking only (do NOT affect ending balance)
# These show in Local Deposits column but don't calculate in ending balance
LOCAL_DEPOSIT_TYPES = frozenset([
    "local_deposits", "local_deposit",
    "deposit", "deposits",  # deposit is now tracking only!
])

# TRANSFER_TYPES
TRANSFER_TYPES = frozenset([
    "transfer", "fund_transfer", "fund_transfers",
    "interbank_transfer", "interbank_transfers",
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


def get_all_transaction_types():
    """Return all known transaction types as a frozenset."""
    return INFLOW_TYPES | OUTFLOW_TYPES | RETURNED_TYPES | ADJUSTMENT_TYPES | LOCAL_DEPOSIT_TYPES | PDC_TYPES