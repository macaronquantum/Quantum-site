"""
Iteration 5 Backend Tests
Tests for:
- Solana balance proxy: GET /api/solana/balance/{wallet}
- Full 5-level MLM chain commission verification (A→B→C→D→E→F)
- Verify correct commission rates at each level
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fiat-to-usdc.preview.emergentagent.com').rstrip('/')

# ============== SOLANA BALANCE PROXY TESTS ==============

class TestSolanaBalanceProxy:
    """Test GET /api/solana/balance/{wallet} backend proxy"""
    
    def test_get_balance_valid_wallet(self):
        """Get Solana and Quantum balance for a wallet with tokens"""
        wallet = "2ebxzttJ5zyLme4cBBHD8hKkVho4tJ13tUUWu3B3aG5i"
        response = requests.get(f"{BASE_URL}/api/solana/balance/{wallet}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("wallet") == wallet
        assert "sol_balance" in data
        assert "quantum" in data
        assert "quantum_mint" in data
        assert "price_usd" in data
        
        # Verify Quantum token structure
        quantum = data.get("quantum", {})
        assert "amount" in quantum
        assert "rawAmount" in quantum
        assert "decimals" in quantum
        assert "uiAmountString" in quantum
        
        # Verify actual values - this wallet should have tokens
        assert data.get("sol_balance") > 0, "Should have SOL balance"
        assert quantum.get("amount") > 0, "Should have Quantum tokens"
        assert quantum.get("amount") >= 9924000, f"Expected ~9924000 QTM, got {quantum.get('amount')}"
        
        # Verify constants
        assert data.get("quantum_mint") == "4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc"
        assert data.get("price_usd") == 2.5
        
        print(f"PASS: Solana balance proxy - {quantum.get('amount')} QTM, {data.get('sol_balance')} SOL")
    
    def test_get_balance_wallet_no_quantum(self):
        """Get balance for a wallet that may not have Quantum tokens"""
        # Test with a random but valid-looking wallet address
        wallet = "So11111111111111111111111111111111111111112"  # SOL token program address
        response = requests.get(f"{BASE_URL}/api/solana/balance/{wallet}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still return valid structure even with 0 balances
        assert data.get("wallet") == wallet
        assert "quantum" in data
        quantum = data.get("quantum", {})
        # Amount should be 0 or positive (no negative)
        assert quantum.get("amount", 0) >= 0
        
        print("PASS: Solana balance proxy handles wallets without Quantum tokens")


# ============== FULL 5-LEVEL MLM CHAIN TEST ==============

class TestMLMFullChainVerification:
    """
    Full end-to-end MLM chain test with 5 levels:
    A → B → C → D → E → F (buyer)
    
    When F makes a purchase:
    - E (level 1) gets 20%
    - D (level 2) gets 10%
    - C (level 3) gets 5%
    - B (level 4) gets 2.5%
    - A (level 5) gets 1%
    """
    
    def test_full_5_level_chain_commission_distribution(self):
        """Create 5 users in chain A→B→C→D→E→F, then verify A gets commissions at all 5 levels"""
        
        # Create unique test prefix for this run
        run_id = uuid.uuid4().hex[:6]
        
        # Step 1: Register User A (root of chain, no referrer)
        user_a_wallet = f"TEST_5LVL_A_{run_id}"
        resp_a = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_a_wallet,
            "referral_code_used": None
        })
        assert resp_a.status_code == 200
        user_a_code = resp_a.json()["referral_code"]
        print(f"Step 1: User A registered - {user_a_wallet}, code: {user_a_code}")
        
        # Step 2: Register User B with A's code
        user_b_wallet = f"TEST_5LVL_B_{run_id}"
        resp_b = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_b_wallet,
            "referral_code_used": user_a_code
        })
        assert resp_b.status_code == 200
        user_b_code = resp_b.json()["referral_code"]
        assert resp_b.json()["referrer_id"] == user_a_wallet
        print(f"Step 2: User B registered with A's code - {user_b_wallet}, code: {user_b_code}")
        
        # Step 3: Register User C with B's code
        user_c_wallet = f"TEST_5LVL_C_{run_id}"
        resp_c = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_c_wallet,
            "referral_code_used": user_b_code
        })
        assert resp_c.status_code == 200
        user_c_code = resp_c.json()["referral_code"]
        assert resp_c.json()["referrer_id"] == user_b_wallet
        print(f"Step 3: User C registered with B's code - {user_c_wallet}, code: {user_c_code}")
        
        # Step 4: Register User D with C's code
        user_d_wallet = f"TEST_5LVL_D_{run_id}"
        resp_d = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_d_wallet,
            "referral_code_used": user_c_code
        })
        assert resp_d.status_code == 200
        user_d_code = resp_d.json()["referral_code"]
        assert resp_d.json()["referrer_id"] == user_c_wallet
        print(f"Step 4: User D registered with C's code - {user_d_wallet}, code: {user_d_code}")
        
        # Step 5: Register User E with D's code
        user_e_wallet = f"TEST_5LVL_E_{run_id}"
        resp_e = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_e_wallet,
            "referral_code_used": user_d_code
        })
        assert resp_e.status_code == 200
        user_e_code = resp_e.json()["referral_code"]
        assert resp_e.json()["referrer_id"] == user_d_wallet
        print(f"Step 5: User E registered with D's code - {user_e_wallet}, code: {user_e_code}")
        
        # Step 6: Register User F (buyer) with E's code
        user_f_wallet = f"TEST_5LVL_F_{run_id}"
        resp_f = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_f_wallet,
            "referral_code_used": user_e_code
        })
        assert resp_f.status_code == 200
        assert resp_f.json()["referrer_id"] == user_e_wallet
        print(f"Step 6: User F (buyer) registered with E's code - {user_f_wallet}")
        
        # Step 7: F makes a $1000 purchase
        purchase_amount = 1000.0
        event_id = f"test-5level-{run_id}"
        
        distribute_resp = requests.post(f"{BASE_URL}/api/affiliate/commission/distribute", json={
            "source_wallet": user_f_wallet,
            "amount": purchase_amount,
            "event_type": "presale_purchase",
            "event_id": event_id
        })
        assert distribute_resp.status_code == 200
        distribute_data = distribute_resp.json()
        
        assert distribute_data.get("success") == True
        assert distribute_data.get("commissions_created") == 5, f"Should create 5 commissions, got {distribute_data.get('commissions_created')}"
        
        # Expected total: 20% + 10% + 5% + 2.5% + 1% = 38.5% of $1000 = $385
        expected_total = purchase_amount * 0.385
        actual_total = distribute_data.get("total_distributed", 0)
        assert abs(actual_total - expected_total) < 0.01, f"Expected ${expected_total}, got ${actual_total}"
        
        print(f"Step 7: F made ${purchase_amount} purchase - ${actual_total:.2f} distributed across 5 levels")
        
        # Step 8: Verify each user got correct commission
        
        # E (direct referrer, level 1) should get 20% = $200
        stats_e = requests.get(f"{BASE_URL}/api/affiliate/{user_e_wallet}/stats").json()
        level_1_e = next((l for l in stats_e.get("levels", []) if l["level"] == 1), None)
        expected_e = purchase_amount * 0.20
        assert level_1_e is not None
        assert level_1_e.get("total_commission") >= expected_e - 0.01, \
            f"User E should have ${expected_e} in level 1, got ${level_1_e.get('total_commission')}"
        print(f"  E (Level 1): ${level_1_e.get('total_commission'):.2f} (expected ${expected_e})")
        
        # D (level 2) should get 10% = $100
        stats_d = requests.get(f"{BASE_URL}/api/affiliate/{user_d_wallet}/stats").json()
        level_2_d = next((l for l in stats_d.get("levels", []) if l["level"] == 2), None)
        expected_d = purchase_amount * 0.10
        assert level_2_d is not None
        assert level_2_d.get("total_commission") >= expected_d - 0.01, \
            f"User D should have ${expected_d} in level 2, got ${level_2_d.get('total_commission')}"
        print(f"  D (Level 2): ${level_2_d.get('total_commission'):.2f} (expected ${expected_d})")
        
        # C (level 3) should get 5% = $50
        stats_c = requests.get(f"{BASE_URL}/api/affiliate/{user_c_wallet}/stats").json()
        level_3_c = next((l for l in stats_c.get("levels", []) if l["level"] == 3), None)
        expected_c = purchase_amount * 0.05
        assert level_3_c is not None
        assert level_3_c.get("total_commission") >= expected_c - 0.01, \
            f"User C should have ${expected_c} in level 3, got ${level_3_c.get('total_commission')}"
        print(f"  C (Level 3): ${level_3_c.get('total_commission'):.2f} (expected ${expected_c})")
        
        # B (level 4) should get 2.5% = $25
        stats_b = requests.get(f"{BASE_URL}/api/affiliate/{user_b_wallet}/stats").json()
        level_4_b = next((l for l in stats_b.get("levels", []) if l["level"] == 4), None)
        expected_b = purchase_amount * 0.025
        assert level_4_b is not None
        assert level_4_b.get("total_commission") >= expected_b - 0.01, \
            f"User B should have ${expected_b} in level 4, got ${level_4_b.get('total_commission')}"
        print(f"  B (Level 4): ${level_4_b.get('total_commission'):.2f} (expected ${expected_b})")
        
        # A (level 5) should get 1% = $10
        stats_a = requests.get(f"{BASE_URL}/api/affiliate/{user_a_wallet}/stats").json()
        level_5_a = next((l for l in stats_a.get("levels", []) if l["level"] == 5), None)
        expected_a = purchase_amount * 0.01
        assert level_5_a is not None
        assert level_5_a.get("total_commission") >= expected_a - 0.01, \
            f"User A should have ${expected_a} in level 5, got ${level_5_a.get('total_commission')}"
        print(f"  A (Level 5): ${level_5_a.get('total_commission'):.2f} (expected ${expected_a})")
        
        # Step 9: Verify A's total earnings equals level 5 commission
        assert stats_a.get("total_earnings") >= expected_a - 0.01
        
        # Step 10: Verify notifications were created for all beneficiaries
        for wallet, expected_level in [
            (user_e_wallet, 1),
            (user_d_wallet, 2),
            (user_c_wallet, 3),
            (user_b_wallet, 4),
            (user_a_wallet, 5)
        ]:
            notif_resp = requests.get(f"{BASE_URL}/api/notifications/{wallet}").json()
            notifications = notif_resp.get("notifications", [])
            assert len(notifications) >= 1, f"User at level {expected_level} should have notification"
            
            # Find the notification for this commission
            commission_notifs = [n for n in notifications if n.get("type") == "commission_received"]
            assert len(commission_notifs) >= 1, f"Should have commission notification for level {expected_level}"
        
        print("Step 8-10: All commission amounts and notifications verified")
        print("PASS: Full 5-level MLM chain test completed successfully")
    
    def test_verify_level_transaction_details_endpoint(self):
        """Verify level-specific transaction endpoint returns correct data"""
        # Use existing test data from TestWallet123ABC
        wallet = "TestWallet123ABC"
        
        for level, expected_rate in [(1, 20.0), (2, 10.0), (3, 5.0), (4, 2.5), (5, 1.0)]:
            response = requests.get(f"{BASE_URL}/api/affiliate/{wallet}/level/{level}/transactions")
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("level") == level
            assert data.get("commission_rate") == expected_rate
            assert "transactions" in data
            assert "total_count" in data
            assert "total_amount" in data
        
        print("PASS: All 5 level transaction endpoints verified with correct commission rates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
