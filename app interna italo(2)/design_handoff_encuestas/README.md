# Handoff: Encuestas — Destinatarios + Solicitud de Reunión por Horario

## Overview
This handoff covers two enhancements to the **Survey management** ("Gestión de Encuestas") flow of the internal app ("app interna italo"):

1. **Create Survey — audience selector.** When creating a survey, the admin can now choose **who will see and answer it**: everyone, a whole sede (location), or specific people picked by name. The same screen also gets **more vertical breathing room** between form fields.
2. **Results / analysis — voters + meeting requests.** In a survey's results, the admin can **see who voted and what each one chose**, **multi-select** voters (some, or "select all"), and **send each selected person a meeting request scheduled at the time slot that person voted for** — one separate invitation per person, grouped by slot for review.

The driving use case: a survey whose question is a **multiple-choice list of time slots** (e.g. `9:00 / 11:00 / 15:00 / 17:00`). Each respondent picks their preferred slot. The admin then coordinates meetings off the back of those answers, inviting each person at their own chosen time.

## About the Design Files
The files in this bundle are **design references created in HTML/React (via in-browser Babel)** — a navigable prototype demonstrating the intended look and behavior, **not production code to copy directly**. The task is to **recreate this design in the target codebase's existing environment** following its established patterns (reuse the app's existing avatar, pill button, bottom-sheet, switch, checkbox, search components where they exist). Do not ship the prototype HTML as-is.

There is **no before/after toggle** — every view in the prototype is a thing to build. The prototype also includes a small **survey-list screen** purely as a navigable entry point (open a survey → results; tap "+ Crear Encuesta" → create). The list screen is context; the two deliverables are **Create Survey** and **Results**.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, and interactions reflect the intended final design and reuse the same token set as the rest of this app's redesigns. Treat the exact pixel values below as targets, but prefer the app's existing tokens/components when they already encode the same intent. The legacy screens (current product) are the three screenshots provided by the user; this redesign keeps their structure and visual language and layers the new functionality on top.

---

## Screens / Views

### A. Survey list (context — navigable entry point only)
- **Header**: centered title **"Gestión de Encuestas"** (`18px`, `700`, `--blue`), bottom border `1px --line`.
- **Search**: boxed input (`--card` bg, `1px --line`, radius `12px`), magnifier + placeholder "Buscar encuesta".
- **Survey card** (button, full width): title (`15.5px`, `700`) + meta row — a status **pill** ("Activa" = green `#eafaf0`/`#1f9d57`; "Cerrada" = gray `--panel`/`#5a6068`), `{responses}/{total} respuestas`, and a date string. Chevron-right at the end (`#c9ced4`). Tap → Results.
- **Action bar**: full-width primary "+ Crear Encuesta" → Create.

### B. Create Survey — DELIVERABLE 1
Centered screen title **"Crear Encuesta"** (`23px`, `800`). Content is a vertical stack of white cards (`1px --line`, radius `16px`, padding `20px 16px`, subtle shadow `0 1px 2px rgba(20,24,30,.04)`), then a bottom action bar.

#### B1. Details card — *improved spacing*
The legacy form packs inputs tightly. Here each field is a `.field` block with **`margin-bottom:22px`** (the key spacing change) and a real label above the control.
- **Label** (`.lab`): `13px`, `font-weight:700`, `--ink`, `margin-bottom:9px`. Required marker `*` in `--red`; "(opcional)" suffix in `--muted2`, weight 600.
- **Input** (`.inp`): full width, `1px --line`, `--card` bg, radius `12px`, **padding `14px`**, `15.5px`. Focus: border `--accent`, white bg, ring `0 0 0 3px --accentSoft`. Placeholder `--muted2`.
- Fields, in order:
  1. **Título de la encuesta** * — text input.
  2. **Descripción (opcional)** — textarea (`min-height:84px`, `resize:none`, line-height 1.45).
  3. **Fecha de finalización (opcional)** — a "calendar" pseudo-input row: placeholder text left, calendar icon right; `--muted2` until set, then `--ink` (`.inp.calendar`). Wire to the app's date picker.
  4. **Encuesta anónima** — a switch row: title "Encuesta anónima" (`15px`, `700`) + helper "No se registra quién respondió cada pregunta." (`12.5px --muted`) on the left, a **toggle switch** on the right. (See *Anonymous interplay* below.)
