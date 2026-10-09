# Handoff: Informes (bandeja + hilo de informe)

## Overview
Módulo de **Informes** para la app interna móvil. Un informe es un "archivo" único con un hilo de entradas cronológicas: la primera es el **informe inicial** (destacada), el resto son seguimientos. Soporta texto enriquecido mínimo, **menciones** como píldoras, **adjuntos** (imagen/video como miniaturas, documentos como chips) abiertos vía URL firmada, **edición** de entradas propias y **cierre** por parte del creador (queda de solo lectura).

Pantallas: 1) Listado de informes, 2) Informe abierto (hilo), 3) Nuevo informe, más la hoja de Cerrar y el visor de adjuntos.

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML** (prototipo React + Babel en el navegador), que muestran el aspecto y el comportamiento esperados. **No son código de producción para copiar.** La tarea es **recrear estos diseños en el entorno existente de la app** (sus componentes, librerías de editor, sistema de navegación y capa de datos). Si no hay entorno, elegir el framework más adecuado (p. ej. React Native) e implementarlo ahí.

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciados, radios y estados son finales y siguen el mismo vocabulario visual que el resto de la app (ver `design_handoff_file_preview`). Recrear con precisión usando los componentes existentes.

---

## Reglas de negocio (fuente: spec del producto)
- **Visibilidad**: un usuario ve un informe si **lo creó** o si **fue mencionado en cualquier entrada**. Si lo mencionan, ve **el hilo completo**, incluidas las entradas anteriores a la mención.
- **Orden de la bandeja**: por última actividad (timestamp de la última entrada, incluida la de cierre), descendente.
- **Título/preview**: se derivan del **texto plano de la primera entrada**. Primer bloque/línea = título (1 línea, ellipsis); el resto = preview (2 líneas, clamp).
- **Menciones**: se insertan sólo eligiendo una persona del selector tras escribir `@`. Se guardan como nodo/etiqueta con `userId`; nunca se muestra texto tipo `@2`. Las menciones de una entrada se persisten (array `mentions`) porque definen la visibilidad.
- **Editar**: el botón sólo aparece en entradas **propias** y sólo con el informe **abierto**. Al guardar, la entrada muestra `(editado)` junto a la hora. Las menciones nuevas añadidas al editar también otorgan visibilidad.
- **Cerrar**: sólo el **creador** ve "Cerrar". Agrega una **entrada de cierre** con texto opcional. Con el informe cerrado: desaparecen el compositor y los botones Editar; todo es solo lectura.
- **Adjuntos**: pertenecen a la entrada que los subió y se muestran agrupados al pie de esa entrada. Al tocar se pide una **URL firmada** al backend y se abre el visor.
- **Conteo "N entradas"**: cuenta todas las entradas excepto la de cierre. Clip = total de adjuntos del informe.

---

## Screens / Views

Marco de referencia: teléfono 392 × 812, statusbar 34px, navbar de sistema 46px. Fuente del sistema: `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.

### 1. Listado de informes
**Layout** (columna flex, scroll vertical en la lista):
- **Header** `padding: 14px 18px 2px`, flex `space-between`:
  - Título "Informes" — 27px / 800 / letter-spacing −0.01em, `#1c2024`.
  - Botón **"+ Nuevo"** — pill primario: bg `#2f78e8`, texto blanco 13.5px/700, padding 7px 13px, radio 999px, ícono + 18px.
- **Subtítulo** "Los que creaste o donde te mencionaron" — 13px `#6f767e`, padding 0 18px 12px, borde inferior 1px `#e8eaed`.
- **Ítem** (botón full-width, bg blanco, borde inferior 1px `#e8eaed`, padding 14px 18px 15px, gap 10px, hover `#fafbfc`):
  - Columna estado (18px, padding-top 4px):
    - Abierto: punto 9px `#2f78e8`.
    - Cerrado: círculo 17px bg `#e4e7eb` con check 11px `#7a8087`.
  - Cuerpo (columna, gap 3px):
    - **Título** 15.5px/700, 1 línea con ellipsis. Cerrado: color `#4a5058` + tag "cerrado" (11.5px/600, `#6f767e` sobre `#eef0f2`, radio 6px, padding 2px 7px).
    - **Meta** 12.5px `#6f767e`: `Creador · relativo · N entradas` (separadores `·` en `#9aa3ab`) + clip 13px y número en `#5a6068`/600 si hay adjuntos.
    - **Preview** 13.5px, line-height 1.4, `#565c63`, clamp 2 líneas.
    - Si no soy el creador: badge **"Te mencionaron"** 11.5px/700, `#3b6fd4` sobre `#e6eefb`, pill, padding 2px 9px.
