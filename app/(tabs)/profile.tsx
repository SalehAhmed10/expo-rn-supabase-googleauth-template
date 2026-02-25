import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { clearPushToken } from '@/utils/notifications';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getDisplayName(session: Session | null) {
  const metadata = session?.user.user_metadata;
  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name : '';
  if (fullName.length > 0) {
    return fullName;
  }

  const name = typeof metadata?.name === 'string' ? metadata.name : '';
  if (name.length > 0) {
    return name;
  }

  return typeof session?.user.email === 'string' && session?.user.email.length > 0
    ? session?.user.email
    : 'User';
}

function getDateLabel(value: string | number | null | undefined) {
  if (!value) {
    return 'Unknown';
  }

  const parsed =
    typeof value === 'number'
      ? new Date(value * 1000)
      : typeof value === 'string'
        ? new Date(value)
        : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleDateString();
}

export default function ProfileScreen() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
        setIsLoading(false);
      }
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const displayName = getDisplayName(session);
  const createdAtLabel = getDateLabel(session?.user.created_at ?? null);
  const expiresAtLabel = getDateLabel(session?.expires_at ?? null);
  const avatarUrl =
    typeof session?.user.user_metadata?.avatar_url === 'string'
      ? session.user.user_metadata.avatar_url
      : typeof session?.user.user_metadata?.picture === 'string'
        ? session.user.user_metadata.picture
        : '';

  const onSignOut = async () => {
    setIsSigningOut(true);
    console.log('[Auth] User signing out:', session?.user?.email);
    await clearPushToken();
    await supabase.auth.signOut();
    console.log('[Auth] Sign-out complete');
    setIsSigningOut(false);
    router.replace('/');
  };

  const onSignOutPress = () => {
    if (isSigningOut) {
      return;
    }

    Alert.alert('Sign out', 'Do you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onSignOut },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centered}>
          <ActivityIndicator color={Colors.light.tint} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.card}>
          <ThemedView style={styles.userInfoContainer}>
            <ThemedView style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <ThemedView style={styles.avatarFallback}>
                  <IconSymbol size={28} name="person.fill" color={Colors.light.text} />
                </ThemedView>
              )}
            </ThemedView>
            <ThemedView style={styles.userDetails}>
              <ThemedText type="defaultSemiBold" style={styles.userName}>
                {displayName}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.infoLabel}>
            Account created
          </ThemedText>
          <ThemedText style={styles.infoValue}>{createdAtLabel}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.infoLabel}>
            Session expires
          </ThemedText>
          <ThemedText style={styles.infoValue}>{expiresAtLabel}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <Pressable style={styles.buttonContainer} onPress={onSignOutPress} disabled={isSigningOut}>
            <ThemedText type="subtitle" style={styles.buttonText}>
              {isSigningOut ? 'Signing out...' : 'Log out'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 35,
    backgroundColor: Colors.light.background,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.gray,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
  },
  infoLabel: {
    opacity: 0.7,
  },
  infoValue: {
    marginTop: 6,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.light.text,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    padding: 24,
    gap: 12,
  },
});
