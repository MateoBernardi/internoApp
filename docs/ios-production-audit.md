# iOS Production Readiness Audit

**Date:** 2026-05-19
**Expo SDK:** ~54.0.33 (from package.json)
**EAS Profile audited:** production

## Summary

| Area | Status |
|------|--------|
| App identity | Needs confirmation |
| EAS Build configuration | Needs confirmation |
| Icons and splash screen | Pass |
| Permissions | Needs confirmation |
| Environment variables and secrets | Pass |
| Dependencies | Pass |
| App Store metadata | Pass |
| OTA updates | Pass |
| Debug artifacts | Pass |
| Source code build hygiene | Pass |

## Detail

### 1. App identity

- **bundleIdentifier:** `"ar.com.italoarg"` — Pass. Reverse-domain notation aligned to `italoarg.com.ar`. Evidence: `app.config.ts` → `ios.bundleIdentifier`.
- **name:** `"Italo Argentina"` — Pass. Evidence: `app.config.ts` → `name`.
- **slug:** `"internoApp"` — Pass. Consistent with `package.json` `name: "internoapp"`. Evidence: `app.config.ts` → `slug`.
- **version:** `"1.0.4"` — Pass. Valid semver. Evidence: `app.config.ts` → `version` and `package.json` → `version`.
- **buildNumber / ios.buildNumber:** Not set in `app.config.ts`. The `eas.json` production profile has `"autoIncrement": true` and the CLI section has `"appVersionSource": "remote"`, meaning EAS manages the build number remotely. — **Needs confirmation.** Cannot verify the current remote value or that a prior iOS build exists. Confirm via `eas build:list --platform ios` before submitting.

---

### 2. EAS Build configuration

- **production profile exists:** Yes — Pass. Evidence: `eas.json` → `build.production`.
- **distribution:** `"store"` — Pass. Explicitly set for production. Evidence: `eas.json` → `build.production.distribution`.
- **autoIncrement:** `true` — Pass. Evidence: `eas.json` → `build.production.autoIncrement`.
- **appVersionSource:** `"remote"` — Pass. Centralized version management. Evidence: `eas.json` → `cli.appVersionSource`.
- **Credentials source:** Not set in `eas.json`. EAS defaults to its own remote credential storage (Expo-managed). — **Needs confirmation.** Verify that iOS distribution certificate and provisioning profile have been generated and are available in EAS (`eas credentials`). Evidence: `eas.json` → `build.production` (no `credentialsSource` field).

---

### 3. Icons and splash screen

- **ios.icon (explicit):** Not set under the `ios` key. Expo falls back to the top-level `icon` field for iOS. Evidence: `app.config.ts` → `icon: "./assets/images/icon-1024.png"` (top-level); `ios` section has no `icon` key.
- **Icon file exists:** `./assets/images/icon-1024.png` is present on disk — Pass.
- **Icon dimensions:** 1024×1024 — Pass. Verified with `file` command output.
- **Icon transparency:** Pass. The PNG was converted to RGB (no alpha channel) for App Store compliance.
- **Splash screen image:** Configured via `expo-splash-screen` plugin with `image: "./assets/images/icon-1024.png"` — Pass. File exists.
- **Splash resizeMode:** `"contain"` — Pass. Evidence: `app.config.ts` → `plugins` → `expo-splash-screen` → `resizeMode`.

---

### 4. Permissions

- **UIBackgroundModes:** `["remote-notification"]` declared — Pass. Appropriate for push notifications. Evidence: `app.config.ts` → `ios.infoPlist.UIBackgroundModes`.
- **expo-image-picker permissions:** The plugin is listed under `plugins` and auto-injects `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription` into the generated `Info.plist`. — **Needs confirmation.** These strings are plugin-generated and cannot be verified from static file reading alone. Confirm by running `npx expo config --platform ios` and inspecting the output.
- **Microphone / RECORD_AUDIO:** Audio recording is not used and no Android `RECORD_AUDIO` permission is present. iOS does not need `NSMicrophoneUsageDescription` for this build.
- **GOOGLE_SERVICES_IOS / Firebase on iOS:** Firebase native iOS SDK integration is not required. `expo-notifications` + APNs is the only native channel. `GOOGLE_SERVICES_IOS` remains unset by design.

---

