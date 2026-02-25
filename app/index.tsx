import { Redirect, Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelloWave } from '@/components/HelloWave';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

const googleLogo = require('@/assets/images/google-sign-in.png');

export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#0a0a0a']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView style={styles.loadingContainer}>
            <ActivityIndicator color="#00d4ff" />
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (session) {
    return <Redirect href="/home" />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#0a0a0a']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.heroSection}>
                <LinearGradient
                  colors={['#00d4ff', '#0099ff', '#7000ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.reactLogo}
                  />
                </LinearGradient>

                <View style={styles.titleContainer}>
                  <ThemedText type="title" style={styles.title}>
                    Welcome!
                  </ThemedText>
                  <HelloWave />
                </View>
              </View>

              <Pressable
                onPress={() => router.push('/login-sheet')}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.signInTitleRow}>
                  <ThemedText type="subtitle" style={styles.cardTitle}>
                    Sign in
                  </ThemedText>
                  <View style={styles.signInIcons}>
                    <Image source={googleLogo} style={styles.signInGoogleIcon} resizeMode="contain" />
                    <Ionicons name="logo-apple" size={18} color="#ffffff" />
                  </View>
                </View>
                <ThemedText style={styles.cardText}>
                  {`Tap the display login button sheet.`}
                </ThemedText>
              </Pressable>

              <View style={styles.card}>
                <View style={styles.signInTitleRow}>
                  <ThemedText type="subtitle" style={styles.cardTitle}>
                    RevenueCat subscriptions
                  </ThemedText>
                  <View style={styles.signInIcons}>
                    <Ionicons name="cash-outline" size={18} color="#ffffff" />
                  </View>  
                </View>
                <ThemedText style={styles.cardText}>
                  Setup RevenueCat subscriptions and manage payments.
                </ThemedText>  
              </View>

              <View style={styles.card}>
                <View style={styles.signInTitleRow}>
                  <ThemedText type="subtitle" style={styles.cardTitle}>
                    Push Notifications
                  </ThemedText>
                  <View style={styles.signInIcons}>
                    <Ionicons name="notifications-outline" size={18} color="#ffffff" />
                  </View>
                </View>
                <ThemedText style={styles.cardText}>
                  {`Configure push notifications with Firebase and Expo and send them to your users.`}
                </ThemedText>
              </View>

              <View style={styles.card}>
                <View style={styles.signInTitleRow}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  Emails with Resend
                </ThemedText>
                <View style={styles.signInIcons}>
                  <Ionicons name="mail-outline" size={18} color="#ffffff" />
                </View>
                </View>
                <ThemedText style={styles.cardText}>
                  {`Configure emails with Resend and send them to your users.`}
                </ThemedText>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 60 : 32,
    paddingBottom: 32,
    gap: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 20,
  },
  reactLogo: {
    width: 76,
    height: 76,
    resizeMode: 'contain',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  cardText: {
    color: '#b8b8c8',
    fontSize: 15,
    lineHeight: 22,
  },
  signInTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
  },
  signInIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    left: 10,
    gap: 8,
  },
  signInGoogleIcon: {
    width: 18,
    height: 18,
  },
  textStrong: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
