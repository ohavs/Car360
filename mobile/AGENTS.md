Car360 for Android — an Expo (SDK 57) / React Native app. Hebrew only, forced RTL.
The web app lives at the repo root; the conversion plan is `docs/ANDROID_PLAN.md`,
one-time setup is `docs/ANDROID_SETUP.md`.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing code that touches an
Expo or React Native API, check the installed package's types/sources in
`node_modules` (versioned docs: `https://docs.expo.dev/versions/v57.0.0/` when reachable).

## Commands

```bash
EXPO_OFFLINE=1 npx expo install <package>  # SDK-compatible versions (offline: uses expo/bundledNativeModules.json)
npm run typecheck                          # tsc --noEmit
npx eslint .                               # lint, incl. the design-system rule below
npx expo export --platform android         # full JS bundle — catches unresolved imports
npx expo prebuild --platform android       # generate android/ to inspect native output
```

Run typecheck and lint before declaring any task done. The APK itself is built by
`.github/workflows/android.yml` (Gradle, no EAS): pushes to `main` publish a stable
GitHub Release, pushes to any other branch a beta pre-release.

## Rules

- Routes live in `src/app/` (Expo Router). Non-route code stays outside it.
- **Design system:** screens build only from `src/ui`. ESLint forbids importing raw
  controls (`Text`, `Pressable`, `TextInput`, `Modal`, `Alert`, …) from
  `react-native` outside `src/ui/**` — no element may ship with Android defaults.
- Colours come from `src/theme/palettes.ts` (ported 1:1 from the web `index.css`),
  sizes from `src/theme/tokens.ts`. No hard-coded colours in screens.
- Every delete needs a `ConfirmDialog`; every form with unsaved changes must guard
  back/close.
- `android/` is generated (Continuous Native Generation) and git-ignored. Configure
  native behaviour in `app.config.ts` and `plugins/`. Native code of our own lives in
  `modules/` (autolinked Expo modules).
- `google-services.json` is never committed; CI writes it from a secret.
