# Fix Collection Import Error Causing 500 Server Error

This plan will fix the persistent 500 Internal Server Error by correcting the Collection model import path in the summary.py file.

## Issue Identified
- Collection model import uses wrong path: `from core.models import Collection`
- Should be: `from ..models import Collection` to match other imports
- This import error is causing the 500 server error

## Solution
Fix the import statement to use the correct relative import path and add Collection to the top-level imports.

## Implementation Steps
1. Add Collection to the top-level imports in summary.py
2. Remove the incorrect inline import
3. Test that the dashboard endpoint loads without errors
