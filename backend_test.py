#!/usr/bin/env python3
"""
Backend API Testing for Quantum IA Web3 DAO Governance App

This script tests the FastAPI backend server endpoints:
- GET /api/ (root endpoint)
- GET /api/status (get status checks)
- POST /api/status (create status check)

The backend should be running on port 8001 via supervisor.
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
        return "https://governance-fintech.preview.emergentagent.com/api"
    except Exception as e:
        print(f"Warning: Could not read frontend .env file: {e}")
        return "https://governance-fintech.preview.emergentagent.com/api"

class QuantumIABackendTester:
    def __init__(self):
        self.base_url = get_backend_url()
        self.test_results = []
        self.session = requests.Session()
        self.session.timeout = 10
        
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
                if data.get('message') == 'Hello World':
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
                        f"Unexpected message content: {data.get('message')}", 
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

    def test_get_status_checks(self):
        """Test GET /api/status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/status")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(
                        "GET /api/status - Get status checks", 
                        True, 
                        f"Returned list with {len(data)} status checks", 
                        f"Count: {len(data)}"
                    )
                else:
                    self.log_test(
                        "GET /api/status - Get status checks", 
                        False, 
                        f"Expected list, got {type(data)}", 
                        data
                    )
            else:
                self.log_test(
                    "GET /api/status - Get status checks", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("GET /api/status - Get status checks", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("GET /api/status - Get status checks", False, f"Invalid JSON response: {str(e)}")

    def test_create_status_check(self):
        """Test POST /api/status endpoint"""
        test_data = {
            "client_name": "Quantum IA Test Client"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/status", 
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['id', 'client_name', 'timestamp']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    if data['client_name'] == test_data['client_name']:
                        self.log_test(
                            "POST /api/status - Create status check", 
                            True, 
                            f"Successfully created status check with ID: {data.get('id')}", 
                            data
                        )
                        return data  # Return for potential cleanup
                    else:
                        self.log_test(
                            "POST /api/status - Create status check", 
                            False, 
                            f"Client name mismatch. Expected: {test_data['client_name']}, Got: {data['client_name']}", 
                            data
                        )
                else:
                    self.log_test(
                        "POST /api/status - Create status check", 
                        False, 
                        f"Missing required fields: {missing_fields}", 
                        data
                    )
            else:
                self.log_test(
                    "POST /api/status - Create status check", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    response.text
                )
                
        except requests.RequestException as e:
            self.log_test("POST /api/status - Create status check", False, f"Request failed: {str(e)}")
        except json.JSONDecodeError as e:
            self.log_test("POST /api/status - Create status check", False, f"Invalid JSON response: {str(e)}")
        
        return None

    def test_mongodb_integration(self):
        """Test MongoDB integration by creating and retrieving data"""
        print("🔗 Testing MongoDB Integration...")
        
        # First create a status check
        created_check = self.test_create_status_check()
        
        if created_check:
            # Then verify it can be retrieved
            print("📋 Verifying data persistence...")
            try:
                response = self.session.get(f"{self.base_url}/status")
                if response.status_code == 200:
                    checks = response.json()
                    found_check = None
                    
                    for check in checks:
                        if check.get('id') == created_check.get('id'):
                            found_check = check
                            break
                    
                    if found_check:
                        self.log_test(
                            "MongoDB Integration Test", 
                            True, 
                            "Data successfully persisted and retrieved from MongoDB", 
                            f"Found check with ID: {found_check.get('id')}"
                        )
                    else:
                        self.log_test(
                            "MongoDB Integration Test", 
                            False, 
                            "Created status check not found in database", 
                            f"Created ID: {created_check.get('id')}, Available IDs: {[c.get('id') for c in checks]}"
                        )
                else:
                    self.log_test(
                        "MongoDB Integration Test", 
                        False, 
                        f"Failed to retrieve status checks: HTTP {response.status_code}", 
                        response.text
                    )
            except Exception as e:
                self.log_test("MongoDB Integration Test", False, f"Error during data retrieval: {str(e)}")
        else:
            self.log_test("MongoDB Integration Test", False, "Could not create initial status check")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Quantum IA Backend API Tests")
        print(f"🔗 Testing backend at: {self.base_url}")
        print("=" * 60)
        
        # Test individual endpoints
        self.test_root_endpoint()
        self.test_get_status_checks()
        
        # Test MongoDB integration (includes POST test)
        self.test_mongodb_integration()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
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