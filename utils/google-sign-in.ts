import { supabase } from '@/lib/supabase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import type { Provider } from '@supabase/auth-js';

type GoogleSignInCallbacks = {
  onLoadingChange: (isLoading: boolean) => void;
  onError: (message: string | null) => void;
  onSuccess: () => void;
  onProfileSyncingChange: (isSyncing: boolean) => void;
};

export function configureGoogleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;

  if (!webClientId) {
    console.warn('Missing EXPO_PUBLIC_WEB_CLIENT_ID');
  }
  if (!iosClientId) {
    console.warn('Missing EXPO_PUBLIC_IOS_CLIENT_ID');
  }

  GoogleSignin.configure({
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    webClientId,
    iosClientId,
    profileImageSize: 120,
  });
}

export async function handleGoogleSignIn({ onLoadingChange, onError, onSuccess, onProfileSyncingChange }: GoogleSignInCallbacks) {
  try {
    onLoadingChange(true);
    onError(null);

    await GoogleSignin.hasPlayServices();

    // Sign out from Google SDK first so the account picker always appears
    // instead of auto-selecting the previously used account.
    try { await GoogleSignin.signOut(); } catch (_) {}

    const googleSignInResult = await GoogleSignin.signIn();
    if (googleSignInResult.type === 'cancelled') {
      console.log('[Auth] Google sign-in cancelled by user');
      return;
    }

    onProfileSyncingChange(true);
    console.log('[Auth] Google sign-in account selected:', googleSignInResult.data?.user?.email);

    const { idToken } = await GoogleSignin.getTokens();
    if (!idToken) throw new Error('Missing Google ID token');

    const { error: signInError } = await supabase.auth.signInWithIdToken({
      provider: 'google' as Provider,
      token: idToken,
    });

    if (signInError) throw signInError;

    console.log('[Auth] Google sign-in successful:', googleSignInResult.data?.user?.email);
    onSuccess();
  } catch (error: unknown) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : undefined;

    const isCancelled =
      errorCode === statusCodes.SIGN_IN_CANCELLED ||
      errorCode === 'SIGN_IN_CANCELLED' ||
      (error instanceof Error && /cancel/i.test(error.message));

    if (isCancelled) {
      onError(null);
      return;
    }

    console.error('Google sign-in error:', error);
    onError(error instanceof Error ? error.message : 'Google sign-in failed');
  } finally {
    onProfileSyncingChange(false);
    onLoadingChange(false);
  }
}
