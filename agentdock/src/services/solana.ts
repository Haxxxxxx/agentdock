import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const HELIUS_KEY = process.env.EXPO_PUBLIC_HELIUS_API_KEY;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 6;

let connectionInstance: Connection | null = null;

export function getConnection(): Connection {
  if (!connectionInstance) {
    const url = HELIUS_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`
      : RPC_URL;
    connectionInstance = new Connection(url, 'confirmed');
  }
  return connectionInstance;
}

export async function getSolBalance(walletAddress: string): Promise<number> {
  const connection = getConnection();
  const pubkey = new PublicKey(walletAddress);
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

export async function getUsdcBalance(walletAddress: string): Promise<number> {
  const connection = getConnection();
  const walletPubkey = new PublicKey(walletAddress);
  const usdcMint = new PublicKey(USDC_MINT);

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
      mint: usdcMint,
    });

    if (tokenAccounts.value.length === 0) return 0;

    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return balance ?? 0;
  } catch {
    return 0;
  }
}

export async function getRecentTransactions(
  walletAddress: string,
  limit = 20
): Promise<Array<{
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
}>> {
  const connection = getConnection();
  const pubkey = new PublicKey(walletAddress);
  const signatures = await connection.getSignaturesForAddress(pubkey, { limit });
  return signatures.map((sig) => ({
    signature: sig.signature,
    slot: sig.slot,
    blockTime: sig.blockTime ?? null,
    err: sig.err,
  }));
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export { LAMPORTS_PER_SOL, USDC_MINT, USDC_DECIMALS };
