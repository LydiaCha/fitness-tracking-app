import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { AppState } from 'react-native';
import { Session, User }         from '@supabase/supabase-js';
import * as WebBrowser            from 'expo-web-browser';
import * as Linking               from 'expo-linking';
import { supabase }               from '@/utils/supabase';
import { STORAGE_KEYS }           from '@/utils/appConstants';
import { getBiometricType, biometricAuthenticate, BiometricType } from '@/utils/biometric';
import { logger }                 from '@/utils/logger';
import { safeGetItem, safeSetItem } from '@/utils/storage';

WebBrowser.maybeCompleteAuthSession();

// ─── Types ───────────────────────────────────────────────────────────────────
interface AuthCtx {
  session:            Session | null;
  user:               User | null;
  loading:            boolean;
  onboardingComplete: boolean;
  isLocked:           boolean;
  biometricType:      BiometricType;
  biometricEnabled:   boolean;
  signIn:             (email: string, password: string) => Promise<void>;
  signUp:             (email: string, password: string) => Promise<void>;
  signOut:            () => Promise<void>;
  signInWithGoogle:   () => Promise<void>;
  resetPassword:      (email: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  unlock:             () => Promise<boolean>;
  skipBiometric:      () => void;
  toggleBiometric:    (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session,            setSession]           = useState<Session | null>(null);
  const [loading,            setLoading]           = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isLocked,           setIsLocked]          = useState(false);
  const [biometricType,      setBiometricType]     = useState<BiometricType>('none');
  const [biometricEnabled,   setBiometricEnabled]  = useState(false);
  const appState = useRef(AppState.currentState);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      logger.info('auth', 'init', 'Initialising auth state');
      try {
        const [
          { data: { session }, error: sessionErr },
          bioType,
          bioEnabledRaw,
          onboardedRaw,
        ] = await Promise.all([
          supabase.auth.getSession(),
          getBiometricType(),
          safeGetItem(STORAGE_KEYS.BIOMETRIC),
          safeGetItem(STORAGE_KEYS.ONBOARDING),
        ]);

        if (sessionErr) {
          // Session errors are non-fatal — user will be redirected to login
          logger.warn('auth', 'init', 'getSession error', { error: sessionErr.message });
        }

        const bioEnabled = bioEnabledRaw === 'true';
        setSession(session);
        setBiometricType(bioType);
        setBiometricEnabled(bioEnabled);
        setOnboardingComplete(onboardedRaw === 'true');

        if (session && bioEnabled && bioType !== 'none') {
          logger.info('auth', 'init', 'Locking app — biometric required');
          setIsLocked(true);
        }

        logger.info('auth', 'init', 'Auth state ready', {
          hasSession: !!session, bioEnabled, bioType, onboarded: onboardedRaw === 'true',
        });
      } catch (e) {
        logger.error('auth', 'init', 'Unexpected init failure', { error: String(e) });
      } finally {
        setLoading(false);
      }
    };

    init();

    // ── Supabase auth state listener ──────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('auth', 'state_change', 'Auth state changed', { event });
      setSession(session);
      if (event === 'SIGNED_OUT') {
        setIsLocked(false);
        setOnboardingComplete(false);
      }
    });

    // ── Re-lock when app returns to foreground ────────────────────────────
    const sub = AppState.addEventListener('change', async nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const bioEnabled = await safeGetItem(STORAGE_KEYS.BIOMETRIC) === 'true';
          const bioType    = await getBiometricType();
          if (session && bioEnabled && bioType !== 'none') {
            logger.info('auth', 'foreground', 'Re-locking app on foreground');
            setIsLocked(true);
          }
        } catch (e) {
          logger.warn('auth', 'foreground', 'Failed to check lock state on foreground', { error: String(e) });
        }
      }
      appState.current = nextState;
    });

    return () => {
      subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  // ── Email / Password ──────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    logger.info('auth', 'signIn', 'Attempting email sign-in');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      logger.warn('auth', 'signIn', 'Sign-in failed', { code: error.code, status: error.status });
      throw error;
    }
    logger.info('auth', 'signIn', 'Sign-in successful');
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    logger.info('auth', 'signUp', 'Attempting account creation');
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      logger.warn('auth', 'signUp', 'Sign-up failed', { code: error.code, status: error.status });
      throw error;
    }
    logger.info('auth', 'signUp', 'Account created — awaiting email confirmation');
  }, []);

  const signOut = useCallback(async () => {
    logger.info('auth', 'signOut', 'Signing out');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Log but don't block — clear local state regardless
        logger.warn('auth', 'signOut', 'Supabase signOut returned error', { error: error.message });
      }
    } catch (e) {
      logger.error('auth', 'signOut', 'Unexpected error during sign-out', { error: String(e) });
    } finally {
      // Always clear local state even if the network call fails
      setIsLocked(false);
      setOnboardingComplete(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    logger.info('auth', 'resetPassword', 'Requesting password reset');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('auth/reset-password'),
    });
    if (error) {
      logger.warn('auth', 'resetPassword', 'Reset request failed', { code: error.code });
      throw error;
    }
    logger.info('auth', 'resetPassword', 'Reset email dispatched');
  }, []);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    logger.info('auth', 'googleOAuth', 'Starting Google OAuth flow');
    const redirectUrl = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });
    if (error || !data.url) {
      logger.error('auth', 'googleOAuth', 'Failed to get OAuth URL', {
        hasError: !!error, hasUrl: !!data?.url,
      });
      throw error ?? new Error('No auth URL returned');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    logger.info('auth', 'googleOAuth', 'Browser session completed', { type: result.type });

    if (result.type === 'success' && result.url) {
      const fragment = result.url.split('#')[1] ?? '';
      const params   = Object.fromEntries(new URLSearchParams(fragment));

      if (params.access_token) {
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token:  params.access_token,
          refresh_token: params.refresh_token ?? '',
        });
        if (sessionErr) {
          logger.error('auth', 'googleOAuth', 'Failed to set session', { error: sessionErr.message });
          throw sessionErr;
        }
        logger.info('auth', 'googleOAuth', 'Google sign-in successful');
      }
    }
  }, []);

  // ── Biometric gate ────────────────────────────────────────────────────────
  const unlock = useCallback(async (): Promise<boolean> => {
    logger.info('auth', 'unlock', 'Attempting biometric unlock');
    try {
      const success = await biometricAuthenticate('Unlock PeakRoutine');
      if (success) {
        logger.info('auth', 'unlock', 'Biometric unlock successful');
        setIsLocked(false);
      } else {
        logger.info('auth', 'unlock', 'Biometric unlock failed or cancelled');
      }
      return success;
    } catch (e) {
      logger.error('auth', 'unlock', 'Unexpected biometric error', { error: String(e) });
      return false;
    }
  }, []);

  const skipBiometric = useCallback(() => {
    logger.info('auth', 'skipBiometric', 'User skipped biometric');
    setIsLocked(false);
  }, []);

  const toggleBiometric = useCallback(async (enabled: boolean) => {
    setBiometricEnabled(enabled);
    const ok = await safeSetItem(STORAGE_KEYS.BIOMETRIC, String(enabled));
    if (!ok) {
      logger.warn('auth', 'toggleBiometric', 'Failed to persist biometric preference');
      // Revert optimistic state
      setBiometricEnabled(!enabled);
    }
  }, []);

  // ── Onboarding ────────────────────────────────────────────────────────────
  const completeOnboarding = useCallback(async () => {
    setOnboardingComplete(true);
    const ok = await safeSetItem(STORAGE_KEYS.ONBOARDING, 'true');
    if (!ok) {
      logger.warn('auth', 'completeOnboarding', 'Failed to persist onboarding flag');
      // Don't revert — the in-memory state is correct; worst case user
      // re-does onboarding on next cold start (acceptable trade-off).
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, loading, onboardingComplete,
      isLocked, biometricType, biometricEnabled,
      signIn, signUp, signOut, signInWithGoogle, resetPassword,
      completeOnboarding, unlock, skipBiometric, toggleBiometric,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}