- **Switch** component: `50×30`, radius `999px`, off bg `#c4cad1` / on bg `--accent`; knob `24×24` white, `translateX(20px)` when on; `box-shadow:0 1px 3px rgba(0,0,0,.25)`.

#### B2. Audience card — *new: "¿Quién verá la encuesta?"*
Card with section label **"¿Quién verá la encuesta?"** (`16px`, `800`). Two radio-style option rows, then (conditionally) the picker.
- **Option row** (`.aud-quick`, `flex; gap:12px; padding:14px`, `1.5px solid --line`, radius `13px`, cursor pointer). Selected: border `--accent`, bg `--accentSoft`. Left **radio** dot (`22×22`, `2px` border; selected shows an `11px --accent` inner dot). Title (`15px`, `700`) + subtitle (`12.5px --muted`).
  - **"Todos los empleados"** — subtitle "Se muestra a las {N} personas de la organización." Trailing users icon in `--accent`. *(Default selected.)*
  - **"Elegir usuarios"** — subtitle "Seleccioná por nombre, o una sede completa." (`margin-top:11px`.)
- When **"Elegir usuarios"** is active, reveal:
  - **Divider** "DESTINATARIOS" (`.aud-divider`: centered label with hairlines either side, `12px`, `600`, letter-spacing `.04em`, `--muted2`).
  - **Selected chips** (`.chips`, wrap, gap `8px`) — show up to **4** chips; if more, a trailing **"+N más"** chip (`--panel` bg). Each chip (`.chip`, `--accentSoft` bg, `1px --accentLine`, radius `999px`, `13px`, `600`, color `#2a4f86`): a `22×22` initials avatar + name + an `×` remove button.
  - **Picker button** (`.pick-btn`, full width, `1.5px dashed #c4cad1`, `#fcfcfd` bg, `--accent` text, radius `13px`, padding `14px`, `700`): magnifier + "Buscar y seleccionar usuarios" (or "Editar selección" once any are chosen). Opens the **Audience sheet** (C).
  - **Summary line** (`.aud-summary`, centered, `13px --muted`): "**N** personas seleccionadas" or "Todavía no seleccionaste a nadie."

#### B3. Questions card (context)
Section label **"Preguntas (N)"** + a small primary **"+ Agregar"** button (`--accent` bg, white, radius `11px`). Below, one question row per question (`.qrow`): a square index badge (`30×30`, `--accentSoft`/`--accent`, `800`), the question title (`14.5px`, `700`, ellipsis), and a type/summary subline (`12px --muted`) — e.g. `Opción múltiple · 9:00 / 11:00 / 15:00 / 17:00`. Empty state: centered "No hay preguntas agregadas". (Question authoring is the existing "Nueva Pregunta" screen — out of scope here, unchanged.)

#### B4. Action bar (fixed, bottom)
White, top border `1px --line`. **"Cancelar"** ghost button (`1.5px --line`, `#5a6068`) + **"Crear Encuesta"** primary (`flex:1`, `--accent`, white, radius `13px`). Primary is **disabled** (`#aebfe8`) until: a non-empty title AND (all-employees OR ≥1 recipient). On create → toast "Encuesta creada y enviada a los destinatarios." and return to list.

