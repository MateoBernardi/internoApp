# Handoff: File & Image Preview — Reusable Module (+ Chat integration)

## Overview
This handoff delivers a **reusable file/image preview module** for the app ("app interna italo") plus the **chat screen integration** that consumes it. The core ask: previewing/opening files and images must be a **single shared capability** that can be dropped anywhere in the app (chat, activity boards, request detail, attachments lists, etc.) — **not** a one-off built inside the chat modal.

Think of it as an internal **"skill"/module**: one entry point to open any file, one set of share/download/print actions (wired to **Expo FileSystem / Sharing / Print**), and one set of attachment renderers (thumbnail for images, chip for files). Every screen reuses the same components and the same behavior.

## About the Design Files
The bundled file is a **design reference built in HTML/React (in-browser Babel)** — it demonstrates the intended look and behavior. It is **not production code to ship**. Recreate it in the app's real environment (React Native + Expo, given the stated stack) following the codebase's existing patterns/components. The HTML mock is the source of truth for layout, spacing, colors, copy, and interaction — not for framework specifics.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and interactions reflect the intended final design and were matched to screenshots of the live app. Recreate faithfully, but prefer the app's existing tokens/components (icon set, modal/sheet primitives, button styles) where they already encode the same intent.

---

## The reusable module — public API

Build this as a self-contained module (e.g. `src/components/filePreview/`) exposing **four** things. Everything else in the app talks only to these.

### 1. `<FilePreview />` — the single entry point to open anything
Renders a fullscreen viewer. Internally routes by `file.kind` to the image viewer or the file viewer. This is what every screen opens.

```tsx
type FileItem = {
  id: string;
  kind: 'image' | 'file';     // routes to ImageViewer vs FileViewer
  name: string;               // display name, e.g. "Reporte-ventas.png"
  ext: string;                // lowercase, e.g. "png" | "txt" | "pdf"
  size?: string;              // human label, e.g. "1.4 MB" (or bytes -> formatted)
  uri: string;                // local or remote URI (the real file/image source)
  sender?: string;            // optional metadata shown in the viewer header
  date?: string;              // optional metadata
  textPreview?: string;       // optional inline text (for txt/csv/log) — enables text view
};

<FilePreview file={file | null} onClose={() => ...} />
// file === null  → hidden. Set a file → opens. Same component for image & file.
```

### 2. `<FileAttachment />` — the in-line renderer (thumbnail / chip)
Drop this wherever a file reference appears in content (a chat message, a board card, a request row). It renders the **image thumbnail** or the **file chip** and calls `onOpen` (typically `() => setPreview(file)`).

```tsx
<FileAttachment file={file} onOpen={() => openPreview(file)} />
// kind 'image' → thumbnail with expand affordance + filename caption
// kind 'file'  → chip: colored type badge + name + "EXT · size" + chevron
```

### 3. `useFileActions(file)` — the Expo-backed actions hook
Encapsulates **Compartir / Descargar / Imprimir** so behavior is identical everywhere. The viewers call this; any custom UI can too.

```tsx
const { share, download, print, busy } = useFileActions(file);
```
Wiring (target implementation):
- **share** → `expo-sharing`: `await Sharing.shareAsync(localUri)` (download to cache first if `uri` is remote).
- **download** → `expo-file-system`: for app-private, `FileSystem.downloadAsync(uri, FileSystem.documentDirectory + name)`. To save into the device gallery/Downloads on Android, use `FileSystem.StorageAccessFramework` (request a directory, create file, write base64). On iOS, images → `expo-media-library` `saveToLibraryAsync`. Surface a toast on success ("Guardado en Documentos").
- **print** → `expo-print`: `await Print.printAsync({ uri: localUri })`. For images, an HTML wrapper (`<img src=…>`) prints cleanly; for PDFs print the uri directly.
- Show a lightweight **toast** for each result (success/failure). In the mock these are: "Compartiendo archivo…", "Guardado en Documentos", "Preparando impresión…".

