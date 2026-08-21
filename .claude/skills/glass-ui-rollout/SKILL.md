---
name: glass-ui-rollout
description: Strategy for rolling out this app's glass-ui design system beyond simple auth forms — onto an existing screen full of cards, lists, kanban boards, and modals (centered dialogs, bottom sheets, FullScreenPortal sheets) that currently use ad-hoc opaque StyleSheet colors with no shared wrapper component. Use when asked to redesign/restyle a screen or "module" and its modals to match glass-ui, to extend glassmorphism past the auth flow, or to apply the glass look to lists/cards/modals rather than a plain form. Complements the `glass-ui` skill (which defines the visual recipe for forms) with the process for a larger, messier surface.
---

# Rolling out glass-ui to a complex screen + its modals

`glass-ui`'s own doc (`shared/ui/glass.ts` + `AuthGradientBackground`) is written for simple auth forms: one screen, one card's worth of inputs, a primary button. Real screens in this app (a home tab, a kanban board, a novedades feed) are not that: they're a tree of cards, pills, and 5-10 modals of different shapes, built with per-file `StyleSheet.create` blocks that duplicate the same "white box + hard border + `elevation`" recipe independently, with **no shared card/section wrapper** to restyle once. This doc is the playbook for that harder case, distilled from actually doing it for the Home tab (`app/(tabs)/index.tsx`) + `TablonNovedades`/`TurnoScanCard`/`EncuestasPendientes`/`KanbanBoard` + their 8 reachable modals.

## 1. Map the full reachable surface before touching anything

Don't restyle the screen in isolation — walk its component tree down through every modal it can open, including modals opened by its children's children (a `FormObjetivoModal` opened by `KanbanBoard` can itself open a `RoleUserSelectionModal`). Use an Explore/general-purpose agent for this if the tree is more than 2-3 files deep; it's cheap and keeps the raw file dumps out of your own context. For each node record:

- what it renders and how (native `Modal`, or a custom portal like `FullScreenPortal` — these need different treatment, see §3)
- its current styling: hardcoded hex, or already pulling from a theme/`Colors` object
- whether **any** shared card/wrapper component already exists to restyle once. In a legacy screen like this, expect the answer to be no — every file has its own local `styles.card`. That finding itself determines the whole approach: you're either hand-touching every file, or you introduce the one shared thing that's missing (see §2) and still touch every file, just pulling from one source of truth instead of reinventing rgba per file.

Also check what glass primitives already exist and where they're currently used (e.g. `glassStyles`, `AuthGradientBackground`, `InputWithIcon`'s `variant="glass"`) — you're extending an existing system, not inventing one from scratch, and its established conventions (opacity family, no-elevation rule, `glassColors` palette) are the constraint everything new must fit inside.

## 2. Extend the token file additively, categorized by *contrast context*, not by component name

Add new keys to the existing `glassStyles` object (`shared/ui/glass.ts`) rather than hand-tuning rgba per file. Don't invent a new palette — every new value should be recognizably drawn from the same opacity family as the tokens that already exist (`0.6`/`0.08`/`0.12`/`0.35` etc.).

The key design question for each new token isn't "what component is this for," it's **"what's behind this surface?"** — that determines how opaque it needs to be to stay legible:

- **Sits on the flat page background, with page content around it** (a list-item card, a section header) → light fill (`~0.6` opacity) is fine; the page background shows through and *is* the point of glass.
- **Sits over a dark dimmed overlay with nothing else behind it** (a centered dialog, a bottom sheet) → needs much higher opacity (`~0.92`) or it reads as murky/illegible against the dark dim, not "frosted."
- **A `FullScreenPortal`/full-screen sheet mounted at the app root, covering literally everything including the tab bar** → same near-opaque `~0.92` fill, because there is no page content or blur target behind it at all — whatever rendered a frame earlier is not a reliable backdrop. On these, the "glass" identity has to be carried by the *inner* chrome (input/field fills, header hairlines, small pill buttons) rather than by the outer sheet's translucency, since the outer translucency alone would be indistinguishable from solid white.
- **A small floating element with nothing under it but page content it partially occludes** (a "minimized draft" pill) → mid-opacity (`~0.75`), fully rounded.

Also add a neutral field/input background token and a semantic-danger button token if the screen has delete/destructive actions with their own ad-hoc red recipe today — collecting those into one shared token is what makes the *next* rollout cheaper, not just this one.

## 3. The one non-negotiable rule, and where it hides

**Never pair `elevation` with a translucent `backgroundColor` on Android** — RN forces an opaque shadow-casting layer behind any elevated view, which punches a solid box through the translucency. Every surface you convert almost certainly has an existing `elevation: N` line (2/3/4/6/8/10 are all over a codebase like this) sitting right next to the `backgroundColor` you're about to make translucent. It is not enough to add glass's `shadowColor/Offset/Opacity/Radius` alongside it — the old `elevation` line must be **deleted**, not overridden, because a later style in a merged array wins per-property but an `elevation` key with no counterpart later in the array survives untouched.

