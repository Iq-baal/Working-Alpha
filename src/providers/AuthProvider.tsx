import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import * as wallet from '../lib/wallet';
import { registerPush } from '../lib/push';

type User = {
  userId: string;
  username: string;
  email: string;
  solanaPublicKey: string;
  usernameClaimed: boolean;
  bonusClaimed: boolean;
  inviteValidated: boolean;
  discoverable?: boolean;
  notificationPrefs?: { payments: boolean; security: boolean; network: boolean } | null;
  payPoints?: number;
  referralCode?: string | null;
  securityQuestion?: string | null;
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken: string | null;
  walletPublicKey: string | null;
  signUp: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  decryptWallet: (password: string) => Promise<Uint8Array | null>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      const token = api.getSessionToken();
      const storedUser = api.getStoredUser();
      const storedPubkey = wallet.getStoredPublicKey();

      let apiPubkey: string | null = null;

      if (token && storedUser) {
        // Verify session is still valid
        try {
          const result = await api.getMe();
          if (result.success && result.user) {
            setUser({
              ...result.user,
              usernameClaimed: result.user.usernameClaimed ?? false,
              bonusClaimed: result.user.bonusClaimed ?? false,
            });
            setSessionToken(token);
            apiPubkey = result.user.solanaPublicKey || null;

            // Subscribe to push notifications after successful auth
            if (result.user?.userId) {
              registerPush(result.user.userId).catch((err) => console.error('Push registration error:', err));
            }
          } else {
            // Session invalid, clear
            api.signOut();
          }
        } catch {
          api.signOut();
        }
      }

      setWalletPublicKey(storedPubkey || apiPubkey);
      setIsLoading(false);
    };

    loadSession();
  }, []);

  const handleSignUp = useCallback(async (
    email: string,
    _username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Generate wallet first
      const walletData = await wallet.generateWallet(password);

      // Derive a temporary unique username from email + random suffix
      // User will claim their real username after wallet creation
      const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
      const suffix = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
      const tempUsername = `${emailPrefix}${suffix}`;

      // Sign up with API
      const result = await api.signUp(email, tempUsername, password, walletData.publicKey);
      
      if (!result.success || !result.sessionToken) {
        return { success: false, error: result.error || 'Signup failed' };
      }

      // Store encrypted wallet
      wallet.storeWallet(walletData);
      
      // Update state
      setUser({
        ...(result.user!),
        usernameClaimed: result.user?.usernameClaimed ?? false,
        bonusClaimed: result.user?.bonusClaimed ?? false,
      });
      setSessionToken(result.sessionToken);
      setWalletPublicKey(walletData.publicKey);

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Signup failed' };
    }
  }, []);

  const handleSignIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await api.signIn(email, password);
      
      if (!result.success || !result.sessionToken) {
        return { success: false, error: result.error || 'Sign in failed' };
      }

      // Update state
      setUser({
        ...(result.user!),
        usernameClaimed: result.user?.usernameClaimed ?? false,
        bonusClaimed: result.user?.bonusClaimed ?? false,
      });
      setSessionToken(result.sessionToken);
      
      // Get public key from stored wallet, fall back to server-returned key
      const storedPubkey = wallet.getStoredPublicKey();
      setWalletPublicKey(storedPubkey || result.user?.solanaPublicKey || null);

      return { success: true };
    } catch (error) {
      console.error('Signin error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
    setSessionToken(null);
    setWalletPublicKey(null);
  }, []);

  const handleRefreshUser = useCallback(async () => {
    try {
      const result = await api.getMe();
      if (result.success && result.user) {
        setUser({
          ...result.user,
          usernameClaimed: result.user.usernameClaimed ?? false,
          bonusClaimed: result.user.bonusClaimed ?? false,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDecryptWallet = useCallback(async (password: string): Promise<Uint8Array | null> => {
    const storedWallet = wallet.loadStoredWallet();
    if (!storedWallet) return null;

    try {
      const secretKey = await wallet.loadWallet(
        storedWallet.encryptedPrivateKey,
        storedWallet.iv,
        storedWallet.salt,
        password
      );
      return secretKey;
    } catch (error) {
      console.error('Failed to decrypt wallet:', error);
      return null;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    sessionToken,
    walletPublicKey,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    decryptWallet: handleDecryptWallet,
    refreshUser: handleRefreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