### C. Audience sheet ("Seleccionar usuarios") — bottom sheet
Slides up over a scrim (`rgba(17,21,27,.5)`, fade `.24s`). Sheet: white, radius `24px 24px 0 0`, `max-height:90%`, `flex column`, slide-in `translateY(100%)→0` over `.3s cubic-bezier(.22,.61,.36,1)`. Scrim tap closes.
- **Grab handle** `42×5`, `#d3d7dd`.
- **Header**: title "Seleccionar usuarios" (`19px`, `800`) + subtitle "Elegí quién va a ver y responder esta encuesta." (`13px --muted`).
- **Search**: boxed (`--card`, `1px --line`, radius `12px`), magnifier + placeholder "Buscar por nombre". Case-insensitive substring filter across all people; groups with no match are hidden.
- **Scroll body**:
  - **"Todos" group header** (only when search is empty): label "TODOS" + text button **"Seleccionar todos" / "Quitar todos"** (`--accent`, `700`, `12.5px`) toggling every currently-shown person.
  - For each **sede** (location) with matches: a **group header** (`.grouphead`) with the uppercase sede name (`12px`, `700`, `--muted`) + text button **"Toda la sede" / "Quitar sede"** that toggles all people in that group.
  - **Person row** (`.arow`, `flex; gap:12px; padding:10px 8px`, radius `11px`, cursor pointer; selected bg `--accentSoft`, hover `#eef1f4`): a **checkbox** (`.check`, `23×23`, radius `7px`, `2px` border; selected = `--accent` fill + white check glyph) + `32×32` initials avatar + name (`15px`, `600`).
  - **Empty**: centered "Sin resultados para "{q}"."
- **Footer** (`.sheet-foot`, fixed, top border): "**N** seleccionados" left + **"Listo"** primary right (`--accent`). Confirm writes the selection back to the form and closes. The sheet edits a **local copy**, seeded from the current selection each time it opens, so closing via scrim discards.

### D. Results / analysis — DELIVERABLE 2
- **Header**: a left text button **"Resultados"** (`--blue`, `600`) — acts as back/section nav; centered survey title (truncates to "Encuesta" when long); a **trash** icon button right (`--red`) to delete the survey (matches the legacy results header).
- Below header: centered survey title (`23px`, `800`) + optional description (`14px --muted`, centered).
- **Stat row** (`.statrow`, 3 equal cards `1px --line`, radius `14px`): big number (`24px`, `800`) + label (`11.5px --muted`). Shown: **Respuestas** (count, `--accent`), **Destinatarios** (total), **Participación** (`round(responses/total*100)%`).

#### D1. Question results card
- **Question header**: "Pregunta 1" label (`13px`, `700`, `--accent`) + a type chip (`.qtype`, `12.5px --muted`) e.g. "✓ Opción múltiple".
- **Question title** (`17px`, `800`): "¿Qué horario te queda mejor?"
- **Bars**, one per option (`.bar`): a top row with the option label (`14.5px`, `700`; here each prefixed by a clock icon in `--accent`) and a value `{count} · {pct}%` (`13px --muted`, tabular nums); a track (`height:10px`, radius `999px`, `--panel`) with a fill (`--accent`, width = `count / maxCount * 100%`, animated `width .5s`). Percent is share of total votes; bar width is relative to the **max** option so the leader fills the track.

#### D2. Voters card — *new: who voted + multi-select*
- **Header row**: section label "Votantes ({N})" (`16px`, `800`) + a **"Seleccionar todos" / "Quitar todos"** button (`.selectall`, `--accent`, `700`) with a leading checkbox mirroring the all-selected state.
- Helper line (`13px --muted`): "Seleccioná votantes para enviarles una reunión en su horario."
- **Voter row** (`.vrow`, `flex; gap:12px; padding:11px 8px`, radius `12px`, cursor pointer; selected bg `--accentSoft`, hover `--card`):
  - **Checkbox** (`23×23`, same style as the sheet) — selected = `--accent` fill + white check.
  - `40×40` initials avatar.
  - Middle: voter name (`15px`, `700`) + their sede (`12px --muted`).
  - **Slot badge** (`.slot`, pill, `--accentSoft`/`1px --accentLine`, color `#2a4f86`, `13px`, `700`): clock icon + the time slot **that voter chose** (e.g. "9:00").
