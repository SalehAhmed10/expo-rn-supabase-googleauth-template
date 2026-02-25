import { HapticTab } from '@/components/HapticTab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/use-notifications';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { Redirect, Tabs, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


export default function AppTabsLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useNotifications(session);

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

  if (isLoading) {
    return (
      <GestureHandlerRootView>
        <ActivityIndicator color={Colors.light.tint} />
      </GestureHandlerRootView>
    );
  }

  if (session && segments[0] !== '(tabs)') {
    return <Redirect href="/home" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colorScheme === 'dark' ? Colors.dark.tabIconSelected : Colors.light.text,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          ...styles.tabBar,
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="home" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="person" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 75,
    paddingBottom: 10,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 0,
    // iOS shadow properties
    shadowColor: Colors.light.text,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Android shadow property
    elevation: 8,
  },
});
