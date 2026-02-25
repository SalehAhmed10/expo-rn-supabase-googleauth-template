---
name: expo-rn-security
description: Security auditing and storage guidance for Expo and React Native apps, including AsyncStorage risk assessment, secure credential storage recommendations, and generating rnsec-based security reports.
---

# Expo/React Native Security

Use this skill to audit Expo/React Native apps for insecure storage and to generate security reports with rnsec.

## Quick workflow

1) Confirm scope and target path (app root, packages, monorepo subdir).
2) Run rnsec and capture findings. See `references/rnsec.md` for usage steps.
3) Review storage usage and enforce the storage policy below.
4) Produce a security report with actionable fixes.
5) `expo-auth-session` can be use only for non critical data and sessions, supabase sessions are fine


## Storage policy (non-negotiable)

- Treat AsyncStorage as public, fully readable.
- Never store auth tokens, passwords, or API secrets in AsyncStorage.
- Use secure alternatives: `expo-secure-store`, `react-native-keychain`, or native Keychain/Keystore.

## Audit checklist

- Identify AsyncStorage usage (imports and direct usage).
- Identify any storage of auth tokens, passwords, API keys/secrets.
- Verify protected routes follow Expo Router guidance: https://docs.expo.dev/router/advanced/protected/
- Suggest secure storage replacements and migration steps.
- Flag hardcoded secrets in code or config files if discovered.

## Report template

Provide the report in this structure unless the user asks for a different format:

- Summary (what was scanned, tooling used, high-level risk)
- Findings (each with severity, file path, and fix)
- Recommended remediation steps
- Follow-up tests or verifications

Keep reports concise and actionable. Use file paths and code locations when possible.
