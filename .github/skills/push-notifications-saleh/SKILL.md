---
name: push-notifications
description: Complete step-by-step guide for setting up Expo push notifications with Firebase FCM V1, Supabase profiles table, send-notification Edge Function, and EAS cloud builds. Covers Android end-to-end with all gotchas.
---

# Push Notifications + EAS Build Setup Guide

Use this skill when setting up push notifications from scratch, migrating from local builds to EAS builds, or debugging `InvalidCredentials` / notification delivery failures.

---

## Architecture Overview

```
Device (Expo Push Token)
  → saved to Supabase profiles table
  → your server/Edge Function queries profiles
  → calls Expo Push API (https://exp.host/--/api/v2/push/send)
  → Expo servers → Firebase FCM V1
  → Firebase → Device
```

Two separate concerns:
- **Token registration** — device-side, uses `google-services.json` (no server key needed)
- **Sending notifications** — server-side, requires FCM V1 credentials uploaded to EAS

---

## Part 1 — Firebase Project Setup

### Step 1 — Create Firebase project & add Android app

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Once created: **Add app** → **Android**
3. Package name: `com.yourname.yourapp` (must match `app.json android.package`)
4. Download `google-services.json`

### Step 2 — Place google-services.json at PROJECT ROOT

> ⚠️ GOTCHA: Do NOT place it in `android/app/`. The `android/` folder is generated and `--clean` will delete it. Always keep it at the project root.

Place at: `<project-root>/google-services.json`

Add to `.gitignore` (don't commit this file):
```
/google-services.json
*firebase-adminsdk*.json
```

### Step 3 — Update app.json to reference root path

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### Step 4 — Convert app.json → app.config.js for EAS env var support

`app.json` doesn't support `process.env` — create `app.config.js` at the project root:

```js
const { expo } = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...expo,
  android: {
    ...expo.android,
    // Cloud builds use the GOOGLE_SERVICES_JSON file env var from EAS
    // Local builds fall back to ./google-services.json in project root
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
};
```

---

## Part 2 — Supabase profiles Table

### Step 5 — Create profiles table

Run this migration via Supabase MCP or dashboard SQL editor:

```sql
-- Profiles table (synced from auth.users via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  push_token  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do anything (needed by Edge Functions)
CREATE POLICY "Service role full access"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-create profile on new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

To backfill existing users:
```sql
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT
  id,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

---

## Part 3 — Client-Side Code

### Step 6 — Install dependencies

```bash
npx expo install expo-notifications expo-device
```

### Step 7 — Create utils/notifications.ts

```ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Notifications] Push tokens not available on simulators');
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'YOUR_EAS_PROJECT_ID', // from app.json extra.eas.projectId
  });

  console.log('[Notifications] Expo push token:', token.data);
  return token.data;
}

export async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, push_token: token, updated_at: new Date().toISOString() });

  if (error) {
    console.error('[Notifications] Failed to save push token:', error.message);
  } else {
    console.log('[Notifications] Push token saved for user:', user.email);
  }
}

export async function clearPushToken(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .upsert({ id: user.id, push_token: null, updated_at: new Date().toISOString() });
}
```

### Step 8 — Create hooks/use-notifications.ts

```ts
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { registerForPushNotificationsAsync, savePushToken } from '@/utils/notifications';

export function useNotifications(session: Session | null) {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const tokenRefreshListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!session) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notifications] Received:', notification.request.content.title);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string> | undefined;
        if (data?.screen) router.push(data.screen as never);
      }
    );

    tokenRefreshListener.current = Notifications.addPushTokenListener((tokenData) => {
      console.log('[Notifications] Token refreshed:', tokenData.data);
      savePushToken(tokenData.data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      tokenRefreshListener.current?.remove();
    };
  // Key on user ID only — avoids re-running on session object reference changes
  }, [session?.user.id]);
}
```

### Step 9 — Wire into (tabs)/_layout.tsx

```ts
import { useNotifications } from '@/hooks/use-notifications';

// Inside the layout component, after session is declared:
useNotifications(session);
```

### Step 10 — Clear token on sign-out (profile.tsx)

```ts
import { clearPushToken } from '@/utils/notifications';

// In the sign-out handler, before supabase.auth.signOut():
await clearPushToken();
await supabase.auth.signOut();
```

---

## Part 4 — FCM V1 Credentials (EAS)

> ⚠️ GOTCHA: FCM Legacy API is deprecated. You MUST use FCM V1. The V1 API requires a **service account JSON key**, not a server key string.

### Step 11 — Download service account key

1. Firebase Console → Project Settings → **Service accounts** tab
2. Click **"Generate new private key"** → **"Generate key"**
3. Save the JSON file (e.g. `yourapp-firebase-adminsdk-xxxxx.json`)
4. Add to `.gitignore`: `*firebase-adminsdk*.json`

### Step 12 — Upload to EAS

```bash
eas credentials --platform android
```

Navigate:
1. Select build profile: `development`
2. **"Manage your Google Service Account Key for Push Notifications (FCM V1)"**
3. **"Set up a Google Service Account Key for Push Notifications (FCM V1)"**
4. Enter the path to your service account JSON file

> ⚠️ GOTCHA: Do NOT select "Push Notifications (Legacy)" — that takes a plain API key string. For FCM V1 you need the Google Service Account submenu.

Verify it's uploaded correctly — the credentials page should show:
```
Push Notifications (FCM V1): Google Service Account Key For FCM V1
Project ID      your-project-id
Client Email    firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

After uploading, delete the local JSON file:
```bash
Remove-Item "yourapp-firebase-adminsdk-xxxxx.json"
```

---

## Part 5 — Supabase Edge Function

### Step 13 — Deploy send-notification Edge Function

Deploy via Supabase MCP or CLI. The function:
- Queries `profiles` table for push tokens
- Targets one user (`userId`), multiple users (`userIds`), or all users (omit both)
- Sends to Expo Push API in batches of 100
- Uses `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase, no setup needed)

```ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { userId, userIds, title, body, data } = await req.json();

  let query = supabase.from('profiles').select('id, push_token').not('push_token', 'is', null);
  if (userId) query = query.eq('id', userId);
  else if (userIds?.length) query = query.in('id', userIds);

  const { data: profiles, error } = await query;
  if (error) return new Response(JSON.stringify({ error: 'DB error' }), { status: 500 });
  if (!profiles?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const messages = profiles.map((p) => ({
    to: p.push_token,
    title, body, sound: 'default',
    ...(data ? { data } : {}),
  }));

  // Send in chunks of 100
  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));

  const results = await Promise.all(
    chunks.map((chunk) =>
      fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      }).then((r) => r.json()),
    ),
  );

  return new Response(JSON.stringify({ sent: messages.length, results }), { status: 200 });
});
```

**Call it:**
```bash
# One user
curl -X POST https://<ref>.supabase.co/functions/v1/send-notification \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<uuid>","title":"Hello","body":"Test","data":{"screen":"/home"}}'

# All users (broadcast)
# omit userId/userIds:
-d '{"title":"Update","body":"New version available!"}'
```

---

## Part 6 — EAS Build Setup

### Step 14 — Install expo-dev-client

```bash
npx expo install expo-dev-client
```

### Step 15 — Configure eas.json

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "autoIncrement": true,
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "autoIncrement": true,
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

> `buildType: "apk"` for dev/preview — directly installable, no Play Store needed.
> `buildType: "app-bundle"` for production — required for Play Store.

### Step 16 — Set EAS environment variables

```bash
# All EXPO_PUBLIC_ vars must be "plaintext" visibility (not "secret")
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..." \
  --visibility plaintext \
  --environment development --environment preview --environment production \
  --non-interactive

# Repeat for: EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_ANDROID_CLIENT_ID,
#             EXPO_PUBLIC_IOS_CLIENT_ID, EXPO_PUBLIC_WEB_CLIENT_ID
```

> ⚠️ GOTCHA: `eas secret:create` is deprecated. Use `eas env:create` instead.
> ⚠️ GOTCHA: `EXPO_PUBLIC_` vars should be `--visibility plaintext`, not `secret`. EAS shows an "Attention" warning if you mark them Secret because they're baked into the compiled app bundle anyway.

### Step 17 — Upload google-services.json as EAS file env var

```bash
eas env:create --name GOOGLE_SERVICES_JSON --type file --value "google-services.json" \
  --visibility sensitive \
  --environment development --environment preview --environment production \
  --non-interactive
```

> ⚠️ GOTCHA: `--type file` takes `--value` as a **file path**, not file contents. EAS reads and uploads the file.

### Step 18 — Add build scripts to package.json

```json
{
  "scripts": {
    "build:dev:android": "eas build -p android --profile development",
    "build:dev:ios": "eas build -p ios --profile development",
    "build:preview:android": "eas build -p android --profile preview",
    "build:prod:android": "eas build -p android --profile production",
    "build:prod:ios": "eas build -p ios --profile production"
  }
}
```

### Step 19 — Trigger first dev build

```bash
npm run build:dev:android
```

When prompted **"Generate a new Android Keystore?"** → **Y**.

EAS will:
1. Generate and store a managed keystore (you never handle the `.jks` file)
2. Build the APK in the cloud (~10-15 min)
3. Provide a download URL or QR code

Download and install on your physical Android device.

### Step 20 — Register EAS keystore SHA-1 in Google Cloud Console

> ⚠️ GOTCHA: The EAS-generated keystore has a DIFFERENT SHA-1 than your local `android/app/debug.keystore`. Google Sign-In uses SHA-1 to verify the APK — if the EAS SHA-1 is not registered, you get `DEVELOPER_ERROR`.

