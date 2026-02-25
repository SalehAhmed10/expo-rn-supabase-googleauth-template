import { registerForPushNotificationsAsync, savePushToken } from '@/utils/notifications';
import type { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Initializes push notifications for an authenticated session.
 * - Registers for permissions and gets Expo push token
 * - Saves the token to Supabase profiles table
 * - Sets up foreground notification handler
 * - Sets up notification tap handler (navigates based on data)
 * - Listens for token refresh and re-saves
 *
 * Call this hook in the root layout once the session is known.
 */
export function useNotifications(session: Session | null) {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const tokenRefreshListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!session) return;

    // Register + save token
    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(token);
    });

    // Foreground: notification received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Received in foreground:', notification.request.content.title);
    });

    // Tap: user tapped a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      console.log('[Notifications] User tapped notification, data:', data);

      // Navigate to screen specified in notification data
      if (data?.screen) {
        router.push(data.screen as never);
      }
    });

    // Token refresh: save the new token
    tokenRefreshListener.current = Notifications.addPushTokenListener((tokenData) => {
      console.log('[Notifications] Token refreshed:', tokenData.data);
      savePushToken(tokenData.data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      tokenRefreshListener.current?.remove();
    };
  // Key on user ID only — avoids re-running when session object reference changes
  }, [session?.user.id]);
}
