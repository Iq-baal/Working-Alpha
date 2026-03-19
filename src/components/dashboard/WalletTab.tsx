import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Send, Download, ChevronRight, Gift, RefreshCw, HandCoins, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import { useLiveProfileRefreshKey } from '../../hooks/useLiveProfileRefresh';
import { CURRENCIES, formatDate, formatBalance, getInitials, getAvatarColor, truncateAddress } from '../../lib/utils';
import { getGlobalCurrency, setGlobalCurrency, onCurrencyChange, demoProfile, getRichMode, onRichModeChange, bumpLiveProfileRefresh } from '../../lib/appState';
import { useBalance, useHistory } from '../../hooks/useDataHooks';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import type { Currency, Transaction } from '../../types';
import { transactionFromLabel, transactionToLabel } from '../../lib/transactionDisplay';
import SendModal from '../send/SendModal';
import ReceiveModal from '../receive/ReceiveModal';
import RequestMoneyModal from '../request/RequestMoneyModal';
import IncomingRequestsModal from '../request/IncomingRequestsModal';
import GiftAirdropModal from '../gift/GiftAirdropModal';
import TransactionDetailModal from '../history/TransactionDetailModal';
import { TransactionSkeleton, BalanceSkeleton } from '../common/LoadingSkeleton';

interface WalletTabProps {
  onSeeAll?: () => void;
}

