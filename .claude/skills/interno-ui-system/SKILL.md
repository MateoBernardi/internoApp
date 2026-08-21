---
name: interno-ui-system
description: "Redesign or rewrite a module of this app (screen + its list/detail/create views + modals) to the current design language: glass chrome on page content, solid modals, a consistent header/no-scroll layout shape, sliding tab selectors, and specific list/composer/header conventions learned the hard way on the Solicitudes module rollout. Use when asked to \"redesign\", \"restyle\", \"modernize\", or \"rewrite the UI\" of a module (Documentos, Kanban, Encuestas, Reportes, etc.), or to make one module look/feel consistent with Solicitudes/Chat. Complements glass-ui (form visual recipe) and glass-ui-rollout (mechanics of converting a screen's chrome to glass tokens): this skill is the higher-level playbook covering layout shape, navigation/interaction patterns, and judgment calls beyond swapping colors for tokens."
---

# Interno UI system — module redesign playbook

This is the accumulated playbook from redesigning the Solicitudes module (list screen, `Solicitud` detail, `ConversacionChat`, `CrearSolicitud`, plus the app-wide `AlertModal`/`OperacionPendienteModal`). Read it before touching another module's UI — it captures decisions that were **corrected mid-session based on real user feedback**, which makes it more reliable than guessing fresh from first principles. Each rule below states the *why* so you can judge edge cases instead of following it blindly.

**Skill hierarchy — use these together, not instead of each other:**
- **This skill** — layout shape, navigation/interaction patterns, list/header/modal conventions, the specific gotchas below.
- **`glass-ui`** — the visual recipe for a simple form screen (auth-style: gradient background, translucent inputs, no icons).
- **`glass-ui-rollout`** — the *mechanics* of converting an existing complex screen's chrome to glass tokens (mapping the reachable surface, extending `shared/ui/glass.ts`, the Android `elevation` rule, execution order). Load it when you're deep in the token-conversion phase of a redesign.
- **`input-focus-style`** — web focus-ring fix for `TextInput`, if the module has any.

## 1. Shared components — reuse these, don't reinvent them

| Component | What it is | File |
|---|---|---|
| `SearchBar` | Rounded search box, `lightTint` border, `componentBackground` fill, **no magnifying-glass icon**, built-in clear button | `components/ui/SearchBar.tsx` |
| `CreateButton` | The one circular "add new X" trigger, 40×40, accent-blue glass pill, no `size`/`style` props by design (so no call site drifts) | `components/ui/CreateButton.tsx` |
| `GlassTabSelector` | Segmented tab control with a sliding glass pill indicator, generic over N tabs, plain `Animated` (no Reanimated dependency) | `components/ui/GlassTabSelector.tsx` |
| `GlassButton` | `primary`/`secondary`/`danger`/`success` variants over `glassStyles.button*` — use instead of a raw `TouchableOpacity` for any primary/destructive action | `shared/ui/GlassButton.tsx` |
| `glassColors` / `glassStyles` | The token source of truth: `card`, `modalOverlay`, `modalCard`, `fieldGlass`, `button*`, `pill`, `sheet` | `shared/ui/glass.ts` |
| `FullScreenPortal` | Mounts a screen at the app root so `position: absolute` content covers the tab bar — use for any detail/create screen presented as a full-screen sheet | `shared/ui/FullScreenPortal.tsx` |

Before writing a new search bar, tab bar, card recipe, or button chrome — check this table first. A second bespoke implementation of any of these is a regression, not a variant.

## 2. Screen layout shape: header → bounded top section → flex thread → pinned composer

Every detail/chat screen in this app (`Solicitud.tsx`, `ConversacionChat.tsx`) follows the same shape now. Copy it exactly for any new detail/chat-style screen in another module — don't rederive it:

