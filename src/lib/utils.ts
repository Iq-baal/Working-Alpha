// Supported currencies — Africa first, then global
import type { Currency } from '../types';

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar',       symbol: '$',   flag: '🇺🇸', rate: 1.00 },
  { code: 'NGN', name: 'Nigerian Naira',   symbol: '₦',   flag: '🇳🇬', rate: 1610 },
  { code: 'KES', name: 'Kenyan Shilling',  symbol: 'KSh', flag: '🇰🇪', rate: 130 },
  { code: 'GHS', name: 'Ghanaian Cedi',    symbol: '₵',   flag: '🇬🇭', rate: 15.5 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', rate: 18.5 },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬', rate: 3750 },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿', rate: 2580 },
  { code: 'EGP', name: 'Egyptian Pound',   symbol: 'E£',  flag: '🇪🇬', rate: 48.5 },
  { code: 'SDG', name: 'Sudanese Pound',   symbol: 'SDG', flag: '🇸🇩', rate: 530 },
  { code: 'EUR', name: 'Euro',             symbol: '€',   flag: '🇪🇺', rate: 0.92 },
  { code: 'GBP', name: 'British Pound',    symbol: '£',   flag: '🇬🇧', rate: 0.79 },
  { code: 'AED', name: 'UAE Dirham',       symbol: 'د.إ', flag: '🇦🇪', rate: 3.67 },
  { code: 'SAR', name: 'Saudi Riyal',      symbol: '﷼',   flag: '🇸🇦', rate: 3.75 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', rate: 4.45 },
  { code: 'INR', name: 'Indian Rupee',     symbol: '₹',   flag: '🇮🇳', rate: 83.5 },
  { code: 'CAD', name: 'Canadian Dollar',  symbol: 'C$',  flag: '🇨🇦', rate: 1.36 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', rate: 1.55 },
  { code: 'JPY', name: 'Japanese Yen',     symbol: '¥',   flag: '🇯🇵', rate: 150 },
  { code: 'CNY', name: 'Chinese Yuan',     symbol: '¥',   flag: '🇨🇳', rate: 7.25 },
  { code: 'ILS', name: 'Israeli New Shekel',symbol: '₪',   flag: '🇮🇱', rate: 3.65 },
  { code: 'MAD', name: 'Moroccan Dirham',  symbol: 'د.م.',flag: '🇲🇦', rate: 10.05 },
  { code: 'OMR', name: 'Omani Rial',       symbol: 'ر.ع.',flag: '🇴🇲', rate: 0.38 },
  { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le', flag: '🇸🇱', rate: 22600 },
];

export const getCurrency = (code: string): Currency =>
  CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];

/**
 * Format a raw number amount with a currency symbol.
 * Amounts >= 1T  → "₦2.3T"
 * Amounts >= 1B  → "₦1.5B"
 * Amounts >= 1M  → "₦1.1M"
 * Below 1M       → "₦185.50"
 */
export const formatBalance = (amount: number, symbol: string): string => {
  if (amount >= 1_000_000_000_000) return `${symbol}${(amount / 1_000_000_000_000).toFixed(2)}T`;
  if (amount >= 1_000_000_000)     return `${symbol}${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000)         return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatAmount = (usdc: number, currencyCode: string): string => {
  const currency = getCurrency(currencyCode);
  return formatBalance(usdc * currency.rate, currency.symbol);
};

export const usdcToDisplay = (usdc: number, currencyCode: string): string =>
  formatAmount(usdc, currencyCode);

export const displayToUsdc = (amount: number, currencyCode: string): number => {
  const currency = getCurrency(currencyCode);
  return amount / currency.rate;
};

// Avatar color palette — warm + vibrant
export const AVATAR_COLORS = [
  '#F97316', '#7C3AED', '#0EA5E9', '#22C55E',
  '#EF4444', '#EC4899', '#F59E0B', '#6366F1',
  '#14B8A6', '#84CC16',
];

export const getAvatarColor = (name: string): string => {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const configuredUsdcMint = (import.meta.env.VITE_USDC_MINT || '').trim();
if (!configuredUsdcMint) {
  throw new Error('VITE_USDC_MINT is required. Set it to your custom USDC mint.');
}

// Use only the configured custom mint.
export const USDC_MINT_DEVNET = configuredUsdcMint;
export const TEST_TOKEN_MINT = USDC_MINT_DEVNET;

const configuredSolanaRpc = (import.meta.env.VITE_SOLANA_RPC || '').trim();
if (!configuredSolanaRpc) {
  throw new Error('VITE_SOLANA_RPC is required. Set it to your Alchemy devnet endpoint.');
}
export const SOLANA_RPC = configuredSolanaRpc;

export const FLAT_FEE_USD = 0.25; // $0.25 flat fee per transfer
export const FX_SPREAD = 0.005;   // 0.5% FX spread

export const truncateAddress = (addr: string, chars = 6): string =>
  addr ? `${addr.slice(0, chars)}...${addr.slice(-chars)}` : '';

/** Relative time for list rows */
export const formatDate = (isoOrTs: string | number | null | undefined): string => {
  if (isoOrTs == null) return '';
  const d = new Date(isoOrTs);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Precise timestamp for detail screens: "04 Mar 2026, 5:41 PM" */
export const formatPreciseDate = (isoOrTs: string | number): string => {
  const d = new Date(isoOrTs);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const hh = d.toLocaleString('en-US', { hour: 'numeric', hour12: true });
  const mm = String(d.getMinutes()).padStart(2, '0');
  const [hour, period] = hh.split(' ');
  return `${day} ${month} ${year}, ${hour}:${mm} ${period}`;
};
