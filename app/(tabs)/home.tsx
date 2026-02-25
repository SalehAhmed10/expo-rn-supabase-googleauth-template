import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Session } from '@supabase/supabase-js';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

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

export default function HomeScreen() {
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

  const onSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
    router.replace('/');
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
        <ThemedText type="title">Home</ThemedText>
        <ThemedText style={styles.subtitle}>Welcome, {displayName}</ThemedText>

        <ThemedView style={styles.card}>
          <ThemedView style={styles.symbolContainer}>
            <SymbolView
              name="bolt.fill"
              size={180}
              type="hierarchical"
              tintColor={Colors.light.tint}
              resizeMode="scaleAspectFit"
              scale="large"
              weight="ultraLight"
              animationSpec={{
                effect: { type: 'bounce', wholeSymbol: true },
                repeating: true,
                speed: 0.2,
              }}
              fallback={<MaterialIcons name="bolt" size={72} color={Colors.light.tint} />}
            />
            {/* <ThemedText style={styles.symbolLabel}>Connected</ThemedText> */}
          </ThemedView>
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
    padding: 24,
    gap: 16,
    backgroundColor: Colors.light.background,
  },
  subtitle: {
    opacity: 0.7,
  },
  card: {
    padding: 16,
    backgroundColor: Colors.light.background,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  cardLabel: {
    opacity: 0.8,
  },
  symbolContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  symbolLabel: {
    opacity: 0.8,
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.light.text,
  },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.dark.text,
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