```
<FullScreenPortal>
  <View style={fullScreen}>            {/* solid bg, absoluteFill, elevation OK (solid, not translucent) */}
    <ModalKeyboardView>
      <View style={container}>          {/* flex: 1 */}
        <Header />                      {/* fixed height, see §3 */}
        <View style={contentBody}>       {/* flex: 1, NOT a ScrollView */}
          {optionalTopSection}           {/* bounded (own max-height), only for short metadata: banners, a chip row — NOT a full list */}
          <View style={cardFlex}>        {/* flex: 1 — the actual content card */}
            <ScrollView style={{flex:1}}>{/* the ONE real scroll region */}
              {items}
            </ScrollView>
            <Composer />                 {/* fixed at the bottom of this card, never inside the scroll */}
          </View>
        </View>
      </View>
    </ModalKeyboardView>
  </View>
</FullScreenPortal>
```

**Why this shape, specifically:** the original `Solicitud.tsx` wrapped *everything* — metadata, the message thread (itself height-capped and internally scrolling), and the composer — inside one outer `ScrollView`. Result: the composer was invisible unless you scrolled the whole screen down first, and there were two nested scroll regions fighting each other. The user's exact words: *"find a way to fit everything on one screen, no scroll in there, its awkward."* The fix wasn't a scroll tweak — it was removing the outer scroll entirely and making the message thread `flex: 1` so it naturally fills the remaining space, with the composer as a flow sibling *after* it (not nested inside it). `ConversacionChat.tsx` already had this shape; `Solicitud.tsx` didn't — when two sibling screens in the same module disagree on layout shape, that's a bug, not a style choice. Match the correct one across all of them.

**When redesigning another module's detail screen**, ask: is there a scrollable list/thread that's the main content? If so, it needs to own `flex: 1` and be the *only* thing that scrolls at that level. Everything above it (participant chips, banners, metadata) goes in a `flexGrow: 0` bounded section; anything that must always stay visible (a composer, a submit bar) goes *after* it as a fixed sibling, never inside its `ScrollView`.

## 3. Header conventions

- **Back/close button is neutral gray, not accent blue.** Every *other* icon button in a header (search-toggle, folder/files, ellipsis-options, add-attachment) uses the accent-blue glass pill (`rgba(26,115,232,0.12)` fill / `rgba(26,115,232,0.35)` border, `glassColors.link` icon). The back chevron specifically does **not** — it gets a neutral gray pill (`rgba(17,24,28,0.03)` fill / `rgba(17,24,28,0.12)` border, `glassColors.textMuted` icon). This was an explicit correction: *"The go back button should not be blue, make it gray."* Define both as separate tokens (`backButton` vs `closeButton` in `conversacion/styles.ts`) — don't parametrize one component with a color prop, since every other module will need the same two-way split.
- **Title is `flex: 1` next to the buttons, not absolutely/flex-centered across the whole bar.** It was tried (a 3-column `flex:1`-rail layout to center the title across the *entire* header regardless of asymmetric button clusters) and reverted — the ask was actually about *vertical* centering, and any horizontal-centering trick that overlays the title across the bar risks colliding with the button cluster on long titles. Keep it simple: `flex: 1`, natural start alignment, `numberOfLines={1}`.
- **Vertical centering of header text is an Android-specific gotcha**, not something `alignItems: 'center'` on the row alone reliably fixes — Android's default font padding pushes text down within its line box. Fix on the `Text` style itself, not the container:
  ```ts
  modalHeaderTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,           // explicit, don't rely on the font's natural metric
    textAlignVertical: 'center',  // Android only, no-op elsewhere
    includeFontPadding: false,    // Android only, no-op elsewhere
  }
  ```
