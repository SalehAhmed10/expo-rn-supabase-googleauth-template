---
name: react-native-best-standards
description: Enforces React Native best coding standards, including TypeScript checks for all files, no use of type any, 2-space indentation, and Colors.light tokens in StyleSheet-based colors.
---

# React Native Best Coding Standards

Use this skill when creating or editing React Native code in this repo.

## TypeScript rules

- TypeScript for all source files; use `.ts`/`.tsx` where applicable.
- Avoid `any` in types, props, and state. Use explicit types or generics instead.
- Keep types close to usage (local type aliases or interfaces inside files) unless shared.
- Make sure NO typescript warnings or presented in any file
- Prefer formSheet from the expo router instead of @gorhom/bottom-sheet'

## Formatting

- Use 2-space indentation.
- Name component files using CamelCase (e.g. `GoogleSignInSheet.tsx`).
- Ensure there are no TypeScript warnings in any file.

## Dependencies
- After a new dependency is installed, running npx expo prebuild it's need it to be run to check the installation went smoothly or not
- If the prebuild went well, it is time to run npx expo start -c

# Effects and updates

- Since Expo SDK 54 React Compiler in React Native lets you delete most useMemo and useCallback. The compiler automatically handles memoization and referential stability at compile time, avoid useCallback and useMemo in most cases, useEffects only when there is no other way

## Styling

- All color values must come from the color pallete from the `constants/theme.ts` file.
- Do not use `useThemeColor`; set colors directly in `StyleSheet.create` (example: `backgroundColor: Colors.light.background`).
- Do not hardcode hex/rgb values in styles; reference `Colors.ligh or Color.dark` tokens instead.