- Tapping the row toggles its selection.
- **Anonymous case**: if the survey is anonymous, individual voters cannot be shown — replace this card's list with an info note (`.anon-note`, `--accentSoft`/`--accentLine`) explaining voters are hidden, and do not offer meeting requests. (The prototype's sample survey is non-anonymous.)

#### D3. Floating action bar (appears when ≥1 voter selected)
Fixed bottom bar with a single full-width primary: calendar-plus icon + **"Solicitar reunión"** + a count **badge** (`rgba(255,255,255,.25)` pill). Opens the **Meeting sheet** (E). When nothing is selected the bar is hidden and the body padding relaxes.

### E. Meeting request sheet ("Solicitud de reunión") — bottom sheet
Same sheet chrome as C. The core idea: **one separate meeting invitation per selected person, each agendada at the slot that person voted**, presented grouped by slot for review.
- **Header**: title "Solicitud de reunión" (`19px`, `800`) + subtitle "{N} personas · cada una recibe la invitación en el horario que eligió."
- **Fields**:
  - **Título / motivo** — text input (default "Reunión de equipo"). Required (send disabled if empty).
  - **Nota para cada persona (opcional)** — textarea; included in every invitation.
- **Separation note** (`.mt-sep-note`, info icon, `--accentSoft`/`--accentLine`): "Se crea una invitación **separada por persona**, agendada en el horario que cada uno votó. Agrupadas abajo por horario."
- **Grouped preview**: for each slot **that has selected people** (in chronological slot order), a group card (`.mt-group`, `--card`, `1px --line`, radius `14px`): header = clock icon + slot time (`14px`, `800`, `--accent`) + a right-aligned count "{n} invitación(es)" (`12px --muted`); body = a wrap of **person chips** (`.mt-person`, white pill, `1px --line`): `32×32` avatar + name.
- **Footer**: "**N** solicitudes" + **"Enviar"** primary (disabled until motivo non-empty). On send → close, clear selection, toast "Se enviaron N solicitudes de reunión, cada una en su horario."

---

## Interactions & Behavior
- **Audience default** = "Todos los empleados". Switching to "Elegir usuarios" reveals chips + picker. Switching back keeps the selection in state but it's not used while "Todos" is active.
- **Audience picker** edits a **local copy** seeded on open; "Listo" commits, scrim/handle discards. "Seleccionar todos" and per-sede "Toda la sede" toggle the currently-shown set; search narrows what those toggles affect.
- **Anonymous interplay** (recommended for production): if "Encuesta anónima" is on, the audience selector still works (you choose recipients), but **results will not expose individual voters** — surface the anon note in D2 and hide meeting requests. Make this consistent end-to-end.
- **Voter multi-select**: tap rows or use "Seleccionar todos". The floating action bar reflects the count and only appears with ≥1 selected.
- **Meeting requests are per-person and per-slot**: the selected voters are bucketed by their voted slot; each person yields one invitation at their slot. The grouped preview is only a review aid — the unit of sending is the individual person. Title + optional note apply to all generated invitations.
- **Toast**: bottom-center (`bg #22262b`, white, `13.5px`, `600`, radius `14px`, leading green dot), ~2600ms.
- **Validation**: Create disabled until title + audience valid; Send disabled until motivo non-empty.
- **Responsive**: mobile-first. Sheets are bottom sheets capped at `max-height:90%` with internal scroll; the results body scrolls under fixed header + (conditional) action bar.