This is the single most likely regression in a rollout like this, and it's easy to miss across 10+ files, so treat the final grep in §6 as mandatory, not optional.

## 4. Leave semantic color alone

Glass applies to *structural chrome* — fills, borders, shadows, modal shells, neutral buttons — never to color that *encodes information*: priority indicators, kanban column state colors, activity-timeline state bubbles, badge colors keyed off a status enum. Converting a "PENDIENTE" column's pastel yellow to a translucent white card would erase the signal it exists to carry. When a card sits *inside* an already-colored container (e.g. a glass `ObjetivoItem` card inside a pastel Kanban column), expect — and call out as intentional, not a bug — that the card's translucency will pick up the container's tint showing through.

## 5. Surface real tradeoffs as questions before planning, not after

A handful of decisions in a rollout like this have no objectively-correct default and are genuinely the requester's call — ask them up front (`AskUserQuestion`), each framed with a recommendation and its concrete cost:

- Build one shared card/section token vs. hand-tune every file independently (recommend shared — the whole point of finding "no wrapper exists" in §1 is that duplicating the recipe 10+ times is worse).
- If a modal/component used by this screen is *also* used elsewhere in the app (e.g. a role/user picker shared across features) — restyling it changes those other screens too. That's an accepted-spillover decision, not something to assume either way.
- Whether the page-level background itself changes (e.g. adding a gradient like the auth screens) or stays flat with only cards/modals going translucent — this changes the blast radius a lot (affects the whole tab, not just the components you're touching) for a purely aesthetic choice.

## 6. Plan concretely per file before executing, then execute in order of increasing risk

Don't plan "add glass styles to the modals" — plan the literal StyleSheet key mapping per file (old value → new token, what's hand-tuned instead of spread because it structurally conflicts — e.g. a dashed-border "create" card can't blindly take a solid-border card token). A planning subagent that actually reads each file and proposes the per-key mapping is worth it here; it catches the local conflicts (an inline style override sitting in JSX instead of the StyleSheet, a border color that's a no-op today because it equals the background color) that a pure "apply this token everywhere" pass would miss or silently reproduce.

Execute in this order:

1. The token file itself (zero risk, nothing consumes it yet).
2. The simplest, lowest-blast-radius cases first — leaf cards with no modal, no children.
3. One representative of each *structural shape* by hand: one centered dialog, one bottom-sheet-style native `Modal`, one `FullScreenPortal` full-screen sheet. This is where you resolve the real judgment calls (contrast opacity, what text color pairs with a translucent button fill — see the gotcha below).
4. Everything else that shares one of those shapes — delegate to parallel subagents (forks, if they should inherit this session's context) with an explicit instruction to **read the one or two files you just hand-edited as the reference pattern and copy it, not re-derive the recipe from scratch.** This is far cheaper and more consistent than having each agent invent its own rgba values, and it's safe to parallelize across files that don't overlap.

**Gotcha worth calling out explicitly to any delegate**: `glassStyles.button`'s translucent blue fill (`rgba(26,115,232,0.12)`) is meant to pair with **dark/tinted text** (`glassColors.text` or `glassColors.link`), not white — the existing auth screens already establish this convention. A mechanical "swap the background to the glass token" pass that leaves an old `color: '#fff'` in place produces low-contrast, hard-to-read button text. Every button converted to a glass token needs its paired text color checked, not just its fill.

## 7. Fix bugs the conversion exposes, but only the ones the conversion caused

Occasionally a file has a latent bug that was invisible before and becomes visibly wrong once you touch that exact style — e.g. a hairline border whose color was set equal to the background color (a no-op today), which becomes a jarring visible line once the background turns translucent and the border color doesn't match it anymore. Fix these inline as part of the same edit, since they're directly downstream of the change you're making — but don't use the rollout as cover for unrelated cleanup (dead/unused style keys, other latent bugs unconnected to translucency) in files you're already touching.

## 8. Verify without a device

You usually can't open a simulator from an agent session. Get real signal anyway:

- After all edits, `grep -n "elevation"` every touched file and manually confirm none of the remaining hits sit in the same style object as a translucent (`rgba(...,` alpha < 1) `backgroundColor` — this is the mandatory check for §3's rule and TypeScript cannot catch it.
- Compare `tsc --noEmit` error counts before and after: `git stash`, run it, note the count, `git stash pop`, run it again. An unchanged count means the rollout introduced zero new type errors (pre-existing unrelated errors elsewhere in the repo are not your problem to fix).
- Run a bundler-level smoke test with no device needed: `npx expo export --platform web --output-dir <scratch dir>`. Exit code 0 means Metro successfully resolved and compiled every touched file — it catches import typos, unused-then-removed-import breakage, and syntax errors across the whole changed set in one shot. Clean up the export output afterward; it's not a deliverable.
- Still explicitly tell the requester a real-device pass is worth doing before merge, and call out the one thing that can't be verified any other way: Android drops all `shadow*` props (no-op), so a glass card there is relying on border + fill alone with no shadow depth cue — confirm that still reads as intentional rather than "flat/broken" on an actual Android render.