### 5. Environment variables and secrets

**.env keys found (values not shown):**
- `API_BASE_URL`
- `FIREBASE_API_KEY`
- `FIREBASE_APP_ID`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_VAPID_PUBLIC_KEY`
- `GOOGLE_SERVICES_JSON`
- `VITE_FEATURE_FOLDERS`

**.env.local keys found (values not shown):**
- `API_BASE_URL`
- `FIREBASE_VAPID_PUBLIC_KEY`
- `GOOGLE_SERVICES_JSON`

**.eas/.env/ contents:**
- `GOOGLE_SERVICES_JSON` (single file, 673 bytes — appears to be the Android Google Services JSON file stored for EAS build injection)

**Findings:**
- `app.config.ts` → `extra` exposes `API_BASE_URL` (a URL, not a secret) and `VAPID_PUBLIC_KEY` (a VAPID public key, designed to be public) — Pass. No secret values in `extra`.
- **Pass (documented).** Firebase configuration is hardcoded directly in `features/devices/services/webPush.ts` for **web-only** FCM usage. This is intentional and aligns with the decision to avoid native Firebase on iOS. The `.env` values remain unused for this path.

---

### 6. Dependencies

- **expo SDK pinned:** `"expo": "~54.0.33"` — Pass. Uses `~` (patch-range pin).
- **react-native version compatibility:** `"react-native": "0.81.5"` — Pass. Expo SDK 54 targets React Native 0.81 (Expo docs table for SDK 54).
- **Pre-release packages in dependencies:** No packages with `alpha`, `beta`, `rc`, or `canary` in their version string were found in `dependencies` — Pass.
- **expo-dev-client in production dependencies:** `"expo-dev-client": "~6.0.20"` is in `dependencies`, not `devDependencies`. Because the EAS production profile does not set `developmentClient: true`, the development client features are inactive at runtime in production builds. This is an accepted Expo pattern for managed workflow. — Pass (with note: if bundle size is a concern, this can be moved to `devDependencies` for production profiles that do not use it).

---

### 7. App Store metadata

- **ios.supportsTablet:** `true` — Pass. Evidence: `app.config.ts` → `ios.supportsTablet`.
- **ios.requireFullScreen:** Not set — Pass. iPad multitasking is supported by design. Evidence: `app.config.ts` → `ios` (field absent).
- **userInterfaceStyle:** `"automatic"` — Pass. Evidence: `app.config.ts` → `userInterfaceStyle`.
- **orientation:** `"portrait"` — Pass. Evidence: `app.config.ts` → `orientation`.

---

### 8. OTA updates

- **expo-updates present:** `"expo-updates": "~29.0.16"` in `dependencies` — Pass.
- **updates.url:** `"https://u.expo.dev/f7cef901-9e89-441f-8cb3-ceb9c01a8b6c"` — Pass. Points to the EAS Update production endpoint for this project. Evidence: `app.config.ts` → `updates.url`.
- **updates.fallbackToCacheTimeout:** Not set — Pass. SDK 54 default behavior is accepted (launch cached, check in background).
- **runtimeVersion policy:** `"appVersion"` — Pass. Ensures OTA updates are only delivered to builds with the same app version. Evidence: `app.config.ts` → `runtimeVersion.policy`.

---

### 9. Debug artifacts

**console.log calls found:** None in `.ts`/`.tsx` source.

**debugger calls:** None found — Pass.
**Hardcoded localhost / 127.0.0.1:** None found in source files — Pass.

---

### 10. Source code build hygiene

**TODO / FIXME comments found in source (`.ts`, `.tsx` files):** None.

**Hardcoded local URLs:** None found — Pass.

**TypeScript compilation errors (inferable from static reading):** None identified — Pass.

---

## Blocked Items

None currently identified.

---

## Needs Confirmation

1. **App identity — ios.buildNumber / autoIncrement:** Confirm the current remote build number via `eas build:list --platform ios`. Confirm that the number will be correctly incremented on the next production build.

2. **EAS Build configuration — credentials:** Run `eas credentials` and confirm that an iOS Distribution Certificate and App Store Provisioning Profile are active and not expired.

3. **Permissions — expo-image-picker auto-injected strings:** Run `npx expo config --type prebuild --json` and verify `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription` appear in the resolved config output.
