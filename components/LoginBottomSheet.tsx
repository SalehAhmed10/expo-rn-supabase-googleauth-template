import { AppleSignInButton } from '@/components/AppleSignInButton';
import { AuthSkeleton } from '@/components/AuthSkeleton';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { ThemedText } from '@/components/ThemedText';
import { Colors, UI } from '@/constants/theme';
import { handleAppleSignIn } from '@/utils/apple-sign-in';
import { configureGoogleSignIn, handleGoogleSignIn } from '@/utils/google-sign-in';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

type LoginBottomSheetProps = {
  onSuccess?: () => void;
};

export function LoginBottomSheet({ onSuccess }: LoginBottomSheetProps) {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isProfileSyncing, setIsProfileSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appleSkeletonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { height: windowHeight } = useWindowDimensions();

  configureGoogleSignIn();

  const onGoogleSignIn = () => {
    handleGoogleSignIn({
      onLoadingChange: setIsGoogleLoading,
      onProfileSyncingChange: setIsProfileSyncing,
      onError: setErrorMessage,
      onSuccess: () => {
        onSuccess?.();
        router.replace('/home');
      },
    });
  };

  const onAppleSignIn = () => {
    handleAppleSignIn({
      onLoadingChange: setIsAppleLoading,
      onProfileSyncingChange: setIsProfileSyncing,
      onError: setErrorMessage,
      onSuccess: () => {
        onSuccess?.();
        router.replace('/home');
      },
      skeletonTimer: appleSkeletonTimer,
    });
  };

  return (
    <View style={[styles.container, { height: windowHeight * UI.loginSheet.heightRatio }]}>
      <View style={styles.card}>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Sign In
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Sign in to sync your account across devices.
          </ThemedText>
          {isProfileSyncing ? (
            <AuthSkeleton />
          ) : (
            <>
              <GoogleSignInButton onPress={onGoogleSignIn} isLoading={isGoogleLoading} />
              <AppleSignInButton onPress={onAppleSignIn} isLoading={isAppleLoading} />
            </>
          )}
          {errorMessage ? <ThemedText style={styles.error}>{errorMessage}</ThemedText> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    paddingVertical: 28,
    paddingHorizontal: 10,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    bottom: 10,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 20,
    opacity: 0.7,
    textAlign: 'center',
  },
  error: {
    marginTop: 16,
    color: Colors.light.danger,
  },
});