- **Vacío**: "No tenés informes todavía." centrado, 14px `#6f767e`.
- **Tiempo relativo**: `recién`, `hace N min`, `hace N h` (mismo día), `ayer`, luego `6 oct`.

### 2. Informe abierto (hilo)
Columna: header fijo · cuerpo scrolleable · compositor fijo al pie.

- **Header** 54px, borde inferior `#e8eaed`, padding 0 12px 0 6px:
  - Izquierda: "‹ Informes" — 15.5px/600 `#2f78e8`, chevron 22px.
  - Derecha (gap 8px):
    - Pill estado 12.5px/700, padding 5px 10px: **Abierto** = punto 7px + texto, `#2459b8` sobre `#e6eefb`; **Cerrado** = candado 12px, `#5a6068` sobre `#eef0f2`.
    - Botón **"Cerrar"** (sólo creador + abierto): pill outline, bg blanco, borde 1px `#d5d9de`, 13.5px/700.
- **Cuerpo** padding 12px 0 18px. Al agregar una entrada, scroll suave al final.
- **Entrada inicial**: tarjeta destacada — margin 0 12px 6px, bg `#f2f6fd`, borde 1px `#d8e4f8`, radio 16px, padding 12px 14px 14px.
  - Etiqueta "INFORME INICIAL" 11px/800, uppercase, letter-spacing .08em, `#3b6fd4`, margin-bottom 10px.
  - Cuerpo 15.5px, sin sangría.
- **Entrada normal**: padding 13px 18px 14px, borde inferior `#e8eaed`.
  - Header (gap 10px, mb 8px): avatar 32px (iniciales 12.5px/700, `#3b6fd4` sobre `#cfe0f7`) · nombre 14.5px/700 + hora 12px `#6f767e` debajo (formato `6 oct 09:52`, sufijo ` (editado)`) · opcional tag **"Te mencionó"** (11px/700 `#3b6fd4` sobre `#e6eefb`; en la inicial, bg blanco) · botón **"Editar"** (pill blanco, borde `#e8eaed`, 12.5px/600 `#4a5058`, lápiz 14px, padding 5px 10px; hover `#f6f7f9`).
  - Cuerpo 15px, line-height 1.5, `#2c3035`, sangría izquierda 46px (alineado con el texto del nombre). Listas: padding-left 22px, margin 4px 0.
- **Mención (píldora)**: inline, bg `#dde8fb`, texto `#2459b8`, 600, 0.94em, radio 999px, padding 1px 8px, sin wrap. **Si la mención soy yo**: bg `#2f78e8`, texto blanco.
- **Adjuntos** (margin-top 11px, gap 8px, misma sangría que el cuerpo):
  - Fila de miniaturas (imagen/video) 76×76, radio 11px, borde `#e8eaed`, gap 7px, wrap. Video: botón play 30px círculo `rgba(17,21,27,.55)` + duración en etiqueta mono 10px abajo-izquierda.
  - Chips de documento: borde `#e8eaed`, radio 10px, padding 6px 10px 6px 6px; badge extensión (9.5px/800 blanco, radio 6px, min-width 34px, color por tipo) · nombre 13px/600 (max 170px, ellipsis) · tamaño 11.5px `#6f767e`.
- **Entrada de cierre**: tarjeta margin 14px 18px 0, bg `#f6f7f9`, borde `#e8eaed`, radio 14px, padding 12px 14px; ícono candado blanco en círculo 30px `#1c2024`; "**Nombre** cerró el informe · 6 oct 17:50"; texto opcional debajo `#3a3f45`.
- **Fin solo lectura**: "Informe cerrado · solo lectura", 12.5px `#9aa3ab` centrado.
- **Compositor** (contenedor: borde superior `#e8eaed`, padding 10px 12px 12px) — ver componente Editor.

