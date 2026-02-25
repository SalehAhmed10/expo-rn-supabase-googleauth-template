# Project TODO

## ✅ Done
- [x] Google Sign-In on Android (Supabase + `@react-native-google-signin/google-signin`)
- [x] Apple Sign-In placeholder (iOS stub in place, needs Apple Developer account)
- [x] Supabase auth session management
- [x] Bottom sheet login UI (`login-sheet` route as native `formSheet`)
- [x] Profile screen with Google avatar + name
- [x] Sign-out with account picker reset
- [x] Auth logs (`[Auth]` prefixed console logs)
- [x] Google auth skill guide (`skills/google-auth-supabase/SKILL.md`)

---

## 🔔 Next — Push Notifications

**Goal:** Send push notifications via Expo Notifications + Firebase (Android) + APNs (iOS).

### Tasks
- [ ] Create Firebase project + add Android app → download `google-services.json` → place in `android/app/`
- [ ] Add `@react-native-firebase/app` + `@react-native-firebase/messaging` or use `expo-notifications` (already installed)
- [ ] Add FCM sender ID to `app.json` under `android.googleServicesFile`
- [ ] Implement `registerForPushNotificationsAsync()` — request permission + get Expo push token
- [ ] Store push token in Supabase `profiles` table on login
- [ ] Set up notification handlers (foreground + background + killed state)
- [ ] Test with Expo push notification tool: https://expo.dev/notifications
- [ ] (Optional) Set up server-side trigger via Supabase Edge Function

### Key files to create
- `utils/notifications.ts` — token registration + permission logic
- `hooks/use-notifications.ts` — hook to initialize on app start

---

## 💳 Stripe Payments

- [ ] Create Stripe account + get publishable key
- [ ] Add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env`
- [ ] Wrap app in `<StripeProvider>` (already installed: `@stripe/stripe-react-native`)
- [ ] Create Supabase Edge Function for payment intent creation
- [ ] Build payment sheet UI

---

## 📦 RevenueCat Subscriptions

- [ ] Create RevenueCat account + project
- [ ] Install `react-native-purchases`
- [ ] Configure products in App Store Connect / Google Play Console
- [ ] Implement paywall screen
- [ ] Gate premium features behind entitlement check

---

## 🍎 Apple Sign-In (iOS)

- [ ] Get Apple Developer account ($99/year)
- [ ] Run `eas build -p ios --profile development` to register app + capabilities
- [ ] Add iOS Client ID to Supabase Google provider
- [ ] Test on physical iPhone (Apple Sign-In doesn't work on simulator)

---

## 📧 Emails with Resend

- [ ] Create Resend account + get API key
- [ ] Create Supabase Edge Function for email sending
- [ ] Welcome email on first sign-in
- [ ] (Optional) Custom SMTP config in Supabase Auth settings

---

## 🔧 Dev Tooling

- [ ] Complete Husky + lint-staged setup (`.lintstagedrc.json` exists, verify hooks work)
- [ ] Add ESLint rule for no-console in production builds
- [ ] Set up EAS Update for OTA updates (`eas update`)
