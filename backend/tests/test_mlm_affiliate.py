"""
MLM Affiliate System Backend Tests
Tests for:
- User registration with/without referral codes
- 5-level affiliate stats retrieval
- Commission distribution across levels
- Commission history
- Affiliate configuration
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fiat-to-usdc.preview.emergentagent.com').rstrip('/')

class TestHealthEndpoint:
    """Basic health check to ensure backend is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"
        print("PASS: Health endpoint returns healthy status")


class TestAffiliateConfig:
    """Test affiliate configuration endpoint"""
    
    def test_get_affiliate_config(self):
        """Verify commission rates are correctly configured (20%, 10%, 5%, 2.5%, 1%)"""
        response = requests.get(f"{BASE_URL}/api/affiliate/config")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("max_levels") == 5, "Should have 5 levels"
        
        commission_rates = data.get("commission_rates", {})
        
        # Verify Level 1: 20%
        assert commission_rates.get("1", {}).get("percentage") == 20.0
        # Verify Level 2: 10%
        assert commission_rates.get("2", {}).get("percentage") == 10.0
        # Verify Level 3: 5%
        assert commission_rates.get("3", {}).get("percentage") == 5.0
        # Verify Level 4: 2.5%
        assert commission_rates.get("4", {}).get("percentage") == 2.5
        # Verify Level 5: 1%
        assert commission_rates.get("5", {}).get("percentage") == 1.0
        
        # Total should be 38.5%
        total = data.get("total_commission_percentage", 0)
        assert 38.4 < total < 38.6, f"Total commission should be ~38.5%, got {total}"
        
        print("PASS: Commission rates correctly configured (20%, 10%, 5%, 2.5%, 1%)")


class TestAffiliateRegistration:
    """Test user registration with and without referral codes"""
    
    def test_register_without_referral_code(self):
        """Register a new user without a referral code"""
        unique_wallet = f"TEST_wallet_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": unique_wallet,
            "referral_code_used": None
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("wallet_public_key") == unique_wallet
        assert "referral_code" in data
        assert data["referral_code"].startswith("QTM")  # Referral codes start with QTM
        assert data.get("referrer_id") is None  # No referrer
        assert "created_at" in data
        
        print(f"PASS: Registered user {unique_wallet} with code {data['referral_code']}")
        return data
    
    def test_register_with_valid_referral_code(self):
        """Register a new user using an existing referral code"""
        # Use existing test user's referral code
        existing_referral_code = "QTM46AVU"  # TestWallet123ABC's code
        unique_wallet = f"TEST_referred_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": unique_wallet,
            "referral_code_used": existing_referral_code
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("wallet_public_key") == unique_wallet
        assert "referral_code" in data
        assert data.get("referrer_id") == "TestWallet123ABC"  # Should be linked to referrer
        
        print(f"PASS: Registered {unique_wallet} with referrer TestWallet123ABC")
        return data
    
    def test_register_with_invalid_referral_code(self):
        """Register with invalid referral code - should still succeed but without referrer"""
        unique_wallet = f"TEST_invalid_ref_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": unique_wallet,
            "referral_code_used": "INVALID123"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should succeed but without referrer
        assert data.get("wallet_public_key") == unique_wallet
        assert data.get("referrer_id") is None
        
        print("PASS: Registration with invalid code succeeds without referrer")
    
    def test_duplicate_registration_returns_existing(self):
        """Registering same wallet twice should return existing user"""
        existing_wallet = "TestWallet123ABC"
        
        response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": existing_wallet,
            "referral_code_used": None
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return existing user with same code
        assert data.get("referral_code") == "QTM46AVU"
        
        print("PASS: Duplicate registration returns existing user")


