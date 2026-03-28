# banking_dcpr/core/constants.py
"""
Centralized transaction type definitions for JOPCA-DCPR.
Import from this module instead of redefining sets in multiple files.
"""

INFLOW_TYPES = frozenset([
    "deposit", "deposits", "collections", "collection",
    "fund_transfer", "fund_transfers",
    "interbank_transfer", "interbank_transfers",
    "transfer",
])

OUTFLOW_TYPES = frozenset([
    "disbursement", "disbursements",
    "bank_charges", "bank_charge",
])

TRANSFER_TYPES = frozenset([
    "transfer", "fund_transfer", "fund_transfers",
    "interbank_transfer", "interbank_transfers",
])

RETURNED_TYPES = frozenset([
    "returned_check", "returned_checks",
])

ADJUSTMENT_TYPES = frozenset([
    "adjustments", "adjustment",
])

LOCAL_DEPOSIT_TYPES = frozenset([
    "local_deposits", "local_deposit",
])

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
