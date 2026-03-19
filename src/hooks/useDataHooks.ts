import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as db from '../lib/db';
import { useAsyncQuery } from './useAsyncQuery';
import { useAuth } from '../providers/AuthProvider';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAppState } from '../App';
import {
  demoBalance,
  demoTransactions,
  onBalanceChange,
  onTransactionsChange,
} from '../lib/appState';
import { isValidPublicKey } from '../lib/solanaWallet';
import { USDC_MINT_DEVNET } from '../lib/utils';
import type { Transaction } from '../types';

const BALANCE_CACHE_TTL_MS = 20_000;
const BALANCE_POLL_INTERVAL_MS = 30_000;
const RATE_LIMIT_COOLDOWN_MS = 45_000;
const HISTORY_CACHE_TTL_MS = 25_000;
const HISTORY_POLL_INTERVAL_MS = 45_000;
const HISTORY_SIGNATURE_LIMIT = 20;
const HISTORY_TX_LIMIT = 15;

type CachedBalance = {
  amount: number;
  fetchedAt: number;
};

let cachedUsdcMintKey: PublicKey | null = null;
let cachedUsdcMintValue: string | null = null;
let sharedBalanceConnection: Connection | null = null;
const balanceCache = new Map<string, CachedBalance>();
const balanceRequests = new Map<string, Promise<number>>();
const rateLimitCooldowns = new Map<string, number>();
const balanceWarned = new Set<string>();
const historyCache = new Map<string, { items: Transaction[]; fetchedAt: number }>();
const historyRequests = new Map<string, Promise<Transaction[]>>();
const historyCooldowns = new Map<string, number>();

function getBalanceConnection() {
  if (!sharedBalanceConnection) {
    sharedBalanceConnection = new Connection(import.meta.env.VITE_SOLANA_RPC, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: true,
    });
  }
  return sharedBalanceConnection;
}

function getCachedBalance(walletAddress?: string | null) {
  if (!walletAddress) return null;
  return balanceCache.get(walletAddress) ?? null;
}

function getFreshCachedBalance(walletAddress?: string | null) {
  const cached = getCachedBalance(walletAddress);
  if (!cached) return null;
  return Date.now() - cached.fetchedAt <= BALANCE_CACHE_TTL_MS ? cached : null;
}

function isRateLimitedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('429') || /too many requests/i.test(message);
}

function resolvePublicKey(value: string, label: string): PublicKey | null {
  const trimmed = value.trim();
  if (!trimmed || !isValidPublicKey(trimmed)) {
    const key = `${label}:invalid`;
    if (!balanceWarned.has(key)) {
      console.error(`Invalid ${label} for Solana balance fetch:`, value);
      balanceWarned.add(key);
    }
    return null;
  }
  try {
    return new PublicKey(trimmed);
  } catch (error) {
    const key = `${label}:constructor`;
    if (!balanceWarned.has(key)) {
      console.error(`Failed to construct PublicKey for ${label}:`, error);
      balanceWarned.add(key);
    }
    return null;
  }
}

function getUsdcMintPublicKey(): PublicKey | null {
  if (cachedUsdcMintKey && cachedUsdcMintValue === USDC_MINT_DEVNET) {
    return cachedUsdcMintKey;
  }
  const key = resolvePublicKey(USDC_MINT_DEVNET, 'USDC mint');
  cachedUsdcMintKey = key;
  cachedUsdcMintValue = USDC_MINT_DEVNET;
  return key;
}

function getCachedHistory(walletAddress?: string | null) {
  if (!walletAddress) return null;
  return historyCache.get(walletAddress) ?? null;
}

function getFreshCachedHistory(walletAddress?: string | null) {
  const cached = getCachedHistory(walletAddress);
  if (!cached) return null;
  return Date.now() - cached.fetchedAt <= HISTORY_CACHE_TTL_MS ? cached : null;
}