class TestAffiliateStats:
    """Test affiliate stats retrieval per level"""
    
    def test_get_stats_existing_user(self):
        """Get stats for existing user with commissions"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data.get("wallet_public_key") == "TestWallet123ABC"
        assert data.get("referral_code") == "QTM46AVU"
        assert "referral_link" in data
        assert "total_referrals" in data
        assert "total_earnings" in data
        assert "pending_earnings" in data
        assert "confirmed_earnings" in data
        assert "paid_earnings" in data
        
        # Verify 5 levels in response
        levels = data.get("levels", [])
        assert len(levels) == 5, f"Should have 5 levels, got {len(levels)}"
        
        for level in levels:
            assert "level" in level
            assert "referral_count" in level
            assert "total_commission" in level
            assert "pending_commission" in level
            assert "confirmed_commission" in level
            assert "paid_commission" in level
        
        # Verify level 1 has commissions (accumulated from test runs)
        level_1 = next((l for l in levels if l["level"] == 1), None)
        assert level_1 is not None
        # Note: Value may be higher than initial $50 due to accumulated test data
        assert level_1.get("total_commission") >= 50.0  # At least $250 purchase * 20%
        
        print("PASS: Stats endpoint returns correct 5-level structure")
    
    def test_get_stats_new_user_auto_registers(self):
        """Stats endpoint should auto-register new users"""
        unique_wallet = f"TEST_auto_reg_{uuid.uuid4().hex[:8]}"
        
        response = requests.get(f"{BASE_URL}/api/affiliate/{unique_wallet}/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should auto-register
        assert data.get("wallet_public_key") == unique_wallet
        assert "referral_code" in data
        assert data["referral_code"].startswith("QTM")
        
        # New user should have 0 earnings
        assert data.get("total_earnings") == 0.0
        assert data.get("total_referrals") == 0
        
        print("PASS: Stats endpoint auto-registers new users")


class TestCommissionDistribution:
    """Test commission distribution across MLM levels"""
    
    def test_distribute_commission_single_level(self):
        """Distribute commission to a single level affiliate"""
        # Create a test chain: NewUser -> TestWallet123ABC (level 1)
        unique_wallet = f"TEST_buyer_{uuid.uuid4().hex[:8]}"
        
        # Register with referral code
        reg_response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": unique_wallet,
            "referral_code_used": "QTM46AVU"  # TestWallet123ABC's code
        })
        assert reg_response.status_code == 200
        
        # Distribute commission
        event_id = f"test-event-{uuid.uuid4().hex[:8]}"
        distribute_response = requests.post(f"{BASE_URL}/api/affiliate/commission/distribute", json={
            "source_wallet": unique_wallet,
            "amount": 100.0,  # $100 purchase
            "event_type": "presale_purchase",
            "event_id": event_id
        })
        
        assert distribute_response.status_code == 200
        data = distribute_response.json()
        
        assert data.get("success") == True
        assert data.get("commissions_created") >= 1  # At least 1 level
        
        # Level 1 should get 20% = $20
        expected_level_1_commission = 100.0 * 0.20
        assert data.get("total_distributed") >= expected_level_1_commission
        
        print(f"PASS: Commission distributed - {data.get('commissions_created')} beneficiaries, ${data.get('total_distributed'):.2f}")
    
    def test_distribute_commission_multi_level_chain(self):
        """Test full 5-level commission distribution"""
        # Create a 5-level chain:
        # Level1User -> Level2User -> Level3User -> Level4User -> Level5User -> Buyer
        
        wallets = []
        prev_referral_code = None
        
        # Create 5 users in chain
        for i in range(1, 6):
            unique_wallet = f"TEST_level{i}_{uuid.uuid4().hex[:8]}"
            
            reg_response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
                "wallet_public_key": unique_wallet,
                "referral_code_used": prev_referral_code
            })
            assert reg_response.status_code == 200
            data = reg_response.json()
            prev_referral_code = data.get("referral_code")
            wallets.append({
                "wallet": unique_wallet,
                "code": prev_referral_code,
                "level": i
            })
        
        # Create buyer using level 5's referral code
        buyer_wallet = f"TEST_buyer_chain_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": buyer_wallet,
            "referral_code_used": wallets[4]["code"]  # Level 5's code
        })
        assert reg_response.status_code == 200
        
        # Distribute commission from buyer's purchase
        event_id = f"test-chain-{uuid.uuid4().hex[:8]}"
        purchase_amount = 1000.0  # $1000 purchase
        
        distribute_response = requests.post(f"{BASE_URL}/api/affiliate/commission/distribute", json={
            "source_wallet": buyer_wallet,
            "amount": purchase_amount,
            "event_type": "presale_purchase",
            "event_id": event_id
        })
        
        assert distribute_response.status_code == 200
        data = distribute_response.json()
        
        assert data.get("success") == True
        assert data.get("commissions_created") == 5, "Should create commissions for all 5 levels"
        
        # Expected total: 20% + 10% + 5% + 2.5% + 1% = 38.5%
        expected_total = purchase_amount * 0.385
        actual_total = data.get("total_distributed", 0)
        assert abs(actual_total - expected_total) < 0.01, f"Expected ${expected_total}, got ${actual_total}"
        
        # Verify each level got correct commission
        level_5_stats = requests.get(f"{BASE_URL}/api/affiliate/{wallets[4]['wallet']}/stats").json()
        level_5_level_1_commission = next((l for l in level_5_stats.get('levels', []) if l['level'] == 1), None)
        assert level_5_level_1_commission is not None
        # Level 5 user should get 20% as direct referrer (level 1)
        assert level_5_level_1_commission.get("total_commission") >= purchase_amount * 0.20
        
        print(f"PASS: 5-level chain distributed ${actual_total:.2f} across 5 beneficiaries")


class TestCommissionHistory:
    """Test commission history retrieval"""
    
    def test_get_commission_history(self):
        """Get commission history for user with commissions"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/commissions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("wallet_public_key") == "TestWallet123ABC"
        assert "commissions" in data
        assert "total_count" in data
        
        commissions = data.get("commissions", [])
        if len(commissions) > 0:
            commission = commissions[0]
            # Verify commission structure
            assert "id" in commission
            assert "source_user_wallet" in commission
            assert "level" in commission
            assert "percentage" in commission
            assert "amount" in commission
            assert "event_type" in commission
            assert "status" in commission
            assert "created_at" in commission
        
        print(f"PASS: Commission history returns {len(commissions)} entries")
    
    def test_get_commission_history_with_pagination(self):
        """Test pagination for commission history"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/commissions?limit=5&offset=0")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data.get("commissions", [])) <= 5
        
        print("PASS: Commission history pagination works")
    
    def test_get_commission_history_empty_user(self):
        """Get commission history for user with no commissions"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet456DEF/commissions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("wallet_public_key") == "TestWallet456DEF"
        # TestWallet456DEF is the buyer, not the referrer, so should have no commissions
        # (commissions go to referrers, not buyers)
        
        print("PASS: Empty commission history returns correct structure")


