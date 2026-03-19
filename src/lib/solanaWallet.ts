import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export interface SolanaWallet {
  publicKey: string;
  privateKey: string;
  keypair: Keypair;
}

/**
 * Generate a new Solana wallet client-side
 * Private key is never sent to the server
 */
export function generateSolanaWallet(): SolanaWallet {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);
  
  return {
    publicKey,
    privateKey,
    keypair
  };
}

/**
 * Restore wallet from private key
 */
export function restoreSolanaWallet(privateKey: string): SolanaWallet {
  const secretKey = bs58.decode(privateKey);
  const keypair = Keypair.fromSecretKey(secretKey);
  const publicKey = keypair.publicKey.toBase58();
  
  return {
    publicKey,
    privateKey,
    keypair
  };
}

/**
 * Validate if a string is a valid Solana private key
 */
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    const secretKey = bs58.decode(privateKey);
    return secretKey.length === 64;
  } catch {
    return false;
  }
}

/**
 * Validate if a string is a valid Solana public key
 */
export function isValidPublicKey(publicKey: string): boolean {
  try {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKey);
  } catch {
    return false;
  }
}

/**
 * Encrypt private key for local storage (basic encryption)
 * In production, use a proper encryption library
 */
export function encryptPrivateKey(privateKey: string, password: string): string {
  // Simple XOR encryption for demonstration
  // In production, use proper encryption like AES
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(password.padEnd(32, '0').slice(0, 32));
  const dataBytes = encoder.encode(privateKey);
  
  const encrypted = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return bs58.encode(encrypted);
}

/**
 * Decrypt private key from local storage
 */
export function decryptPrivateKey(encryptedData: string, password: string): string {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(password.padEnd(32, '0').slice(0, 32));
  const encryptedBytes = bs58.decode(encryptedData);
  
  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder().decode(decrypted);
}