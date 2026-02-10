from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime
import os
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
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.quantum_db

# Collections
presale_purchases = db.presale_purchases
payment_transactions = db.payment_transactions
referral_data = db.referral_data

# Stripe Configuration
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
SOLANA_WALLET_ADDRESS = "2ebxzttJ5zyLme4cBBHD8hKkVho4tJ13tUUWu3B3aG5i"

# Token Configuration
TOKEN_PRICE = 2.5  # USD per token
MIN_PURCHASE = 100  # Minimum tokens


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
        webhook_url = "https://web3-auth-flow.preview.emergentagent.com/api/webhook/stripe"
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
