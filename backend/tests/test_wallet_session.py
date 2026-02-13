"""
Backend tests for Wallet Session endpoints (deep-link flow)
Tests the /api/wallet/session POST and GET endpoints used for Phantom wallet mobile deep-linking
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWalletSessionEndpoints:
    """Test wallet session creation and retrieval for deep-link flow"""
    
    def test_create_wallet_session_success(self):
        """POST /api/wallet/session - Create a session with keypair"""
        keypair_data = json.dumps({"pub": [1, 2, 3, 4, 5], "sec": [6, 7, 8, 9, 10]})
        response = requests.post(
            f"{BASE_URL}/api/wallet/session",
            json={"keypair": keypair_data},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_id" in data, "Response should contain session_id"
        assert len(data["session_id"]) == 8, "Session ID should be 8 characters"
        
        # Store session_id for next test
        self.__class__.test_session_id = data["session_id"]
        print(f"✓ Session created: {data['session_id']}")
    
    def test_get_wallet_session_success(self):
        """GET /api/wallet/session/{sid} - Retrieve and delete session"""
        # First create a session
        keypair_data = json.dumps({"pub": [11, 12, 13], "sec": [14, 15, 16]})
        create_resp = requests.post(
            f"{BASE_URL}/api/wallet/session",
            json={"keypair": keypair_data}
        )
        session_id = create_resp.json()["session_id"]
        
        # Now retrieve it
        response = requests.get(f"{BASE_URL}/api/wallet/session/{session_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["keypair"] == keypair_data, "Keypair should match what was stored"
        assert data["error"] is None, "Error should be null for valid session"
        print(f"✓ Session retrieved successfully")
    
    def test_get_wallet_session_deleted_after_retrieval(self):
        """Verify session is deleted after retrieval (one-time use)"""
        # Create session
        keypair_data = json.dumps({"pub": [21, 22], "sec": [23, 24]})
        create_resp = requests.post(
            f"{BASE_URL}/api/wallet/session",
            json={"keypair": keypair_data}
        )
        session_id = create_resp.json()["session_id"]
        
        # First retrieval should succeed
        first_get = requests.get(f"{BASE_URL}/api/wallet/session/{session_id}")
        assert first_get.status_code == 200
        assert first_get.json()["keypair"] == keypair_data
        
        # Second retrieval should return error (session deleted)
        second_get = requests.get(f"{BASE_URL}/api/wallet/session/{session_id}")
        assert second_get.status_code == 200  # Still returns 200 with error in body
        data = second_get.json()
        assert data["keypair"] is None, "Keypair should be None after deletion"
        assert data["error"] == "Session not found or expired", "Should return not found error"
        print(f"✓ Session correctly deleted after first retrieval")
    
    def test_get_nonexistent_session(self):
        """GET /api/wallet/session/{sid} - Non-existent session returns error"""
        response = requests.get(f"{BASE_URL}/api/wallet/session/nonexistent123")
        
        assert response.status_code == 200  # Returns 200 with error in body (not 404)
        data = response.json()
        assert data["keypair"] is None
        assert data["error"] == "Session not found or expired"
        print(f"✓ Non-existent session correctly returns error")
    
    def test_create_session_missing_keypair(self):
        """POST /api/wallet/session - Missing keypair should fail"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/session",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        print(f"✓ Missing keypair correctly rejected")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    def test_health_check(self):
        """GET /api/health - Health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("✓ Health check passed")
    
    def test_api_root(self):
        """GET /api - API root endpoint"""
        response = requests.get(f"{BASE_URL}/api")
        assert response.status_code == 200
        data = response.json()
        assert "Quantum IA" in data["message"]
        assert data["status"] == "operational"
        print("✓ API root passed")
    
    def test_presale_progress(self):
        """GET /api/presale/progress - Presale progress endpoint"""
        response = requests.get(f"{BASE_URL}/api/presale/progress")
        assert response.status_code == 200
        data = response.json()
        assert "total_raised" in data
        assert "goal" in data
        assert "participants" in data
        assert "is_active" in data
        print(f"✓ Presale progress: ${data['total_raised']:.2f} / ${data['goal']}")
    
    def test_config(self):
        """GET /api/config - Public config endpoint"""
        response = requests.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        data = response.json()
        assert data["tokenPrice"] == 0.2
        assert data["minPurchase"] == 100
        assert "solanaAddress" in data
        print("✓ Config endpoint passed")
    
    def test_affiliate_config(self):
        """GET /api/affiliate/config - Affiliate config endpoint"""
        response = requests.get(f"{BASE_URL}/api/affiliate/config")
        assert response.status_code == 200
        data = response.json()
        assert data["max_levels"] == 5
        assert "commission_rates" in data
        assert data["total_commission_percentage"] == 38.5
        print("✓ Affiliate config passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