### 4. `fileTypeColor(ext)` + `FileTypeBadge` — shared type styling
One source of truth for type colors so chips, badges, and viewer heroes match everywhere.
```
txt → #5b6b7a   pdf → #d64545   doc/docx → #2f6fd6
xls/xlsx/csv → #1f9d57   zip → #b07a1e   default → #7a8087
```

> **Reuse rule:** screens never re-implement opening, sharing, downloading, printing, or attachment rendering. They only (a) render `<FileAttachment>` for their files and (b) mount one `<FilePreview>` and set its `file`. This is what makes it a skill, not a screen.

---

## Component specs (visuals)

### ImageViewer (fullscreen, `kind: 'image'`)
- Backdrop `#0e1216`. Column layout: top bar / body / action bar.
- **Top bar** (`56px`): round close "×" left (`40×40`, `rgba(255,255,255,.12)`, white glyph); name block (name `15px/600` white, subtitle `sender · date` `12px` `rgba(255,255,255,.55)`), both truncate.
- **Body**: flex-centered, image `object-fit: contain`, rounded `8px`, max 100% of area. Small caption overlay bottom-left: `EXT · size` (mono, `rgba(255,255,255,.55)` text on translucent chip).
- **Action bar**: three equal buttons (`flex:1`), each icon-over-label, `rgba(255,255,255,.08)` bg, radius `13px`, label `12.5px/600` white, respect `env(safe-area-inset-bottom)`. Order: **Compartir, Descargar, Imprimir**.

### FileViewer (fullscreen, `kind: 'file'`)
- Same chrome as ImageViewer (top bar + action bar identical). Subtitle: `EXT · size · sender`.
- **Body, two modes:**
  - If `textPreview` present (txt/csv/log) → white rounded card (`12px`, padding `16px`), monospace `13px/1.6`, `white-space:pre-wrap`, scrollable, `max-width 340px`.
  - Else → centered **hero**: rounded square `96×96` filled with `fileTypeColor(ext)`, white `EXT` label `20px/800`; filename `17px/700`; meta `EXT · size` + "Vista previa no disponible para este tipo" `13.5px` `rgba(255,255,255,.6)`.

### FileAttachment — image thumbnail
- Full-width tappable. Image area `height:158px`, radius `11px`, `1px solid #e8eaed`, image cover. Expand affordance top-right: `30×30`, radius `9px`, `rgba(17,21,27,.45)` + blur, white expand icon.
- Caption below: small image glyph + filename (`13px`, `--muted #7a8087`, truncate).

### FileAttachment — file chip
- Row, white, `1px solid #e8eaed`, radius `12px`, padding `10px 12px`, `gap:12px`.
- Left **type badge** `44×44`, radius `10px`, bg `fileTypeColor(ext)`, white `EXT` text `11px/800` letter-spacing `.04em`.
- Middle: name (`14.5px/600`, truncate) + `EXT · size` (`12.5px --muted`).
- Right: chevron-right `--muted2 #9aa3ab`.

---

## Chat integration (one consumer of the module)

### A. Conversation header — replaces the lone `(i)` button
A tappable row at the top of the chat modal body (where `(i)` used to sit). Opens the Files modal.
- Container: `--card #f6f7f9`, `1px --line`, radius `14px`, padding `11px 12px`, `gap:12px`, full width.
- **Left**: 1:1 → `44px` avatar with initials (`--avatarBg #cfe0f7` / `--avatarInk #3b6fd4`). Group → `44px` round icon (group glyph, same colors).
- **Title** (`16px/700`, truncate):
  - **1:1** → the **other user's name** (e.g. "Victor Bernardi"). Subtitle: "Conversación directa · toca para ver archivos".
  - **Group** → the **asunto** (e.g. "Tenemos que hacer una cosa"). Subtitle: "{N} participantes · toca para ver archivos".
  - Subtitle `12.5px --muted`, truncate.
- **Right**: a "files" pill — paperclip icon + count badge (`--avatarBg` bg, `--avatarInk` text, radius `999px`). Whole row is the tap target.

