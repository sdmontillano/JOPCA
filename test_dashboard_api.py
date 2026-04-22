#!/usr/bin/env python3
"""
Test script to verify dashboard API endpoints are working correctly
"""
import requests
import json
from datetime import datetime, date

# Base URL
BASE_URL = "http://127.0.0.1:8000"

def test_api_endpoint(endpoint, description):
    """Test a single API endpoint"""
    print(f"\n=== Testing {description} ===")
    print(f"Endpoint: {endpoint}")
    
    try:
        response = requests.get(f"{BASE_URL}{endpoint}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            
            # Check for expected fields
            if 'cash_in_bank' in data:
                print(f"Cash in Bank entries: {len(data['cash_in_bank'])}")
            if 'accounts' in data:
                print(f"Accounts: {len(data['accounts'])}")
            if 'cash_on_hand' in data:
                print(f"PCF entries: {len(data['cash_on_hand'])}")
            
            print("SUCCESS: Endpoint working correctly")
            return True
        else:
            print(f"ERROR: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to server. Make sure Django server is running.")
        return False
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

def main():
    print("Dashboard API Test Script")
    print("=" * 50)
    
    # Test endpoints
    today = date.today()
    month_str = today.strftime("%Y-%m")
    
    endpoints = [
        (f"/summary/detailed-daily/", "Daily Summary"),
        (f"/summary/detailed-monthly/?month={month_str}", "Monthly Summary"),
        (f"/summary/detailed-daily-report/?date={today}", "Daily Report"),
        (f"/summary/detailed-monthly-report/?month={month_str}", "Monthly Report"),
    ]
    
    results = []
    for endpoint, description in endpoints:
        success = test_api_endpoint(endpoint, description)
        results.append((description, success))
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    for description, success in results:
        status = "PASS" if success else "FAIL"
        print(f"{description}: {status}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("All dashboard API endpoints are working correctly!")
    else:
        print("Some endpoints need attention.")

if __name__ == "__main__":
    main()
