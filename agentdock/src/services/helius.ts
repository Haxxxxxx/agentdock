const HELIUS_API_KEY = process.env.EXPO_PUBLIC_HELIUS_API_KEY;
const HELIUS_BASE = 'https://api.helius.xyz/v0';

export interface EnhancedTransaction {
  signature: string;
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  timestamp: number;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: { tokenAmount: string; decimals: number };
      userAccount: string;
    }>;
  }>;
  events: Record<string, unknown>;
}

export async function getEnhancedTransactions(
  walletAddress: string,
  limit = 20
): Promise<EnhancedTransaction[]> {
  if (!HELIUS_API_KEY) {
    console.warn('Helius API key not configured');
    return [];
  }

  const response = await fetch(
    `${HELIUS_BASE}/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Helius API error: ${response.status}`);
  }

  return response.json();
}

export async function parseTransaction(signature: string): Promise<EnhancedTransaction[]> {
  if (!HELIUS_API_KEY) return [];

  const response = await fetch(`${HELIUS_BASE}/transactions?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: [signature] }),
  });

  if (!response.ok) {
    throw new Error(`Helius parse error: ${response.status}`);
  }

  return response.json();
}

export function mapHeliusType(type: string): string {
  const typeMap: Record<string, string> = {
    TRANSFER: 'transfer',
    SWAP: 'swap',
    NFT_SALE: 'transfer',
    NFT_MINT: 'program_interaction',
    STAKE_SOL: 'stake',
    UNSTAKE_SOL: 'stake',
    COMPRESSED_NFT_MINT: 'program_interaction',
    UNKNOWN: 'unknown',
  };
  return typeMap[type] || 'unknown';
}