function tokenAmountToNumber(tokenAmount: any): number {
  if (!tokenAmount) return 0;
  if (typeof tokenAmount.uiAmount === 'number') return tokenAmount.uiAmount;
  if (tokenAmount.uiAmountString !== undefined && tokenAmount.uiAmountString !== null) {
    const parsed = Number(tokenAmount.uiAmountString);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const raw = Number(tokenAmount.amount ?? 0);
  const decimals = Number(tokenAmount.decimals ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return decimals > 0 ? raw / Math.pow(10, decimals) : raw;
}

function resolveAccountKey(keys: any[], index: number): string | null {
  const key = keys?.[index];
  if (!key) return null;
  if (typeof key === 'string') return key;
  if (typeof key?.pubkey === 'string') return key.pubkey;
  return null;
}

async function getTokenAccountsForOwner(conn: Connection, owner: PublicKey, mintKey: PublicKey) {
  const mintAddress = mintKey.toBase58();
  const accounts = new Set<string>();
  const programs = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];

  for (const programId of programs) {
    try {
      const ata = getAssociatedTokenAddressSync(mintKey, owner, false, programId);
      accounts.add(ata.toBase58());
    } catch {
      // ignore
    }

    try {
      const parsed = await conn.getParsedTokenAccountsByOwner(owner, { programId });
      for (const item of parsed.value) {
        const info = (item.account.data as any)?.parsed?.info;
        if (info?.mint === mintAddress) {
          accounts.add(item.pubkey.toBase58());
        }
      }
    } catch {
      // ignore
    }
  }

  return Array.from(accounts);
}

async function fetchOnchainHistory(walletAddress: string, options?: { force?: boolean }) {
  const cached = getCachedHistory(walletAddress);
  const fresh = getFreshCachedHistory(walletAddress);
  const now = Date.now();

  if (!options?.force && fresh) {
    return fresh.items;
  }

  const cooldownUntil = historyCooldowns.get(walletAddress) ?? 0;
  if (!options?.force && cached && cooldownUntil > now) {
    return cached.items;
  }

  const inFlight = historyRequests.get(walletAddress);
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      const owner = resolvePublicKey(walletAddress, 'wallet address');
      const mintKey = getUsdcMintPublicKey();
      if (!owner || !mintKey) {
        return cached?.items ?? [];
      }

      const conn = getBalanceConnection();
      const tokenAccounts = await getTokenAccountsForOwner(conn, owner, mintKey);
      if (tokenAccounts.length === 0) {
        historyCache.set(walletAddress, { items: [], fetchedAt: Date.now() });
        return [];
      }

      const signatureMap = new Map<string, { signature: string; blockTime?: number | null }>();
      for (const address of tokenAccounts) {
        const signatures = await conn.getSignaturesForAddress(new PublicKey(address), {
          limit: HISTORY_SIGNATURE_LIMIT,
        });
        for (const info of signatures) {
          if (!signatureMap.has(info.signature)) {
            signatureMap.set(info.signature, { signature: info.signature, blockTime: info.blockTime });
          }
        }
      }

      const signatureInfos = Array.from(signatureMap.values())
        .sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0))
        .slice(0, HISTORY_TX_LIMIT);

      const tokenAccountSet = new Set(tokenAccounts);
      const mintAddress = mintKey.toBase58();
      const history: Transaction[] = [];

      for (const info of signatureInfos) {
        const tx = await conn.getParsedTransaction(
          info.signature,
          { commitment: 'confirmed', maxSupportedTransactionVersion: 0 } as any
        );
        if (!tx?.meta || !tx.transaction) continue;

        const preBalances = tx.meta.preTokenBalances || [];
        const postBalances = tx.meta.postTokenBalances || [];
        const accountKeys = tx.transaction.message.accountKeys as any[];
        const preMap = new Map<number, { amount: number; owner?: string | null }>();
        const postMap = new Map<number, { amount: number; owner?: string | null }>();

        for (const entry of preBalances) {
          if (entry?.mint !== mintAddress) continue;
          preMap.set(entry.accountIndex, {
            amount: tokenAmountToNumber(entry.uiTokenAmount),
            owner: entry.owner ?? null,
          });
        }
        for (const entry of postBalances) {
          if (entry?.mint !== mintAddress) continue;
          postMap.set(entry.accountIndex, {
            amount: tokenAmountToNumber(entry.uiTokenAmount),
            owner: entry.owner ?? null,
          });
        }

        const indices = new Set<number>([...preMap.keys(), ...postMap.keys()]);
        let delta = 0;
        const counterparties: Array<{ change: number; owner?: string | null; address?: string | null }> = [];

        indices.forEach((index) => {
          const pre = preMap.get(index)?.amount ?? 0;
          const post = postMap.get(index)?.amount ?? 0;
          const change = post - pre;
          if (Math.abs(change) < 1e-9) return;
          const address = resolveAccountKey(accountKeys, index);
          const ownerAddress = postMap.get(index)?.owner || preMap.get(index)?.owner || null;
          const isOwnerAccount =
            (ownerAddress && ownerAddress === walletAddress) ||
            (address && tokenAccountSet.has(address));
          if (isOwnerAccount) {
            delta += change;
          } else {
            counterparties.push({ change, owner: ownerAddress, address });
          }
        });

        if (Math.abs(delta) < 1e-9) continue;
        const direction = delta > 0 ? 'receive' : 'send';
        const desiredSign = direction === 'receive' ? -1 : 1;
        const counterparty = counterparties
          .filter((c) => Math.sign(c.change) === desiredSign)
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
        const counterpartyAddress = counterparty?.owner || counterparty?.address || null;
        const rawTime = tx.blockTime ?? info.blockTime ?? null;
        const createdAt = new Date(rawTime ? rawTime * 1000 : Date.now()).toISOString();

        history.push({
          id: info.signature,
          type: direction,
          from_address: direction === 'receive' ? (counterpartyAddress || '') : walletAddress,
          to_address: direction === 'receive' ? walletAddress : (counterpartyAddress || ''),
          from_user_id: null,
          to_user_id: null,
          from_name: direction === 'receive' ? (counterpartyAddress ? 'External Wallet' : 'External Wallet') : 'You',
          to_name: direction === 'receive' ? 'You' : (counterpartyAddress ? 'External Wallet' : 'External Wallet'),
          from_username: null,
          to_username: direction === 'send' ? null : null,
          amount_usdc: Math.abs(delta),
          amount_display: Math.abs(delta),
          currency: 'USDC',
          fee: 0,
          status: 'confirmed',
          tx_hash: info.signature,
          category: 'transfer',
          created_at: createdAt,
        });
      }

      historyCache.set(walletAddress, { items: history, fetchedAt: Date.now() });
      historyCooldowns.delete(walletAddress);
      return history;
    } catch (error) {
      if (cached && isRateLimitedError(error)) {
        historyCooldowns.set(walletAddress, Date.now() + RATE_LIMIT_COOLDOWN_MS);
        return cached.items;
      }
      throw error;
    } finally {
      historyRequests.delete(walletAddress);
    }
  })();

  historyRequests.set(walletAddress, request);
  return request;
}

