# Fix Fund Transfer Columns in CashInBankTable

This plan will fix the missing Fund Transfer and Fund Receipt columns in the CashInBankTable component by adding separate columns for fund transfers out and fund transfers in, matching the Dashboard.jsx implementation.

## Issues Found
- CashInBankTable only has one "Fund Trans" column instead of separate "Fund Transfer" and "Fund Receipt" columns
- Uses single `fund_transfers` field instead of `fund_transfers_out` and `fund_transfers_in`
- Missing proper column structure that matches Dashboard.jsx

## Changes Needed
1. Update table header to include both "Fund Transfer" and "Fund Receipt" columns
2. Update table body to display `fund_transfers_out` and `fund_transfers_in` separately
3. Update totals calculation to handle separate fund transfer fields
4. Update CSV export to include both columns
5. Fix column count in "No data" message

## Implementation Steps
1. Modify table header section to add both columns
2. Update table body rows to display separate fund transfer values
3. Fix totals calculation logic
4. Update grand total row
5. Update CSV export headers and data
6. Update column span for empty state
