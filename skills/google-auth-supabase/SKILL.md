---
name: google-auth-supabase
description: Complete step-by-step guide for setting up Google Sign-In with Supabase auth in this Expo template. Covers Android, iOS, all gotchas, and troubleshooting DEVELOPER_ERROR.
---

# Google Auth + Supabase Setup Guide

Use this skill when setting up Google Sign-In from scratch in this template or debugging auth failures.

---

## Prerequisites

- Supabase project created (get URL + anon key from dashboard)
- Google Cloud Console account
- Android device or emulator for testing
- Apple Developer account (iOS only — can skip for Android-only)

---

## Step 1 — Rename app identifiers

Update `app.json` with your own unique identifiers:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "scheme": "yourappscheme",
    "ios": { "bundleIdentifier": "com.yourname.yourapp" },
    "android": { "package": "com.yourname.yourapp" }
  }
}
```

Then regenerate native folders:
```bash
npx expo prebuild --clean
```

---

## Step 2 — Get the correct Android SHA-1

> ⚠️ GOTCHA: This project ships with `android/app/debug.keystore` — NOT `~/.android/debug.keystore`. Always use the project keystore.

```bash
keytool -keystore android/app/debug.keystore -list -v -storepass android 2>&1 | Select-String "SHA1"
```

Save this SHA-1 — you'll need it for Google Cloud Console.

To verify the actual APK being signed uses the same fingerprint:
```bash
$sdk = "$env:LOCALAPPDATA\Android\Sdk\build-tools"
$latest = Get-ChildItem $sdk | Sort-Object Name -Descending | Select-Object -First 1
& "$($latest.FullName)\apksigner.bat" verify --print-certs android/app/build/outputs/apk/debug/app-debug.apk 2>&1 | Select-String "SHA-1"
```
Both must match. If they don't — `DEVELOPER_ERROR` will occur.

---

## Step 3 — Create Google Cloud OAuth Clients

Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**

### A — Android Client
| Field | Value |
|---|---|
| Application type | Android |
| Package name | `com.yourname.yourapp` (must match `app.json`) |
| SHA-1 fingerprint | from Step 2 above (hex only, no `SHA1:` prefix) |

> Do NOT enable "Custom URI scheme" for Android clients.

### B — Web Client (required even for mobile-only apps)
| Field | Value |
|---|---|
| Application type | Web application |
| Authorized JS origins | `http://localhost:8081` |
| Authorized redirect URIs | `https://<your-project-ref>.supabase.co/auth/v1/callback` |

> ⚠️ GOTCHA: The Web client is mandatory. It's not for browser use — Supabase uses it server-side to verify the ID token. Without it, `signInWithIdToken` has nothing to validate against and sign-in fails silently.

### C — iOS Client (skip if Android-only)
| Field | Value |
|---|---|
| Application type | iOS |
| Bundle ID | `com.yourname.yourapp` (must match `app.json`) |

Save the downloaded `.plist` — you need the `REVERSED_CLIENT_ID` value.

---

## Step 4 — Set environment variables

Copy `.env.example` → `.env` and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_ANDROID_CLIENT_ID=<android-client-id>.apps.googleusercontent.com
EXPO_PUBLIC_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
EXPO_PUBLIC_IOS_CLIENT_ID=<ios-client-id>.apps.googleusercontent.com   # optional
```

---

## Step 5 — Add iOS URL scheme to app.json (iOS only)

Find your iOS client's reversed ID (format: `com.googleusercontent.apps.<id>`) and add to plugins:

```json
{
  "plugins": [
    ["@react-native-google-signin/google-signin", {
      "iosUrlScheme": "com.googleusercontent.apps.<your-ios-client-id>"
    }]
  ]
}
```

Then run `npx expo prebuild --clean` again.

---

## Step 6 — Configure Supabase Google provider

1. Go to Supabase dashboard → **Authentication** → **Sign In / Providers** → **Google**
2. Toggle **Enable Sign in with Google** ON
3. **Client IDs** (comma-separated): paste Android + Web + iOS client IDs
4. **Client Secret**: from your Web client in Google Cloud Console
   - Click **Add secret** if the existing one isn't visible (Google no longer shows existing secrets)
   - Copy the secret immediately — it's only shown once
5. Click **Save**

---

## Step 7 — Add test users

While your OAuth consent screen is in **Testing** mode, only listed emails can sign in:

1. Go to [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience)
2. Under **Test users** → **Add users** → add your email
3. Save

---

## Step 8 — Build and test

```bash
npx expo run:android
```

Expected Metro logs on success:
```
[Auth] Google sign-in account selected: user@gmail.com
[Auth] Google sign-in successful: user@gmail.com
```

---

## Troubleshooting

### `DEVELOPER_ERROR`
Most common cause — SHA-1 mismatch. Check in order:
1. Run `apksigner` on the built APK (Step 2) and compare to Google Cloud Console
2. Confirm package name in Google Cloud matches `android.package` in `app.json`
3. Confirm `EXPO_PUBLIC_WEB_CLIENT_ID` is the **Web application** client, not Android
4. Wait 15–30 min after creating/updating credentials (Google propagation delay)

### Account picker not showing (auto-selects last account)
Add `GoogleSignin.signOut()` before `GoogleSignin.signIn()` in `utils/google-sign-in.ts`:
```ts
try { await GoogleSignin.signOut(); } catch (_) {}
const result = await GoogleSignin.signIn();
```

### `Missing EXPO_PUBLIC_WEB_CLIENT_ID` warning
Web client ID is not set in `.env`. This is required for Android. See Step 4.

### Sign-in works but Supabase has no user
The Supabase Google provider is not enabled or the client secret is wrong. Re-check Step 6.

---


