# Handoff: Participants Block Redesign (Chat / Activity Modal)

## Overview
This handoff covers a redesign of the **Participants** area inside the chat/activity modal of an internal app ("app interna italo"). In the current product, participants are rendered as a vertical stack of full-width cards — one card per person. As the participant count grows (~10+ is common), this list grows unbounded, pushing the messages thread and composer off-screen and forcing long scrolling inside a single modal — a poor UX.

The redesign replaces that unbounded stack with a **compact, collapsible, fixed-height participants block** so the chat is always reachable, while preserving the modal's existing visual language (no restyle of the rest of the modal).

## About the Design Files
The files in this bundle are **design references created in HTML/React (via in-browser Babel)** — a prototype demonstrating the intended look and behavior, **not production code to copy directly**. The task is to **recreate this design in the target codebase's existing environment** (whatever framework/component library the app uses) following its established patterns. If no front-end environment exists yet, pick the most appropriate framework and implement there. Do not ship the prototype HTML as-is.

The prototype includes a top-level **"Versión actual / Rediseño"** toggle purely so reviewers can compare before/after. The "Versión actual" view documents the legacy layout; only the **"Rediseño"** view is the thing to build.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, and interactions reflect the intended final design and were matched against screenshots of the live app. Recreate the UI faithfully using the codebase's existing components where they exist (avatar, pill button, icon button, bottom sheet/modal). Treat exact pixel values below as targets, but prefer the app's existing tokens/components when they already encode the same intent.

---

## Screens / Views

### 1. Modal body (context — unchanged except the Participants block)
- **Purpose**: View an activity/chat thread, manage its participants, and send messages.
- **Layout** (top → bottom, vertical flow, single scroll container, padding `18px` horizontal):
  1. **Grab/header bar** — `54px` tall, bottom border `1px var(--line)`. A round chevron-down "collapse modal" button (`42×42`, bg `#eef0f2`) right-aligned.
  2. **Summary line** — see below.
  3. **Participants block** — the redesigned component (the focus of this handoff).
  4. **Messages panel** — light-gray rounded container with message cards + composer.
- The modal itself is a bottom sheet: rounded top corners `22px`, white, fills from `46px` below the top of the screen backdrop.

### 2. Summary line ("Participantes: …")
- **Purpose**: At-a-glance text list of who's in the thread.
- **Change from legacy**: This line previously printed every name and wrapped to multiple lines (a secondary contributor to vertical growth). It is now **truncated to the first 2 names + "+N más"**.
- **Style**: font-size `14.5px`, color `--muted (#7a8087)`, line-height `1.45`, margin `2px 0 18px`. The "+N más" fragment is `color:#5a6068; font-weight:600`.
- **Copy**: `Participantes: {name1}, {name2} +{rest} más` (when more than 2). If 2 or fewer, list all names with no suffix.

### 3. Participants block — REDESIGN (the core deliverable)

A single card (`--card #f6f7f9`, `1px solid --line #e8eaed`, radius `14px`) with two states. Above the card sits a **section header row**.

#### 3a. Section header row
- Layout: `flex; align-items:center; justify-content:space-between; margin-bottom:12px`.
- Left: label **"Participantes"** — `16px`, `color:--muted`, `font-weight:500`.
- Right: an actions group (`flex; gap:14px`) containing:
  - **Info icon button** ("i"): round `30×30`, `1.6px solid --navy (#2b1f5c)`, navy glyph, white bg.
  - **"+ Agregar" pill button**: `flex; gap:7px`, `1.6px solid --navy`, navy text, white bg, radius `999px`, padding `9px 16px`, `14.5px`, `font-weight:700`. The "+" is `18px`. Opens the Add bottom sheet.

#### 3b. Collapsed state (default)
A single horizontal row (the whole row is a button), padding `13px 14px`, `flex; align-items:center; gap:14px`:
- **Overlapping avatar stack**: first **4** participants as `30×30` circles, each overlapping the previous by `-10px` (`margin-left:-10px`, first has none), each with a `2px solid #fff` ring. If more than 4 remain, an **overflow chip** "+N" (`30×30`, bg `#e1e5ea`, text `#5a6068`, `font-weight:700`, `12px`, same `-10px` overlap + white ring).
- **Caption** (`flex:1`):
  - Title: **"{count} participantes"** — `15.5px`, `font-weight:700`, `color:--ink (#1c2024)`.
  - Subtitle: **"Tocá para ver y administrar"** (collapsed) / **"Tocá para contraer"** (expanded) — `12.5px`, `color:--muted`.