async function fetchUsdcBalance(walletAddress: string, options?: { force?: boolean }) {
  const cached = getCachedBalance(walletAddress);
  const fresh = getFreshCachedBalance(walletAddress);
  const now = Date.now();

  if (!options?.force && fresh) {
    return fresh.amount;
  }

  const cooldownUntil = rateLimitCooldowns.get(walletAddress) ?? 0;
  if (!options?.force && cached && cooldownUntil > now) {
    return cached.amount;
  }

  const inFlight = balanceRequests.get(walletAddress);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const pubkey = resolvePublicKey(walletAddress, 'wallet address');
      const mintKey = getUsdcMintPublicKey();
      if (!pubkey || !mintKey) {
        return cached?.amount ?? 0;
      }

      const conn = getBalanceConnection();
      const getBalanceForProgram = async (programId: PublicKey) => {
        try {
          const ata = getAssociatedTokenAddressSync(mintKey, pubkey, false, programId);
          const balance = await conn.getTokenAccountBalance(ata);
          const uiAmountString = balance?.value?.uiAmountString;
          if (uiAmountString !== undefined && uiAmountString !== null) {
            const parsed = Number(uiAmountString);
            return Number.isFinite(parsed) ? parsed : 0;
          }
          const uiAmount = balance?.value?.uiAmount ?? 0;
          return typeof uiAmount === 'number' ? uiAmount : 0;
        } catch {
          return null;
        }
      };

      const getBalanceFromOwnerAccounts = async (programId: PublicKey) => {
        try {
          const accounts = await conn.getParsedTokenAccountsByOwner(pubkey, { programId });
          if (!accounts.value.length) return null;
          const mintAddress = mintKey.toBase58();
          return accounts.value.reduce((sum, { account }) => {
            if (!('parsed' in account.data)) return sum;
            const info = account.data.parsed?.info;
            if (!info || info.mint !== mintAddress) return sum;
            const tokenAmount = info.tokenAmount;
            const uiAmountString = tokenAmount?.uiAmountString;
            if (uiAmountString !== undefined && uiAmountString !== null) {
              const parsed = Number(uiAmountString);
              return Number.isFinite(parsed) ? sum + parsed : sum;
            }
            const uiAmount = tokenAmount?.uiAmount ?? 0;
            return typeof uiAmount === 'number' ? sum + uiAmount : sum;
          }, 0);
        } catch {
          return null;
        }
      };

      const [tokenBalance, token2022Balance] = await Promise.all([
        getBalanceForProgram(TOKEN_PROGRAM_ID),
        getBalanceForProgram(TOKEN_2022_PROGRAM_ID),
      ]);

      let amount = [tokenBalance, token2022Balance]
        .filter((v): v is number => typeof v === 'number')
        .reduce((sum, v) => sum + v, 0);

      if (amount === 0) {
        const [fallbackToken, fallback2022] = await Promise.all([
          getBalanceFromOwnerAccounts(TOKEN_PROGRAM_ID),
          getBalanceFromOwnerAccounts(TOKEN_2022_PROGRAM_ID),
        ]);
        amount = [fallbackToken, fallback2022]
          .filter((v): v is number => typeof v === 'number')
          .reduce((sum, v) => sum + v, 0);
      }

      balanceCache.set(walletAddress, { amount, fetchedAt: Date.now() });
      rateLimitCooldowns.delete(walletAddress);
      return amount;
    } catch (error) {
      if (cached && isRateLimitedError(error)) {
        rateLimitCooldowns.set(walletAddress, Date.now() + RATE_LIMIT_COOLDOWN_MS);
        return cached.amount;
      }
      throw error;
    } finally {
      balanceRequests.delete(walletAddress);
    }
  })();

  balanceRequests.set(walletAddress, request);
  return request;
}

