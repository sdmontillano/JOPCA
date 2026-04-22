# Fix Persistent Dashboard 500 Error

This plan will investigate and fix the persistent 500 Internal Server Error preventing dashboard access by addressing potential issues with the function flag approach in compute_bank_daily_summary.

## Issue Analysis
- Dashboard still showing 500 error despite fixing Collection import
- Function flag approach (compute_bank_daily_summary._collections_counted) may be causing issues
- Need to revert to simpler, more reliable approach

## Solution
Revert the function flag approach and use a simpler method to prevent collection duplication that doesn't rely on function attributes.

## Implementation Steps
1. Remove the function flag logic that may be causing issues
2. Use a simpler approach to count collections only once
3. Test that the dashboard endpoint loads without errors
4. Ensure collections are still properly integrated without duplication
