#!/usr/bin/env python3
"""
Additional Backend API Tests for Quantum IA - Stripe Integration Check
"""

import requests
import json

def test_stripe_endpoints():
    """Test additional Stripe-related endpoints"""
    base_url = "https://fiat-to-usdc.preview.emergentagent.com/api"
    session = requests.Session()
    session.timeout = 10
    
    print("🔍 Testing additional endpoints...")
    
    # Test presale status endpoint (should return 404 for non-existent session)
    try:
        response = session.get(f"{base_url}/presale/status/fake_session_id")
        if response.status_code == 404:
            print("✅ PASS GET /api/presale/status/{id} - Correctly returns 404 for invalid session")
        else:
            print(f"❌ FAIL GET /api/presale/status/{id} - Expected 404, got {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL GET /api/presale/status/{id} - Request failed: {e}")
    
    # Test webhook endpoint (should require signature)
    try:
        response = session.post(
            f"{base_url}/webhook/stripe",
            json={"test": "data"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 400:
            data = response.json()
            if "signature" in data.get('detail', '').lower():
                print("✅ PASS POST /api/webhook/stripe - Correctly requires Stripe signature")
            else:
                print(f"❌ FAIL POST /api/webhook/stripe - Wrong error: {data.get('detail')}")
        else:
            print(f"❌ FAIL POST /api/webhook/stripe - Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"❌ FAIL POST /api/webhook/stripe - Request failed: {e}")

if __name__ == "__main__":
    test_stripe_endpoints()