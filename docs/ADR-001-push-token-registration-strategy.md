ADR-001: Push Token Acquisition and Device Registration Strategy
Date: 2026-04-01
Status: Accepted
Lab: Notifications
Deciders: Frontend squad

## Context
The app supports push notifications in native (iOS/Android) and web. The system must register a device only after authentication and with a valid access token. In web, permission prompts should be triggered by explicit user gesture and not automatically on app load.

## Decision
Use a unified registration strategy through the device hook:

- Native path:
  - Request permission using Expo Notifications APIs.
  - Get Expo push token with projectId.
  - Register device in backend only when enabled and authenticated.
- Web path:
  - Do not auto-request permission on mount.
  - Expose a user-gesture function to request permission and token.
  - Register FCM token only when enabled and authenticated.
- Reliability guards:
  - Fingerprint deduplication per platform/accessToken/token.
  - Invalid-token memory to avoid repeated failing registrations.

## Alternatives Considered
| Alternative | Reason Rejected |
| --- | --- |
| Auto-request web permission at startup | Allows pre-auth subscription behavior and poor UX. |
| Register device before login | Cannot associate token safely to a user session. |
| Separate unrelated systems per platform | Duplicates logic and increases maintenance cost. |

## Consequences
### Positive:
- Prevents anonymous pre-auth registration to backend.
- Web permission flow aligns with browser constraints.
- Reduced duplicate registrations and retries.

### Negative:
- Web requires explicit user action to enable push.
- More hook state/guards and operational complexity.

### Constraints introduced:
- Registration requires enabled + authenticated + accessToken + pushToken.
- Backend token validation must remain platform-aware.

## Pros
- Better security posture for user-token binding.
- Lower risk of accidental subscriptions in login screens.
- Consistent architecture across native and web.

## Cons
- Extra UX step for web push enablement.
- More conditional branching in hook lifecycle.

## Tools
- React hooks (useEffect, useState, useRef, useCallback)
- Expo Constants configuration
- Local deduplication guards (fingerprint and invalid-token set)

## APIs used
- Expo Notifications:
  - getPermissionsAsync
  - requestPermissionsAsync
  - getExpoPushTokenAsync
  - setNotificationChannelAsync
  - addPushTokenListener
- Backend:
  - POST /devices

## Libraries in use
- expo-notifications
- expo-device
- expo-constants
- react-native
- firebase (web path)
