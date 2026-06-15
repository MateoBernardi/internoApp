# iOS Expo Build from linux (No Mac, No 2FA)

This guide explains how to configure Apple production credentials manually in the Expo dashboard so that `eas build` runs fully remote and does not request local Apple credentials.

## Prerequisites

- Active Apple Developer account (Account Holder or Admin role).
- Git Bash installed on linux (includes `openssl`).
- `app.json` configured with the correct `bundleIdentifier` (example: `ar.com.italoarg`).

## Phase 1: Create the Distribution Certificate (.p12) Without macOS

Since you do not have the macOS Certificate Assistant, use OpenSSL to sign the request.

### Step 1.1: Create the private key and CSR

1. Open Git Bash on linux.
2. Go to a temporary folder (example: `cd ~/Desktop`).
3. Generate the private key:

```bash
openssl genrsa -out private.key 2048
```

4. Generate the certificate signing request (CSR):

```bash
openssl req -new -key private.key -out request.certSigningRequest
```

When prompted, set Country to `AR` and press Enter to skip the rest.

### Step 1.2: Request the certificate in Apple Developer

1. Go to Apple Developer Portal -> Certificates, Identifiers & Profiles.
2. In Certificates, click `+`.
3. Select Apple Distribution (or iOS Distribution) -> Continue.
4. Upload `request.certSigningRequest` from the previous step.
5. Download the generated certificate (usually `distribution.cer`) and save it in the same folder.

### Step 1.3: Convert to .p12

Expo requires the certificate bundled with the private key in `.p12` format.

```bash
openssl pkcs12 -export -out certificado.p12 -inkey private.key -in distribution.cer
```

Create a simple password you can remember. You will enter it later in Expo.

## Phase 2: Create the App ID and Provisioning Profile (.mobileprovision)

### Step 2.1: Register the App ID (Identifier)

1. In Apple Developer, go to Identifiers and click `+`.
2. Select App IDs -> Continue, then App -> Continue.
3. Fill the fields:
   - Description: internal name (example: `App Interno Production`).
   - Bundle ID: Explicit, and must match `app.json` exactly (example: `ar.com.italoarg`).
   - Capabilities: leave empty unless you need very specific Apple services.
4. Click Continue -> Register.

### Step 2.2: Generate the Provisioning Profile

1. In Apple Developer, go to Profiles and click `+`.
2. Under Distribution, select App Store Connect (required even for private or unlisted distribution).
3. App ID: select the identifier you just created.
4. Certificates: select the distribution certificate from Phase 1.
5. Name the profile (example: `App Interno Profile`) -> Generate -> Download.
6. Save the `.mobileprovision` file.

## Phase 3: Configure Push Notifications (APNs Key)

If your app uses Expo push notifications, you need a `.p8` key.

1. In Apple Developer, go to Keys and click `+`.
2. Key Name: example `Expo Push Key`.
3. Enable Apple Push Notifications service (APNs) -> Continue -> Register.
4. Download the `.p8` file (only available once).
5. Copy the 10-character Key ID.
6. Copy the Team ID from your Apple Developer account (top right or Membership details).

## Phase 4: Upload Credentials to Expo Dashboard

1. Sign in to Expo Dashboard and open your project.
2. Go to Project Settings -> Credentials.
3. Select the iOS tab and locate your Bundle ID (`ar.com.italoarg`). If it does not exist, add it.
4. Click the three dots (...) -> Upload credentials manually:
   - Distribution Certificate: upload `certificado.p12` and provide its password.
   - Provisioning Profile: upload the `.mobileprovision` file.
   - Push Notification Key: upload the `.p8` file and provide Key ID and Team ID.

## Phase 5: Run the Production Build

With credentials stored in Expo, run your usual build command from Windows:

```bash
eas build -p ios --profile production
```

Answer the interactive CLI prompts as follows to force cloud credentials:

- Do you want to log in to your Apple account? -> `n`
- Would you like to set up Push Notifications for your project? -> `n`

Why `n`? This prevents the CLI from trying to create local credentials. Expo will still use the credentials you uploaded in Phase 4.

## Expected Result

The CLI should print: `Using iOS credentials from Expo server` and the build will run without local passwords or 2FA.

## Optional Tip: Avoid encryption prompts in TestFlight

To avoid manual export compliance prompts in TestFlight, add this to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "ar.com.italoarg",
      "config": {
        "usesNonExemptEncryption": false
      }
    }
  }
}
```
