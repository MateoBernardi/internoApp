# Code Audit Log

## FULL AUDIT: 2026-06-05

Scope: full TypeScript/React Native (Expo) codebase — 199 source files under `app/`, `components/`, `features/`, `shared/`, `hooks/`, `context/` (excluding `node_modules`, `.expo`, `dist/`, `.venv`).

Metrics:
- `as any` / `: any` occurrences: **107**
- `console.*` calls in shipped code: **115**
- Test files: **0** (no Jest/Vitest config, no `__tests__`, no `test` script in `package.json`)
- Largest component: `Solicitud.tsx` at **2098 lines**

---

### 🔴 Critical

_None._ Secret hygiene is sound: `.env` and `google-services.json` are both gitignored and **not** tracked in git history. The Firebase web API keys present in `.env` and `public/firebase-messaging-sw.js` are public-by-design client identifiers (protected server-side by Firebase rules), not true secrets. No `eval`, hardcoded passwords, or committed credentials found.

---

### 🟠 High

**H1 — Zero automated tests across the entire codebase.**
No test files, no test runner configured, no `test` script in `package.json`. Critical security-sensitive logic (JWT decode, refresh-token rotation/reuse detection in `AuthSessionService.ts`, date validation in `useValidacionFechas.ts`, mappers in `solicitudMapper.ts`/`actividadMapper.ts`) has no regression coverage. Test naming/structure conventions could not be assessed because none exist.
- _Recommendation:_ Add Jest + `@testing-library/react-native`. Prioritize `features/auth/services/AuthSessionService.ts` and the DTO mappers.

**H2 — Dead duplicate file: `features/solicitudesActividades/views/ActividadDetalle.tsx` (1239 lines).** ✅ RESOLVED
A near-identical twin of `components/ActividadDetalle.tsx` (1266 lines). Only the `components/` version is imported (by `views/AgendaPersonal.tsx`); the `views/` version is imported nowhere. 1239 lines of unmaintained code that will drift from its live counterpart and confuse contributors.
- _Recommendation:_ Delete `features/solicitudesActividades/views/ActividadDetalle.tsx`.

**H3 — God components.** 🔄 IN PROGRESS (Solicitud/ConversacionChat)
Several files far exceed maintainable size, mixing data fetching, business logic, and presentation:
- `Solicitud.tsx` — 2098 → **1466** lines (−30%)
- `AgendaPersonal.tsx` — 1342 → **606** lines (−55%)
- `ConversacionChat.tsx` — 1323 → **684** lines (−48%)
- `VerResultadoEncuestas.tsx` — 1304 → **195** lines (−85%)
- `CrearEncuesta.tsx` — 745 → **257** lines (−65%)
- `CrearSolicitud.tsx` — 967 → **655** lines (−32%)

