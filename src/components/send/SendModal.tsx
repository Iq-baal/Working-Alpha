import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Landmark, User, Wallet, ArrowRight, Check, Utensils, Car, Home, GraduationCap, Users, ShoppingCart, HeartPulse, ArrowRightLeft, Plus } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import { PublicKey, Transaction, Keypair, Connection } from '@solana/web3.js';
import { getInitials, getAvatarColor, formatBalance } from '../../lib/utils';
import { getGlobalCurrency } from '../../lib/appState';
import { useBalance, useHistory } from '../../hooks/useDataHooks';
import { PLATFORM_FEE_RATE } from '../../lib/solana_utils';
import VerificationBadge from '../common/VerificationBadge';
import AppleBackButton from '../common/AppleBackButton';
import { useAppState } from '../../App';
import { generateReceiptPNG } from '../../lib/receiptGenerator';

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

type SendStep = 'method' | 'recipient' | 'amount' | 'review' | 'sending' | 'success';
type SendMethod = 'username' | 'address' | 'contact' | 'bank';

interface SendModalProps {
  onClose: () => void;
  initialRecipientUsername?: string;
  initialAmount?: number;
}

// Demo-only users (only visible in Demo mode)
const DEMO_USERS = [
  { userId: 'demo1', username: 'kwame_o',   name: 'Kwame Osei',    occupation: 'Software Engineer', verificationLevel: 1, walletAddress: null, avatarBase64: null, discoverable: true },
  { userId: 'demo2', username: 'amara_d',   name: 'Amara Diallo',  occupation: 'Designer',          verificationLevel: 1, walletAddress: null, avatarBase64: null, discoverable: true },
  { userId: 'demo3', username: 'chidi_n',   name: 'Chidi Nweke',   occupation: 'Product Manager',   verificationLevel: 0, walletAddress: null, avatarBase64: null, discoverable: false },
];

const CATEGORIES = [
  { icon: Utensils, label: 'Food', color: '#F97316' },
  { icon: Car, label: 'Transport', color: '#0EA5E9' },
  { icon: Landmark, label: 'Loan', color: '#7C3AED' },
  { icon: Home, label: 'Rent', color: '#22C55E' },
  { icon: GraduationCap, label: 'School Fees', color: '#EAB308' },
  { icon: Users, label: 'Upkeep', color: '#EC4899' },
  { icon: ShoppingCart, label: 'Groceries', color: '#14B8A6' },
  { icon: HeartPulse, label: 'Health', color: '#EF4444' },
  { icon: ArrowRightLeft, label: 'Disbursement', color: '#8B5CF6' },
  { icon: Plus, label: 'Other', color: '#64748B' },
];