## State Management
Indicative state:
- **Create**: `titulo`, `anon: boolean`, `allEmployees: boolean`, `recipients: string[]`, `sheetOpen: boolean`. Audience sheet holds a transient `local: string[]` + `query`.
- **Results**: `selected: string[]` (voter names), `meetingSheetOpen: boolean`. Meeting sheet holds `motivo`, `nota`.
- **App shell**: `screen: 'list' | 'crear' | 'resultados'`, `activeSurvey`, transient `toast`.
- In a real app: recipients map to the survey's audience/visibility (user IDs, sede IDs, or an "all" flag) persisted with the survey; votes/voters come from responses (respect anonymity server-side); meeting requests create N calendar invitations, one per (person, votedSlot), with the shared motivo/nota — likely a batch endpoint that fans out per attendee.

## Data Model (prototype shapes — adapt to real APIs)
- **People** are grouped by **sede**: `{ "Sede Centro": [names...], "Sede Norte": [...], "Sede Sur": [...] }`. `sedeOf(name)` resolves a person's sede.
- **Question** of type *multiple choice* whose options are time slots: `["9:00","11:00","15:00","17:00"]`.
- **Votes**: `{ name, slot }[]` — who voted and the slot each chose. Counts/percentages derive from this; the voter list and meeting grouping both read it.
- **Survey**: `{ id, title, desc, status: 'active'|'closed', responses, total, date }`.

## Design Tokens
Colors (shared with the rest of this app's redesigns):
- `--ink #1c2024` (primary text) · `--muted #7a8087` (secondary) · `--muted2 #9aa3ab` (placeholders/chevrons)
- `--line #e8eaed` (borders) · `--card #f6f7f9` (inputs/soft cards) · `--panel #eef0f2` (tracks, neutral pills)
- `--accent / --blue #2f78e8` (primary actions, links, fills) · `--accentSoft #e9f1fd` (selected bg, soft pills) · `--accentLine #cfe0f9` (soft pill borders)
- `--navy #2b1f5c` · `--green #1f9d57` (active pill) · `--red #e2543b` (required mark, delete) · `--amber #c98a1a`
- `--avatarBg #cfe0f7` / `--avatarInk #3b6fd4` (avatar fill / initials)
- Chip text `#2a4f86` · disabled primary `#aebfe8` · dashed picker border `#c4cad1` · toast bg `#22262b`, toast dot `#5fd08a`

Typography: system stack — `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Sizes used: 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 15 / 15.5 / 16 / 17 / 19 / 23 / 24 px. Weights: 600 (names/links), 700 (labels/titles), 800 (section/screen titles, numbers).

Border radius: 7 (checkbox), 9 (question index badge), 11 (sheet rows/inputs), 12 (inputs, message-ish cards, voter row), 13 (audience option/picker/action buttons), 14 (cards, bars track endpoints, meeting group), 16 (form cards), 24 (sheet top), 999 (pills/chips/avatars/switch).

Spacing: form field gap **`22px`** (the create-screen breathing room); card padding `20px 16px`; sheet `max-height:90%`; bar fill animation `width .5s`.

Avatar sizes: `40` (voter rows), `32` (`.sm` — sheet rows, chips, meeting chips), `22` (audience chips). Initials = first letter of first two name parts, uppercased.

Shadows: cards `0 1px 2px rgba(20,24,30,.04)`; switch knob `0 1px 3px rgba(0,0,0,.25)`; phone bezel only (prototype chrome — drop in production).

## Assets
No external image assets. All icons (back, magnifier, chevron, calendar, calendar-plus, clock, check, ×, trash, users, info, star) are inline SVGs in the prototype — replace with the codebase's existing icon set. Avatars are generated initials, not photos; if the app has avatar images, use them with an initials fallback.

## Files
- `Encuestas - Gestión.html` — shell: phone chrome, all CSS/tokens, loads the app script.
- `encuestas-app.jsx` — the full interactive prototype (React via in-browser Babel): list, Create Survey (+ audience sheet), Results (+ meeting sheet), sample data, icons. All component logic referenced above lives here.

Open `Encuestas - Gestión.html` to run the prototype. Flow: list → open "Disponibilidad reunión de equipo" for Results (the deliverable-2 demo), or "+ Crear Encuesta" for Create (deliverable-1).
