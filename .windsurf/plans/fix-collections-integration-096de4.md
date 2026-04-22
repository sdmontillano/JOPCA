# Fix Collections Integration with Dashboard

This plan will fix the issue where cash collections are not showing up in the dashboard Collections total because the Collections API and bank transactions are separate systems that need to be integrated.

## Issue Found
- Collections are stored in Collection model with status "UNDEPOSITED"
- Dashboard Collections column only looks at Transaction model with type="collection"
- Missing integration between Collection records and Transaction records

## Solution Options
1. Update dashboard to include Collection data in Collections total
2. Create automatic Transaction records when Collections are created
3. Update compute_bank_daily_summary to include Collection data

## Implementation Steps
1. Modify compute_bank_daily_summary to include Collection data
2. Update dashboard to properly calculate Collections from both sources
3. Ensure Collections are properly reflected in bank summaries
