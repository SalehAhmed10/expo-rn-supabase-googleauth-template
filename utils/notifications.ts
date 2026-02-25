import { supabase } from '@/lib/supabase';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permission and returns the Expo push token.
 * Returns null if permission is denied or running on a simulator.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Notifications] Push tokens are not available on simulators/emulators');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return null;
  }

  // Android requires notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#54f254',
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'b965fcc1-ecaf-4a6b-920d-579d54702df7',
  });

  console.log('[Notifications] Expo push token:', token.data);
  return token.data;
}

/**
 * Saves the push token to the user's profile in Supabase.
 * Called after login and whenever the token refreshes.
 */
export async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[Notifications] No authenticated user — skipping token save');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    console.error('[Notifications] Failed to save push token:', error.message);
  } else {
    console.log('[Notifications] Push token saved for user:', user.email);
  }
}

/**
 * Clears the push token from Supabase on sign-out.
 * Prevents notifications being sent to a logged-out device.
 */
export async function clearPushToken(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({ push_token: null, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  console.log('[Notifications] Push token cleared on sign-out');
}