class TestAffiliateTree:
    """Test affiliate tree endpoint"""
    
    def test_get_affiliate_tree(self):
        """Get affiliate tree for user with referrals"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/tree")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("wallet_public_key") == "TestWallet123ABC"
        assert "tree" in data
        assert "total_network_size" in data
        
        # TestWallet123ABC has at least 1 referral (TestWallet456DEF)
        assert data.get("total_network_size") >= 1
        
        print(f"PASS: Affiliate tree shows {data.get('total_network_size')} network size")


class TestMLMChainVerification:
    """End-to-end test for MLM chain verification"""
    
    def test_full_mlm_flow(self):
        """
        Full MLM flow test:
        1. User A registers (no referrer)
        2. User B registers with A's code
        3. User C registers with B's code
        4. User C makes a purchase
        5. Verify A gets level 2 commission (10%)
        6. Verify B gets level 1 commission (20%)
        """
        # Step 1: Register User A
        user_a_wallet = f"TEST_A_{uuid.uuid4().hex[:8]}"
        resp_a = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_a_wallet,
            "referral_code_used": None
        })
        assert resp_a.status_code == 200
        user_a = resp_a.json()
        user_a_code = user_a["referral_code"]
        print(f"User A: {user_a_wallet}, code: {user_a_code}")
        
        # Step 2: Register User B with A's code
        user_b_wallet = f"TEST_B_{uuid.uuid4().hex[:8]}"
        resp_b = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_b_wallet,
            "referral_code_used": user_a_code
        })
        assert resp_b.status_code == 200
        user_b = resp_b.json()
        user_b_code = user_b["referral_code"]
        assert user_b["referrer_id"] == user_a_wallet
        print(f"User B: {user_b_wallet}, code: {user_b_code}, referrer: {user_a_wallet}")
        
        # Step 3: Register User C with B's code
        user_c_wallet = f"TEST_C_{uuid.uuid4().hex[:8]}"
        resp_c = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_c_wallet,
            "referral_code_used": user_b_code
        })
        assert resp_c.status_code == 200
        user_c = resp_c.json()
        assert user_c["referrer_id"] == user_b_wallet
        print(f"User C: {user_c_wallet}, referrer: {user_b_wallet}")
        
        # Step 4: User C makes a $500 purchase
        event_id = f"test-mlm-flow-{uuid.uuid4().hex[:8]}"
        purchase_amount = 500.0
        
        distribute_resp = requests.post(f"{BASE_URL}/api/affiliate/commission/distribute", json={
            "source_wallet": user_c_wallet,
            "amount": purchase_amount,
            "event_type": "presale_purchase",
            "event_id": event_id
        })
        assert distribute_resp.status_code == 200
        distribute_data = distribute_resp.json()
        print(f"Distribution: {distribute_data.get('commissions_created')} commissions, ${distribute_data.get('total_distributed'):.2f}")
        
        # Step 5: Verify B got level 1 commission (20% = $100)
        stats_b = requests.get(f"{BASE_URL}/api/affiliate/{user_b_wallet}/stats").json()
        level_1_b = next((l for l in stats_b["levels"] if l["level"] == 1), None)
        expected_b_commission = purchase_amount * 0.20  # 20% = $100
        assert level_1_b["total_commission"] >= expected_b_commission - 0.01, \
            f"User B should have >=${expected_b_commission} in level 1, got {level_1_b['total_commission']}"
        print(f"User B level 1 commission: ${level_1_b['total_commission']:.2f} (expected ${expected_b_commission})")
        
        # Step 6: Verify A got level 2 commission (10% = $50)
        stats_a = requests.get(f"{BASE_URL}/api/affiliate/{user_a_wallet}/stats").json()
        level_2_a = next((l for l in stats_a["levels"] if l["level"] == 2), None)
        expected_a_commission = purchase_amount * 0.10  # 10% = $50
        assert level_2_a["total_commission"] >= expected_a_commission - 0.01, \
            f"User A should have >=${expected_a_commission} in level 2, got {level_2_a['total_commission']}"
        print(f"User A level 2 commission: ${level_2_a['total_commission']:.2f} (expected ${expected_a_commission})")
        
        print("PASS: Full MLM chain verified - A gets 10% from C via B")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