export default function SendModal({ onClose, initialRecipientUsername, initialAmount }: SendModalProps) {
  const currency = getGlobalCurrency();
  const { balance } = useBalance();

  const { user, walletPublicKey: walletAddress, decryptWallet } = useAuth();
  const { mode } = useAppState();
  const [step, setStep] = useState<SendStep>('method');
  const [prevStep, setPrevStep] = useState<SendStep>('method');
  const [method, setMethod] = useState<SendMethod>('username');

  const stepOrder: SendStep[] = ['method', 'recipient', 'amount', 'review', 'sending', 'success'];
  const direction = stepOrder.indexOf(step) > stepOrder.indexOf(prevStep) ? 1 : -1;

  const handleStepChange = (next: SendStep) => {
    setPrevStep(step);
    setStep(next);
  };

  // Username search — strict exact match
  const [searchQuery, setSearchQuery] = useState('');
  const [committedSearchQuery, setCommittedSearchQuery] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResultsLive, setSearchResultsLive] = useState<any[] | undefined>(undefined);
  const [newContactHandle, setNewContactHandle] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactsRefreshKey, setContactsRefreshKey] = useState(0);
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [demoContacts, setDemoContacts] = useState<Array<{ contactType: 'user' | 'address'; userId: string | null; username: string | null; name: string; walletAddress: string | null; avatarBase64: string | null; verificationLevel: number }>>([]);
  
  // Live search (Convex)
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const normalizedCommittedQuery = committedSearchQuery.trim().toLowerCase();
  const hasCommittedSearch = normalizedCommittedQuery.length >= 2;
  const isInputSynced = normalizedSearchQuery === normalizedCommittedQuery;

  const liveSearchResultsRaw = useAsyncQuery(
    mode === 'live' && hasCommittedSearch
      ? () => db.searchUsers({
          query: normalizedCommittedQuery,
          externalUserId: user?.userId,
        })
      : null,
    [mode, normalizedCommittedQuery, user?.userId, walletAddress]
  );
  const liveContacts = useAsyncQuery(
    mode === 'live' && user ? () => db.listContacts({ externalUserId: user.userId }) : null,
    [mode, user?.userId, contactsRefreshKey]
  ) as any[] | undefined;

  const [recipient, setRecipient] = useState<any>(null);
  const [walletInput, setWalletInput] = useState('');
  const [amount, setAmount] = useState(() =>
    initialAmount && initialAmount > 0
      ? String((initialAmount * (getGlobalCurrency().rate || 1)).toFixed(2))
      : ''
  );
  const [narration, setNarration] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [, setSending] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const { transactions: transactionsRaw } = useHistory();
  const transactions = transactionsRaw ?? [];

  const balanceInCurrency = balance * currency.rate;
  const amountNum = parseFloat(amount || '0');
  const usdcAmount = selectedCategory
    ? amountNum / currency.rate
    : amountNum / currency.rate;
  const estimatedServiceFeeUsdc = usdcAmount * PLATFORM_FEE_RATE;

  useEffect(() => {
    if (!hasCommittedSearch) {
      setSearchResultsLive(undefined);
      setSearching(false);
      return;
    }
    if (mode !== 'live') {
      setSearching(false);
      return;
    }
    setSearchResultsLive(undefined);
    setSearching(true);
  }, [hasCommittedSearch, normalizedCommittedQuery, mode]);

  useEffect(() => {
    if (!hasCommittedSearch || mode !== 'live') return;
    if (liveSearchResultsRaw === undefined) return;
    setSearchResultsLive(liveSearchResultsRaw);
    setSearching(false);
  }, [liveSearchResultsRaw, hasCommittedSearch, mode]);

  // Unified search: only runs after explicit submit.
  const searchResults: any[] = mode === 'demo'
    ? DEMO_USERS.filter(u => u.username.toLowerCase().includes(normalizedCommittedQuery) && u.discoverable)
    : (searchResultsLive || []);
  const uniqueSearchResults = useMemo(() => {
    const seen = new Set<string>();
    const output: any[] = [];
    for (const u of (searchResults || [])) {
      const key = `${u?.userId || ''}|${(u?.username || '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(u);
    }
    return output;
  }, [searchResults]);
  const contacts: any[] = mode === 'demo' ? demoContacts : (liveContacts || []);

  const recipientName = recipient?.name || recipient?.username || '';
  const searchResolved = searchAttempted && !searching && hasCommittedSearch && isInputSynced;
  const searchHasMatch = searchResolved && uniqueSearchResults.length > 0;
  const searchNoMatch = searchResolved && uniqueSearchResults.length === 0;

  const recentRecipients = useMemo(() => {
    const sentTxs = (transactions || [])
      .filter((tx) => tx.type === 'send' && tx.to_address)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const seen = new Set<string>();
    const list: Array<{ name: string; address: string; avatarBase64: string | null; username?: string | null; userId?: string | null }> = [];
    for (const tx of sentTxs) {
      if (!tx.to_address || seen.has(tx.to_address)) continue;
      seen.add(tx.to_address);
      const hasUserLabel = !!(tx.to_username || (tx.to_name && tx.to_name !== 'External Wallet'));
      const isExternalRecipient = !hasUserLabel;
      list.push({
        name: isExternalRecipient
          ? 'External Wallet'
          : (tx.to_name || tx.to_username || `@${tx.to_address.slice(0, 8)}`),
        address: tx.to_address,
        avatarBase64: tx.to_avatar_base64 || null,
        username: tx.to_username || null,
        userId: tx.to_user_id || null,
      });
      if (list.length >= 6) break;
    }
    return list;
  }, [transactions]);

  const runUserSearch = () => {
    if (normalizedSearchQuery.length < 2) {
      setSearchAttempted(false);
      setCommittedSearchQuery('');
      setSearching(false);
      setSearchResultsLive(undefined);
      return;
    }
    setCommittedSearchQuery(normalizedSearchQuery);
    setSearchAttempted(true);
    if (mode === 'demo') setSearching(false);
  };

  const handleAddContact = async () => {
    const handle = newContactHandle.trim();
    if (!handle) return;
    setContactError(null);
    setContactSuccess(null);

    if (contacts.length >= 15) {
      setContactError('Contact limit reached (15 max).');
      return;
    }

    if (mode === 'demo') {
      const normalized = handle.toLowerCase().replace(/^@+/, '');
      const userMatch = DEMO_USERS.find((u) => u.username.toLowerCase() === normalized);
      if (userMatch) {
        if (demoContacts.some((c) => c.userId === userMatch.userId)) {
          setContactError('Contact already saved.');
          return;
        }
        setDemoContacts((prev) => [...prev, {
          contactType: 'user',
          userId: userMatch.userId,
          username: userMatch.username,
          name: userMatch.name,
          walletAddress: userMatch.walletAddress,
          avatarBase64: userMatch.avatarBase64,
          verificationLevel: userMatch.verificationLevel,
        }]);
      } else if (handle.length >= 20) {
        if (demoContacts.some((c) => c.walletAddress === handle)) {
          setContactError('Contact already saved.');
          return;
        }
        setDemoContacts((prev) => [...prev, {
          contactType: 'address',
          userId: null,
          username: null,
          name: 'External Wallet',
          walletAddress: handle,
          avatarBase64: null,
          verificationLevel: 0,
        }]);
      } else {
        setContactError('Enter a valid username or wallet address.');
        return;
      }
      setNewContactHandle('');
      setContactSuccess('Contact saved.');
      return;
    }

    if (!user?.userId) {
      setContactError('Please sign in again.');
      return;
    }
    setAddingContact(true);
    try {
      await db.addContactByHandle({
        handle,
        externalUserId: user?.userId,
      });
      setNewContactHandle('');
      setContactsRefreshKey((prev) => prev + 1);
      setContactSuccess('Contact saved.');
    } catch (err: any) {
      setContactError(err?.message || 'Failed to add contact.');
    } finally {
      setAddingContact(false);
    }
  };

  const handleSaveUserContact = async (target: any) => {
    if (!target?.username) return;
    if (contacts.length >= 15) {
      setContactError('Contact limit reached (15 max).');
      return;
    }
    setContactError(null);
    setContactSuccess(null);
    const contactKey = target.userId || target.username;
    setSavingContactId(contactKey);

    try {
      if (mode === 'demo') {
        if (demoContacts.some((c) => c.userId === target.userId)) {
          setContactError('Contact already saved.');
          return;
        }
        setDemoContacts((prev) => [...prev, {
          contactType: 'user',
          userId: target.userId,
          username: target.username,
          name: target.name || target.username,
          walletAddress: target.walletAddress || null,
          avatarBase64: target.avatarBase64 || null,
          verificationLevel: target.verificationLevel ?? 0,
        }]);
        setContactSuccess('Contact saved.');
        return;
      }

      if (!user?.userId) {
        setContactError('Please sign in again.');
        return;
      }

      await db.addContactByHandle({
        handle: `@${target.username}`,
        externalUserId: user?.userId,
      });
      setContactsRefreshKey((prev) => prev + 1);
      setContactSuccess('Contact saved.');
    } catch (err: any) {
      setContactError(err?.message || 'Failed to save contact.');
    } finally {
      setSavingContactId(null);
    }
  };

  useEffect(() => {
    if (!contactSuccess) return;
    const timer = window.setTimeout(() => setContactSuccess(null), 2400);
    return () => window.clearTimeout(timer);
  }, [contactSuccess]);

  useEffect(() => {
    const initial = (initialRecipientUsername || '').trim().replace(/^@+/, '').toLowerCase();
    if (!initial) return;
    setMethod('username');
    setSearchQuery(initial);
    setCommittedSearchQuery(initial);
    setSearchAttempted(true);
    setPrevStep('method');
    setStep('recipient');
  }, [initialRecipientUsername]);

  const formatAmountInput = (raw: string) => {
    if (!raw) return '';
    const [intPartRaw, decPartRaw] = raw.split('.');
    const intPart = (intPartRaw || '0').replace(/^0+(?=\d)/, '') || '0';
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (decPartRaw === undefined) return withCommas;
    return `${withCommas}.${decPartRaw}`;
  };

  const normalizeAmountInput = (value: string) => {
    const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned;
    const before = cleaned.slice(0, firstDot + 1);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, '');
    return before + after;
  };

  const handleSend = async () => {
    doSend();
  };

  const doSend = async () => {
    setSending(true);
    handleStepChange('sending');
    setTxError(null);

    try {
      if (mode === 'demo') {
        await new Promise(r => setTimeout(r, 2200));
        handleStepChange('success');
      } else {
        // LIVE MODE — SPONSORED TRANSACTION FLOW
        if (!walletAddress || !user) throw new Error("Wallet not connected");
        
        const pendingKey = user?.userId ? `payme_pending_send_${user?.userId}` : 'payme_pending_send';
        const readPending = () => {
          if (typeof window === 'undefined') return null;
          try {
            const raw = localStorage.getItem(pendingKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed?.createdAt) return null;
            if (Date.now() - parsed.createdAt > 2 * 60 * 1000) {
              localStorage.removeItem(pendingKey);
              return null;
            }
            return parsed;
          } catch {
            return null;
          }
        };
        const writePending = (payload: any) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem(pendingKey, JSON.stringify(payload));
        };
        const clearPending = () => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(pendingKey);
        };

        const senderAddress = walletAddress;
        if (!senderAddress) {
          throw new Error('Wallet address is missing');
        }
        
        // Resolve recipient pubkey
        let receiverPubkey: PublicKey;
        if (method === 'username') {
          if (!recipient?.walletAddress) throw new Error("Recipient has no wallet address");
          receiverPubkey = new PublicKey(recipient.walletAddress);
        } else {
          receiverPubkey = new PublicKey(walletInput);
        }

        const receiverAddress = receiverPubkey.toString();
        if (receiverAddress === senderAddress) {
          throw new Error("You can't send money to yourself.");
        }
        const selfId = user?.userId || user?.userId;
        if (method === 'username' && selfId && recipient?.userId && recipient.userId === selfId) {
          throw new Error("You can't send money to yourself.");
        }

        const pending = readPending();
        if (pending?.receiverAddress === receiverAddress && Math.abs((pending?.amount || 0) - usdcAmount) < 1e-9) {
          throw new Error('A transfer to this recipient is already processing. Please wait a moment and check History before retrying.');
        }

        const clientRef =
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
 
        // 1. Sign with user's decrypted wallet (prompt before fetching a blockhash)
        const password = prompt('Enter your password to sign this transaction:');
        if (!password) throw new Error('Transaction signing cancelled.');
        const secretKey = await decryptWallet(password);
        if (!secretKey) throw new Error('Failed to decrypt wallet — wrong password?');
        const keypair = Keypair.fromSecretKey(secretKey);

        const connection = new Connection(import.meta.env.VITE_SOLANA_RPC, 'confirmed');

        const buildAndSign = async (blockhash: string, lastValidBlockHeight: number) => {
          // Backend constructs transaction, adds fee, and partially signs as gas sponsor
          const { serializedTx: partiallySignedTxBase64, feeCharged } = await db.buildSponsoredTransaction({
            senderAddress,
            receiverAddress,
            amount: usdcAmount,
            recentBlockhash: blockhash,
            lastValidBlockHeight,
          });

          // Deserialize the partially signed transaction
          const partiallySignedTx = Transaction.from(base64ToBytes(partiallySignedTxBase64));

          // Sign with user's decrypted wallet
          partiallySignedTx.sign(keypair);

          return { partiallySignedTx, feeCharged };
        };

        const sendWithFreshBlockhash = async () => {
          // Fetch a fresh blockhash right before signing and sending
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
          const { partiallySignedTx, feeCharged } = await buildAndSign(blockhash, lastValidBlockHeight);

          // Broadcast directly from the browser — avoids CF Worker → devnet 403
          const rawTx = partiallySignedTx.serialize();
          const signature = await connection.sendRawTransaction(rawTx, { skipPreflight: false });
          await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

          return { signature, feeCharged };
        };

        let signature: string;
        let feeCharged: number;
        try {
          ({ signature, feeCharged } = await sendWithFreshBlockhash());
        } catch (error) {
          if (error instanceof Error && /Blockhash not found|BlockhashNotFound/i.test(error.message)) {
            ({ signature, feeCharged } = await sendWithFreshBlockhash());
          } else {
            throw error;
          }
        }

        writePending({
          clientRef,
          createdAt: Date.now(),
          receiverAddress,
          amount: usdcAmount,
        });

        // 6. Tell the backend the confirmed signature so it can record the transaction
        const { transactionId } = await db.broadcastSponsoredTransaction({
          signature,
          senderAddress,
          receiverId: recipient?.userId,
          receiverAddress,
          amount: usdcAmount,
          currency: currency.code,
          displayAmount: amountNum,
          displayCurrency: currency.code,
          displaySymbol: currency.symbol,
          fee: feeCharged,
          category: selectedCategory || 'transfer',
          narration: narration || undefined,
          memo: recipient?.username || 'External Wallet',
          clientRef,
          externalUserId: user?.userId,
        });

        clearPending();
        setStep('success');

        // --- ASYNC RECEIPT GENERATION ---
        try {
          const receiptBlob = await generateReceiptPNG({
            senderAddress,
            receiverAddress,
            amount: usdcAmount,
            currency: 'USDC',
            fee: feeCharged,
            timestamp: Date.now(),
            category: selectedCategory || 'Transfer',
            signature: signature
          });

          const receiptFile = new File([receiptBlob], 'receipt.png', { type: 'image/png' });
          const uploadResult = await db.uploadReceipt({
            file: receiptFile,
            externalUserId: user?.userId,
            email: user.email,
            username: user.username,
            walletAddress,
          });
          
          if (uploadResult) {
            if (transactionId) {
              await db.linkReceiptToTransaction({
                transactionId: transactionId as any,
                storageId: uploadResult,
              });
            }
          }
        } catch (rErr) {
          console.error('Receipt generation failed:', rErr);
        }
      }
    } catch (err: any) {
      console.error('Send failed:', err);
      setTxError(err.message || "Transaction failed. Check your balance.");
      setStep('review');
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
        onClick={e => e.stopPropagation()}
        className="modal-sheet"
        style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-divider)', margin: '14px auto 0' }} />

        <AnimatePresence initial={false} custom={direction}>
          {/* METHOD */}
          {step === 'method' && (
            <motion.div 
              key="method" 
              custom={direction}
              initial={{ opacity: 0, x: direction * 40, scale: 0.98 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: -direction * 40, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 24px' }}>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>Send Money</h2>
                <button onClick={onClose} style={{ background: 'var(--color-border)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text)' }}><X size={17} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { id: 'username' as SendMethod, icon: User,     label: 'PayMe Username',  desc: 'Send to a PayMe user instantly',         available: true },
                  { id: 'contact'  as SendMethod, icon: Users,    label: 'Saved Contacts',  desc: 'Quickly pay your trusted contacts',      available: true },
                  { id: 'address'  as SendMethod, icon: Wallet,   label: 'Wallet Address',  desc: 'Send to any Solana address',             available: true },
                  { id: 'bank'     as SendMethod, icon: Landmark, label: 'Bank Transfer',   desc: 'Available on mainnet',                   available: false },
                ].map(({ id, icon: Icon, label, desc, available }) => (
                  <motion.button 
                    key={id} 
                    whileHover={available ? { scale: 1.02, x: 5 } : {}}
                    whileTap={available ? { scale: 0.98 } : {}}
                    onClick={() => { if (!available) return; setMethod(id); handleStepChange('recipient'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, background: available ? 'var(--color-border)' : 'rgba(255,255,255,0.02)', border: `1px solid ${available ? 'var(--color-border-strong)' : 'var(--color-border)'}`, borderRadius: 20, padding: '18px 20px', cursor: available ? 'pointer' : 'not-allowed', textAlign: 'left', color: available ? 'var(--color-text)' : 'var(--color-text-3)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: available ? 'rgba(249,115,22,0.15)' : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} color={available ? '#F97316' : 'var(--color-text-4)'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 12, color: available ? 'var(--color-text-3)' : 'var(--color-text-4)' }}>{desc}</p>
                    </div>
                    {!available && <span style={{ fontSize: 10, background: 'rgba(249,115,22,0.15)', color: '#F97316', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>MAINNET</span>}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* RECIPIENT */}
          {step === 'recipient' && (
            <motion.div 
              key="recipient" 
              custom={direction}
              initial={{ opacity: 0, x: direction * 40, scale: 0.98 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: -direction * 40, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 24px' }}>
                <AppleBackButton onBack={() => handleStepChange('method')} />
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>
                  {method === 'contact' ? 'Saved Contacts' : method === 'username' ? 'Find User' : 'Wallet Address'}
                </h2>
              </div>

              {method === 'contact' ? (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Add a contact</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                      Save a PayMe username or any Solana wallet so you can pay faster next time.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      value={newContactHandle}
                      onChange={(e) => { setNewContactHandle(e.target.value); setContactError(null); setContactSuccess(null); }}
                      placeholder="@username or Solana wallet address"
                      style={{ flex: 1, background: 'var(--color-border)', border: '1.5px solid var(--color-border-strong)', borderRadius: 14, padding: '12px 14px', fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
                    />
                    <button
                      onClick={handleAddContact}
                      disabled={addingContact || !newContactHandle.trim() || contacts.length >= 15}
                      style={{ height: 46, padding: '0 14px', borderRadius: 12, border: '1px solid var(--color-border-strong)', background: 'rgba(249,115,22,0.15)', color: '#F97316', fontWeight: 700, cursor: 'pointer', opacity: (addingContact || contacts.length >= 15) ? 0.5 : 1 }}
                    >
                      {addingContact ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingLeft: 2 }}>
                    <p style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Saved contacts: {contacts.length}/15</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-4)' }}>Examples: @kwame_o · 7Zq...9bF</p>
                  </div>
                  {contactError && <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 12 }}>{contactError}</p>}
                  {contactSuccess && <p style={{ fontSize: 12, color: '#22C55E', marginBottom: 12 }}>{contactSuccess}</p>}

                  <div>
                    {contacts.length === 0 ? (
                      <div style={{ background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '16px 14px', fontSize: 13, color: 'var(--color-text-3)' }}>
                        No contacts yet. Add a PayMe username or external wallet above.
                      </div>
                    ) : (
                      contacts.map((c, i) => (
                        <motion.div
                          key={`${c.contactId}_${i}`}
                          whileHover={{ scale: 1.01, backgroundColor: 'var(--color-border-strong)' }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            if (c.contactType === 'user' && c.walletAddress) {
                              setMethod('username');
                              setRecipient({
                                userId: c.userId,
                                username: c.username,
                                name: c.name,
                                verificationLevel: c.verificationLevel ?? 0,
                                walletAddress: c.walletAddress,
                                avatarBase64: c.avatarBase64,
                                occupation: '',
                              });
                              handleStepChange('amount');
                            } else if (c.walletAddress) {
                              setMethod('address');
                              setWalletInput(c.walletAddress);
                              setRecipient({
                                userId: undefined,
                                username: null,
                                name: c.name || 'External Wallet',
                                verificationLevel: 0,
                                walletAddress: c.walletAddress,
                                avatarBase64: null,
                                occupation: '',
                              });
                              handleStepChange('amount');
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '12px 14px', marginBottom: 9, cursor: 'pointer' }}
                        >
                          <div className="avatar" style={{ width: 44, height: 44, background: c.avatarBase64 ? 'transparent' : getAvatarColor(c.name || c.username || 'Contact'), fontSize: 14, color: 'var(--color-text)', overflow: 'hidden', border: c.avatarBase64 ? '1px solid var(--color-border)' : 'none' }}>
                            {c.avatarBase64 ? <img src={c.avatarBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(c.name || c.username || 'CT')}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: 14 }}>{c.name || c.username || 'Contact'}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                              {c.contactType === 'user' ? `@${c.username || 'user'}` : `${(c.walletAddress || '').slice(0, 8)}...${(c.walletAddress || '').slice(-6)}`}
                            </p>
                          </div>
                          <ArrowRight size={14} color="#F97316" />
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              ) : method === 'username' ? (
                <>
                  <div style={{ position: 'relative', marginBottom: 8, display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} color="var(--color-text-3)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                    {searchAttempted && hasCommittedSearch && isInputSynced && (
                      <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: searchHasMatch ? 'rgba(34,197,94,0.16)' : searchNoMatch ? 'rgba(239,68,68,0.14)' : 'rgba(249,115,22,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        {searching ? (
                          <div className="spinner-small" style={{ width: 12, height: 12 }} />
                        ) : searchHasMatch ? (
                          <Check size={13} color="#22C55E" />
                        ) : (
                          <X size={13} color="#EF4444" />
                        )}
                      </div>
                    )}
                    <input
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value.toLowerCase().replace(/\s/g, ''));
                        setCommittedSearchQuery('');
                        setSearchAttempted(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          runUserSearch();
                        }
                      }}
                      placeholder="Exact username (e.g. kwame_o)"
                      autoFocus
                      style={{ width: '100%', background: 'var(--color-border)', border: `1.5px solid ${searchHasMatch ? 'rgba(34,197,94,0.45)' : searchNoMatch ? 'rgba(239,68,68,0.45)' : 'var(--color-border-strong)'}`, borderRadius: 16, padding: '14px 42px 14px 44px', fontSize: 15, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
                    />
                    </div>
                    <button
                      onClick={runUserSearch}
                      disabled={normalizedSearchQuery.length < 2}
                      style={{ height: 50, padding: '0 16px', borderRadius: 14, border: '1px solid var(--color-border-strong)', background: normalizedSearchQuery.length >= 2 ? 'rgba(249,115,22,0.15)' : 'var(--color-border)', color: normalizedSearchQuery.length >= 2 ? '#F97316' : 'var(--color-text-4)', fontWeight: 700, cursor: normalizedSearchQuery.length >= 2 ? 'pointer' : 'not-allowed' }}
                    >
                      Search
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 16, paddingLeft: 4 }}>Type username, then tap Search (or press Enter)</p>

                  {!searchAttempted && recentRecipients.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 10, paddingLeft: 4, fontWeight: 700, letterSpacing: '0.3px' }}>RECENT RECIPIENTS</p>
                      {recentRecipients.map((r) => (
                        <motion.div
                          key={r.address}
                          whileHover={{ scale: 1.01, backgroundColor: 'var(--color-border-strong)' }}
                          onClick={() => {
                            if (r.username) {
                              setRecipient({
                                userId: r.userId || undefined,
                                username: r.username,
                                name: r.name,
                                verificationLevel: 0,
                                walletAddress: r.address,
                                avatarBase64: r.avatarBase64,
                                occupation: '',
                              });
                            } else {
                              setRecipient({
                                userId: undefined,
                                username: null,
                                name: r.name,
                                verificationLevel: 0,
                                walletAddress: r.address,
                                avatarBase64: r.avatarBase64,
                                occupation: '',
                              });
                            }
                            handleStepChange('amount');
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 18, padding: '14px 18px', width: '100%', marginBottom: 10, cursor: 'pointer' }}
                        >
                          <div className="avatar" style={{ width: 52, height: 52, background: r.avatarBase64 ? 'transparent' : getAvatarColor(r.name), fontSize: 17, color: 'var(--color-text)', flexShrink: 0, overflow: 'hidden', border: r.avatarBase64 ? '1px solid var(--color-border)' : 'none' }}>
                            {r.avatarBase64 ? <img src={r.avatarBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : getInitials(r.name)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{r.name}</div>
                            {r.username ? (
                              <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>@{r.username}</p>
                            ) : (
                              <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontFamily: 'monospace' }}>{r.address.slice(0, 8)}...{r.address.slice(-6)}</p>
                            )}
                          </div>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowRight size={13} color="#F97316" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <AnimatePresence>
                    {searchResolved && uniqueSearchResults.map((u, i) => {
                      const isSelf = !!u.isSelf;
                      const canSendToUser = u.canSend !== false && !isSelf;
                      const isSaved = contacts.some((c) =>
                        c.contactType === 'user' &&
                        ((u.userId && c.userId === u.userId) || (u.username && c.username?.toLowerCase() === u.username.toLowerCase()))
                      );
                      const saveKey = u.userId || u.username;
                      const isSaving = !!saveKey && savingContactId === saveKey;
                      return (
                      <motion.div
                        key={u.userId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={canSendToUser ? { scale: 1.01, backgroundColor: 'var(--color-border-strong)' } : {}}
                        onClick={() => { if (canSendToUser) { setRecipient(u); handleStepChange('amount'); } }}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-border)', border: `1px solid var(--color-border)`, borderRadius: 18, padding: '14px 18px', width: '100%', marginBottom: 10, cursor: canSendToUser ? 'pointer' : 'not-allowed', opacity: canSendToUser ? 1 : 0.7 }}>
                        <div className="avatar" style={{ width: 52, height: 52, background: u.avatarBase64 ? 'transparent' : getAvatarColor(u.name || u.username), fontSize: 17, color: 'var(--color-text)', flexShrink: 0, overflow: 'hidden', border: u.avatarBase64 ? '1px solid var(--color-border)' : 'none' }}>
                          {u.avatarBase64 ? <img src={u.avatarBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(u.name || u.username)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{u.name || u.username}</span>
                            <VerificationBadge level={u.verificationLevel} size={15} />
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>@{u.username} {u.occupation ? `· ${u.occupation}` : ''}</p>
                          {isSelf && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>You can't send money to yourself</p>}
                          {!isSelf && !u.walletAddress && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>This user is not ready to receive yet</p>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSelf && !isSaved) {
                                handleSaveUserContact(u);
                              }
                            }}
                            disabled={isSelf || isSaved || isSaving}
                            style={{
                              borderRadius: 999,
                              border: '1px solid var(--color-border-strong)',
                              background: isSaved ? 'var(--color-border)' : 'rgba(34,197,94,0.16)',
                              color: isSaved ? 'var(--color-text-3)' : '#22C55E',
                              padding: '4px 10px',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: isSelf || isSaved || isSaving ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isSaved ? 'SAVED' : isSaving ? 'SAVING...' : 'SAVE'}
                          </button>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: canSendToUser ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {canSendToUser ? <ArrowRight size={13} color="#F97316" /> : <X size={13} color="#EF4444" />}
                          </div>
                        </div>
                      </motion.div>
                    )})}
                  </AnimatePresence>
                </>
              ) : (
                <>
                  <input
                    value={walletInput}
                    onChange={e => setWalletInput(e.target.value)}
                    placeholder="Solana wallet address (base58)…"
                    style={{ width: '100%', background: 'var(--color-border)', border: '1.5px solid var(--color-border-strong)', borderRadius: 16, padding: '14px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--color-text)', outline: 'none', marginBottom: 8 }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 20, paddingLeft: 4 }}>44-character Solana public key</p>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary" onClick={() => { if (walletInput.length > 20) handleStepChange('amount'); }} style={{ width: '100%', height: 54, borderRadius: 18 }}>Continue</motion.button>
                </>
              )}
            </motion.div>
          )}

          {/* AMOUNT */}
          {step === 'amount' && (
            <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 20px' }}>
                <AppleBackButton onBack={() => setStep('recipient')} />
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>Amount</h2>
              </div>

              {/* Balance — uses global currency, no picker here */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 2 }}>YOUR BALANCE</p>
                <p style={{ fontSize: 17, fontWeight: 700 }}>
                  {currency.flag} {formatBalance(balanceInCurrency, currency.symbol)} {currency.code}
                </p>
              </div>

              {/* Amount input */}
              <div style={{ textAlign: 'center', marginBottom: 8, background: 'var(--color-border)', border: '1.5px solid var(--color-border-strong)', borderRadius: 20, padding: '20px 20px 14px' }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>
                  SENDING TO {(recipientName || 'recipient').toUpperCase()}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-3)' }}>{currency.symbol}</span>
                  <input
                    type="text" inputMode="decimal"
                    value={formatAmountInput(amount)}
                    onChange={e => setAmount(normalizeAmountInput(e.target.value))}
                    placeholder="0.00"
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: 'clamp(30px, 10vw, 48px)', fontWeight: 900, color: 'var(--color-text)', width: '100%', maxWidth: 320, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontFamily: 'inherit' }}
                  />
                </div>
                {amountNum > 0 && <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>≈ {usdcAmount.toFixed(4)} USDC</p>}
                {amountNum > balanceInCurrency && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>Insufficient balance</p>}
              </div>

              {/* Narration + 3D pie category button */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    value={narration} onChange={e => setNarration(e.target.value)}
                    placeholder="What's this for? (optional)"
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit' }}
                  />
                  {/* 3D pie visual button */}
                  <button onClick={() => setShowCategories(s => !s)} title="Pick a category"
                    style={{ width: 38, height: 38, borderRadius: '50%', background: showCategories ? 'rgba(249,115,22,0.15)' : 'var(--color-border)', border: `1.5px solid ${showCategories ? '#F97316' : 'var(--color-border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0, transition: 'all 0.2s' }}>
                    {/* 3D pie chart SVG matching user reference */}
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Bottom ellipse for 3D depth */}
                      <ellipse cx="11" cy="14" rx="9" ry="4" fill="rgba(0,0,0,0.3)" />
                      {/* Teal segment top */}
                      <path d="M11 5 A6 6 0 0 1 17 11 L11 11 Z" fill="#4ECDC4" />
                      {/* Pink/red segment top */}
                      <path d="M17 11 A6 6 0 0 1 14 16.2 L11 11 Z" fill="#FF6B8A" />
                      {/* Blue/purple segment (majority) top */}
                      <path d="M14 16.2 A6 6 0 1 1 11 5 L11 11 Z" fill="#7B9EEB" />
                      {/* Teal 3D side */}
                      <path d="M11 5 A6 6 0 0 1 17 11 L17 13.5 A6 6 0 0 0 11 7.5 Z" fill="#3DBDB5" opacity="0.85" />
                      {/* Pink 3D side */}
                      <path d="M17 11 A6 6 0 0 1 14 16.2 L14 18.7 A6 6 0 0 0 17 13.5 Z" fill="#E85070" opacity="0.85" />
                      {/* Blue 3D side */}
                      <path d="M14 16.2 A6 6 0 1 1 11 5 L11 7.5 A6 6 0 1 0 14 18.7 Z" fill="#5B7EC5" opacity="0.85" />
                    </svg>
                  </button>
                </div>

                <AnimatePresence>
                  {showCategories && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12 }}>
                        {CATEGORIES.map(cat => (
                          <button key={cat.label}
                            onClick={() => { setNarration(cat.label); setSelectedCategory(cat.label); setShowCategories(false); }}
                            style={{ background: selectedCategory === cat.label ? 'rgba(249,115,22,0.2)' : 'var(--color-border)', border: `1px solid ${selectedCategory === cat.label ? '#F97316' : 'var(--color-border)'}`, borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <cat.icon size={15} color={cat.color} /> {cat.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary"
                onClick={() => { if (amountNum > 0 && amountNum <= balanceInCurrency) handleStepChange('review'); }}
                disabled={!amountNum || amountNum > balanceInCurrency}
                style={{ width: '100%', height: 56, borderRadius: 18, fontSize: 17, opacity: (!amountNum || amountNum > balanceInCurrency) ? 0.45 : 1 }}>
                Continue
              </motion.button>
            </motion.div>
          )}

          {/* REVIEW */}
          {step === 'review' && (
            <motion.div 
              key="review" 
              custom={direction}
              initial={{ opacity: 0, x: direction * 40, scale: 0.98 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: -direction * 40, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 24px' }}>
                <AppleBackButton onBack={() => handleStepChange('amount')} />
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>Review</h2>
              </div>

              {recipient && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '16px 18px', marginBottom: 16 }}>
                  <div className="avatar" style={{ width: 48, height: 48, background: recipient.avatarBase64 ? 'transparent' : getAvatarColor(recipient.name), fontSize: 16, color: 'var(--color-text)', overflow: 'hidden', border: recipient.avatarBase64 ? '1px solid var(--color-border)' : 'none' }}>
                    {recipient.avatarBase64 ? <img src={recipient.avatarBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(recipient.name)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700 }}>{recipient.name}</span>
                      <VerificationBadge level={recipient.verificationLevel} size={15} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>@{recipient.username} · {recipient.occupation}</p>
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '20px', marginBottom: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 4 }}>You are sending</p>
                <p style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1.5px' }}>{currency.symbol}{amountNum.toFixed(2)} {currency.code}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>≈ {usdcAmount.toFixed(4)} USDC</p>
                {narration && <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 10, fontStyle: 'italic' }}>"{narration}"</p>}
              </div>

              <p style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', marginBottom: 12 }}>
                Sender pays gas reimbursement (in USDC) + 0.005% service fee {amountNum > 0 ? `(~${estimatedServiceFeeUsdc.toFixed(6)} USDC service)` : ''}. Receiver gets exactly the sent amount.
              </p>

              {txError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
                  <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 600 }}>{txError}</p>
                </div>
              )}

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary" onClick={handleSend} style={{ width: '100%', height: 56, borderRadius: 18, fontSize: 17 }}>
                Send {currency.symbol}{amountNum.toFixed(2)}
              </motion.button>
            </motion.div>
          )}

          {/* SENDING */}
          {step === 'sending' && (
            <motion.div 
              key="sending" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              style={{ textAlign: 'center', padding: '60px 0' }}
            >
              <motion.div 
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1],
                  borderColor: ['rgba(249,115,22,0.2)', '#F97316', 'rgba(249,115,22,0.2)']
                }} 
                transition={{ 
                  rotate: { duration: 1, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                  borderColor: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                }}
                style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid rgba(249,115,22,0.2)', borderTop: '4px solid #F97316', margin: '0 auto 24px' }} 
              />
              <p style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Sending...</p>
              <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>Broadcasting to Solana devnet</p>
            </motion.div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <motion.div 
              key="success" 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              style={{ textAlign: 'center', padding: '48px 0', position: 'relative' }}
            >
              {/* Confetti celebration fallback */}
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 1, 
                    scale: 0, 
                    x: 0, 
                    y: 0 
                  }}
                  animate={{ 
                    opacity: 0, 
                    scale: Math.random() + 0.5, 
                    x: (Math.random() - 0.5) * 400, 
                    y: (Math.random() - 0.5) * 400 - 100,
                    rotate: Math.random() * 360
                  }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{ 
                    position: 'absolute', 
                    top: '30%', 
                    left: '50%', 
                    width: 8, 
                    height: 8, 
                    backgroundColor: ['#F97316', '#7C3AED', '#22C55E', '#0EA5E9'][i % 4],
                    borderRadius: i % 2 === 0 ? '50%' : '2px'
                  }}
                />
              ))}

              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.05 }}
                style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Check size={40} color="#22C55E" />
              </motion.div>
              <h3 style={{ fontWeight: 900, fontSize: 26, marginBottom: 8 }}>Payment Sent!</h3>
              <p style={{ fontSize: 15, color: 'var(--color-text-3)', marginBottom: 36, lineHeight: 1.5 }}>
                {currency.symbol}{amountNum.toFixed(2)} {currency.code} successfully<br />sent to <strong style={{ color: 'var(--color-text)' }}>{recipientName}</strong>
              </p>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary" onClick={onClose} style={{ width: '100%', height: 56, borderRadius: 18, fontSize: 16 }}>Done</motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
