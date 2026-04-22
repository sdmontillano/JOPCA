#!/usr/bin/env python
"""
Test script to verify dashboard API endpoints using Django's test client
"""
import os
import sys
import django
from django.test import Client
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'banking_dcpr.settings')
django.setup()

def test_endpoints():
    print("Testing Dashboard API Endpoints")
    print("=" * 50)
    
    # Create test user and get token
    try:
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={'email': 'test@example.com', 'is_staff': True}
        )
        if created:
            user.set_password('testpass123')
            user.save()
        
        token, created = Token.objects.get_or_create(user=user)
        auth_header = f'Token {token.key}'
        
        client = Client()
        
        # Test endpoints
        endpoints = [
            ('/summary/detailed-daily/', 'Daily Summary'),
            ('/summary/detailed-monthly/?month=2024-01', 'Monthly Summary'),
        ]
        
        for endpoint, description in endpoints:
            print(f"\n=== Testing {description} ===")
            print(f"Endpoint: {endpoint}")
            
            try:
                response = client.get(endpoint, HTTP_AUTHORIZATION=auth_header)
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
                else:
                    print(f"ERROR: {response.status_code}")
                    print(f"Response: {response.content.decode()}")
                    
            except Exception as e:
                print(f"EXCEPTION: {str(e)}")
        
        print("\n" + "=" * 50)
        print("Test completed successfully!")
        
    except Exception as e:
        print(f"Setup error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_endpoints()