export function useBalance() {
  const { mode } = useAppState();
  const { walletPublicKey: walletAddress } = useAuth();
  const normalizedWalletAddress = typeof walletAddress === 'string' ? walletAddress.trim() : '';
  const resolvedWalletAddress = normalizedWalletAddress && isValidPublicKey(normalizedWalletAddress)
    ? normalizedWalletAddress
    : null;

  const [balance, setBalance] = useState(() => {
    if (mode !== 'live') return demoBalance;
    return getCachedBalance(resolvedWalletAddress)?.amount ?? 0;
  });
  const [loading, setLoading] = useState(() => mode === 'live' && !!resolvedWalletAddress && !getCachedBalance(resolvedWalletAddress));
  const mountedRef = useRef(true);
  const activeWalletAddressRef = useRef<string | null>(resolvedWalletAddress);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    activeWalletAddressRef.current = resolvedWalletAddress;
    requestVersionRef.current += 1;
  }, [resolvedWalletAddress, mode]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchLiveBalance = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      if (mode !== 'live' || !resolvedWalletAddress) return;

      const requestVersion = ++requestVersionRef.current;
      const hasFreshCache = !!getFreshCachedBalance(resolvedWalletAddress);
      if (!options?.background && !hasFreshCache) {
        setLoading(true);
      }

      try {
        const amount = await fetchUsdcBalance(resolvedWalletAddress, { force: options?.force });
        if (
          mountedRef.current &&
          activeWalletAddressRef.current === resolvedWalletAddress &&
          requestVersion === requestVersionRef.current
        ) {
          setBalance((current) => (current === amount ? current : amount));
        }
      } catch (err) {
        if (isRateLimitedError(err)) {
          console.warn('Solana RPC rate limited while fetching balance. Using cached balance when available.');
        } else {
          console.error('Failed to fetch Solana balance:', err);
        }
      } finally {
        if (
          mountedRef.current &&
          activeWalletAddressRef.current === resolvedWalletAddress &&
          requestVersion === requestVersionRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [mode, resolvedWalletAddress]
  );

  useEffect(() => {
    if (mode !== 'live') {
      setBalance(demoBalance);
      setLoading(false);
      return;
    }

    const cached = getCachedBalance(resolvedWalletAddress);
    setBalance(cached?.amount ?? 0);
    setLoading(!!resolvedWalletAddress && !cached);
  }, [mode, resolvedWalletAddress]);

  useEffect(() => {
    if (mode !== 'live' || !resolvedWalletAddress) return;

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void fetchLiveBalance({ background: true });
    };

    void fetchLiveBalance();
    const interval = window.setInterval(refreshIfVisible, BALANCE_POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [mode, resolvedWalletAddress, fetchLiveBalance]);

  useEffect(() => {
    if (mode !== 'demo') return;
    setBalance(demoBalance);
    const unsub = onBalanceChange((b) => setBalance(b));
    return unsub;
  }, [mode]);

  return {
    balance,
    loading,
    refresh: () => fetchLiveBalance({ force: true }),
  };
}

export function useHistory() {
  const { mode } = useAppState();
  const { user, walletPublicKey: walletAddress } = useAuth();
  const normalizedWalletAddress = typeof walletAddress === 'string' ? walletAddress.trim() : '';
  const resolvedWalletAddress = normalizedWalletAddress && isValidPublicKey(normalizedWalletAddress)
    ? normalizedWalletAddress
    : null;

  const [refreshKey, setRefreshKey] = useState(0);
  const liveTxsRaw = useAsyncQuery(
    mode === 'live' && user
      ? () => db.getHistory({ externalUserId: user.userId })
      : null,
    [mode, user?.userId, resolvedWalletAddress, refreshKey]
  );

  const [demoHistory, setDemoHistory] = useState<Transaction[]>(demoTransactions);
  const [chainHistory, setChainHistory] = useState<Transaction[]>([]);
  const [chainLoading, setChainLoading] = useState(false);

  const fetchChainHistory = useCallback(
    async (options?: { force?: boolean }) => {
      if (mode !== 'live' || !resolvedWalletAddress) return [];
      setChainLoading(true);
      try {
        const items = await fetchOnchainHistory(resolvedWalletAddress, options);
        setChainHistory(items);
        return items;
      } catch (err) {
        if (!isRateLimitedError(err)) {
          console.warn('Failed to fetch on-chain history:', err);
        }
        return getCachedHistory(resolvedWalletAddress)?.items ?? [];
      } finally {
        setChainLoading(false);
      }
    },
    [mode, resolvedWalletAddress]
  );

  useEffect(() => {
    if (mode !== 'live' || !resolvedWalletAddress) {
      setChainHistory([]);
      setChainLoading(false);
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void fetchChainHistory();
    };

    void fetchChainHistory();
    const interval = window.setInterval(refreshIfVisible, HISTORY_POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [mode, resolvedWalletAddress, fetchChainHistory]);
  useEffect(() => {
    if (mode !== 'demo') return;
    setDemoHistory(demoTransactions);
    const unsub = onTransactionsChange((txs) => setDemoHistory(txs));
    return unsub;
  }, [mode]);

  if (mode === 'demo') {
    return {
      transactions: demoHistory,
      loading: false,
      refresh: async () => {
        setDemoHistory([...demoTransactions]);
      },
    };
  }

  const userIdCandidates = new Set<string>();
  if (user?.userId) userIdCandidates.add(String(user.userId));
  const currentWalletAddress = resolvedWalletAddress || null;
  const liveTxs: Transaction[] = (liveTxsRaw ?? []).map((tx) => {
    const resolvedRecipientId = tx.receiverId || null;
    const normalizedRecipientId = resolvedRecipientId ? String(resolvedRecipientId).trim() : null;
    const senderId = tx.senderId ? String(tx.senderId).trim() : null;
    const receiverAddress = String(tx.receiverAddress || '').trim();
    const isBonus = tx.type === 'bonus';
    const idReceiveMatch = normalizedRecipientId ? userIdCandidates.has(normalizedRecipientId) : false;
    const idSendMatch = senderId ? userIdCandidates.has(senderId) : false;
    const walletReceiveMatch = !!currentWalletAddress && receiverAddress === currentWalletAddress;
    const isReceive =
      isBonus ||
      tx.type === 'receive' ||
      idReceiveMatch ||
      (!idSendMatch && walletReceiveMatch) ||
      false;
    const normalizedCategory = ('transfer') as
      | 'transfer'
      | 'payment'
      | 'bonus'
      | 'refund'
      | 'gift';
    const memo = '';
    const memoLooksLikeUsername = false;
    return {
      id: tx._id,
      type: isReceive ? 'receive' : 'send',
      from_address: tx.senderAddress,
      to_address: tx.receiverAddress,
      from_user_id: tx.senderId || null,
      to_user_id: resolvedRecipientId || null,
      from_name: tx.senderUsername || 'Unknown',
      to_name: tx.receiverUsername || 'Unknown',
      from_username: tx.senderUsername || null,
      to_username: tx.receiverUsername || (memoLooksLikeUsername ? memo : null),
      from_avatar_base64: tx.from_avatar_base64 || null,
      to_avatar_base64: tx.to_avatar_base64 || null,
      amount_usdc: tx.amount,
      amount_display: tx.displayAmount ?? tx.amount,
      currency: tx.currency,
      fee: 0,
      status: tx.status === 'success' ? 'confirmed' : (tx.status as any),
      tx_hash: tx.signature,
      category: normalizedCategory,
      gift_anonymous: false,
      gift_acknowledged: false,
      created_at: tx.created_at ? new Date(tx.created_at).toISOString() : new Date().toISOString(),
      narration: undefined,
    };
  });

  const pbSignatureSet = useMemo(() => {
    const set = new Set<string>();
    for (const tx of (liveTxs || [])) {
      const sig = tx.tx_hash || tx.id;
      if (sig) set.add(sig);
    }
    return set;
  }, [liveTxs]);

  useEffect(() => {
    if (mode !== 'live' || !user?.userId || chainHistory.length === 0) return;
    const storageKey = `payme_chain_notifs_${user.userId}`;
    let seen = new Set<string>();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          seen = new Set(parsed.filter((v) => typeof v === 'string'));
        }
      }
    } catch {
      // ignore parse errors
    }

    const candidates = chainHistory.filter((tx) => {
      const sig = tx.tx_hash || tx.id;
      if (!sig) return false;
      if (pbSignatureSet.has(sig)) return false;
      return !seen.has(sig);
    });

    if (candidates.length === 0) return;

    const run = async () => {
      const nextSeen = new Set(seen);
      for (const tx of candidates) {
        const sig = tx.tx_hash || tx.id;
        if (!sig) continue;
        const amount = Number(tx.amount_usdc || 0);
        const formatted = Number.isFinite(amount) ? amount.toLocaleString() : '0';
        if (tx.type === 'receive') {
          await db.createNotification({
            userId: user.userId,
            type: 'payment_received',
            title: 'Payment Received',
            content: `You received ${formatted} USDC.`,
            data: { signature: sig, source: 'onchain' },
          });
        } else {
          await db.createNotification({
            userId: user.userId,
            type: 'system',
            title: 'Payment Sent',
            content: `You sent ${formatted} USDC.`,
            data: { signature: sig, source: 'onchain' },
          });
        }
        nextSeen.add(sig);
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(nextSeen).slice(-200)));
      } catch {
        // ignore
      }
    };

    void run();
  }, [mode, user?.userId, chainHistory, pbSignatureSet]);

  return {
    transactions: (() => {
      const merged = new Map<string, Transaction>();
      for (const tx of liveTxs) {
        const key = tx.tx_hash || tx.id;
        merged.set(key, tx);
      }
      for (const tx of chainHistory) {
        const key = tx.tx_hash || tx.id;
        if (!merged.has(key)) {
          merged.set(key, tx);
        }
      }
      return Array.from(merged.values()).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    })(),
    loading: liveTxsRaw === undefined || chainLoading,
    refresh: async () => {
      setRefreshKey((prev) => prev + 1);
      await fetchChainHistory({ force: true });
    },
  };
}
