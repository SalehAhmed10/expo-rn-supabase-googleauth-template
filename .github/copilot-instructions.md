# Copilot Instructions — Expo SaaS Template

## Project Overview
React Native SaaS starter built with **Expo 54**, **Expo Router 6**, **Supabase** (auth + backend), **React 19 + React Compiler**, and native Google/Apple Sign-In. Stripe/RevenueCat integrations are planned but not yet implemented.

## Architecture

### Navigation (Expo Router file-based)
```
app/
  _layout.tsx          # Root Stack — wraps GestureHandlerRootView, declares login-sheet as formSheet
  login-sheet.tsx      # Thin wrapper around <LoginBottomSheet /> — presented as a native sheet
  (tabs)/
    _layout.tsx        # Auth gate: reads supabase session, redirects to /home if authenticated
    home.tsx
    profile.tsx
```
- The `(tabs)/_layout.tsx` owns **all auth state** (`supabase.auth.getSession` + `onAuthStateChange`). There is no global auth context/provider.
- To trigger login, navigate to `"login-sheet"` route (presented as a native `formSheet` at 40% height).
- After successful sign-in, both auth utils call `router.replace('/home')`.

### Auth Utilities (`utils/`)
Sign-in logic lives in plain functions, **not hooks**. They follow a callback-object pattern:
```ts
handleGoogleSignIn({ onLoadingChange, onError, onSuccess, onProfileSyncingChange })
handleAppleSignIn({ onLoadingChange, onError, onSuccess, onProfileSyncingChange, skeletonTimer })
```
Call `configureGoogleSignIn()` once before using `handleGoogleSignIn` (done inside `LoginBottomSheet`).

### Platform-specific Components
Use the `.ios.tsx` / `.tsx` suffix pair for iOS-only native components:
- `components/AppleSignInButton.ios.tsx` — real native Apple button (iOS only)
- `components/AppleSignInButton.tsx` — returns `null` (Android/web stub)

Always create both files when building iOS-exclusive native UI.

### Theming (`constants/theme.ts`)
Single source of truth — import `Colors`, `UI`, `Fonts` from `@/constants/theme`:
- `Colors.light.*` / `Colors.dark.*` — semantic color tokens
- `UI.loginSheet.heightRatio` (0.40) — sheet height constant
- `UI.radii.authButton` — shared border radius
- `Fonts` — `Platform.select`-aware system font stacks

Use `useColorScheme()` from `@/hooks/use-color-scheme` (re-exports RN's hook) to read current scheme.

### Supabase Client (`lib/supabase.ts`)
Singleton created once; uses `AsyncStorage` for session persistence. Always import via `@/lib/supabase`.

## Environment Variables
All public env vars use `EXPO_PUBLIC_` prefix (required by Expo):
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_WEB_CLIENT_ID      # Google OAuth web client
EXPO_PUBLIC_IOS_CLIENT_ID      # Google OAuth iOS client
EXPO_PUBLIC_ANDROID_CLIENT_ID  # Google OAuth Android client
```
Copy `.env.example` → `.env.local` before running locally.

## Android Signing — Important
The project ships with its own `android/app/debug.keystore` (not `~/.android/debug.keystore`). When registering this app in Google Cloud Console for Android OAuth, always use the SHA-1 from the **project** keystore:
```bash
keytool -keystore android/app/debug.keystore -list -v -storepass android 2>&1 | Select-String "SHA1"
# SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```
Do NOT use `~/.android/debug.keystore` — it produces a different SHA-1 and causes `DEVELOPER_ERROR`.

## Developer Workflows

### Local Development
```bash
npm install
npx expo prebuild          # Generates ios/ and android/ — re-run after adding native plugins
npx expo run:ios           # or expo run:android
npx expo start --clear     # Clear Metro cache when things misbehave
npx expo prebuild --clean  # Full native clean rebuild
```

### EAS Builds
```bash
eas build -p ios --profile development   # Internal dev build
eas build -p ios --profile production    # App Store build (auto-increments version)
```
`eas.json` sets `appVersionSource: "remote"` — do **not** manually bump `version` in `app.json` for production.

## Key Conventions
- **Path alias**: `@/` maps to the project root (configured in `tsconfig.json`).
- **StyleSheet**: Use `StyleSheet.create` — no CSS-in-JS or NativeWind.
- **Apple Sign-In is required** for iOS App Store submission; do not remove it.
- **React Compiler** is enabled (`experiments.reactCompiler: true` in `app.json`) — avoid manual `useMemo`/`useCallback` unless profiling shows a need.
- Skills for common patterns are in `skills/` (expo-api-routes, expo-rn-security, react-native-best-standards, upgrading-expo, **google-auth-supabase**).
