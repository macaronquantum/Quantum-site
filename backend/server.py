from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone, timedelta
from enum import Enum
import os
import uuid
import httpx
import secrets
import string
from dotenv import load_dotenv
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest
)

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Configuration
MONGO_URL = os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URL)
db = client.quantum_db

# Collections
presale_purchases = db.presale_purchases
payment_transactions = db.payment_transactions
referral_data = db.referral_data
wallet_sessions = db.wallet_sessions

# NEW: MLM Affiliate Collections
users_collection = db.users
affiliate_relations = db.affiliate_relations
affiliate_commissions = db.affiliate_commissions

# Notification & Presale Collections
notifications_collection = db.notifications
push_tokens_collection = db.push_tokens
presale_config_collection = db.presale_config

# Stripe Configuration
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
SOLANA_WALLET_ADDRESS = "2ebxzttJ5zyLme4cBBHD8hKkVho4tJ13tUUWu3B3aG5i"

# Solana Configuration
QUANTUM_MINT = "4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc"
SOLANA_RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://solana-mainnet.g.alchemy.com/v2/demo",
]

# Token Configuration
TOKEN_PRICE = 0.20  # USD per token
MIN_PURCHASE = 100  # Minimum tokens

# MLM Commission Configuration (5 levels)
COMMISSION_RATES = {
    1: 0.20,   # 20% Level 1 (direct)
    2: 0.10,   # 10% Level 2
    3: 0.05,   # 5% Level 3
    4: 0.025,  # 2.5% Level 4
    5: 0.01,   # 1% Level 5
}
MAX_AFFILIATE_LEVEL = 5


# ============== ENUMS ==============

class CommissionStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PAID = "paid"


class EventType(str, Enum):
    PRESALE_PURCHASE = "presale_purchase"
    DEPOSIT = "deposit"
    TRADE_FEE = "trade_fee"
    OTHER = "other"


# ============== WALLET SESSION MODELS ==============

class WalletSessionCreate(BaseModel):
    keypair: str  # JSON string of the keypair

class WalletSessionResponse(BaseModel):
    session_id: str

class WalletSessionGet(BaseModel):
    keypair: Optional[str] = None
    error: Optional[str] = None


# ============== MLM AFFILIATE MODELS ==============

class UserCreate(BaseModel):
    wallet_public_key: str
    referral_code_used: Optional[str] = None  # Code used to register


class UserResponse(BaseModel):
    wallet_public_key: str
    referral_code: str
    referrer_id: Optional[str] = None
    created_at: str


class AffiliateRelationResponse(BaseModel):
    user_id: str
    ancestor_id: str
    level: int


class LevelStats(BaseModel):
    level: int
    referral_count: int
    total_commission: float
    pending_commission: float
    confirmed_commission: float
    paid_commission: float


class AffiliateStatsResponse(BaseModel):
    wallet_public_key: str
    referral_code: str
    referral_link: str
    total_referrals: int
    total_earnings: float
    pending_earnings: float
    confirmed_earnings: float
    paid_earnings: float
    levels: List[LevelStats]


class CommissionEntry(BaseModel):
    id: str
    source_user_wallet: str
    level: int
    percentage: float
    amount: float
    event_type: str
    event_id: str
    status: str
    created_at: str


class CommissionHistoryResponse(BaseModel):
    wallet_public_key: str
    commissions: List[CommissionEntry]
    total_count: int


class AffiliateTreeNode(BaseModel):
    wallet_public_key: str
    referral_code: str
    level: int
    direct_referrals: int
    total_generated: float
    children: List['AffiliateTreeNode'] = []


AffiliateTreeNode.model_rebuild()


class AffiliateTreeResponse(BaseModel):
    wallet_public_key: str
    tree: List[AffiliateTreeNode]
    total_network_size: int


class CreateCommissionRequest(BaseModel):
    source_wallet: str
    amount: float  # Net revenue amount
    event_type: str
    event_id: str


class CreateCommissionResponse(BaseModel):
    success: bool
    commissions_created: int
    total_distributed: float
    message: str


# ============== MLM UTILITY FUNCTIONS ==============

def generate_unique_referral_code() -> str:
    """Generate a unique 8-character referral code"""
    chars = string.ascii_uppercase + string.digits
    return 'QTM' + ''.join(secrets.choice(chars) for _ in range(5))


async def get_user_by_wallet(wallet: str) -> Optional[dict]:
    """Get user by wallet address"""
    return await users_collection.find_one(
        {"wallet_public_key": wallet},
        {"_id": 0}
    )


async def get_user_by_referral_code(code: str) -> Optional[dict]:
    """Get user by referral code"""
    return await users_collection.find_one(
        {"referral_code": code.upper()},
        {"_id": 0}
    )


