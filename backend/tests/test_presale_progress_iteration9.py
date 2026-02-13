"""
Iteration 9: Test presale progress API with SOL price fix (Binance fallback)
Tests the bug fix where presale was showing $5 instead of ~$1100+
"""
import pytest
import requests
import os

BASE_URL = "https://deep-link-wallet.preview.emergentagent.com"


class TestPresaleProgressAPI:
    """Test presale progress endpoint with SOL price fix"""

    def test_presale_progress_returns_correct_raised(self):
        """Test that presale progress returns total_raised > $5 (bug fix verification)"""
        response = requests.get(f"{BASE_URL}/api/presale/progress")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify response structure
        assert "total_raised" in data
        assert "goal" in data
        assert "progress_percentage" in data
        assert "participants" in data
        assert "sol_price_usd" in data
        assert "sol_value_usd" in data
        
        # BUG FIX VERIFICATION: total_raised should be ~$1000+ not $5
        assert data["total_raised"] > 100, f"total_raised ({data['total_raised']}) should be > $100 (was $5 before fix)"
        print(f"✅ total_raised = ${data['total_raised']:.2f} (correct, not $5)")
        
    def test_presale_progress_sol_price_not_zero(self):
        """Test that SOL price API returns non-zero (Binance fallback working)"""
        response = requests.get(f"{BASE_URL}/api/presale/progress")
        assert response.status_code == 200
        
        data = response.json()
        
        # BUG FIX VERIFICATION: sol_price_usd should be > 0 (fallback working)
        assert data["sol_price_usd"] > 0, f"sol_price_usd ({data['sol_price_usd']}) should be > 0 (Binance fallback)"
        print(f"✅ sol_price_usd = ${data['sol_price_usd']:.2f} (Binance fallback working)")
        
    def test_presale_progress_with_refresh(self):
        """Test presale progress with refresh=true to bypass cache"""
        response = requests.get(f"{BASE_URL}/api/presale/progress?refresh=true")
        assert response.status_code == 200
        
        data = response.json()
        
        # Should still return correct values with cache bypass
        assert data["total_raised"] > 100
        assert data["sol_price_usd"] > 0
        print(f"✅ With refresh: total_raised=${data['total_raised']:.2f}, sol_price=${data['sol_price_usd']:.2f}")

    def test_presale_progress_structure(self):
        """Test complete response structure"""
        response = requests.get(f"{BASE_URL}/api/presale/progress")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all expected fields
        expected_fields = [
            "total_raised", "goal", "progress_percentage", "remaining",
            "participants", "is_active", "sol_balance", "sol_price_usd",
            "sol_value_usd", "start_date", "end_date"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_raised"], (int, float))
        assert isinstance(data["goal"], (int, float))
        assert isinstance(data["progress_percentage"], (int, float))
        assert isinstance(data["participants"], int)
        assert isinstance(data["is_active"], bool)
        
        print("✅ All expected fields present with correct types")


class TestHealthAndConfig:
    """Test basic health and config endpoints"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")
        
    def test_config(self):
        """Test config endpoint"""
        response = requests.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        data = response.json()
        assert "tokenPrice" in data
        assert "minPurchase" in data
        assert data["tokenPrice"] == 0.20
        print("✅ Config endpoint working")
        
    def test_affiliate_config(self):
        """Test affiliate config endpoint"""
        response = requests.get(f"{BASE_URL}/api/affiliate/config")
        assert response.status_code == 200
        data = response.json()
        assert "max_levels" in data
        assert data["max_levels"] == 5
        print("✅ Affiliate config endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
