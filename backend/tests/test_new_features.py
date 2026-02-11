"""
New Features Backend Tests - Iteration 3
Tests for:
- Level transaction details: GET /api/affiliate/{wallet}/level/{level}/transactions
- Presale progress: GET /api/presale/progress
- Presale config update: PUT /api/presale/config
- Notifications: GET, POST mark-read, DELETE clear endpoints
- Notifications created when commissions are distributed
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mlm-network-20.preview.emergentagent.com').rstrip('/')

# ============== LEVEL TRANSACTION TESTS ==============

class TestLevelTransactions:
    """Test GET /api/affiliate/{wallet}/level/{level}/transactions"""
    
    def test_get_level_1_transactions(self):
        """Get transactions for level 1"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/level/1/transactions")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data.get("wallet") == "TestWallet123ABC"
        assert data.get("level") == 1
        assert data.get("commission_rate") == 20.0  # Level 1 is 20%
        assert "transactions" in data
        assert "total_count" in data
        assert "total_amount" in data
        
        # Verify transactions have correct structure if present
        transactions = data.get("transactions", [])
        if len(transactions) > 0:
            tx = transactions[0]
            assert "id" in tx
            assert "source_wallet" in tx
            assert "amount" in tx
            assert "percentage" in tx
            assert "event_type" in tx
            assert "status" in tx
            assert "created_at" in tx
        
        print(f"PASS: Level 1 transactions - {len(transactions)} entries, ${data.get('total_amount', 0):.2f} total")
    
    def test_get_level_2_transactions(self):
        """Get transactions for level 2"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/level/2/transactions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("level") == 2
        assert data.get("commission_rate") == 10.0  # Level 2 is 10%
        
        print(f"PASS: Level 2 transactions - {data.get('total_count', 0)} entries")
    
    def test_get_level_3_transactions(self):
        """Get transactions for level 3"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/level/3/transactions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("level") == 3
        assert data.get("commission_rate") == 5.0  # Level 3 is 5%
        
        print(f"PASS: Level 3 transactions - {data.get('total_count', 0)} entries")
    
    def test_get_level_4_transactions(self):
        """Get transactions for level 4"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/level/4/transactions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("level") == 4
        assert data.get("commission_rate") == 2.5  # Level 4 is 2.5%
        
        print(f"PASS: Level 4 transactions - {data.get('total_count', 0)} entries")
    
    def test_get_level_5_transactions(self):
        """Get transactions for level 5"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/level/5/transactions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("level") == 5
        assert data.get("commission_rate") == 1.0  # Level 5 is 1%
        
        print(f"PASS: Level 5 transactions - {data.get('total_count', 0)} entries")
    
    def test_invalid_level_returns_400(self):
        """Invalid level (0 or 6) should return 400"""
        # Test level 0
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/level/0/transactions")
        assert response.status_code == 400
        
        # Test level 6
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/level/6/transactions")
        assert response.status_code == 400
        
        print("PASS: Invalid levels (0, 6) correctly return 400")
    
    def test_level_transactions_pagination(self):
        """Test pagination for level transactions"""
        response = requests.get(f"{BASE_URL}/api/affiliate/TestWallet123ABC/level/1/transactions?limit=1&offset=0")
        
        assert response.status_code == 200
        data = response.json()
        
        transactions = data.get("transactions", [])
        assert len(transactions) <= 1
        
        print("PASS: Level transactions pagination works")


# ============== PRESALE PROGRESS TESTS ==============

