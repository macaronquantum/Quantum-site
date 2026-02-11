#!/usr/bin/env python3
"""
Backend API Testing for Quantum IA Web3 DAO Governance App

This script tests the FastAPI backend server endpoints:
- GET /api/ (root endpoint)
- GET /api/config (configuration endpoint)
- POST /api/presale/purchase (presale purchase endpoint)
- GET /api/referral/{wallet_address} (referral data endpoint)
- GET /api/health (health check endpoint)

The backend should be running via supervisor and accessible via the external URL.
"""

import requests
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, List

# Get backend URL from frontend .env file
def get_backend_url():
    """Get the backend URL from frontend .env file"""
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    backend_url = line.strip().split('=')[1]
                    return f"{backend_url}/api"
        # Fallback if not found in .env
        return "https://mlm-network-20.preview.emergentagent.com/api"
    except Exception as e:
        print(f"Warning: Could not read frontend .env file: {e}")
        return "https://mlm-network-20.preview.emergentagent.com/api"

class QuantumIABackendTester:
    def __init__(self):
        self.base_url = get_backend_url()
        self.test_results = []
        self.session = requests.Session()
        self.session.timeout = 30
        
    def log_test(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test results"""
        result = {
            'test_name': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()

    def test_root_endpoint(self):
        """Test GET /api/ endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                expected_message = 'Quantum IA Backend API'
                if data.get('message') == expected_message:
                    self.log_test(
                        "GET /api/ - Root endpoint", 
                        True, 
                        f"Returned correct message: {data.get('message')}", 
                        data
                    )
                else:
                    self.log_test(
                        "GET /api/ - Root endpoint", 
                        False, 
                        f"Expected '{expected_message}', got: {data.get('message')}", 
                        data
                    )
            else:
                self.log_test(
                    "GET /api/ - Root endpoint", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("GET /api/ - Root endpoint", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/ - Root endpoint", False, f"Invalid JSON response: {str(e)}")

    def test_health_endpoint(self):
        """Test GET /api/health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy' and data.get('database') == 'connected':
                    self.log_test(
                        "GET /api/health - Health check", 
                        True, 
                        f"Server healthy, database connected", 
                        data
                    )
                else:
                    self.log_test(
                        "GET /api/health - Health check", 
                        False, 
                        f"Unexpected health status: {data}", 
                        data
                    )
            else:
                self.log_test(
                    "GET /api/health - Health check", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("GET /api/health - Health check", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/health - Health check", False, f"Invalid JSON response: {str(e)}")

    def test_config_endpoint(self):
        """Test GET /api/config endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/config")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['tokenPrice', 'minPurchase', 'solanaAddress', 'commissionRate']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Validate data types and values
                    if (isinstance(data['tokenPrice'], (int, float)) and 
                        isinstance(data['minPurchase'], int) and 
                        isinstance(data['solanaAddress'], str) and 
                        isinstance(data['commissionRate'], (int, float))):
                        self.log_test(
                            "GET /api/config - Configuration", 
                            True, 
                            f"All required fields present. Token price: ${data['tokenPrice']}, Min purchase: {data['minPurchase']}", 
                            data
                        )
                    else:
                        self.log_test(
                            "GET /api/config - Configuration", 
                            False, 
                            f"Invalid data types in response", 
                            data
                        )
                else:
                    self.log_test(
                        "GET /api/config - Configuration", 
                        False, 
                        f"Missing required fields: {missing_fields}", 
                        data
                    )
            else:
                self.log_test(
                    "GET /api/config - Configuration", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("GET /api/config - Configuration", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/config - Configuration", False, f"Invalid JSON response: {str(e)}")

    def test_referral_endpoint(self):
        """Test GET /api/referral/{wallet_address} endpoint"""
        # Use a realistic Solana wallet address for testing
        test_wallet = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        
        try:
            response = self.session.get(f"{self.base_url}/referral/{test_wallet}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['walletAddress', 'referralCode', 'referrals', 'totalPurchased', 'commissionEarned', 'commissionPending', 'commissionPaid']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    if (data['walletAddress'] == test_wallet and 
                        data['referralCode'].startswith('QTM')):
                        self.log_test(
                            "GET /api/referral/{address} - Referral data", 
                            True, 
                            f"Valid referral data returned. Code: {data['referralCode']}, Referrals: {data['referrals']}", 
                            data
                        )
                    else:
                        self.log_test(
                            "GET /api/referral/{address} - Referral data", 
                            False, 
                            f"Invalid referral data format or wallet mismatch", 
                            data
                        )
                else:
                    self.log_test(
                        "GET /api/referral/{address} - Referral data", 
                        False, 
                        f"Missing required fields: {missing_fields}", 
                        data
                    )
            else:
                self.log_test(
                    "GET /api/referral/{address} - Referral data", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("GET /api/referral/{address} - Referral data", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/referral/{address} - Referral data", False, f"Invalid JSON response: {str(e)}")

    def test_presale_purchase_crypto(self):
        """Test POST /api/presale/purchase endpoint with crypto payment"""
        test_data = {
            "firstName": "Alice",
            "lastName": "Johnson", 
            "email": "alice.johnson@example.com",
            "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            "tokenAmount": 1000,
            "paymentMethod": "crypto",
            "hostUrl": "https://mlm-network-20.preview.emergentagent.com"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/presale/purchase", 
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['success', 'message']
                
                if all(field in data for field in required_fields):
                    if (data['success'] == True and 
                        'solanaAddress' in data and 
                        'amount' in data):
                        self.log_test(
                            "POST /api/presale/purchase - Crypto payment", 
                            True, 
                            f"Crypto purchase successful. Amount: ${data.get('amount')}, Solana address provided", 
                            {"success": data['success'], "amount": data.get('amount')}
                        )
                    else:
                        self.log_test(
                            "POST /api/presale/purchase - Crypto payment", 
                            False, 
                            f"Invalid crypto purchase response structure", 
                            data
                        )
                else:
                    self.log_test(
                        "POST /api/presale/purchase - Crypto payment", 
                        False, 
                        f"Missing required fields in response", 
                        data
                    )
            else:
                self.log_test(
                    "POST /api/presale/purchase - Crypto payment", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("POST /api/presale/purchase - Crypto payment", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("POST /api/presale/purchase - Crypto payment", False, f"Invalid JSON response: {str(e)}")

    def test_presale_purchase_card(self):
        """Test POST /api/presale/purchase endpoint with card payment"""
        test_data = {
            "firstName": "Bob",
            "lastName": "Smith", 
            "email": "bob.smith@example.com",
            "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            "tokenAmount": 500,
            "paymentMethod": "card",
            "hostUrl": "https://mlm-network-20.preview.emergentagent.com"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/presale/purchase", 
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['success', 'message']
                
                if all(field in data for field in required_fields):
                    if (data['success'] == True and 
                        'checkoutUrl' in data and 
                        'sessionId' in data):
                        self.log_test(
                            "POST /api/presale/purchase - Card payment", 
                            True, 
                            f"Card payment checkout created. Session ID: {data.get('sessionId')[:12]}...", 
                            {"success": data['success'], "has_checkout_url": bool(data.get('checkoutUrl'))}
                        )
                    else:
                        self.log_test(
                            "POST /api/presale/purchase - Card payment", 
                            False, 
                            f"Invalid card payment response structure", 
                            data
                        )
                else:
                    self.log_test(
                        "POST /api/presale/purchase - Card payment", 
                        False, 
                        f"Missing required fields in response", 
                        data
                    )
            else:
                self.log_test(
                    "POST /api/presale/purchase - Card payment", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("POST /api/presale/purchase - Card payment", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("POST /api/presale/purchase - Card payment", False, f"Invalid JSON response: {str(e)}")

    def test_presale_validation(self):
        """Test POST /api/presale/purchase input validation"""
        # Test minimum purchase validation
        test_data = {
            "firstName": "Charlie",
            "lastName": "Brown", 
            "email": "charlie.brown@example.com",
            "walletAddress": "8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            "tokenAmount": 50,  # Below minimum (100)
            "paymentMethod": "crypto",
            "hostUrl": "https://mlm-network-20.preview.emergentagent.com"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/presale/purchase", 
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 400:
                data = response.json()
                if "Minimum purchase" in data.get('detail', ''):
                    self.log_test(
                        "POST /api/presale/purchase - Validation", 
                        True, 
                        f"Correctly rejected purchase below minimum: {data.get('detail')}", 
                        data
                    )
                else:
                    self.log_test(
                        "POST /api/presale/purchase - Validation", 
                        False, 
                        f"Wrong validation error message: {data.get('detail')}", 
                        data
                    )
            else:
                self.log_test(
                    "POST /api/presale/purchase - Validation", 
                    False, 
                    f"Expected HTTP 400, got {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("POST /api/presale/purchase - Validation", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("POST /api/presale/purchase - Validation", False, f"Invalid JSON response: {str(e)}")

    def check_status_endpoints(self):
        """Check if status endpoints exist (mentioned in review request but not in code)"""
        print("🔍 Checking for status endpoints...")
        
        try:
            # Test GET /api/status
            response = self.session.get(f"{self.base_url}/status")
            if response.status_code == 404:
                self.log_test(
                    "GET /api/status - Status check", 
                    False, 
                    "Endpoint not found - not implemented in current server.py", 
                    "404 Not Found"
                )
            else:
                self.log_test(
                    "GET /api/status - Status check", 
                    False, 
                    f"Unexpected response: HTTP {response.status_code}", 
                    response.text
                )
                
            # Test POST /api/status
            response = self.session.post(
                f"{self.base_url}/status",
                json={"client_name": "test"},
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 404:
                self.log_test(
                    "POST /api/status - Create status check", 
                    False, 
                    "Endpoint not found - not implemented in current server.py", 
                    "404 Not Found"
                )
            else:
                self.log_test(
                    "POST /api/status - Create status check", 
                    False, 
                    f"Unexpected response: HTTP {response.status_code}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("Status endpoints check", False, f"Request failed: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Quantum IA Backend API Tests")
        print(f"🔗 Testing backend at: {self.base_url}")
        print("=" * 80)
        
        # Test core endpoints
        self.test_root_endpoint()
        self.test_health_endpoint()
        self.test_config_endpoint()
        self.test_referral_endpoint()
        
        # Test presale endpoints
        self.test_presale_purchase_crypto()
        self.test_presale_purchase_card()
        self.test_presale_validation()
        
        # Check missing endpoints mentioned in review
        self.check_status_endpoints()
        
        # Summary
        print("=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test_name']}: {result['details']}")
        else:
            print("\n✅ All tests passed!")
        
        return failed_tests == 0


if __name__ == "__main__":
    tester = QuantumIABackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)