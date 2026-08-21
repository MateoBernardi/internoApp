---
name: glass-ui
description: Apply this app's glassmorphism form style (translucent input boxes/buttons on a light gradient background, no emoji icons) when building or restyling a form screen — login, register, settings, password reset, etc. Use when asked for a "glass" look, to match the auth screens' style, or to redesign a form-heavy screen.
---

# Glass UI form pattern

This is the visual language used for the auth screens (`login`, `crear-usuario`, `cambiar-contrasena`) as of the redesign in this branch. It's a light glassmorphism style: a soft white-to-light-blue gradient behind translucent "glass" input boxes and buttons, no icons inside inputs, and dark text for readability. Reuse the shared pieces below rather than re-inventing rgba values per screen.

## Shared building blocks (reuse, don't duplicate)

- **`shared/ui/glass.ts`** — `glassColors` (text/textMuted/link/placeholder/disabledText/error/success, all tuned for a light background) and `glassStyles` (`box`, `button`, `buttonSecondary`, `errorBox`, `successBox`). Import these instead of hardcoding rgba strings — if the color needs to change, it changes once, everywhere.
- **`shared/ui/AuthGradientBackground.tsx`** — `<AuthGradientBackground />` renders the full-bleed `LinearGradient` (`AUTH_GRADIENT_COLORS`, currently `['#ffffff', '#eaf1fd']`). Also exports `AUTH_GRADIENT_START` for the SafeAreaView/wrapper background colors so there's no color mismatch at the screen edges (see `app/(auth)/_layout.tsx` and each `app/(auth)/*.tsx` route wrapper's `lightColor` prop).
- **`components/InputWithIcon.tsx`** — pass `variant="glass"` to get the translucent box/text/placeholder treatment. `icon` is optional; omit it for the glass look (no emoji icons). The default (`variant="solid"`, the old white-box look) is unchanged, so other screens using this component (`AsociarCuenta.tsx`, `EditarUsuario.tsx`) are unaffected — never change the default variant's styling.

## Applying it to a new screen

1. Root container: render `<AuthGradientBackground />` as the first child of the screen's outermost `flex: 1` view (before the scroll/content), and set that view's own `backgroundColor` to `'transparent'`.
2. Drop any wrapping "card" (`borderRadius` + `backgroundColor` + `shadow*` + `elevation` white box). Content sits directly on the gradient — individual inputs and buttons are the only "boxes."
3. Every `InputWithIcon` gets `variant="glass"`, no `icon` prop.
4. Every button: merge `glassStyles.button` (primary) or `glassStyles.buttonSecondary` (secondary/"back" actions) into the `style` array, e.g. `style={[styles.button, glassStyles.button, ...conditionalStyles]}`. Keep layout-only concerns (`marginTop`, `flex: 1` for side-by-side buttons, `minHeight`) in the screen's local `styles.button`; let `glassStyles.button` own the fill/border/shadow.
5. Recolor all text with `glassColors` tokens — never hardcode `#fff`/dark grays locally: `text` for headings, `textMuted` for helper text, `link` for tappable links, `placeholder` for `TextInput` placeholders (handled automatically by `InputWithIcon`'s glass variant), `error`/`success` for status text, paired with `errorBox`/`successBox` (or the same rgba recipe) for their containers.
6. Cap the form's width with a local `maxWidth` (see gotcha below) and give the parent enough `paddingHorizontal` (this app uses `40`) so the boxes read as inset "floating" elements, not edge-to-edge.
7. If the screen shouldn't scroll (e.g. a short login-style form), don't wrap it in `ScrollView` — use a plain `flex: 1` View inside `KeyboardAvoidingView` so it's pinned to exactly the viewport height.

## Hard-won gotchas (verify these before calling it done)

- **Never pair `elevation` with a translucent `backgroundColor` on Android.** RN Android forces an opaque shadow-casting layer behind any elevated view, which renders as a solid white/gray box punched through the translucent fill — it looks like a broken double-box. This is why `glassStyles.box`/`button` have `shadowColor/shadowOffset/shadowOpacity/shadowRadius` (iOS-only, harmless elsewhere) but **no `elevation`**. If a screen-local style also sets `elevation` and gets merged with a glass style afterward, remove that `elevation` too — it doesn't matter that it's "hidden" earlier in the array, RN merges all keys.
- **Style array order matters, and native/web branches are easy to miss.** A trailing entry in a `style={[...]}` array wins per-property. A bug shipped here because a `maxWidth` computed via `Platform.OS !== 'web' ? 380 : ...` was spread as a *later* array item than the intended narrower `maxWidth` in the StyleSheet — silently overriding it, but only on native. Always test (or at least trace) the native branch of any responsive/platform-conditional width logic, not just the web preview.
- **Web-only preview isn't enough for native-only bugs.** Playwright/browser screenshots can't reproduce Android's `elevation` shadow behavior or catch native-only style-array overrides. When a real-device screenshot disagrees with a web screenshot, trust the device and go find the native-specific code path.
- **Flip text/border colors with background lightness.** `glassColors` here is tuned for a *light* background — don't reuse white text or white-tinted borders (`rgba(255,255,255,...)`) if the background ever moves to something dark; the box would become invisible only reading via its shadow.
- **Guard `TextInput` against row overflow.** Inside a `flexDirection: 'row'` input container, give the `TextInput` `flexShrink: 1` and `minWidth: 0` so a long placeholder/value can't push the row wider than its container.
- **`icon` on `InputWithIcon` is optional but the prop must stay optional at the type level** (`icon?: string`) — other screens (`AsociarCuenta.tsx`, `EditarUsuario.tsx`) still pass emoji icons with `variant="solid"`. Don't remove the icon-rendering branch, just don't invoke it for glass screens.

## Reference implementation

Read these for a working example before building a new screen:

- `components/LoginForm.tsx` + `features/auth/views/LoginScreen.tsx` — simplest case (no-scroll, single card's worth of fields, primary button only).
- `shared/views/CrearUsuario.tsx` — multi-field form with per-field inline errors and a success banner.
- `shared/views/CambiarContrasenaView.tsx` — multi-step form with primary + secondary ("Atrás") buttons and a success step.