class TestPresaleProgress:
    """Test presale progress endpoint"""
    
    def test_get_presale_progress(self):
        """Get presale progress (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/presale/progress")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_raised" in data
        assert "goal" in data
        assert "progress_percentage" in data
        assert "remaining" in data
        assert "is_active" in data
        assert "participants" in data
        
        # Default goal should be $2M
        assert data.get("goal") == 2000000
        
        # Progress percentage should be calculated correctly
        total_raised = data.get("total_raised", 0)
        goal = data.get("goal", 2000000)
        expected_percentage = (total_raised / goal * 100) if goal > 0 else 0
        actual_percentage = data.get("progress_percentage", 0)
        assert abs(actual_percentage - expected_percentage) < 0.1
        
        # Remaining should be correct
        expected_remaining = max(goal - total_raised, 0)
        assert data.get("remaining") == expected_remaining
        
        print(f"PASS: Presale progress - ${total_raised:,} / ${goal:,} ({actual_percentage:.1f}%)")
    
    def test_update_presale_config(self):
        """Update presale configuration (admin)"""
        # Get current state
        current = requests.get(f"{BASE_URL}/api/presale/progress").json()
        original_raised = current.get("total_raised", 0)
        
        # Update total_raised
        new_raised = original_raised + 1000
        response = requests.put(f"{BASE_URL}/api/presale/config", json={
            "total_raised": new_raised
        })
        
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        # Verify update
        updated = requests.get(f"{BASE_URL}/api/presale/progress").json()
        assert updated.get("total_raised") == new_raised
        
        # Reset back to original
        requests.put(f"{BASE_URL}/api/presale/config", json={
            "total_raised": original_raised
        })
        
        print(f"PASS: Presale config update works - updated total_raised to ${new_raised:,}")
    
    def test_update_presale_goal(self):
        """Update presale goal"""
        # Get current state
        current = requests.get(f"{BASE_URL}/api/presale/progress").json()
        original_goal = current.get("goal", 2000000)
        
        # Update goal
        new_goal = 5000000
        response = requests.put(f"{BASE_URL}/api/presale/config", json={
            "goal": new_goal
        })
        
        assert response.status_code == 200
        
        # Verify update
        updated = requests.get(f"{BASE_URL}/api/presale/progress").json()
        assert updated.get("goal") == new_goal
        
        # Reset back to original
        requests.put(f"{BASE_URL}/api/presale/config", json={
            "goal": original_goal
        })
        
        print(f"PASS: Presale goal update works - changed goal from ${original_goal:,} to ${new_goal:,}")
    
    def test_increment_presale_raised(self):
        """Test increment presale raised amount (internal use)"""
        # Get current state
        current = requests.get(f"{BASE_URL}/api/presale/progress").json()
        original_raised = current.get("total_raised", 0)
        original_participants = current.get("participants", 0)
        
        # Increment by $500
        response = requests.post(f"{BASE_URL}/api/presale/increment-raised?amount=500")
        
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        # Verify increment
        updated = requests.get(f"{BASE_URL}/api/presale/progress").json()
        assert updated.get("total_raised") == original_raised + 500
        assert updated.get("participants") == original_participants + 1
        
        # Reset
        requests.put(f"{BASE_URL}/api/presale/config", json={
            "total_raised": original_raised
        })
        
        print("PASS: Presale increment raised works")


# ============== NOTIFICATION TESTS ==============

class TestNotifications:
    """Test notification system endpoints"""
    
    def test_get_notifications_empty_user(self):
        """Get notifications for user with no notifications"""
        unique_wallet = f"TEST_notif_{uuid.uuid4().hex[:8]}"
        
        response = requests.get(f"{BASE_URL}/api/notifications/{unique_wallet}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "notifications" in data
        assert "unread_count" in data
        assert data.get("notifications") == []
        assert data.get("unread_count") == 0
        
        print("PASS: Empty notifications returns correct structure")
    
    def test_notifications_created_on_commission_distribution(self):
        """Verify notifications are created when commissions are distributed"""
        # Create a referrer
        referrer_wallet = f"TEST_referrer_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": referrer_wallet,
            "referral_code_used": None
        })
        assert reg_response.status_code == 200
        referrer_code = reg_response.json().get("referral_code")
        
        # Create a buyer who uses the referrer's code
        buyer_wallet = f"TEST_buyer_notif_{uuid.uuid4().hex[:8]}"
        requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": buyer_wallet,
            "referral_code_used": referrer_code
        })
        
        # Distribute commission
        event_id = f"test-notif-{uuid.uuid4().hex[:8]}"
        distribute_response = requests.post(f"{BASE_URL}/api/affiliate/commission/distribute", json={
            "source_wallet": buyer_wallet,
            "amount": 200.0,
            "event_type": "presale_purchase",
            "event_id": event_id
        })
        assert distribute_response.status_code == 200
        
        # Check notifications for referrer
        notif_response = requests.get(f"{BASE_URL}/api/notifications/{referrer_wallet}")
        assert notif_response.status_code == 200
        
        data = notif_response.json()
        notifications = data.get("notifications", [])
        
        # Should have at least 1 notification for commission
        assert len(notifications) >= 1, "Should have notification for commission"
        
        # Verify notification structure
        notif = notifications[0]
        assert notif.get("type") == "commission_received"
        assert "Commission Niveau 1" in notif.get("title", "")
        assert notif.get("read") == False
        assert data.get("unread_count") >= 1
        
        # Verify notification body contains commission amount ($200 * 20% = $40)
        expected_commission = 200.0 * 0.20
        assert str(expected_commission) in notif.get("body", "")
        
        print(f"PASS: Notification created on commission - '{notif.get('title')}'")
        
        return referrer_wallet  # Return for cleanup
    
    def test_mark_notifications_as_read(self):
        """Mark notifications as read"""
        # First create a notification by distributing commission
        referrer_wallet = f"TEST_mark_read_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": referrer_wallet,
            "referral_code_used": None
        })
        referrer_code = reg_response.json().get("referral_code")
        
        buyer_wallet = f"TEST_buyer_mark_{uuid.uuid4().hex[:8]}"
        requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": buyer_wallet,
            "referral_code_used": referrer_code
        })
        
        requests.post(f"{BASE_URL}/api/affiliate/commission/distribute", json={
            "source_wallet": buyer_wallet,
            "amount": 100.0,
            "event_type": "presale_purchase",
            "event_id": f"test-mark-{uuid.uuid4().hex[:8]}"
        })
        
        # Verify unread notification exists
        before = requests.get(f"{BASE_URL}/api/notifications/{referrer_wallet}").json()
        assert before.get("unread_count") >= 1
        
        # Mark as read
        mark_response = requests.post(f"{BASE_URL}/api/notifications/{referrer_wallet}/mark-read")
        assert mark_response.status_code == 200
        assert mark_response.json().get("success") == True
        assert mark_response.json().get("marked_read") >= 1
        
        # Verify read
        after = requests.get(f"{BASE_URL}/api/notifications/{referrer_wallet}").json()
        assert after.get("unread_count") == 0
        
        # All notifications should be read now
        for notif in after.get("notifications", []):
            assert notif.get("read") == True
        
        print("PASS: Mark notifications as read works")
    
    def test_clear_all_notifications(self):
        """Clear all notifications for a user"""
        # Create user with notification
        referrer_wallet = f"TEST_clear_{uuid.uuid4().hex[:8]}"
        reg_response = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": referrer_wallet,
            "referral_code_used": None
        })
        referrer_code = reg_response.json().get("referral_code")
        
        buyer_wallet = f"TEST_buyer_clear_{uuid.uuid4().hex[:8]}"
        requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": buyer_wallet,
            "referral_code_used": referrer_code
        })
        
        requests.post(f"{BASE_URL}/api/affiliate/commission/distribute", json={
            "source_wallet": buyer_wallet,
            "amount": 100.0,
            "event_type": "presale_purchase",
            "event_id": f"test-clear-{uuid.uuid4().hex[:8]}"
        })
        
        # Verify notification exists
        before = requests.get(f"{BASE_URL}/api/notifications/{referrer_wallet}").json()
        assert len(before.get("notifications", [])) >= 1
        
        # Clear all
        clear_response = requests.delete(f"{BASE_URL}/api/notifications/{referrer_wallet}/clear")
        assert clear_response.status_code == 200
        assert clear_response.json().get("success") == True
        assert clear_response.json().get("deleted") >= 1
        
        # Verify cleared
        after = requests.get(f"{BASE_URL}/api/notifications/{referrer_wallet}").json()
        assert len(after.get("notifications", [])) == 0
        assert after.get("unread_count") == 0
        
        print("PASS: Clear all notifications works")
    
    def test_notifications_limit(self):
        """Test notifications limit parameter"""
        response = requests.get(f"{BASE_URL}/api/notifications/TestWallet123ABC?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        notifications = data.get("notifications", [])
        assert len(notifications) <= 5
        
        print("PASS: Notifications limit parameter works")
    
    def test_notifications_unread_only(self):
        """Test unread_only filter"""
        response = requests.get(f"{BASE_URL}/api/notifications/TestWallet123ABC?unread_only=true")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned notifications should be unread
        for notif in data.get("notifications", []):
            assert notif.get("read") == False
        
        print("PASS: Notifications unread_only filter works")


# ============== PUSH TOKEN REGISTRATION ==============

class TestPushTokenRegistration:
    """Test push token registration endpoint"""
    
    def test_register_push_token(self):
        """Register a push token for notifications"""
        unique_wallet = f"TEST_push_{uuid.uuid4().hex[:8]}"
        test_token = f"ExponentPushToken[{uuid.uuid4().hex[:20]}]"
        
        response = requests.post(f"{BASE_URL}/api/notifications/register-push-token", json={
            "wallet": unique_wallet,
            "push_token": test_token,
            "platform": "expo"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "registered" in data.get("message", "").lower() or data.get("message")
        
        print(f"PASS: Push token registered for {unique_wallet}")
    
    def test_update_push_token(self):
        """Update existing push token"""
        unique_wallet = f"TEST_push_update_{uuid.uuid4().hex[:8]}"
        
        # Register initial token
        initial_token = f"ExponentPushToken[initial_{uuid.uuid4().hex[:10]}]"
        requests.post(f"{BASE_URL}/api/notifications/register-push-token", json={
            "wallet": unique_wallet,
            "push_token": initial_token,
            "platform": "expo"
        })
        
        # Update to new token
        new_token = f"ExponentPushToken[updated_{uuid.uuid4().hex[:10]}]"
        response = requests.post(f"{BASE_URL}/api/notifications/register-push-token", json={
            "wallet": unique_wallet,
            "push_token": new_token,
            "platform": "ios"
        })
        
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        print("PASS: Push token update works (upsert)")


# ============== INTEGRATION TEST ==============

class TestNotificationIntegration:
    """End-to-end test for notification integration with MLM commissions"""
    
    def test_full_notification_flow(self):
        """
        Full flow:
        1. User A registers (no referrer)
        2. User B registers with A's code
        3. User B makes a purchase
        4. Verify A receives notification for level 1 commission
        5. Mark notification as read
        6. Clear notification
        """
        # Step 1: Register User A
        user_a_wallet = f"TEST_A_notif_{uuid.uuid4().hex[:8]}"
        resp_a = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_a_wallet,
            "referral_code_used": None
        })
        assert resp_a.status_code == 200
        user_a_code = resp_a.json()["referral_code"]
        print(f"Step 1: User A registered - {user_a_wallet}, code: {user_a_code}")
        
        # Step 2: Register User B with A's code
        user_b_wallet = f"TEST_B_notif_{uuid.uuid4().hex[:8]}"
        resp_b = requests.post(f"{BASE_URL}/api/affiliate/register", json={
            "wallet_public_key": user_b_wallet,
            "referral_code_used": user_a_code
        })
        assert resp_b.status_code == 200
        print(f"Step 2: User B registered with A's code - {user_b_wallet}")
        
        # Step 3: User B makes a purchase
        purchase_amount = 500.0
        event_id = f"test-full-flow-{uuid.uuid4().hex[:8]}"
        
        distribute_resp = requests.post(f"{BASE_URL}/api/affiliate/commission/distribute", json={
            "source_wallet": user_b_wallet,
            "amount": purchase_amount,
            "event_type": "presale_purchase",
            "event_id": event_id
        })
        assert distribute_resp.status_code == 200
        print(f"Step 3: User B made ${purchase_amount} purchase")
        
        # Step 4: Verify A received notification
        notif_resp = requests.get(f"{BASE_URL}/api/notifications/{user_a_wallet}")
        assert notif_resp.status_code == 200
        notif_data = notif_resp.json()
        
        notifications = notif_data.get("notifications", [])
        assert len(notifications) >= 1, "User A should have notification"
        
        latest_notif = notifications[0]
        expected_commission = purchase_amount * 0.20  # 20% = $100
        
        assert latest_notif.get("type") == "commission_received"
        assert "Niveau 1" in latest_notif.get("title", "")
        assert str(expected_commission) in latest_notif.get("body", "")
        assert latest_notif.get("read") == False
        assert notif_data.get("unread_count") >= 1
        print(f"Step 4: User A received notification - '{latest_notif.get('title')}'")
        
        # Step 5: Mark as read
        mark_resp = requests.post(f"{BASE_URL}/api/notifications/{user_a_wallet}/mark-read")
        assert mark_resp.status_code == 200
        assert mark_resp.json().get("marked_read") >= 1
        
        # Verify read
        after_mark = requests.get(f"{BASE_URL}/api/notifications/{user_a_wallet}").json()
        assert after_mark.get("unread_count") == 0
        print("Step 5: Notifications marked as read")
        
        # Step 6: Clear notifications
        clear_resp = requests.delete(f"{BASE_URL}/api/notifications/{user_a_wallet}/clear")
        assert clear_resp.status_code == 200
        assert clear_resp.json().get("deleted") >= 1
        
        # Verify cleared
        after_clear = requests.get(f"{BASE_URL}/api/notifications/{user_a_wallet}").json()
        assert len(after_clear.get("notifications", [])) == 0
        print("Step 6: Notifications cleared")
        
        print("PASS: Full notification flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