Get the EAS SHA-1 from:
[expo.dev](https://expo.dev) → your project → **Credentials** → **Android** → your package name → **Keystore** → **SHA-1 Fingerprint**

Then in Google Cloud Console:
> ⚠️ GOTCHA: Android OAuth clients support **only one SHA-1 per client**. You cannot add a second SHA-1 to the same client. You must create a second client.

1. Google Cloud Console → Credentials → **Create credentials** → **OAuth Client ID**
2. Application type: **Android**
3. Package name: same as your app (e.g. `com.yourname.yourapp`)
4. SHA-1: paste the EAS keystore SHA-1
5. Name: `Android EAS Build`

You'll end up with two Android clients:
| Client Name | SHA-1 Source | Used By |
|---|---|---|
| `Android Debug - Local` | `android/app/debug.keystore` | `npx expo run:android` |
| `Android EAS Build` | EAS managed keystore | `npm run build:dev:android` |

Both work with the same Web Client ID configured in Supabase. **No code changes needed.**

---

## Daily Development Workflow (after first EAS build)

```bash
# Day-to-day: just start Metro — no rebuild needed
npm start

# Only rebuild when native code changes (new plugins, app.json changes):
npm run build:dev:android
```

The EAS APK stays installed on your device. It hot-reloads from Metro just like `expo run:android`.

---

## Quick Test: Send a Notification via PowerShell

```powershell
# Get the user's push token from Supabase profiles table first, then:
Invoke-RestMethod `
  -Uri "https://<ref>.supabase.co/functions/v1/send-notification" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer <ANON_KEY>"
    "Content-Type"  = "application/json"
  } `
  -Body '{"userId":"<uuid>","title":"Test","body":"Hello from Supabase Edge Function!"}' |
  ConvertTo-Json -Depth 5
```

Expected response: `{"sent":1,"results":[{"data":[{"status":"ok","id":"..."}]}]}`

---

## Troubleshooting

### `InvalidCredentials` when sending push notification
FCM V1 credentials not uploaded to EAS, or the wrong credentials type was selected.
- Re-run `eas credentials --platform android` and select **FCM V1 → Google Service Account**
- Confirm with a direct Expo push API test (bypasses EAS entirely):
  ```powershell
  Invoke-RestMethod -Uri "https://exp.host/--/api/v2/push/send" -Method Post `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"to":"ExponentPushToken[...]","title":"Test","body":"Test"}' | ConvertTo-Json -Depth 5
  ```
  If this returns `"status":"error"` with `InvalidCredentials`, the FCM V1 key is wrong or expired.

### Notification not showing when app is in foreground
`setNotificationHandler` must be called at module level in `utils/notifications.ts` (outside any component or hook). It must return `shouldShowAlert: true` and `shouldShowBanner: true`.

### Push token saves multiple times (duplicate log lines)
The `useNotifications` hook's `useEffect` runs whenever the `session` object reference changes, even if it's the same user. This happens because Supabase refreshes the session internally.

Fix: key the effect on the user ID string, not the session object:
```ts
// Wrong — session object reference changes on refresh:
}, [session]);

// Correct — stable string, only changes on actual login/logout:
}, [session?.user.id]);
```

### `DEVELOPER_ERROR` on EAS build (Google Sign-In fails)
EAS uses a different keystore than local builds. The EAS SHA-1 is not registered in Google Cloud Console. See Step 20.

### `google-services.json` warning during local dev
```
File specified via "android.googleServicesFile" field in your app config is not checked in to your repository.
```
This warning appears when running `npx expo run:android` because the file is `.gitignore`d. It's safe — the file exists locally at the project root. The warning is from Expo CLI, not a build failure.

### EAS build can't find google-services.json
Make sure `app.config.js` exists at the project root (not just `app.json`), the `GOOGLE_SERVICES_JSON` EAS env var was created with `--type file`, and the env var is set for the build profile you're using.

### `eas env:create` vs `eas secret:create`
`eas secret:create` is deprecated. Always use `eas env:create`. Visibility guide:
| Var type | Visibility flag |
|---|---|
| `EXPO_PUBLIC_*` | `--visibility plaintext` |
| `GOOGLE_SERVICES_JSON` (file) | `--visibility sensitive` |
| Server-only secrets (e.g. service role key) | `--visibility secret` |

---

## Key Values for This Project

| Item | Value |
|------|-------|
| EAS Project ID | `b965fcc1-ecaf-4a6b-920d-579d54702df7` |
| Firebase Project | `expo-boilerplate-salehahmed` |
| Package name | `com.salehahmed.expoboilerplate` |
| Local debug SHA-1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| EAS keystore SHA-1 | `35:C3:F4:8F:BC:10:E5:FE:74:08:D6:37:8D:26:A6:18:36:D8:66:EB` |
| Supabase project ref | `twhxryigszvzvkizngul` |
| Edge Function URL | `https://twhxryigszvzvkizngul.supabase.co/functions/v1/send-notification` |
