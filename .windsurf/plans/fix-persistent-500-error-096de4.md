# Fix Persistent 500 Error on Dashboard Endpoint

This plan will resolve the persistent 500 Internal Server Error by simplifying the collection integration logic and avoiding any potential model comparison issues.

## Issue Analysis
- The 500 error persists despite fixing imports and function flags
- The `bank == banks.first()` comparison may still be causing issues
- Need to revert to a simpler, more reliable approach

## Solution
Temporarily remove the collection integration to get the dashboard working, then implement a cleaner approach that doesn't interfere with the core functionality.

## Implementation Steps
1. Remove collection integration temporarily to isolate the issue
2. Test if dashboard loads without collection code
3. Implement a cleaner collection integration approach
4. Ensure collections work without breaking the dashboard