### 3. Nuevo informe
- Header igual al del hilo: "‹ Cancelar" izquierda, "Nuevo informe" centrado 15.5px/700.
- Hint 13px `#6f767e`: "La primera línea se usa como título en la bandeja. Mencioná con **@** a quienes tienen que verlo."
- Editor en variante alta (área de texto min-height 220px). Placeholder: "¿Qué pasó? Empezá con un título corto…". Botón "Publicar". Al publicar se crea el informe y se navega a su hilo.

### Hoja "Cerrar informe"
Bottom sheet: backdrop `rgba(17,21,27,.45)` (fade .2s); hoja blanca radio 22px 22px 0 0, padding 10px 18px 18px, entrada `translateY(100%)→0` en .24s `cubic-bezier(.2,.8,.2,1)`. Grabber 40×5 `#dcdfe3`.
- Título "Cerrar informe" 19px/800.
- Texto "Se agrega una entrada de cierre. Después nadie podrá escribir ni editar." 13.5px `#6f767e`.
- Textarea 3 filas, placeholder "Motivo o resolución (opcional)", borde `#dadde2`, radio 12px; focus borde `#a9c4ef` + ring `0 0 0 3px rgba(47,120,232,.1)`.
- Acciones derecha: "Cancelar" (bg `#eef0f2`, texto `#4a5058`) y "🔒 Cerrar informe" (bg `#1c2024`, blanco).

### Visor de adjuntos
Pantalla completa `#0e1216`. Top 56px: botón cerrar 40px (`rgba(255,255,255,.12)`), nombre 15px/600 + "Autor · fecha" 12px 55% blanco. Estado de carga mientras se obtiene la URL firmada: spinner 18px + "Generando enlace seguro…". Imagen/video: área ~330×420 radio 8px. Documento: badge 92px radio 22px con extensión + nombre + "EXT · tamaño" (si el tipo no es previsualizable). Pie: "🔒 Enlace firmado · vence en 15 min" (12px 60% blanco) + botón "Descargar" (pill `rgba(255,255,255,.12)`).

---

## Componente: Editor (compositor / edición / nuevo)
**Un único componente** para las tres situaciones: compositor fijo, edición inline de una entrada y nuevo informe.

- Contenedor: borde 1px `#dadde2`, radio 14px; `:focus-within` → borde `#a9c4ef` + ring `0 0 0 3px rgba(47,120,232,.1)`.
- **Barra de formato** (padding 5px 6px, borde inferior `#e8eaed`), botones 32×30 radio 7px, color `#4a5058`, hover `#eef0f2`, **activo** `#2459b8` sobre `#e3ecfb`:
  `B` `I` `U` | `• lista` `1. lista` | `@` `📎`  (separadores 1×18px `#e8eaed`).
  El estado activo refleja el formato en el cursor.
- **Área de texto** 15px/1.45, min 24px, max 110px con scroll (en edición inline sin max; en nuevo min 220px). Placeholder `#9aa3ab` "Escribí una entrada…".
- **Enviar** (compositor/nuevo): pill `#2f78e8`, 14px/700, ícono avión 18px; deshabilitado `#c9d7ee` si no hay texto ni adjuntos. Atajo ⌘/Ctrl+Enter.
- **Modo edición inline**: el contenido se carga en el editor; acciones abajo a la derecha "Cancelar" (ghost) y "Guardar" (primario). Los adjuntos de la entrada aparecen en la bandeja de pendientes y se pueden quitar/agregar.
- **Menciones**:
  - Disparo: `@` al inicio o tras espacio (escribiéndolo o con el botón `@`, que inserta un espacio previo si hace falta).
  - Popover (blanco, borde `#e8eaed`, radio 14px, sombra `0 12px 32px rgba(20,24,30,.18)`) **encima** del compositor fijo, **debajo** en edición inline. Cabecera "MENCIONAR A" 11px/700. Filas: avatar 32px + nombre 14px/700 + rol 12px `#6f767e`; resaltada `#eef3fc`. Máx. 5 resultados.
  - Filtro: insensible a mayúsculas y tildes, por inicio del nombre completo o de cualquier palabra; admite un espacio (p. ej. "mateo b").
  - Teclado: ↑/↓ mueve, Enter/Tab elige, Esc cierra. Si no hay coincidencias, el popover se oculta.
  - Al elegir: reemplaza `@consulta` por un nodo atómico no editable (píldora) con `userId`, seguido de un espacio, y deja el cursor después.