- **Chevron** (down): `color:#9aa3ab`, rotates `180deg` when expanded (`transition: transform .22s`).
- Tapping anywhere on the row toggles expand/collapse.

#### 3c. Expanded state
Revealed below the collapsed row, separated by a top border `1px solid --line`. **This is the key UX mechanism: the expanded list is height-capped and scrolls internally so the modal never grows.**
- **Search bar** (only rendered when participant count > 6): `flex; gap:8px; padding:10px 12px`, bottom border `1px --line`. A magnifier glyph (`#9aa3ab`) + borderless input, placeholder **"Buscar participante"**, `14.5px`. Filters the list case-insensitively by name substring.
- **List** (`--pp-list`): `max-height:188px; overflow-y:auto; padding:6px 6px`. Custom scrollbar `6px`, thumb `#cdd2d8` radius `99px`. This cap is what bounds the modal — tune to ~3 visible rows.
  - **Row**: `flex; align-items:center; gap:12px; padding:9px 8px; border-radius:10px`. Hover bg `#eef1f4`.
    - Avatar `34×34` (`.sm`), `font-size:14px`.
    - Name `flex:1`, `15.5px`, `font-weight:600`, full name shown.
    - **Remove (×) button**: round `30×30`, bg `--xbg (#9aa3ab)`, white "×" glyph.
  - **Remove animation**: on click, the row gets `opacity:0; transform:translateX(12px)` over `200ms`, then the participant is removed from state.
  - **Empty filter result**: centered "Sin resultados", `color:--muted`, `14px`.
- **Footer** (`--pp-foot`): `padding:9px 14px`, top border `1px --line`, `flex; space-between`, `12.5px --muted`.
  - Left: **"{count} en total"**.
  - Right: text button **"+ Agregar participante"** — `color:--blue (#2f78e8)`, `font-weight:700`, `13px`. Also opens the Add bottom sheet.

### 4. Add participants — bottom sheet (`+ Agregar`)
- **Purpose**: Search and add people not yet in the thread.
- **Trigger**: the header "+ Agregar" pill OR the expanded-state footer link.
- **Layout**: slides up from the bottom over a scrim. Scrim `rgba(17,21,27,.42)`, fade `.22s`. Sheet: white, radius `22px 22px 0 0`, `max-height:74%`, `flex column`, slide-in `transform: translateY(100%) → 0` over `.26s cubic-bezier(.22,.61,.36,1)`. Tapping the scrim closes it.
  - **Grab handle**: `42×5`, radius `99px`, `#d3d7dd`, centered, margin `10px auto 4px`.
  - **Header**: title **"Agregar participantes"** (`18px`, `700`) + subtitle **"Tocá una persona para sumarla a la conversación"** (`13px --muted`).
  - **Search**: boxed input (`--card` bg, `1px --line`, radius `11px`, padding `11px 13px`), magnifier + placeholder **"Buscar por nombre"**, `15px`. Filters the addable pool.
  - **List**: scrollable. Each **row** (`padding:11px 10px; radius:11px`, hover `#eef1f4`, cursor pointer): avatar `.sm` + full name (`15.5px`, `600`) + an **"+ Agregar"** button (`1.6px solid --navy`, navy, radius `999px`, padding `6px 14px`, `13.5px`, `700`).
    - On add: button flips to **"✓ Agregado"** state (`border-color:#1f9d57; color:#1f9d57; bg:#eaf7ef`) for ~`900ms`, the person is added to participants and removed from the addable pool, and a toast fires.
  - **Empty**: "No hay más personas para agregar".

### 5. Messages panel (context — unchanged)
- Container `--panel (#eef0f2)`, `1px --line`, radius `16px`, padding `16px`.
- Header: "Mensajes" (`16px --muted`) left, "Mostrar información completa" link (`14.5px --blue`, `600`) right.
- Message card: white, radius `12px`, padding `14px 14px 16px`. Top row: author name (`16px`, `700`) + timestamp (`13px --muted`). Body bubble: `--bubble (#ededf0)`, radius `9px`, padding `12px 13px`, `15.5px`, `#33373c`.
- Composer: white, `1px --line`, radius `14px`, padding `14px`. Placeholder "Escribir mensaje" (`15.5px`, `#9aa3ab`). Action row right-aligned: round `42×42` buttons (`#eef0f2`): "+" , add-person icon, and a **send** button (bg `--send #5b9bf0`, white paper-plane).

