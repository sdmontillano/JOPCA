# Fix Dashboard Cash In Bank Table Missing Columns

This plan will fix the cash in bank table in Dashboard.jsx that's missing Fund Transfer and Fund Receipt columns by adding the missing columns to match the 2-day inline table structure.

## Issues Found
- Dashboard.jsx has a third cash in bank table (lines ~1080-1098) with only 7 columns
- Missing Fund Transfer and Fund Receipt columns
- Missing Local Deposits column  
- Table structure doesn't match the 2-day inline table

## Changes Needed
1. Add "Local Deposits" column header between Collections and Disbursements
2. Add "Fund Transfer" column header after Disbursements  
3. Add "Fund Receipt" column header after Fund Transfer
4. Update table body to display the new column data
5. Update column span from 8 to 11 for empty state
6. Update grand total row to include new columns

## Implementation Steps
1. Update table header section to add missing columns
2. Update table body rows to display data for new columns
3. Fix empty state column span
4. Update grand total row structure