- **Adjuntar** (📎): menú (blanco, radio 12px, sombra `0 10px 28px rgba(20,24,30,.16)`) con "Foto o video" y "Documento". Los adjuntos pendientes se muestran sobre el área de texto (miniaturas 56px / chips) con botón quitar (círculo 20px `#4a5058`, borde blanco 2px, arriba-derecha).

---

## State Management
```
Report  { id, creatorId, status: 'open'|'closed', entries: Entry[] }
Entry   { id, authorId, createdAt, kind?: 'close',
          body (rich text: html o AST con nodos mention{userId}),
          mentions: userId[], attachments: Attachment[], edited?: bool,
          text? (sólo cierre) }
Attachment { id, kind: 'image'|'video'|'doc', name, ext, size, duration? }
```
- Bandeja: query de informes visibles para el usuario actual (creador o mencionado), ordenados por última actividad. El título/preview pueden calcularse en servidor.
- Hilo: `editingEntryId`, `closeSheetOpen`, `closeText`, `viewer {attachment, author, at} | null`.
- Mutaciones: `addEntry(reportId, body, mentions, attachments)`, `editEntry(entryId, …)` (sólo autor, sólo abierto → marca `edited`), `closeReport(reportId, text?)` (sólo creador → agrega entrada de cierre y `status='closed'`), `createReport(body, mentions, attachments)`.
- Adjuntos: subir al storage al seleccionar; al abrir, `GET signed-url(attachmentId)` y mostrar estado de carga.
- Validar permisos también en servidor (editar/cerrar/ver).

## Design Tokens
Colores:
- Tinta `#1c2024` · texto cuerpo `#2c3035` · secundario `#6f767e` · terciario `#9aa3ab` · iconos/ghost `#4a5058` / `#5a6068`
- Línea `#e8eaed` · borde input `#dadde2` · borde outline `#d5d9de`
- Fondos: card `#f6f7f9` · panel `#eef0f2` · hover `#fafbfc`
- Azul primario `#2f78e8` · azul texto `#2459b8` · avatar `#cfe0f7`/`#3b6fd4`
- Tintes azules: badges `#e6eefb` · mención `#dde8fb` · activo toolbar `#e3ecfb` · fila picker `#eef3fc` · inicial `#f2f6fd` / borde `#d8e4f8` · focus `#a9c4ef`
- Deshabilitado primario `#c9d7ee` · visor `#0e1216`
- Tipos de archivo: pdf `#d64545`, doc/docx `#2f6fd6`, xls/xlsx/csv `#1f9d57`, txt `#5b6b7a`, otros `#7a8087`

Tipografía (system stack): 27/800 título pantalla · 19/800 título hoja · 15.5/700 títulos ítem y header · 15–15.5/400 cuerpo (lh 1.5) · 14.5/700 nombre · 13.5 preview/botones · 12.5 meta · 12 hora · 11/800 etiquetas uppercase.

Radios: 999 pills · 22 hoja · 16 tarjeta inicial · 14 editor/cierre/popover · 12 menú/textarea · 11 miniaturas · 10 chips · 7 botones toolbar · 6 tags/badges ext.

Sombras: popover `0 12px 32px rgba(20,24,30,.18)` · menú `0 10px 28px rgba(20,24,30,.16)` · focus ring `0 0 0 3px rgba(47,120,232,.1)`.

Espaciado: márgenes laterales de pantalla 18px (tarjetas 12px); sangría del cuerpo de entrada 46px (avatar 32 + gap 10 + 4).

## Assets
Sin imágenes reales: las miniaturas son placeholders rayados que se reemplazan por las imágenes/frames del storage. Íconos: SVG inline simples (chevron, +, clip, check, listas, avión, lápiz, play, candado, x, imagen, documento, descarga) — usar la librería de íconos existente de la app.

## Files
- `Informes.html` — estilos y montaje del prototipo.
- `informes-ui.jsx` — Editor (formato, menciones, adjuntos), Attachments, Viewer, Avatar, helpers de fecha, íconos.
- `informes-app.jsx` — datos de ejemplo, Listado, Hilo, Entrada, hoja de Cerrar, Nuevo informe y lógica de permisos/visibilidad.

El prototipo tiene un selector "Ver como" (Ana Pérez = creadora / Mateo Bernardi = mencionado) sólo para demostrar las diferencias de permisos; no forma parte del producto.