async def create_affiliate_relations(new_user_wallet: str, referrer_wallet: str):
    """
    Create affiliate relations for all ancestors up to 5 levels.
    When user B registers with referrer A:
    - A is level 1 for B
    - A's referrer is level 2 for B
    - etc. up to level 5
    """
    current_ancestor = referrer_wallet
    level = 1
    
    while current_ancestor and level <= MAX_AFFILIATE_LEVEL:
        # Create relation
        await affiliate_relations.insert_one({
            "user_id": new_user_wallet,
            "ancestor_id": current_ancestor,
            "level": level,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Get next ancestor (referrer's referrer)
        ancestor_user = await get_user_by_wallet(current_ancestor)
        if ancestor_user and ancestor_user.get("referrer_id"):
            current_ancestor = ancestor_user["referrer_id"]
            level += 1
        else:
            break


async def distribute_commissions(source_wallet: str, net_amount: float, event_type: str, event_id: str) -> tuple:
    """
    Distribute commissions to all ancestors based on MLM rates.
    Returns (commissions_created, total_distributed)
    Also sends notifications to beneficiaries.
    """
    # Get all ancestors of the source user
    ancestors = await affiliate_relations.find(
        {"user_id": source_wallet},
        {"_id": 0}
    ).to_list(length=MAX_AFFILIATE_LEVEL)
    
    if not ancestors:
        return (0, 0.0)
    
    commissions_created = 0
    total_distributed = 0.0
    
    for relation in ancestors:
        level = relation["level"]
        rate = COMMISSION_RATES.get(level, 0)
        
        if rate > 0:
            commission_amount = net_amount * rate
            
            await affiliate_commissions.insert_one({
                "commission_id": str(uuid.uuid4()),
                "source_user_id": source_wallet,
                "beneficiary_user_id": relation["ancestor_id"],
                "level": level,
                "percentage": rate * 100,  # Store as percentage (20, 10, etc.)
                "amount": commission_amount,
                "event_type": event_type,
                "event_id": event_id,
                "status": CommissionStatus.PENDING.value,
                "created_at": datetime.now(timezone.utc)
            })
            
            # Create notification for beneficiary
            notification_id = str(uuid.uuid4())
            await notifications_collection.insert_one({
                "notification_id": notification_id,
                "wallet": relation["ancestor_id"],
                "type": "commission_received",
                "title": f"Commission Niveau {level} !",
                "body": f"Vous avez gagné ${commission_amount:.2f} ({rate * 100}%) sur un achat de ${net_amount:.2f}",
                "data": {
                    "source_wallet": source_wallet,
                    "level": level,
                    "commission_amount": commission_amount,
                    "purchase_amount": net_amount
                },
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })
            
            commissions_created += 1
            total_distributed += commission_amount
    
    return (commissions_created, total_distributed)


# ============== WALLET SESSION ENDPOINTS ==============

@app.post("/api/wallet/session", response_model=WalletSessionResponse)
async def create_wallet_session(data: WalletSessionCreate):
    """Store a temporary keypair and return a session ID"""
    session_id = str(uuid.uuid4())[:8]  # Short ID for URL
    
    await wallet_sessions.insert_one({
        "session_id": session_id,
        "keypair": data.keypair,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    })
    
    return WalletSessionResponse(session_id=session_id)


@app.get("/api/wallet/session/{session_id}", response_model=WalletSessionGet)
async def get_wallet_session(session_id: str):
    """Retrieve and delete a keypair by session ID"""
    session = await wallet_sessions.find_one_and_delete({"session_id": session_id})
    
    if not session:
        return WalletSessionGet(error="Session not found or expired")
    
    # Check if expired
    if session.get("expires_at") and session["expires_at"] < datetime.utcnow():
        return WalletSessionGet(error="Session expired")
    
    return WalletSessionGet(keypair=session["keypair"])


# ============== MLM AFFILIATE ENDPOINTS ==============

@app.post("/api/affiliate/register", response_model=UserResponse)
async def register_affiliate(user_data: UserCreate):
    """
    Register a new user in the affiliate system.
    If a referral code is provided, create the affiliate relationships.
    """
    wallet = user_data.wallet_public_key
    
    # Check if user already exists
    existing_user = await get_user_by_wallet(wallet)
    if existing_user:
        return UserResponse(
            wallet_public_key=existing_user["wallet_public_key"],
            referral_code=existing_user["referral_code"],
            referrer_id=existing_user.get("referrer_id"),
            created_at=existing_user["created_at"].isoformat() if isinstance(existing_user["created_at"], datetime) else existing_user["created_at"]
        )
    
    # Generate unique referral code
    referral_code = generate_unique_referral_code()
    while await get_user_by_referral_code(referral_code):
        referral_code = generate_unique_referral_code()
    
    referrer_wallet = None
    
    # If referral code used, find the referrer
    if user_data.referral_code_used:
        referrer = await get_user_by_referral_code(user_data.referral_code_used)
        if referrer:
            referrer_wallet = referrer["wallet_public_key"]
    
    # Create user
    now = datetime.now(timezone.utc)
    user_doc = {
        "wallet_public_key": wallet,
        "referral_code": referral_code,
        "referrer_id": referrer_wallet,
        "created_at": now
    }
    
    await users_collection.insert_one(user_doc)
    
    # Create affiliate relations if there's a referrer
    if referrer_wallet:
        await create_affiliate_relations(wallet, referrer_wallet)
    
    return UserResponse(
        wallet_public_key=wallet,
        referral_code=referral_code,
        referrer_id=referrer_wallet,
        created_at=now.isoformat()
    )


@app.get("/api/affiliate/{wallet}/stats", response_model=AffiliateStatsResponse)
async def get_affiliate_stats(wallet: str, request: Request):
    """Get comprehensive affiliate statistics for a user"""
    
    # Get or create user
    user = await get_user_by_wallet(wallet)
    if not user:
        # Auto-register user without referrer
        register_response = await register_affiliate(UserCreate(wallet_public_key=wallet))
        user = await get_user_by_wallet(wallet)
    
    # Build referral link
    host = str(request.base_url).rstrip('/')
    referral_link = f"{host}/presale?ref={user['referral_code']}"
    
    # Calculate stats per level
    levels_stats = []
    total_referrals = 0
    total_earnings = 0.0
    pending_earnings = 0.0
    confirmed_earnings = 0.0
    paid_earnings = 0.0
    
    for level in range(1, MAX_AFFILIATE_LEVEL + 1):
        # Count referrals at this level
        referral_count = await affiliate_relations.count_documents({
            "ancestor_id": wallet,
            "level": level
        })
        total_referrals += referral_count
        
        # Get commissions at this level
        level_commissions = await affiliate_commissions.find({
            "beneficiary_user_id": wallet,
            "level": level
        }, {"_id": 0}).to_list(length=10000)
        
        level_total = sum(c["amount"] for c in level_commissions)
        level_pending = sum(c["amount"] for c in level_commissions if c["status"] == CommissionStatus.PENDING.value)
        level_confirmed = sum(c["amount"] for c in level_commissions if c["status"] == CommissionStatus.CONFIRMED.value)
        level_paid = sum(c["amount"] for c in level_commissions if c["status"] == CommissionStatus.PAID.value)
        
        total_earnings += level_total
        pending_earnings += level_pending
        confirmed_earnings += level_confirmed
        paid_earnings += level_paid
        
        levels_stats.append(LevelStats(
            level=level,
            referral_count=referral_count,
            total_commission=level_total,
            pending_commission=level_pending,
            confirmed_commission=level_confirmed,
            paid_commission=level_paid
        ))
    
    return AffiliateStatsResponse(
        wallet_public_key=wallet,
        referral_code=user["referral_code"],
        referral_link=referral_link,
        total_referrals=total_referrals,
        total_earnings=total_earnings,
        pending_earnings=pending_earnings,
        confirmed_earnings=confirmed_earnings,
        paid_earnings=paid_earnings,
        levels=levels_stats
    )


@app.get("/api/affiliate/{wallet}/commissions", response_model=CommissionHistoryResponse)
async def get_commission_history(wallet: str, limit: int = 50, offset: int = 0):
    """Get commission history for a user"""
    
    # Get total count
    total_count = await affiliate_commissions.count_documents({"beneficiary_user_id": wallet})
    
    # Get commissions with pagination
    commissions_cursor = affiliate_commissions.find(
        {"beneficiary_user_id": wallet},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit)
    
    commissions = await commissions_cursor.to_list(length=limit)
    
    commission_entries = []
    for c in commissions:
        commission_entries.append(CommissionEntry(
            id=c.get("commission_id", str(uuid.uuid4())),
            source_user_wallet=c["source_user_id"],
            level=c["level"],
            percentage=c["percentage"],
            amount=c["amount"],
            event_type=c["event_type"],
            event_id=c["event_id"],
            status=c["status"],
            created_at=c["created_at"].isoformat() if isinstance(c["created_at"], datetime) else str(c["created_at"])
        ))
    
    return CommissionHistoryResponse(
        wallet_public_key=wallet,
        commissions=commission_entries,
        total_count=total_count
    )


@app.get("/api/affiliate/{wallet}/tree", response_model=AffiliateTreeResponse)
async def get_affiliate_tree(wallet: str, max_depth: int = 2):
    """
    Get the affiliate tree for a user (their downline).
    max_depth limits how deep to fetch (default 2 levels for performance).
    """
    
    async def build_tree_node(user_wallet: str, current_depth: int) -> AffiliateTreeNode:
        user = await get_user_by_wallet(user_wallet)
        if not user:
            return None
        
        # Get direct referrals (level 1)
        direct_referrals = await affiliate_relations.find({
            "ancestor_id": user_wallet,
            "level": 1
        }, {"_id": 0}).to_list(length=1000)
        
        # Calculate total generated revenue (sum of commissions from this user's network)
        total_generated = 0.0
        network_commissions = await affiliate_commissions.find({
            "beneficiary_user_id": user_wallet
        }, {"_id": 0, "amount": 1}).to_list(length=10000)
        total_generated = sum(c["amount"] for c in network_commissions)
        
        children = []
        if current_depth < max_depth:
            for ref in direct_referrals:
                child_node = await build_tree_node(ref["user_id"], current_depth + 1)
                if child_node:
                    children.append(child_node)
        
        return AffiliateTreeNode(
            wallet_public_key=user_wallet,
            referral_code=user["referral_code"],
            level=current_depth,
            direct_referrals=len(direct_referrals),
            total_generated=total_generated,
            children=children
        )
    
    # Get direct referrals of the wallet
    direct_refs = await affiliate_relations.find({
        "ancestor_id": wallet,
        "level": 1
    }, {"_id": 0}).to_list(length=1000)
    
    tree = []
    for ref in direct_refs:
        node = await build_tree_node(ref["user_id"], 1)
        if node:
            tree.append(node)
    
    # Calculate total network size
    total_network = await affiliate_relations.count_documents({"ancestor_id": wallet})
    
    return AffiliateTreeResponse(
        wallet_public_key=wallet,
        tree=tree,
        total_network_size=total_network
    )


@app.post("/api/affiliate/commission/distribute", response_model=CreateCommissionResponse)
async def create_commission(data: CreateCommissionRequest):
    """
    Distribute commissions when a revenue event occurs.
    This should be called internally when a purchase is completed.
    """
    try:
        commissions_created, total_distributed = await distribute_commissions(
            source_wallet=data.source_wallet,
            net_amount=data.amount,
            event_type=data.event_type,
            event_id=data.event_id
        )
        
        return CreateCommissionResponse(
            success=True,
            commissions_created=commissions_created,
            total_distributed=total_distributed,
            message=f"Distributed ${total_distributed:.2f} across {commissions_created} beneficiaries"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/affiliate/config")
async def get_affiliate_config():
    """Get affiliate system configuration (commission rates per level)"""
    return {
        "max_levels": MAX_AFFILIATE_LEVEL,
        "commission_rates": {
            str(k): {"percentage": v * 100, "decimal": v} 
            for k, v in COMMISSION_RATES.items()
        },
        "total_commission_percentage": sum(COMMISSION_RATES.values()) * 100
    }


@app.get("/api/affiliate/{wallet}/level/{level}/transactions")
async def get_level_transactions(wallet: str, level: int, limit: int = 50, offset: int = 0):
    """Get all transactions/commissions for a specific level"""
    if level < 1 or level > MAX_AFFILIATE_LEVEL:
        raise HTTPException(status_code=400, detail="Invalid level (1-5)")
    
    # Get commissions where this user is beneficiary at this specific level
    total_count = await affiliate_commissions.count_documents({
        "beneficiary_user_id": wallet,
        "level": level
    })
    
    commissions_cursor = affiliate_commissions.find(
        {"beneficiary_user_id": wallet, "level": level},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit)
    
    commissions = await commissions_cursor.to_list(length=limit)
    
    transactions = []
    for c in commissions:
        transactions.append({
            "id": c.get("commission_id", str(uuid.uuid4())),
            "source_wallet": c["source_user_id"],
            "amount": c["amount"],
            "percentage": c["percentage"],
            "event_type": c["event_type"],
            "event_id": c["event_id"],
            "status": c["status"],
            "created_at": c["created_at"].isoformat() if isinstance(c["created_at"], datetime) else str(c["created_at"])
        })
    
    return {
        "wallet": wallet,
        "level": level,
        "commission_rate": COMMISSION_RATES.get(level, 0) * 100,
        "transactions": transactions,
        "total_count": total_count,
        "total_amount": sum(t["amount"] for t in transactions)
    }


# ============== NOTIFICATION SYSTEM ==============

class NotificationType(str, Enum):
    AFFILIATE_PURCHASE = "affiliate_purchase"
    COMMISSION_RECEIVED = "commission_received"
    COMMISSION_PAID = "commission_paid"
    NEW_REFERRAL = "new_referral"
    SYSTEM = "system"


class PushTokenRegister(BaseModel):
    wallet: str
    push_token: str
    platform: str = "expo"  # expo, ios, android


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: str
    data: Optional[Dict] = None
    read: bool
    created_at: str


async def create_notification(
    wallet: str,
    notification_type: NotificationType,
    title: str,
    body: str,
    data: Optional[Dict] = None
) -> str:
    """Create a notification for a user"""
    notification_id = str(uuid.uuid4())
    
    notification_doc = {
        "notification_id": notification_id,
        "wallet": wallet,
        "type": notification_type.value,
        "title": title,
        "body": body,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await notifications_collection.insert_one(notification_doc)
    
    # TODO: Send push notification via Expo Push API
    # This would require the expo-server-sdk or direct API call
    # For now, we store the notification for in-app display
    
    return notification_id


async def notify_affiliate_of_purchase(
    beneficiary_wallet: str,
    source_wallet: str,
    level: int,
    commission_amount: float,
    purchase_amount: float
):
    """Notify an affiliate when they receive a commission"""
    title = f"Commission Niveau {level} !"
    body = f"Vous avez gagné ${commission_amount:.2f} ({COMMISSION_RATES.get(level, 0) * 100}%) sur un achat de ${purchase_amount:.2f}"
    
    await create_notification(
        wallet=beneficiary_wallet,
        notification_type=NotificationType.COMMISSION_RECEIVED,
        title=title,
        body=body,
        data={
            "source_wallet": source_wallet,
            "level": level,
            "commission_amount": commission_amount,
            "purchase_amount": purchase_amount
        }
    )


@app.post("/api/notifications/register-push-token")
async def register_push_token(data: PushTokenRegister):
    """Register an Expo push token for a wallet"""
    await push_tokens_collection.update_one(
        {"wallet": data.wallet},
        {
            "$set": {
                "wallet": data.wallet,
                "push_token": data.push_token,
                "platform": data.platform,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    return {"success": True, "message": "Push token registered"}


@app.get("/api/notifications/{wallet}")
async def get_notifications(wallet: str, limit: int = 50, unread_only: bool = False):
    """Get notifications for a wallet"""
    query = {"wallet": wallet}
    if unread_only:
        query["read"] = False
    
    notifications_cursor = notifications_collection.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    
    notifications = await notifications_cursor.to_list(length=limit)
    
    # Count unread
    unread_count = await notifications_collection.count_documents({
        "wallet": wallet,
        "read": False
    })
    
    result = []
    for n in notifications:
        result.append(NotificationResponse(
            id=n["notification_id"],
            type=n["type"],
            title=n["title"],
            body=n["body"],
            data=n.get("data"),
            read=n["read"],
            created_at=n["created_at"].isoformat() if isinstance(n["created_at"], datetime) else str(n["created_at"])
        ))
    
    return {
        "notifications": result,
        "unread_count": unread_count
    }


@app.post("/api/notifications/{wallet}/mark-read")
async def mark_notifications_read(wallet: str, notification_ids: List[str] = None):
    """Mark notifications as read"""
    query = {"wallet": wallet}
    if notification_ids:
        query["notification_id"] = {"$in": notification_ids}
    
    result = await notifications_collection.update_many(
        query,
        {"$set": {"read": True}}
    )
    
    return {"success": True, "marked_read": result.modified_count}


@app.delete("/api/notifications/{wallet}/clear")
async def clear_notifications(wallet: str):
    """Clear all notifications for a wallet"""
    result = await notifications_collection.delete_many({"wallet": wallet})
    return {"success": True, "deleted": result.deleted_count}


# ============== PRESALE PROGRESS ==============

class PresaleConfigUpdate(BaseModel):
    total_raised: Optional[float] = None
    goal: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None


# On-chain presale cache (2 hours TTL)
_presale_onchain_cache: Dict = {}
_presale_cache_ts: float = 0
PRESALE_CACHE_TTL = 7200  # 2 hours


async def get_sol_price_usd() -> float:
    """Get current SOL price in USD from CoinGecko"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": "solana", "vs_currencies": "usd"},
            )
            return resp.json().get("solana", {}).get("usd", 0)
    except Exception:
        return 0


async def get_token_holders_count() -> int:
    """Count holders of Quantum token on-chain."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        for endpoint in SOLANA_RPC_ENDPOINTS:
            try:
                resp = await client.post(endpoint, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "getTokenLargestAccounts",
                    "params": [QUANTUM_MINT],
                })
                data = resp.json()
                if "error" in data:
                    continue
                accounts = data.get("result", {}).get("value", [])
                return len([a for a in accounts if float(a.get("uiAmount", 0) or 0) > 0])
            except Exception:
                continue
    return 0


async def get_wallet_total_value_usd() -> dict:
    """
    Get total USD value of ALL assets on the presale wallet.
    SOL balance * SOL price + Quantum tokens * Quantum price + USDC balance.
    Simple: 3 RPC calls max, no transaction parsing needed.
    """
    sol_price = await get_sol_price_usd()
    sol_balance = 0.0
    total_usd = 0.0

    # Get SOL balance
    try:
        result = await solana_rpc_call("getBalance", [SOLANA_WALLET_ADDRESS])
        lamports = result.get("value", 0) if isinstance(result, dict) else 0
        sol_balance = lamports / 1e9
    except Exception:
        pass

    # Get all SPL token accounts
    try:
        result = await solana_rpc_call("getTokenAccountsByOwner", [
            SOLANA_WALLET_ADDRESS,
            {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
            {"encoding": "jsonParsed"},
        ])
        accounts = result.get("value", []) if isinstance(result, dict) else []
        for acc in accounts:
            info = acc["account"]["data"]["parsed"]["info"]
            mint = info["mint"]
            ui_amount = info["tokenAmount"].get("uiAmount", 0) or 0

            if mint == QUANTUM_MINT:
                # Quantum tokens at presale price
                total_usd += ui_amount * TOKEN_PRICE
            elif mint == "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v":
                # USDC (1:1 with USD)
                total_usd += ui_amount
            elif mint == "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB":
                # USDT (1:1 with USD)
                total_usd += ui_amount
    except Exception:
        pass

    # Add SOL value in USD
    sol_usd = sol_balance * sol_price if sol_price > 0 else 0
    total_usd += sol_usd

    return {
        "total_usd": round(total_usd, 2),
        "sol_balance": round(sol_balance, 4),
        "sol_price_usd": sol_price,
        "sol_value_usd": round(sol_usd, 2),
    }


@app.get("/api/presale/progress")
async def get_presale_progress():
    """Get presale progress from on-chain wallet balance (cached 2h)"""
    global _presale_onchain_cache, _presale_cache_ts

    import time
    now = time.time()

    if _presale_onchain_cache and (now - _presale_cache_ts) < PRESALE_CACHE_TTL:
        return _presale_onchain_cache

    # Get total wallet value (simple, fast: 2-3 RPC calls)
    wallet_data = await get_wallet_total_value_usd()
    total_raised_usd = wallet_data["total_usd"]

    # Get token holders count (may fail due to rate limits)
    holders = await get_token_holders_count()

    goal = 2000000  # $2M

    result = {
        "total_raised": total_raised_usd,
        "goal": goal,
        "progress_percentage": min((total_raised_usd / goal * 100), 100) if goal > 0 else 0,
        "remaining": round(max(goal - total_raised_usd, 0), 2),
        "participants": holders,
        "is_active": True,
        "sol_balance": wallet_data["sol_balance"],
        "sol_price_usd": wallet_data["sol_price_usd"],
        "sol_value_usd": wallet_data["sol_value_usd"],
        "start_date": None,
        "end_date": None,
    }

    _presale_onchain_cache = result
    _presale_cache_ts = now

    return result


@app.put("/api/presale/config")
async def update_presale_config(config_update: PresaleConfigUpdate):
    """Update presale configuration (admin endpoint)"""
    update_data = {}
    
    if config_update.total_raised is not None:
        update_data["total_raised"] = config_update.total_raised
    if config_update.goal is not None:
        update_data["goal"] = config_update.goal
    if config_update.start_date is not None:
        update_data["start_date"] = config_update.start_date
    if config_update.end_date is not None:
        update_data["end_date"] = config_update.end_date
    if config_update.is_active is not None:
        update_data["is_active"] = config_update.is_active
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await presale_config_collection.update_one(
            {"config_id": "main"},
            {"$set": update_data},
            upsert=True
        )
    
    return {"success": True, "message": "Configuration updated"}


@app.post("/api/presale/increment-raised")
async def increment_presale_raised(amount: float):
    """Increment the total raised amount (internal use)"""
    await presale_config_collection.update_one(
        {"config_id": "main"},
        {
            "$inc": {"total_raised": amount, "participants": 1},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        },
        upsert=True
    )
    return {"success": True}


# ============== SOLANA BALANCE PROXY ==============

async def solana_rpc_call(method: str, params: list) -> dict:
    """Make a Solana RPC call via backend (avoids browser CORS/rate-limit)"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        for endpoint in SOLANA_RPC_ENDPOINTS:
            try:
                resp = await client.post(endpoint, json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": method,
                    "params": params,
                })
                data = resp.json()
                if "error" in data:
                    continue
                return data.get("result", {})
            except Exception:
                continue
    return {}


@app.get("/api/solana/balance/{wallet}")
async def get_solana_balance(wallet: str):
    """Proxy endpoint: fetch SOL + Quantum token balance from Solana mainnet"""
    sol_balance = 0.0
    quantum_amount = 0.0
    quantum_raw = "0"
    quantum_decimals = 0
    quantum_ui_string = "0"

    # SOL balance
    try:
        result = await solana_rpc_call("getBalance", [wallet])
        lamports = result.get("value", 0) if isinstance(result, dict) else 0
        sol_balance = lamports / 1e9
    except Exception:
        pass

    # Quantum SPL token balance
    try:
        result = await solana_rpc_call("getTokenAccountsByOwner", [
            wallet,
            {"mint": QUANTUM_MINT},
            {"encoding": "jsonParsed"},
        ])
        accounts = result.get("value", []) if isinstance(result, dict) else []
        if accounts:
            token_info = accounts[0]["account"]["data"]["parsed"]["info"]["tokenAmount"]
            quantum_amount = token_info.get("uiAmount", 0) or 0
            quantum_raw = token_info.get("amount", "0")
            quantum_decimals = token_info.get("decimals", 0)
            quantum_ui_string = token_info.get("uiAmountString", "0")
    except Exception:
        pass

    return {
        "wallet": wallet,
        "sol_balance": sol_balance,
        "quantum": {
            "amount": quantum_amount,
            "rawAmount": quantum_raw,
            "decimals": quantum_decimals,
            "uiAmountString": quantum_ui_string,
        },
        "quantum_mint": QUANTUM_MINT,
        "price_usd": TOKEN_PRICE,
    }


# ============== LEGACY MODELS (for backward compatibility) ==============

class PreSalePurchaseRequest(BaseModel):
    firstName: str
    lastName: str
    email: Optional[str] = None
    walletAddress: str
    tokenAmount: int
    paymentMethod: str  # 'card' or 'crypto'
    referralCode: Optional[str] = None
    hostUrl: str


class PreSalePurchaseResponse(BaseModel):
    success: bool
    checkoutUrl: Optional[str] = None
    sessionId: Optional[str] = None
    solanaAddress: Optional[str] = None
    amount: Optional[float] = None
    message: str


class ReferralStats(BaseModel):
    walletAddress: str
    referralCode: str
    referrals: int = 0
    totalPurchased: int = 0
    commissionEarned: float = 0.0
    commissionPending: float = 0.0
    commissionPaid: float = 0.0


# ============== UTILITY FUNCTIONS ==============

def generate_referral_code(wallet_address: str) -> str:
    """Generate referral code from wallet address"""
    return f"QTM{wallet_address[:6].upper()}"


async def get_or_create_referral_data(wallet_address: str) -> ReferralStats:
    """Get or create referral data for a wallet"""
    existing = await referral_data.find_one({"walletAddress": wallet_address})
    
    if existing:
        return ReferralStats(**existing)
    
    # Create new referral data
    referral_code = generate_referral_code(wallet_address)
    new_data = ReferralStats(
        walletAddress=wallet_address,
        referralCode=referral_code
    )
    
    await referral_data.insert_one(new_data.dict())
    return new_data


async def update_referral_stats(referral_code: str, purchase_amount: float, token_amount: int):
    """Update referral stats when a purchase is made"""
    # Find referrer by code
    referrer = await referral_data.find_one({"referralCode": referral_code})
    
    if not referrer:
        return
    
    # Calculate commission (10%)
    commission = purchase_amount * 0.10
    
    # Update stats
    await referral_data.update_one(
        {"referralCode": referral_code},
        {
            "$inc": {
                "referrals": 1,
                "totalPurchased": token_amount,
                "commissionEarned": commission,
                "commissionPending": commission
            }
        }
    )


# ============== API ENDPOINTS ==============

@app.get("/api")
async def root():
    return {"message": "Quantum IA Backend API", "status": "operational"}


@app.get("/api/health")
async def health_check():
    try:
        # Check MongoDB connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.post("/api/presale/purchase", response_model=PreSalePurchaseResponse)
async def create_presale_purchase(purchase: PreSalePurchaseRequest):
    """Create a pre-sale purchase (Stripe for card, manual for crypto)"""
    
    try:
        # Validate minimum purchase
        if purchase.tokenAmount < MIN_PURCHASE:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum purchase is {MIN_PURCHASE} tokens"
            )
        
        # Calculate total (server-side only)
        total_price = float(purchase.tokenAmount) * TOKEN_PRICE
        
        # Register user in MLM system if not already registered
        existing_user = await get_user_by_wallet(purchase.walletAddress)
        if not existing_user:
            await register_affiliate(UserCreate(
                wallet_public_key=purchase.walletAddress,
                referral_code_used=purchase.referralCode
            ))
        
        # CRYPTO PAYMENT - Return Solana address
        if purchase.paymentMethod == "crypto":
            # Store purchase as pending
            purchase_id = str(uuid.uuid4())
            purchase_doc = {
                "purchase_id": purchase_id,
                "firstName": purchase.firstName,
                "lastName": purchase.lastName,
                "email": purchase.email,
                "walletAddress": purchase.walletAddress,
                "tokenAmount": purchase.tokenAmount,
                "totalPrice": total_price,
                "paymentMethod": "crypto",
                "paymentStatus": "pending_manual_transfer",
                "solanaAddress": SOLANA_WALLET_ADDRESS,
                "referralCode": purchase.referralCode,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            }
            
            result = await presale_purchases.insert_one(purchase_doc)
            
            return PreSalePurchaseResponse(
                success=True,
                solanaAddress=SOLANA_WALLET_ADDRESS,
                amount=total_price,
                message=f"Please send ${total_price:.2f} USD worth of SOL/USDC to the provided address"
            )
        
        # CARD PAYMENT - Use Stripe
        elif purchase.paymentMethod == "card":
            # Initialize Stripe
            webhook_url = f"{purchase.hostUrl}/api/webhook/stripe"
            stripe_checkout = StripeCheckout(
                api_key=STRIPE_API_KEY,
                webhook_url=webhook_url
            )
            
            # Create success/cancel URLs
            success_url = f"{purchase.hostUrl}/presale/success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
            cancel_url = f"{purchase.hostUrl}/presale/cancel"
            
            # Metadata for tracking
            metadata = {
                "firstName": purchase.firstName,
                "lastName": purchase.lastName,
                "email": purchase.email or "",
                "walletAddress": purchase.walletAddress,
                "tokenAmount": str(purchase.tokenAmount),
                "referralCode": purchase.referralCode or ""
            }
            
            # Create Stripe checkout session
            checkout_request = CheckoutSessionRequest(
                amount=total_price,
                currency="usd",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
                payment_methods=["card"]
            )
            
            session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(
                checkout_request
            )
            
            # Store in database as pending
            purchase_id = str(uuid.uuid4())
            purchase_doc = {
                "purchase_id": purchase_id,
                "firstName": purchase.firstName,
                "lastName": purchase.lastName,
                "email": purchase.email,
                "walletAddress": purchase.walletAddress,
                "tokenAmount": purchase.tokenAmount,
                "totalPrice": total_price,
                "paymentMethod": "card",
                "paymentStatus": "pending",
                "stripeSessionId": session.session_id,
                "referralCode": purchase.referralCode,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            }
            
            await presale_purchases.insert_one(purchase_doc)
            
            # Store transaction
            transaction_doc = {
                "sessionId": session.session_id,
                "purchase_id": purchase_id,
                "amount": total_price,
                "currency": "usd",
                "status": "pending",
                "paymentStatus": "pending",
                "metadata": metadata,
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            }
            
            await payment_transactions.insert_one(transaction_doc)
            
            return PreSalePurchaseResponse(
                success=True,
                checkoutUrl=session.url,
                sessionId=session.session_id,
                message="Redirecting to Stripe checkout"
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid payment method")
            
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error creating purchase: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create purchase: {str(e)}")


@app.get("/api/presale/status/{session_id}")
async def get_presale_status(session_id: str):
    """Get the status of a Stripe checkout session"""
    
    try:
        # Check if already processed
        existing_transaction = await payment_transactions.find_one({"sessionId": session_id})
        
        if not existing_transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # If already completed, return cached status
        if existing_transaction.get("paymentStatus") == "paid":
            return {
                "status": "complete",
                "payment_status": "paid",
                "amount_total": existing_transaction.get("amount"),
                "currency": existing_transaction.get("currency"),
                "metadata": existing_transaction.get("metadata", {})
            }
        
        # Initialize Stripe to check status
        webhook_url = "https://mlm-network-20.preview.emergentagent.com/api/webhook/stripe"
        stripe_checkout = StripeCheckout(
            api_key=STRIPE_API_KEY,
            webhook_url=webhook_url
        )
        
        # Get status from Stripe
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update database only if status changed and not already processed
        if checkout_status.payment_status == "paid" and existing_transaction.get("paymentStatus") != "paid":
            # Update transaction
            await payment_transactions.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "status": checkout_status.status,
                        "paymentStatus": checkout_status.payment_status,
                        "updatedAt": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Update purchase status
            await presale_purchases.update_one(
                {"stripeSessionId": session_id},
                {
                    "$set": {
                        "paymentStatus": "paid",
                        "updatedAt": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Get purchase details for MLM commission distribution
            purchase = await presale_purchases.find_one({"stripeSessionId": session_id})
            if purchase:
                # Distribute MLM commissions
                await distribute_commissions(
                    source_wallet=purchase["walletAddress"],
                    net_amount=purchase["totalPrice"],
                    event_type=EventType.PRESALE_PURCHASE.value,
                    event_id=purchase.get("purchase_id", session_id)
                )
            
            # Legacy: Update old referral stats if applicable
            metadata = checkout_status.metadata
            if metadata and metadata.get("referralCode"):
                await update_referral_stats(
                    metadata.get("referralCode"),
                    checkout_status.amount_total / 100,  # Convert cents to dollars
                    int(metadata.get("tokenAmount", 0))
                )
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount_total": checkout_status.amount_total,
            "currency": checkout_status.currency,
            "metadata": checkout_status.metadata
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error checking status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}")


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    try:
        # Get raw body
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        # Initialize Stripe
        webhook_url = str(request.base_url) + "api/webhook/stripe"
        stripe_checkout = StripeCheckout(
            api_key=STRIPE_API_KEY,
            webhook_url=webhook_url
        )
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process webhook event
        if webhook_response.payment_status == "paid":
            # Update transaction if not already processed
            existing = await payment_transactions.find_one({"sessionId": webhook_response.session_id})
            
            if existing and existing.get("paymentStatus") != "paid":
                # Update transaction
                await payment_transactions.update_one(
                    {"sessionId": webhook_response.session_id},
                    {
                        "$set": {
                            "paymentStatus": "paid",
                            "updatedAt": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Update purchase
                await presale_purchases.update_one(
                    {"stripeSessionId": webhook_response.session_id},
                    {
                        "$set": {
                            "paymentStatus": "paid",
                            "updatedAt": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Get purchase details for MLM commission distribution
                purchase = await presale_purchases.find_one({"stripeSessionId": webhook_response.session_id})
                if purchase:
                    # Distribute MLM commissions
                    await distribute_commissions(
                        source_wallet=purchase["walletAddress"],
                        net_amount=purchase["totalPrice"],
                        event_type=EventType.PRESALE_PURCHASE.value,
                        event_id=purchase.get("purchase_id", webhook_response.session_id)
                    )
                
                # Legacy: Update old referral if applicable
                if webhook_response.metadata and webhook_response.metadata.get("referralCode"):
                    metadata = webhook_response.metadata
                    token_amount = int(metadata.get("tokenAmount", 0))
                    total_price = token_amount * TOKEN_PRICE
                    
                    await update_referral_stats(
                        metadata.get("referralCode"),
                        total_price,
                        token_amount
                    )
        
        return {"received": True}
        
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/referral/{wallet_address}", response_model=ReferralStats)
async def get_referral_data(wallet_address: str):
    """Get referral data for a wallet address"""
    
    try:
        referral_info = await get_or_create_referral_data(wallet_address)
        return referral_info
        
    except Exception as e:
        print(f"Error fetching referral data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch referral data: {str(e)}")


@app.get("/api/config")
async def get_config():
    """Get public configuration"""
    return {
        "tokenPrice": TOKEN_PRICE,
        "minPurchase": MIN_PURCHASE,
        "solanaAddress": SOLANA_WALLET_ADDRESS,
        "commissionRate": 0.10
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
