# Debug Collection Calculation Issue

This plan will investigate why a single collection of 200 is showing as 1,000 in the dashboard Collections total.

## Potential Issues
1. Duplicate counting of collections across multiple banks
2. Collection records being counted multiple times
3. Aggregation logic incorrectly summing collections per bank
4. Multiple collection records being created

## Investigation Steps
1. Check if collections are being duplicated across banks
2. Verify Collection model records for the date
3. Debug compute_bank_daily_summary aggregation logic
4. Check if collections are bank-specific or global

## Implementation
Add debugging to understand the exact collection calculation and identify where the 5x multiplier is coming from.