### Legacy view (for reference only — do NOT build)
The "Versión actual" toggle renders the old layout: the same header row, then **one full-width card per participant** (`flex; gap:14px; bg --card; 1px --line; radius:14px; padding:14px; margin-bottom:12px`), each with a `46×46` avatar, name (`17px`, `700`), and × button. This is the unbounded list the redesign replaces.

---

## Interactions & Behavior
- **Toggle collapsed/expanded**: tap the collapsed row → expands the height-capped manager; chevron rotates 180°. Subtitle copy swaps.
- **Remove participant**: tap × → row animates out (`opacity→0`, `translateX 12px`, 200ms) → removed from `people`, returned to the addable `pool`, toast "{name} quitado".
- **Add participant**: open sheet → tap a person (or its "+ Agregar") → added to `people`, removed from `pool`, button shows "✓ Agregado" for ~900ms, toast "{name} agregado". Sheet stays open for multiple adds; scrim/handle closes it.
- **Search (in-list)**: appears only when count > 6; case-insensitive substring filter on the participant list.
- **Search (sheet)**: same filter behavior over the addable pool.
- **Summary line** recomputes from `people` on every change (first 2 names + "+N más").
- **Toast**: pill at bottom center (`bg #22262b`, white, `13.5px`, `600`, radius `999px`), fades/slides in for ~1600ms.
- **Responsive**: the design is a mobile bottom-sheet modal; the participants block should remain full-width within the modal. The `188px` list cap is the responsive safeguard against vertical growth — keep it relative to available modal height if you can (e.g., cap so messages stay visible).

## State Management
State needed (names indicative):
- `people: string[]` — current participants (source of truth for the stack, summary, expanded list, count).
- `pool: string[]` — people available to add (drives the sheet). Removing a participant pushes them back here; adding pulls them out.
- `open: boolean` — collapsed/expanded state of the participants card.
- `listQuery: string` — in-list search text.
- `sheetOpen: boolean` — Add sheet visibility.
- `sheetQuery: string` — sheet search text.
- `justAdded: string[]` — transient, for the "✓ Agregado" confirmation (~900ms).
- `toast: string` — transient toast text (~1600ms).
- In a real app, `people`/`pool` map to thread membership API calls (add/remove member); `pool` is the directory of addable users (likely fetched/searched server-side).

## Design Tokens
Colors:
- `--ink #1c2024` (primary text)
- `--muted #7a8087` (secondary text/labels)
- `--muted2 #9aa3ab` (placeholders, chevrons)
- `--line #e8eaed` (borders/dividers)
- `--card #f6f7f9` (participant card / inputs)
- `--panel #eef0f2` (messages panel, status bar, round buttons)
- `--bubble #ededf0` (message body bubble)
- `--blue #2f78e8` (links / text actions)
- `--send #5b9bf0` (send button)
- `--avatarBg #cfe0f7` / `--avatarInk #3b6fd4` (avatar fill / initials)
- `--navy #2b1f5c` (outlined buttons: info, +Agregar, sheet add)
- `--xbg #9aa3ab` (remove × button bg)
- Success (added): border/text `#1f9d57`, bg `#eaf7ef`
- Toast bg `#22262b`

Typography: system stack — `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Sizes used: 12.5 / 13 / 13.5 / 14 / 14.5 / 15 / 15.5 / 16 / 17 / 18 px. Weights: 500 (labels), 600 (names/links), 700 (titles/buttons).

Border radius: 9 (bubble), 10 (list row), 11 (sheet inputs/rows), 12 (message card), 14 (cards/composer), 16 (messages panel), 22 (modal/sheet top), 999 (pills/chips/avatars).

Spacing: card padding `13–14px`; section header `margin-bottom:12px`; gaps `7–14px`; list cap `max-height:188px`.

Shadows: avatars/chips use a `2px solid #fff` ring instead of shadow; message card `0 1px 2px rgba(0,0,0,.03)`.

Avatar sizes: `46` (legacy/large), `34` (`.sm`, expanded list & sheet), `30` (`.xs`, collapsed stack + overflow chip). Initials = first letter of first two name parts, uppercased.

## Assets
No external image assets. Icons (chevron, magnifier, ×, add-person, send, paper-plane) are inline SVGs in the prototype — replace with the codebase's existing icon set. Avatars are generated initials, not photos; if the app has avatar images, use them and fall back to initials.

## Files
- `Participantes Redesign.html` — the full interactive prototype (React via in-browser Babel). Contains both the legacy ("Versión actual") and redesigned ("Rediseño") views, the Add bottom sheet, and the demo toggle. All component logic, styles, and tokens referenced above live in this file.
