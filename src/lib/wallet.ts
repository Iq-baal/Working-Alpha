import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

const STORAGE_KEY = 'payme_wallet';

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

/**
 * Derive a 256-bit key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a new Solana keypair and encrypt it with password
 */
export async function generateWallet(password: string): Promise<{
  publicKey: string;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
}> {
  // Generate new keypair using tweetnacl
  const keypair = nacl.sign.keyPair();
  const publicKey = bs58.encode(keypair.publicKey);
  const privateKeyBase64 = bytesToBase64(keypair.secretKey);
  
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive encryption key from password
  const cryptoKey = await deriveKey(password, salt);
  
  // Encrypt private key using AES-GCM
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKeyBase64);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  return {
    publicKey,
    encryptedPrivateKey: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
  };
}

/**
 * Decrypt wallet from stored data
 */
export async function loadWallet(
  encryptedPrivateKey: string,
  iv: string,
  salt: string,
  password: string
): Promise<Uint8Array> {
  const cryptoKey = await deriveKey(
    password,
    base64ToBytes(salt)
  );
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(iv),
    },
    cryptoKey,
    base64ToBytes(encryptedPrivateKey)
  );
  
  const decoder = new TextDecoder();
  const privateKeyBase64 = decoder.decode(new Uint8Array(decrypted));
  
  return base64ToBytes(privateKeyBase64);
}

/**
 * Store encrypted wallet to localStorage
 */
export function storeWallet(walletData: {
  publicKey: string;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
}): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(walletData));
}

/**
 * Load encrypted wallet from localStorage
 */
export function loadStoredWallet(): {
  publicKey: string;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
} | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Check if wallet exists in storage
 */
export function hasStoredWallet(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Get public key from stored wallet (no decryption needed)
 */
export function getStoredPublicKey(): string | null {
  const wallet = loadStoredWallet();
  return wallet?.publicKey || null;
}

/**
 * Clear wallet from storage
 */
export function clearWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}