const formatCompactCurrency = (amount: number, currencySymbol: string) => {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${currencySymbol}${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`;
  }
  return `${currencySymbol}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
};

export default function WalletTab({ onSeeAll }: WalletTabProps) {
  const { user, walletPublicKey: walletAddress } = useAuth();
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(getGlobalCurrency());
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [balanceChange, setBalanceChange] = useState<'increase' | 'decrease' | null>(null);
  const prevBalanceRef = useRef<number>(0);
  const [showSend, setShowSend] = useState(false);
  const [sendPrefillUsername, setSendPrefillUsername] = useState<string | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showIncomingRequests, setShowIncomingRequests] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [showGift, setShowGift] = useState(false);
  const [showRichTease, setShowRichTease] = useState<null | 'donate' | 'charity'>(null);
  const [richMode, setRichModeState] = useState(getRichMode());
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useBalance();
  const { transactions: transactionsRaw, loading: historyLoading, refresh: refreshHistory } = useHistory();
  const transactions = transactionsRaw ?? [];
  const profileRefreshKey = useLiveProfileRefreshKey();
  const profile = useAsyncQuery(
    user ? () => db.getProfile({ userId: user?.userId }) : null,
    [user?.userId, walletAddress, profileRefreshKey]
  );
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [checkingTreasury, setCheckingTreasury] = useState(false);
  const [treasuryIssues, setTreasuryIssues] = useState<string[] | null>(null);
  const handledPayLinkRef = useRef(false);
  const fxRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const profileLoaded = profile !== undefined;
  const bonusClaimedDb = profile?.bonusClaimed;
  const recipientUsername = (profile?.username || demoProfile.username || '').trim();

  // Sync from global state (currency only)
  useEffect(() => {
    const unsubCur = onCurrencyChange(c => setSelectedCurrency(c));
    const unsubRich = onRichModeChange((v) => setRichModeState(v));
    return () => { unsubCur(); unsubRich(); };
  }, []);

  // FX rate refresh every 15 minutes
  useEffect(() => {
    const refreshFxRates = async () => {
      try {
        const result = await db.getFxRates();
        if (!result?.rates) return;
        
        // Update CURRENCIES array with live rates (USD is base)
        const usdRate = result.rates.USD || 1;
        CURRENCIES.forEach(currency => {
          if (currency.code === 'USD') {
            currency.rate = 1;
          } else {
            // Convert from USD base to target currency
            const rate = result.rates[currency.code];
            if (rate) {
              currency.rate = rate / usdRate;
            }
          }
        });
      } catch (err) {
        console.error('Failed to refresh FX rates:', err);
      }
    };

    // Initial refresh
    refreshFxRates();

    // Set up 15-minute interval
    fxRefreshIntervalRef.current = setInterval(refreshFxRates, 15 * 60 * 1000);

    return () => {
      if (fxRefreshIntervalRef.current) {
        clearInterval(fxRefreshIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!richMode) return;
    if (!showRichTease) return;
    setShowSend(false);
    setShowReceive(false);
    setShowRequest(false);
  }, [richMode, showRichTease]);

  useEffect(() => {
    if (profile?.bonusClaimed) {
      setBonusClaimed(true);
    }
  }, [profile?.bonusClaimed]);

  // Detect balance changes for color animation
  useEffect(() => {
    if (balance === 0 && prevBalanceRef.current === 0) return;
    
    if (balance > prevBalanceRef.current && prevBalanceRef.current !== 0) {
      setBalanceChange('increase');
      const timer = setTimeout(() => setBalanceChange(null), 1500);
      return () => clearTimeout(timer);
    } else if (balance < prevBalanceRef.current && prevBalanceRef.current !== 0) {
      setBalanceChange('decrease');
      const timer = setTimeout(() => setBalanceChange(null), 1500);
      return () => clearTimeout(timer);
    }
    
    prevBalanceRef.current = balance;
  }, [balance]);

  const handleCurrencySelect = (c: Currency) => {
    setGlobalCurrency(c);
    setSelectedCurrency(c);
    setShowCurrencyPicker(false);
  };

  const balanceInCurrency = balance * selectedCurrency.rate;
  const displayBalance = balanceHidden
    ? '••••••'
    : formatBalance(balanceInCurrency, selectedCurrency.symbol);

  const pull = usePullToRefresh(async () => {
    await Promise.all([refreshBalance(), refreshHistory()]);
    db.listMoneyRequests().then(setIncomingRequests).catch(() => undefined);
  });

  useEffect(() => {
    if (handledPayLinkRef.current) return;
    handledPayLinkRef.current = true;
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const fromQuery = (url.searchParams.get('pay') || url.searchParams.get('username') || '').trim();
    const pathMatch = url.pathname.match(/\/pay\/([^/]+)/i);
    const fromPath = pathMatch ? decodeURIComponent(pathMatch[1]) : '';
    const prefill = (fromQuery || fromPath).replace(/^@+/, '').toLowerCase();
    if (!prefill) return;

    setSendPrefillUsername(prefill);
    setShowSend(true);

    if (fromQuery || fromPath) {
      url.searchParams.delete('pay');
      url.searchParams.delete('username');
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', fromPath ? '/' : next);
    }
  }, []);

  // Fetch incoming money requests on mount and after pull-to-refresh
  useEffect(() => {
    if (!user?.userId) return;
    db.listMoneyRequests().then(setIncomingRequests).catch(() => undefined);
  }, [user?.userId]);

  return (
    <div ref={pull.rootRef} {...pull.bind} style={{ padding: 'var(--page-padding) var(--page-padding) 0', position: 'relative' }}>
      <div
        style={{
          height: pull.pullDistance,
          opacity: pull.pullDistance > 0 || pull.refreshing ? 1 : 0,
          transition: pull.refreshing ? 'none' : 'height 0.2s ease, opacity 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 999, padding: '6px 12px', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600 }}>
          <RefreshCw size={13} className={pull.refreshing ? 'spin' : undefined} />
          <span>{pull.refreshing ? 'Refreshing...' : pull.ready ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      </div>
      {/* Balance Card Container with stable height to prevent twitching */}
      <div style={{ position: 'relative', marginBottom: 16, minHeight: 218 }}>
        <AnimatePresence initial={false}>
          {balanceLoading && balance === 0 ? (
            <motion.div
              key="balance-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'var(--color-surface-2)', borderRadius: 'var(--card-radius)', border: '1px solid var(--color-border)' }}
            >
              <BalanceSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="balance-card"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                backgroundColor: balanceChange === 'increase' 
                  ? 'rgba(34, 197, 94, 0.08)' 
                  : balanceChange === 'decrease'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'var(--color-surface)'
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ background: 'var(--color-surface)', borderRadius: 'var(--card-radius)', border: `1px solid ${balanceChange === 'increase' ? 'rgba(34, 197, 94, 0.3)' : balanceChange === 'decrease' ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-divider)'}`, padding: 'var(--card-padding)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <button
                  onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-border)', border: '1px solid var(--color-border-strong)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer', color: 'var(--color-text)', fontSize: 13, fontWeight: 600 }}
                >
                  <span>{selectedCurrency.flag}</span>
                  <span>{selectedCurrency.code}</span>
                  <span style={{ color: 'var(--color-text-3)', fontSize: 11 }}>▾</span>
                </button>
                <button
                  onClick={() => setBalanceHidden(h => !h)}
                  style={{ background: 'var(--color-border)', border: '1px solid var(--color-border-strong)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', color: 'var(--color-text-2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  {balanceHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  {balanceHidden ? 'Show' : 'Hide'}
                </button>
              </div>

              <div style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500, marginBottom: 4, letterSpacing: '0.5px' }}>AVAILABLE BALANCE</p>
                <motion.div 
                  key={displayBalance} 
                  initial={{ opacity: 0.7, y: 2 }} 
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    textShadow: balanceChange === 'increase' 
                      ? '0 0 20px rgba(34, 197, 94, 0.4)' 
                      : balanceChange === 'decrease'
                      ? '0 0 20px rgba(239, 68, 68, 0.4)'
                      : 'none'
                  }} 
                  transition={{ duration: 0.3 }}
                  className="text-balance-amount" 
                  style={{ lineHeight: 1.1 }}
                >
                  {displayBalance}
                </motion.div>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>
                  {balanceHidden ? '•••••• USDC on Solana Devnet' : `${balance.toFixed(2)} USDC on Solana Devnet`}
                </p>
              </div>

              {walletAddress && (
                <div style={{ marginTop: 16, background: 'var(--color-border)', borderRadius: 10, padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{truncateAddress(walletAddress, 8)}</span>
                  <button onClick={() => navigator.clipboard.writeText(walletAddress)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97316', fontSize: 10, fontWeight: 600, fontFamily: 'inherit' }}>COPY</button>
                </div>
              )}

              <AnimatePresence>
                {showCurrencyPicker && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginTop: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                      {CURRENCIES.map(c => (
                        <button key={c.code} onClick={() => handleCurrencySelect(c)}
                          style={{ background: c.code === selectedCurrency.code ? 'rgba(249,115,22,0.2)' : 'var(--color-border)', border: `1px solid ${c.code === selectedCurrency.code ? '#F97316' : 'var(--color-border)'}`, borderRadius: 10, padding: '8px 6px', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600 }}>
                          <span style={{ fontSize: 18 }}>{c.flag}</span>
                          <span>{c.code}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 30 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
        <button className="btn-primary" onClick={() => richMode ? setShowGift(true) : setShowSend(true)} style={{ height: 54, borderRadius: 16, fontSize: 'clamp(11.5px, 3.4vw, 14px)', padding: '0 4px', gap: '4px' }}>
          {richMode ? <Gift size={15} /> : <Send size={15} />} <span style={{ whiteSpace: 'nowrap' }}>{richMode ? 'Gift' : 'Send'}</span>
        </button>
        <button className="btn-secondary" onClick={() => richMode ? setShowRichTease('donate') : setShowReceive(true)} style={{ height: 54, borderRadius: 16, fontSize: 'clamp(11.5px, 3.4vw, 14px)', padding: '0 4px', gap: '4px' }}>
          {richMode ? <HeartHandshake size={15} /> : <Download size={15} />} <span style={{ whiteSpace: 'nowrap' }}>{richMode ? 'Donate' : 'Receive'}</span>
        </button>
        <button className="btn-secondary" onClick={() => richMode ? setShowRichTease('charity') : setShowRequest(true)} style={{ height: 54, borderRadius: 16, fontSize: 'clamp(11.5px, 3.4vw, 14px)', padding: '0 4px', gap: '4px' }}>
          <HandCoins size={15} /> <span style={{ whiteSpace: 'nowrap' }}>{richMode ? 'Charity' : 'Request'}</span>
        </button>
      </motion.div>

      {/* Incoming Money Requests Banner */}
      {incomingRequests.length > 0 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.07, type: 'spring', stiffness: 400, damping: 30 }} style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowIncomingRequests(true)}
            style={{ width: '100%', background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(124,58,23,0.1) 100%)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 18, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              <HandCoins size={20} color="#F97316" />
              <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: '#F97316', border: '2px solid var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', padding: '0 4px' }}>
                {incomingRequests.length}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: 'var(--color-text)' }}>
                {incomingRequests.length === 1 ? '1 money request' : `${incomingRequests.length} money requests`}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                {incomingRequests[0] ? `@${incomingRequests[0].requesterUsername} and others are requesting payment` : 'Tap to view and respond'}
              </p>
            </div>
            <ChevronRight size={16} color="#F97316" />
          </button>
        </motion.div>
      )}

      {/* Claim Bonus */}
      {(profileLoaded && bonusClaimedDb === false && !bonusClaimed) && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 30 }} style={{ marginBottom: 24 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(124,58,23,0.1) 100%)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Gift size={22} color="#F97316" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Welcome Bonus</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Claim 10,000 free test USDC to try the app</p>
            </div>
            <button 
              className="btn-primary" 
              disabled={claimingBonus}
              onClick={async () => {
                if (!user || !walletAddress) return;
                setClaimingBonus(true);
                setBonusError(null);
                try {
                  await db.claimWelcomeBonus({ 
                    userWalletAddress: walletAddress,
                  });
                  setBonusClaimed(true);
                  setTreasuryIssues(null);
                  bumpLiveProfileRefresh();
                  await Promise.all([refreshBalance(), refreshHistory()]);
                } catch (e: any) {
                  const rawMessage = e?.message || '';
                  if (rawMessage.includes('Server Error')) {
                    setBonusError('Bonus is temporarily unavailable: treasury signer is not configured on backend.');
                  } else {
                    setBonusError(rawMessage || 'Claim failed. Make sure treasury is funded.');
                  }
                  console.error(e);
                } finally {
                  setClaimingBonus(false);
                }
              }} 
              style={{ padding: '10px 18px', fontSize: 13, borderRadius: 12, flexShrink: 0 }}
            >
              {claimingBonus ? '⏳' : 'Claim'}
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-ghost"
              disabled={checkingTreasury}
              onClick={async () => {
                setCheckingTreasury(true);
                try {
                  const status = await db.treasuryHealthCheck();
                  setTreasuryIssues(status.issues?.length ? status.issues : []);
                } catch (err: any) {
                  setTreasuryIssues([err?.message || 'Treasury check failed.']);
                } finally {
                  setCheckingTreasury(false);
                }
              }}
              style={{ padding: '8px 12px', fontSize: 12, borderRadius: 10 }}
            >
              {checkingTreasury ? 'Checking...' : 'Treasury Check'}
            </button>
          </div>
          {bonusError && (
            <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8, padding: '0 4px' }}>
              ⚠️ {bonusError.includes('treasury') ? 'Treasury setup error: Make sure the Solana worker is configured and funded on devnet.' : bonusError}
            </p>
          )}
          {treasuryIssues && (
            <div style={{ marginTop: 8, padding: '0 4px' }}>
              {treasuryIssues.length === 0 ? (
                <p style={{ fontSize: 12, color: '#22C55E' }}>Treasury check passed.</p>
              ) : (
                <p style={{ fontSize: 12, color: '#EF4444' }}>
                  ⚠️ {treasuryIssues.join(' ')}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Recent Transactions */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p className="section-header" style={{ margin: 0 }}>Recent</p>
          <button onClick={onSeeAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97316', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
            See All <ChevronRight size={14} />
          </button>
        </div>
        
        <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {historyLoading && transactions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <TransactionSkeleton />
              <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />
              <TransactionSkeleton />
              <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />
              <TransactionSkeleton />
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🪹</p>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>No transactions yet</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Once you send or receive USDC, your history will appear here.</p>
            </div>
          ) : (
            <AnimatePresence>
              {transactions.slice(0, 3).map((tx, i) => {
                const name = tx.type === 'receive' ? transactionFromLabel(tx) : transactionToLabel(tx);
                const initials = getInitials(name);
                const color = getAvatarColor(name);
                const isReceive = tx.type === 'receive';
                const avatarBase64 = tx.category === 'bonus' ? null : (isReceive ? tx.from_avatar_base64 : tx.to_avatar_base64);
                const amountInCurrency = tx.amount_usdc * selectedCurrency.rate;
                const displayAmt = formatCompactCurrency(amountInCurrency, selectedCurrency.symbol);

                return (
                  <div key={tx.id}>
                    <motion.div 
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: i * 0.03,
                        type: 'spring',
                        stiffness: 450,
                        damping: 30
                      }}
                      whileHover={{ scale: 1.01, backgroundColor: 'var(--color-border)' }}
                      whileTap={{ scale: 0.99 }}
                      className="row-item" 
                      style={{ padding: '14px 18px', cursor: 'pointer', transition: 'background-color 0.2s' }} 
                      onClick={() => setSelectedTx(tx)}
                    >
                      <div className="avatar" style={{ width: 44, height: 44, background: tx.category === 'bonus' ? 'rgba(249,115,22,0.2)' : color, color: tx.category === 'bonus' ? '#F97316' : 'var(--color-text)' }}>
                        {tx.category === 'bonus' ? <Gift size={18} /> : avatarBase64 ? <img src={avatarBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} /> : <span>{initials}</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{name}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{formatDate(tx.created_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, fontSize: 'clamp(13px, 3.4vw, 15px)', color: isReceive ? '#22C55E' : 'var(--color-text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {isReceive ? '+' : '-'}{displayAmt}
                        </p>
                        <span className={`badge ${tx.status === 'confirmed' ? 'badge-success' : 'badge-pending'}`} style={{ fontSize: 9.5, padding: '2px 7px' }}>
                          {tx.status}
                        </span>
                      </div>
                    </motion.div>
                    {i < transactions.length - 1 && (i < 2) && <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />}
                  </div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showSend && !richMode && <SendModal initialRecipientUsername={sendPrefillUsername || undefined} onClose={() => { setShowSend(false); setSendPrefillUsername(null); }} />}
        {showReceive && <ReceiveModal walletAddress={walletAddress || ''} recipientUsername={recipientUsername} onClose={() => setShowReceive(false)} />}
        {showRequest && !richMode && <RequestMoneyModal onClose={() => setShowRequest(false)} />}
        {showIncomingRequests && (
          <IncomingRequestsModal
            requests={incomingRequests}
            onClose={() => setShowIncomingRequests(false)}
            onResolved={(id) => {
              setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
              if (incomingRequests.length <= 1) setShowIncomingRequests(false);
            }}
          />
        )}
        {showGift && <GiftAirdropModal onClose={() => setShowGift(false)} />}
        {showRichTease && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowRichTease(null)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 620, damping: 40 }}
              className="modal-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-handle" />
              <div
                style={{
                  borderRadius: 22,
                  border: '1px solid rgba(120,120,128,0.24)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(120,120,128,0.08))',
                  padding: '18px 16px',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontWeight: 900, fontSize: 16, marginBottom: 10, letterSpacing: '0.4px' }}>
                  {showRichTease === 'donate' ? 'DONATE' : 'CHARITY'}
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.65 }}>
                  {showRichTease === 'donate'
                    ? `Dev is unwell, Will finish this up as soon as my hands touches keyboard... Any Keyboard, Hehe`
                    : `Worry Not!, This feature will transform how you give charity, As soon as I'm out, I'll speedrun this, Hehe`}
                </p>
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 14, height: 50, borderRadius: 16 }}
                onClick={() => {
                  setShowRichTease(null);
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
        {selectedTx && <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />}
      </AnimatePresence>
    </div>
  );
}