- **Header sizing is a shared token**, not per-screen — `modalHeader`/`modalHeaderTitle`/`closeButton`/`backButton` all live in `conversacion/styles.ts` (or the equivalent shared style file for the module you're touching) so bumping "make it a little bigger" once fixes every screen that shares the header.
- **No decorative subtitle line under the title just to restate what's already visible elsewhere** (e.g. a "N participants · tap to see files" subtitle when the header icons already convey those actions) — it's dead weight. Cut it; if you need a tap-target hint, that's what the tap affordance itself (opacity feedback) should communicate.

## 4. List/card conventions

- **Card recipe**: translucent white fill, hairline border, soft shadow, **no `elevation`**. Mirror the Kanban `ObjetivoItem` recipe (`features/kanban/views/KanbanBoard.tsx`) or the shared `glassStyles.card` token. See `glass-ui-rollout` for the full mechanics and the Android `elevation`+translucency trap.
- **Don't add a separator line between list items once the items are cards with their own border.** A hairline divider between two things that already each have a visible border is visual noise, not signal. Remove it — this was an explicit correction after the card conversion (*"Erase the separator line since now we have got cards on the list"*).
- **Never dim a "no action needed" item with a flat opacity.** The first instinct — `opacity: 0.6` on items with nothing pending — reads as *disabled/blocked*, not *calm*, and was called out immediately: *"currently they seem as if they were blocked."* The correct polarity: leave "nothing pending" items at their **normal**, full-strength glass appearance (untouched — that IS the calm state); reserve emphasis for the **action-required** item instead — brighter/more opaque card fill (near-solid white, not the translucent baseline) plus bold near-black title text. Contrast comes from *making the urgent one louder*, never from *making the normal one quieter*.
- **Semantic status colors (badges, priority tags) are never glass-ified** — this rule carries over unchanged from `glass-ui-rollout`. A tipo/estado badge's color is signal; only its container shape follows the glass pill recipe.
- **A small icon inside a status/type chip reads better than text alone** — e.g. a `pricetag-outline` Ionicon before a tipo label. Cheap, low-risk addition; remember to add `flexDirection: 'row', alignItems: 'center'` to the chip's container if it wasn't already a row (icon + text default-stack vertically otherwise).

## 5. Modals: solid, always — page content: glass, always

This is the single most important reversal from the first pass of this rollout, and it's a blanket rule, not a per-screen judgment call:

> **Any surface that renders as a modal/dialog *over* content — a centered dialog, a file-attachment viewer, a role/participant picker, a blocking spinner — must have a solid, opaque background. Never translucent.** Only page-level chrome that sits *inline* on the flat page background (list-item cards, buttons, tab selectors, input fields) uses the translucent glass recipe.

Why: a modal floats over a dimmed scrim with nothing reliable behind it to blur — unlike a card, which sits on known, flat page background. Translucent modal content over a busy scrim reads as murky, not "glass."

**Implementation: fix this at the shared token, once**, not per file. `glassStyles.modalCard` in `shared/ui/glass.ts` — its `backgroundColor` should be a solid hex (`#ffffff`), not an `rgba(...)`. `glassStyles.modalOverlay` (the dim scrim behind the dialog) is fine as-is; that's not "glass," it's a standard backdrop. Because every dialog in the app — `AlertModal`, `OperacionPendienteModal`, `RoleUserSelectionModal`, `ValidacionFechasModal`, every `conversacionStyles.modalContent` dialog, Kanban's move-objective modal, `NovedadModal` — is built on this one token, fixing it here fixes all of them in one edit. **Grep for `glassStyles.modalCard`/`modalOverlay` usage before starting a new module's rollout** to confirm you're not introducing a second, diverging modal-card style.

## 6. Tab selector (`GlassTabSelector`)

- The sliding indicator must span the **full height of the bar**, not be inset from it (`top: 0, bottom: 0` on the indicator, not `top: 4, bottom: 4`) — matching corner radius to the outer container. An indicator that's shorter than the bar reads as a bug, not a design choice.
- It's generic over N tabs (`tabs: {key,label,showBadge}[]`) — reuse the existing component; don't build a two-tab-only version for a new module.
- Uses plain RN `Animated`, not Reanimated — a 2–3 stop slide doesn't need the extra dependency weight.

## 7. Interaction/navigation judgment calls

- **Move drill-down content out of an inline embedded block and into an explicit modal, triggered by tapping the thing it's about** (e.g. a participants list embedded in a chat's scroll body → moved to a "Participantes" modal opened by tapping the group name). Inline embedding of secondary information competes for space with the primary content (the message thread) and — per §2 — was part of why the screen didn't fit without scrolling.
- **When reusing a collapsible component inside a modal you just explicitly opened, skip the redundant second "expand" tap.** Add an `initialExpanded`/`defaultExpanded` prop rather than making the user tap once to open the modal and again to expand its content — the modal-open action *is* the drill-in gesture already.
- **Contextual wording, not contextual functionality, unless the backend actually supports it.** When an action's label doesn't match the user's mental model in a specific context (e.g. "Ocultar conversación" on a *group* chat, when the user thinks of it as "leaving" the group) — fix the **label** for that context (`solicitud.es_grupo ? 'Salir de la conversación' : 'Ocultar conversación'`) without inventing new backend behavior (e.g. an actual "remove me as participant" mutation) that wasn't asked for and doesn't exist. Don't over-deliver functionality nobody requested; do fix words that lie about what's about to happen.
- **Remove state/refs/handlers that become dead code after a structural change** — e.g. a keyboard-hide scroll workaround that referenced the outer `ScrollView` you just deleted should be repointed at whatever ref is now correct (usually the inner content list's ref), not left dangling or duplicated. Check `grep` for the old ref/style name across the file before considering a structural edit done.

## 8. When an instruction turns out to mean something narrower than you built

This happened once in this rollout and is worth naming: an instruction to "fix the title... in the center" was implemented as *horizontal* centering (a structural 3-column flex rework), and the follow-up correction clarified it meant *vertical* centering only, with an explicit caution against overlap risk. **The fix was a full revert of the structural change, not a patch on top of it** — going back to the simple `flex: 1` layout and solving the actually-requested problem (vertical text alignment) with a narrow, additive style change (`lineHeight`/`textAlignVertical`/`includeFontPadding`). When a correction reveals the *scope* of a request was smaller than what you built, prefer reverting to the pre-change structure over layering a fix onto the misread one — the smaller diff is easier to reason about and less likely to leave orphaned styles/props behind.

## 9. Verification checklist (run every time, not just at the end)

1. `grep -n "elevation"` every touched file — confirm no hit shares a style object with a translucent (`rgba(...,` alpha < 1) `backgroundColor`. This is the one thing TypeScript can't catch.
2. `tsc --noEmit` before vs after (`git stash` / `git stash pop`, compare error *counts*, not just skim). Pre-existing unrelated errors elsewhere in the repo are not yours to fix — matching the baseline count exactly means zero new errors.
3. `npx expo export --platform web --output-dir <scratchpad>` — confirms Metro resolves/compiles every touched file with no import/syntax breakage across the whole changed set in one shot. Delete the output afterward, it's not a deliverable.
4. Grep for now-orphaned styles/refs/props after any structural edit (renamed a ref, deleted a `ScrollView`, removed a subtitle) — dead code left behind by a redesign is easy to miss and easy to grep for.
5. Explicitly tell the user what you *can't* verify from this environment: no simulator/device access means Android's `elevation` drop and real font-rendering (the vertical-centering gotcha in §3) can't be visually confirmed here — say so rather than claiming full confidence.

## 10. Reference implementation

Read these end-to-end before redesigning another module — they're the canonical "after" state:

- `features/solicitudesActividades/views/Solicitudes.tsx` — list screen: tab selector + search/create row ordering, `GlassTabSelector` usage.
- `features/solicitudesActividades/components/SolicitudesList.tsx` / `ChatsList.tsx` — card recipe, action-required vs normal item styling, filter chrome.
- `features/solicitudesActividades/components/Solicitud.tsx` / `ConversacionChat.tsx` — the no-scroll layout shape (§2), header conventions (§3), message-thread day separators, composer layout (attach/send on opposite sides of the input, not bunched together).
- `features/solicitudesActividades/conversacion/styles.ts` — the shared header/card/modal/bitácora tokens both detail screens pull from; this is where a header-wide or modal-wide change belongs, not duplicated per file.
- `components/ui/GlassTabSelector.tsx` — sliding tab indicator implementation.
- `shared/ui/glass.ts` — token source of truth, including the solid-`modalCard` fix from §5.
