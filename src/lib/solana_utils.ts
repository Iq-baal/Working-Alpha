const configuredUsdcMint = (import.meta.env.VITE_USDC_MINT || '').trim();
if (!configuredUsdcMint) {
  throw new Error('VITE_USDC_MINT is required. Set it to your custom USDC mint.');
}

export const USDC_MINT_DEVNET = configuredUsdcMint;

export const PLATFORM_FEE_RATE = 0.00005; // 0.005%
export const MIN_PLATFORM_FEE_USDC = 0.0001;
export const WELCOME_BONUS_USDC = 10000;
