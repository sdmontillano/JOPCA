# Fix Fund Transfer Display Sign Issue

This plan will fix the issue where fund_transfer_in transactions are showing as negative amounts instead of positive amounts in the BankDetail component.

## Issue Found
- fund_transfer_in transactions are showing as negative (-) instead of positive (+)
- The INFLOW_TYPES array in BankDetail.jsx doesn't include 'fund_transfer_in'
- The formatAmount function uses INFLOW_TYPES to determine sign (+ or -)

## Solution
Add 'fund_transfer_in' to INFLOW_TYPES and 'fund_transfer_out' to OUTFLOW_TYPES in BankDetail.jsx to ensure proper sign display.

## Implementation Steps
1. Update INFLOW_TYPES to include 'fund_transfer_in'
2. Update OUTFLOW_TYPES to include 'fund_transfer_out'
3. Update typeColors to include styling for both fund transfer types
