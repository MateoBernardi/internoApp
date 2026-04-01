ADR-003: Web Push Service Worker Behavior
Date: 2026-04-01
Status: Accepted
Lab: Notifications
Deciders: Frontend squad

## Context
Web push delivery requires a service worker for background events, notification rendering, and click navigation. The project also needs deterministic generation of the service worker from environment variables.

## Decision
Use Firebase Messaging in the web service worker with generated configuration.

Service worker responsibilities:
- Receive background push messages.
- Show browser notifications with title/body/icon.
- Broadcast payload to active clients for in-app sync when relevant.
- Handle notification click by focusing existing app client or opening target route.

Generation strategy:
- Generate public/firebase-messaging-sw.js from scripts/generate-sw.js using environment variables.

## SW functionality
Background message flow:
- messaging.onBackgroundMessage(payload)
- Build notification options from payload.notification and payload.data
- Show notification via self.registration.showNotification
- Optionally post message to open clients with type PUSH_NOTIFICATION

Notification click flow:
- Read route from data.url or data.link
- Normalize to same-origin path
- Focus existing client and navigate, or openWindow if none exists

## Alternatives Considered
| Alternative | Reason Rejected |
| --- | --- |
| No service worker | Background web notifications do not work reliably. |
| Manual static SW edits | High drift risk with config updates across environments. |
| Non-Firebase custom push stack | Out of scope for current architecture and infra. |

## Consequences
### Positive:
- Reliable web background notification behavior.
- Unified route-open logic when users click notifications.
- Configurable via environment-driven generation.

### Negative:
- Service worker debugging complexity.
- Browser support and secure-context constraints.
- Need to regenerate SW when config changes.

### Constraints introduced:
- SW must be served from app public root.
- Firebase web config and VAPID must be valid.
- Payload should include stable data fields for navigation.

## Pros
- Supports closed/background PWA notification delivery.
- Centralized handling of notification click behavior.
- Clear separation between app runtime and SW runtime.

## Cons
- More moving parts (app + SW + generation script).
- Potential mismatch if generated file is stale.
- Requires HTTPS/secure context in web environments.

## Tools
- Service Worker API
- Firebase Messaging compat scripts
- Node generation script for SW file

## APIs used
- importScripts(firebase app/messaging compat)
- messaging.onBackgroundMessage
- self.registration.showNotification
- self.addEventListener('notificationclick')
- clients.matchAll
- clients.openWindow
- client.focus and client.navigate

## Libraries in use
- firebase-app-compat
- firebase-messaging-compat
- firebase web SDK runtime configuration