### B. Files modal — "Archivos de la conversación" (redesigned)
Replaces the old list of raw UUID filenames. Centered card on dim backdrop (`rgba(17,21,27,.5)`), radius `20px`, `max-height:78%`, internal scroll.
- Title "Archivos de la conversación" `21px/800`; subtitle "{n} imágenes · {m} archivos" `13px --muted`.
- **Imágenes** group (label `12px/700` uppercase `--muted2`): 2-col grid of thumbnails (`height:104px`, radius `11px`) with filename caption `11.5px --muted` (truncate). Tap → `<FilePreview>` with that image.
- **Archivos** group: rows reusing the file-chip pattern (`--card` bg). Tap → `<FilePreview>` with that file.
- Footer: "Cerrar" text button, `--red #e2543b`, `16px/700`, right-aligned (matches existing modal style).

### C. Messages
Each message renders author + timestamp, then its body: plain text bubble, OR `<FileAttachment>` (image thumbnail / file chip). Composer unchanged (textarea + "+" + send `#5b9bf0`).

---

## Interactions & Behavior
- Tap an **image** (in a message or the files modal) → ImageViewer opens.
- Tap a **file** → FileViewer opens (text preview if available, else hero).
- Tap the **conversation header** → Files modal opens; tapping any item closes the modal and opens the viewer.
- In a viewer: **Compartir / Descargar / Imprimir** call `useFileActions` and toast the result; "×" closes.
- 1:1 vs group only changes the header's avatar/title/subtitle (toggle in the mock demonstrates both).
- Toast: bottom-center pill, `#22262b` bg, white `13.5px/600`, radius `999px`, ~1.7s, with a small success dot.

## State Management
- `previewFile: FileItem | null` — per screen, drives `<FilePreview>`. (Optionally split into `imageView`/`fileView` as the mock does; a single `previewFile` is cleaner.)
- `filesModalOpen: boolean` — chat only.
- `variant: 'dm' | 'group'` — chat header; in production derive from conversation data, not a toggle.
- `busy`/toast state — owned by `useFileActions` / a global toast.
- Files come from message attachments / conversation files API. `FileItem.uri` is the real source; remote files are cached to `FileSystem.cacheDirectory` before share/print.

## Design Tokens
Colors: `--ink #1c2024`, `--muted #7a8087`, `--muted2 #9aa3ab`, `--line #e8eaed`, `--card #f6f7f9`, `--panel #eef0f2`, `--bubble #ededf0`, `--blue #2f78e8`, `--send #5b9bf0`, `--avatarBg #cfe0f7`, `--avatarInk #3b6fd4`, `--navy #2b1f5c`, `--red #e2543b`. Viewer bg `#0e1216`. Type colors as listed above. Success dot `#5fd08a`.
Type: system stack (`-apple-system, "Segoe UI", Roboto, …`); monospace for text preview/badges. Sizes 11–21px; weights 500/600/700/800.
Radii: 9 (bubble), 10 (badge), 11 (thumb), 12 (chip/card), 13 (action btn), 14 (header/composer), 16 (panel), 20 (files card), 999 (pills). Avatars 44/36. Thumb 158px (message) / 104px (grid).

## Assets
No external assets. Icons (close, expand, paperclip, group, chevrons, share, download, print, send, plus, image glyph) are inline SVGs — swap for the app's icon set. Image thumbnails in the mock are striped placeholders standing in for real screenshots/photos; production uses real `uri` sources (`<Image>`), with the placeholder as the loading/fallback state.

## Expo dependencies to add
`expo-file-system`, `expo-sharing`, `expo-print`, and (for saving images to the gallery on iOS) `expo-media-library`. Centralize all four behind `useFileActions` so no screen imports them directly.

## Files
- `Chat Archivos Redesign.html` — full interactive reference: `FileAttachment` (thumbnail + chip), `ImageViewer`, `FileViewer`, `FilesModal`, conversation header, and mocked share/download/print actions. All specs above map to components in this file.
