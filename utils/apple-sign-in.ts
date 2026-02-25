import { supabase } from '@/lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';

type AppleSignInCallbacks = {
  onLoadingChange: (isLoading: boolean) => void;
  onProfileSyncingChange: (isSyncing: boolean) => void;
  onError: (message: string | null) => void;
  onSuccess: () => void;
  skeletonTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

/**
 * Handles Apple Sign-In authentication flow.
 *
 * Flow:
 * 1. Triggers native Apple Sign-In dialog via expo-apple-authentication
 * 2. Requests user's full name and email (only provided on FIRST sign-in)
 * 3. Receives identity token (JWT) from Apple
 * 4. Authenticates with Supabase using the Apple identity token
 * 5. Optionally updates Supabase auth metadata with the full name
 *
 * Important Notes:
 * - Apple only provides name/email on the FIRST sign-in. On subsequent sign-ins,
 *   these fields will be null, so we fallback to Supabase auth data.
 * - The identity token is a JWT that Supabase validates with Apple's public keys.
 * - If user cancels the dialog, we silently return without showing an error.
 */
export async function handleAppleSignIn({
  onLoadingChange,
  onProfileSyncingChange,
  onError,
  onSuccess,
  skeletonTimer,
}: AppleSignInCallbacks) {
  try {
    onLoadingChange(true);
    if (skeletonTimer.current) {
      clearTimeout(skeletonTimer.current);
    }
    skeletonTimer.current = setTimeout(() => {
      onProfileSyncingChange(true);
    }, 2000);
    onError(null);

    // Step 1: Trigger native Apple Sign-In dialog
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Step 2: Validate the identity token from Apple
    if (!credential.identityToken || typeof credential.identityToken !== 'string') {
      throw new Error('Missing Apple identity token');
    }

    // Step 3: Authenticate with Supabase using Apple's identity token
    // Supabase validates the JWT with Apple's public keys server-side

    const appleAuthResult = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (appleAuthResult.error) {
      console.error('Supabase apple auth error:', appleAuthResult.error);
      throw appleAuthResult.error;
    }

    // Step 4: Fetch the authenticated user from Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Supabase could not get user after Apple sign-in', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Missing user after Apple sign-in');
    }

    // Step 5: Extract user profile data
    // Note: Apple only provides name/email on FIRST sign-in, so we use fallbacks
    const name = typeof credential.fullName?.givenName === 'string' ? credential.fullName.givenName : '';
    const surname = typeof credential.fullName?.familyName === 'string' ? credential.fullName.familyName : '';
    const fullName = [name, surname].filter((value) => value.length > 0).join(' ');

    // Step 6: Update Supabase auth metadata with full name (if available and not already set)
    if (fullName.length > 0 && typeof authData.user.user_metadata?.full_name !== 'string') {
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (updateAuthError) {
        console.error('Supabase user metadata update error:', updateAuthError);
        throw updateAuthError;
      }
    }

    onSuccess();
  } catch (error: unknown) {
    // Silently handle user cancellation (don't show error)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ERR_REQUEST_CANCELED'
    ) {
      return;
    }
    console.error('Apple sign-in error:', error);
    onError(error instanceof Error ? error.message : 'Apple sign-in failed');
  } finally {
    onLoadingChange(false);
    onProfileSyncingChange(false);
    if (skeletonTimer.current) {
      clearTimeout(skeletonTimer.current);
      skeletonTimer.current = null;
    }
  }
}
