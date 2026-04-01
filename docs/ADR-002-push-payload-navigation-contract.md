ADR-002: Push Payload and Navigation Contract
Date: 2026-04-01
Status: Accepted
Lab: Notifications
Deciders: Frontend + Backend squads

## Context
Push payloads must navigate users to the correct screens on both native and web. The frontend supports URL-first navigation plus event-based fallback routing. Payload fields may vary between providers and backend events.

## Decision
Adopt a URL-first payload contract with fallback fields.

Primary navigation fields (first non-empty wins):
- url
- link
- path
- deepLink

Accepted URL format:
- Relative app route starting with / (recommended), for example:
  - /solicitud?id=123&type=recibida

Fallback routing fields:
- type or event
- solicitud_id or solicitudId or request_id or requestId
- actividad_id or actividadId
- es_creador or is_creator or creator

## Alternatives Considered
| Alternative | Reason Rejected |
| --- | --- |
| Event-only payloads with no URL | Increases frontend coupling to event semantics. |
| Absolute external URLs only | Not safe for internal app routing control. |
| Different payload shape per platform | Adds backend complexity and drift risk. |

## Consequences
### Positive:
- Single payload contract works across native and web.
- URL-driven navigation is simpler to debug and evolve.
- Fallback fields keep compatibility with legacy events.

### Negative:
- Contract discipline is required in backend emitters.
- Missing URL can still rely on weaker fallback logic.

### Constraints introduced:
- URL paths must match app router routes and params.
- Data values should be string-safe for FCM transport.

## Payloads expected
Recommended payload for new solicitud detail:

```json
{
  "notification": {
    "title": "Nueva solicitud",
    "body": "Tenes una solicitud pendiente"
  },
  "data": {
    "url": "/solicitud?id=123&type=recibida",
    "solicitud_id": "123",
    "type": "nueva_solicitud"
  }
}
```

Event fallback payload example:

```json
{
  "data": {
    "type": "estado_actualizado",
    "solicitud_id": "123",
    "es_creador": "false"
  }
}
```

## Pros
- Predictable deep-link behavior.
- Easier backend implementation with explicit URL target.
- Backward compatibility through fallback aliases.

## Cons
- Multiple legacy field aliases still need maintenance.
- Bad URLs are ignored by safety checks and require fallback.

## Tools
- Expo Router for route push
- URL parser with same-origin guard
- Payload alias resolution map in frontend

## APIs used
- router.push(path)
- URL constructor for path normalization
- Notification payload access via response/request content data

## Libraries in use
- expo-router
- expo-notifications
- react-native