These are hard to test, review, and reason about. `Solicitud.tsx` and `ConversacionChat.tsx` overlap heavily (both implement chat/attachment/document-picker flows with copy-pasted catch blocks).
- _Recommendation:_ Extract shared chat/attachment logic into a hook (e.g. `useChatAdjuntos`); split rendering into subcomponents.
- _Progress (2026-06-05):_ Created shared `features/solicitudesActividades/conversacion/` (861 lines): `styles.ts`, `constants.ts`, and hooks `useAlertModal`, `useMessagesScroll`, `useMarcarVisto`, `useAdjuntos`, `useParticipantesManager`, `useCompartirSelection`. Both components rewired to consume them (Phases 0–6). The **logic** layer is now deduplicated and single-source.
- _Left inline by design:_ the **render** layer (participants section, message list, composer, share modal, outer shell) genuinely diverges between the two modals — Solicitud has date-change rows + an inline date editor + agenda banners; Chat gates participants on `es_grupo`, shows an archivos button, and slices differently. Unifying these would trade duplication for branchy conditional components, so they were intentionally not merged. No tsc/eslint regressions across any phase.
- _AgendaPersonal (2026-06-05):_ split 1342 → 606 lines. Extracted `agenda/dateUtils.ts` (pure date helpers, dropped dead `parseLocalDateTime`), `agenda/activityMappers.ts` (`mapActivities`/`mapLicencias`), and presentational `components/AgendaToolbar.tsx`, `components/AgendaMonthGrid.tsx`, `components/CrearActividadModal.tsx`. `AgendaSemanal`/`AgendaDiaria`/`ActividadDetalle` untouched (same props). Behavior-preserving; deduped the iOS/Android date-picker `value` ternary; dropped 7 dead styles. No tsc/eslint regressions.
- _Encuestas (2026-06-05):_ split `VerResultadoEncuestas` 1304 → 195 and `CrearEncuesta` 745 → 257. Shared `components/EncuestasScreenHeader.tsx` dedupes the centered header (6 sites across both). `VerResultadoEncuestas` exploded into `resultados/`: shared `styles.ts` + `utils.ts` (`agruparEncuestas`/`calcularTotalRespuestas`/`getTipoPreguntaLabel` + `RespuestaAgrupada`), a deduped `RespondentesModal` (was copy-pasted 3×), and `DetalleResultados` + `RespuestasRating/Texto/MultipleChoice/SiNo`. `CrearEncuesta` extracted `FormularioPregunta.tsx` + shared `crearEncuestaStyles.ts`. Pruned 21 dead styles. Behavior-preserving; no tsc/eslint regressions.
- _CrearSolicitud (2026-06-05):_ split 967 → 655. Reused `conversacion/hooks/useAlertModal` (its `alertModal`+`showModal` was identical). Extracted the picker logic into a new `conversacion/hooks/useFilePicker` and refactored `useAdjuntos` to compose it (public API unchanged → Solicitud/Chat untouched); CrearSolicitud now reuses `useFilePicker` (keeps its own adjuntar-menu labels; internal camera/doc error-toast wording standardized to the shared hook's). Extracted `crearSolicitudUtils.ts` (date helpers) and `crearSolicitudStyles.ts`. The custom upload (with `usuarios_compartidos`) stays inline since it diverges from `useAdjuntos`. No tsc/eslint regressions (the lone remaining `uploadArchivo` exhaustive-deps warning is pre-existing).

---

### 🟡 Medium

**M1 — Pervasive `as any` / `: any` (107 occurrences) defeats type safety.**
Hotspots: mappers casting DTO fields (`(inv as any).id_usuario_invitado`, `actividadMapper.ts:158-159`), error handling (`catch (error: any)` everywhere then `error?.statusCode`), and React Query mutation payloads typed `data: any` (`useReportes.ts:69,90`). This is the same class of risk recorded in memory [[feedback_dto_runtime_mismatch]] — runtime shapes diverge from declared types and `any` hides it.
- _Recommendation:_ Type API error objects with a shared `ApiError` interface; replace mapper `as any` casts with explicit DTO union types.

**M2 — Route navigation bypasses typed routes via `as any`.**
`typedRoutes: true` is enabled in `app.config.ts`, but ~10 `router.push(... as any)` / `pathname: '...' as any` casts (e.g. `_layout.tsx:87,96`, `LoginForm.tsx:154,160`, `CambiarContrasenaView.tsx:186`) discard the type checking the feature is meant to provide.
- _Recommendation:_ Use the generated `Href` types instead of casting; the project already imports `Href` correctly in `app/(tabs)/_layout.tsx`.

**M3 — Web stores auth tokens in `localStorage` (XSS exposure).**
`AuthSessionService.ts:33-42` uses `localStorage` for access/refresh tokens on web (SecureStore on native). Any XSS on the web build can exfiltrate tokens. Partially mitigated by the CSP in `+html.tsx`, but that CSP itself is weakened (see L4).
- _Recommendation:_ Accept as a known tradeoff and document it, or move to httpOnly-cookie-based refresh; at minimum keep the refresh token out of JS-readable storage if the backend can set cookies. KNOWN TRADE OFF

**M4 — Dead code / Expo template leftovers.**
Never imported anywhere:
- `components/hello-wave.tsx` (`HelloWave`)
- `components/parallax-scroll-view.tsx` (`ParallaxScrollView`)
- `components/ui/collapsible.tsx` (`Collapsible` — no import statements reference it)
- `app/modal.tsx` — placeholder screen literally rendering "This is a modal", still registered as a Stack screen in `_layout.tsx:175`
- _Recommendation:_ Delete all four; remove the `modal` Stack.Screen registration. RESOLVED

**M5 — Stale standalone artifact tracked in git: `solicitudes-licencias.html` (31 KB).**
A static HTML file at repo root, unrelated to the Expo build pipeline, committed to the repo.
- _Recommendation:_ Confirm it is not a build input (it isn't referenced by any source file) and delete, or move to `docs/`. RESOLVED

---

### 🔵 Low — ✅ ALL RESOLVED (2026-06-05)

> L1: added `shared/silenceConsole.ts` (no-ops all console in non-`__DEV__` builds), imported once at top of `app/_layout.tsx`.
> L2: stripped `❌` emojis from `userApi.ts` error logs.
> L3: extracted `throwApiError(errorText, response)` into `shared/apiRequest.ts`; replaced 11 copy-pasted one-liners across `solicitudesApi.ts`, `reportesApi.ts`, `archivosApi.ts`.
> L4: removed `'unsafe-eval'` from the CSP `script-src` in `app/+html.tsx`.
> L5: documented the intent of the two `exhaustive-deps` suppressions in `Solicitud.tsx` (deps are recompute triggers, not consumed values).
> L6: removed the unvalidated `router.push(trimmed)` fallback in the notification deep-link handler (`_layout.tsx`); malformed URLs now return `false`.

**L1 — 115 `console.*` calls ship to production.**
No logging abstraction or environment gating. Verbose `console.error`/`console.info` (e.g. `solicitudesApi.ts:192` logs request params on every search; `userApi.ts` logs full response bodies on error) will run in release builds, hurting performance and leaking response contents to device logs.
- _Recommendation:_ Introduce a `logger` wrapper that no-ops (or routes to a service) when `!__DEV__`.

**L2 — Decorative emojis in error logs.**
`userApi.ts` uses `console.error("❌ ...")` in 6 places. Inconsistent with the rest of the codebase and noisy in aggregated logs.

**L3 — Duplicated inline error-parsing boilerplate.**
The exact one-liner `try { const errData = JSON.parse(errorText); throw new Error(...) } catch (e) {...}` is copy-pasted across `solicitudesApi.ts` (5×), `reportesApi.ts`, `actividadesApi.ts`. 
- _Recommendation:_ Extract a `throwApiError(errorText, response)` helper into `shared/`.

**L4 — CSP allows `unsafe-inline` and `unsafe-eval`.**
`app/+html.tsx:38` sets `script-src 'self' 'unsafe-inline' 'unsafe-eval' ...`. The inline comment acknowledges it's needed for SW registration + inline styles, but `unsafe-eval` meaningfully widens XSS impact (compounds M3's token exposure).
- _Recommendation:_ Move the SW-registration and style blocks to hashed/nonce'd external files and drop `unsafe-eval`.

**L5 — Two `react-hooks/exhaustive-deps` suppressions in `Solicitud.tsx` (lines 376, 739).**
Disabled lint rules around effect dependencies are a common source of stale-closure bugs. Worth revisiting when M3 splits the component.

**L6 — Notification deep-link fallback is loosely validated.**
`_layout.tsx` correctly validates URL origin and `/`-prefix for the happy path (good defensive code), but the `catch` fallback (`:58-61`) will `router.push(trimmed)` for any string starting with `/`, bypassing the URL parse. Low risk since payloads come from your own push backend, but it's an unvalidated navigation sink.

---

### Notes / things done right
- Refresh-token rotation with **reuse detection** and single-flight locking in `AuthSessionService.ts`; tokens are **fingerprinted** in logs, never logged raw.
- Secrets correctly externalized and gitignored.
- Consistent feature-folder architecture (`dto` → `mappers` → `models` → `services` → `viewmodels` → `views`).
- Error catches generally surface user-facing messages rather than silently swallowing (only one truly empty catch: `+html.tsx:218`, on a non-critical SW path).
