/**
 * Direct Solana JSON-RPC client.
 * Uses backend proxy to avoid browser CORS/rate-limit issues.
 * Falls back to direct RPC if proxy unavailable.
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
];

const QUANTUM_MINT = '4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc';
const QUANTUM_PRICE_USD = 0.20;
const SOLSCAN_TOKEN_URL = `https://solscan.io/token/${QUANTUM_MINT}`;

// ─── Backend proxy for balances (preferred) ─────────────────
export interface BackendBalanceResponse {
  wallet: string;
  sol_balance: number;
  quantum: TokenBalance;
  quantum_mint: string;
  price_usd: number;
}

export async function getBalancesViaBackend(
  walletAddress: string
): Promise<BackendBalanceResponse | null> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/solana/balance/${walletAddress}`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('Backend balance proxy failed:', err);
    return null;
  }
}

async function rpcCall(method: string, params: any[]): Promise<any> {
  let lastError: any;

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }

      return data.result;
    } catch (err) {
      lastError = err;
      console.warn(`RPC call to ${endpoint} failed:`, err);
      continue; // try next endpoint
    }
  }

  throw lastError || new Error('All RPC endpoints failed');
}

// ─── Get SOL balance (in SOL, not lamports) ─────────────────
export async function getSolBalance(walletAddress: string): Promise<number> {
  try {
    const lamports = await rpcCall('getBalance', [walletAddress]);
    return (lamports?.value ?? 0) / 1e9; // lamports → SOL
  } catch (err) {
    console.error('getSolBalance error:', err);
    return 0;
  }
}

// ─── Get Quantum (SPL) token balance ────────────────────────
export interface TokenBalance {
  amount: number; // human-readable
  rawAmount: string; // raw on-chain string
  decimals: number;
  uiAmountString: string;
}

export async function getQuantumBalance(
  walletAddress: string
): Promise<TokenBalance> {
  try {
    const result = await rpcCall('getTokenAccountsByOwner', [
      walletAddress,
      { mint: QUANTUM_MINT },
      { encoding: 'jsonParsed' },
    ]);

    if (result?.value?.length > 0) {
      const info = result.value[0].account.data.parsed.info.tokenAmount;
      return {
        amount: info.uiAmount ?? 0,
        rawAmount: info.amount ?? '0',
        decimals: info.decimals ?? 0,
        uiAmountString: info.uiAmountString ?? '0',
      };
    }

    return { amount: 0, rawAmount: '0', decimals: 0, uiAmountString: '0' };
  } catch (err) {
    console.error('getQuantumBalance error:', err);
    return { amount: 0, rawAmount: '0', decimals: 0, uiAmountString: '0' };
  }
}

// ─── Get all SPL token accounts for the wallet ──────────────
export async function getAllTokenAccounts(
  walletAddress: string
): Promise<any[]> {
  try {
    const result = await rpcCall('getTokenAccountsByOwner', [
      walletAddress,
      { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
      { encoding: 'jsonParsed' },
    ]);
    return result?.value ?? [];
  } catch (err) {
    console.error('getAllTokenAccounts error:', err);
    return [];
  }
}

// ─── USD to EUR real-time rate ──────────────────────────────
let cachedEurRate: { rate: number; timestamp: number } | null = null;
const RATE_CACHE_MS = 10 * 60 * 1000; // 10 minutes

export async function getUsdToEurRate(): Promise<number> {
  if (
    cachedEurRate &&
    Date.now() - cachedEurRate.timestamp < RATE_CACHE_MS
  ) {
    return cachedEurRate.rate;
  }

  try {
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );
    const data = await response.json();
    const rate = data.rates?.EUR ?? 0.92;
    cachedEurRate = { rate, timestamp: Date.now() };
    return rate;
  } catch {
    return cachedEurRate?.rate ?? 0.92; // fallback
  }
}

// ─── Constants ──────────────────────────────────────────────
export { QUANTUM_MINT, QUANTUM_PRICE_USD };
