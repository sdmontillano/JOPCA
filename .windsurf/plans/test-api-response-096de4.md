# Test API Response for Fund Transfer Data

This plan will create a test script to verify if the backend API is returning fund transfer data correctly and identify any data mapping issues.

## Investigation Needed
- Check if backend returns fund_transfers_in and fund_transfers_out fields
- Verify API response structure matches frontend expectations
- Identify any data mapping inconsistencies

## Test Steps
1. Create test script to call compute_bank_daily_summary
2. Check response structure for fund transfer fields
3. Verify data types and values
4. Compare with frontend data mapping
