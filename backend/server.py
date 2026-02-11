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

# Stripe Configuration
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
SOLANA_WALLET_ADDRESS = "2ebxzttJ5zyLme4cBBHD8hKkVho4tJ13tUUWu3B3aG5i"

# Token Configuration
TOKEN_PRICE = 2.5  # USD per token
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


# ============== MODELS ==============

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
        
        # CRYPTO PAYMENT - Return Solana address
        if purchase.paymentMethod == "crypto":
            # Store purchase as pending
            purchase_doc = {
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
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
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
            purchase_doc = {
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
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            await presale_purchases.insert_one(purchase_doc)
            
            # Store transaction
            transaction_doc = {
                "sessionId": session.session_id,
                "amount": total_price,
                "currency": "usd",
                "status": "pending",
                "paymentStatus": "pending",
                "metadata": metadata,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
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
        webhook_url = "https://expo-dev-preview-1.preview.emergentagent.com/api/webhook/stripe"
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
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            
            # Update purchase status
            await presale_purchases.update_one(
                {"stripeSessionId": session_id},
                {
                    "$set": {
                        "paymentStatus": "paid",
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            
            # Update referral stats if applicable
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
                            "updatedAt": datetime.utcnow()
                        }
                    }
                )
                
                # Update purchase
                await presale_purchases.update_one(
                    {"stripeSessionId": webhook_response.session_id},
                    {
                        "$set": {
                            "paymentStatus": "paid",
                            "updatedAt": datetime.utcnow()
                        }
                    }
                )
                
                # Update referral if applicable
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
