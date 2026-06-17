# Handoff: Sistema de horarios y fichaje (clock-in/out)

> Documento de migración para un agente de desarrollo (Claude Code) que va a implementar este diseño en el código real de la app interna.

---

## 0. Cómo leer este documento

La feature se implementa en **2 partes secuenciales**. **No empezar la Parte 2 hasta tener la Parte 1 completa y aprobada.**

- **PARTE 1 — ABM de horarios (admin) + visualización del horario personal en la Agenda.**
  Es todo lo que hay que construir AHORA: el admin carga/edita turnos y cada empleado los ve en su agenda.
- **PARTE 2 — QR + marcar entrada/salida.** Se diseña pero se implementa **después** de la Parte 1. La lógica de validación del fichaje se define más adelante.

Cada sección marca claramente a qué parte pertenece con `🟢 PARTE 1` o `🔵 PARTE 2`.

---

## 1. Overview

Se agrega a la app interna un sistema de **horarios laborales** con dos roles:

1. **Admin**: carga los turnos del equipo desde un archivo **TXT** y los edita en una pantalla de gestión (ABM). Filtra por día, turno, sede y empleado.
2. **Empleado**: ve sus turnos asignados dentro de su **Agenda Personal** (rediseñada), junto con sus licencias y actividades personales. Más adelante (Parte 2) podrá fichar entrada/salida escaneando un QR.

El dato que carga el admin (turno: fecha, horario, sede) es exactamente lo que aparece como **turno asignado** en la agenda del empleado.

---

## 2. Sobre los archivos de este bundle

Los archivos `.html` / `.jsx` incluidos son **referencias de diseño hechas en HTML/React (Babel in-browser)**. Son prototipos que muestran el aspecto y el comportamiento buscados — **no** son código de producción para copiar tal cual.

La tarea es **recrear estos diseños dentro del entorno y los patrones ya existentes de la app** (el framework, el sistema de componentes, la librería de estilos y los componentes ya implementados que correspondan). Si algún patrón ya existe en la app (headers, búsqueda de usuarios, navbar con tabs, agenda), **se reutiliza el existente** en vez de recrearlo.

---

## 3. Fidelidad

**Alta fidelidad (hi-fi).** Colores, tipografía, espaciados, jerarquía e interacciones son finales. Recrear la UI con fidelidad usando los componentes/estilos de la app. Los valores exactos están en la sección **Design Tokens**.

---

## 4. Decisiones tomadas (resumen rápido)

| Tema | Decisión |
|---|---|
| Admin: dispositivo | **Una sola pantalla, mobile.** No hay diseño desktop aparte → la misma vista debe ser **responsive**. |
| Admin: alcance temporal | Se muestra **un (1) día a la vez**. |
| Admin: header | **No** usar un header propio de "Admin". Reutilizar los headers que ya usa la app. |
| Admin: filtros | **Día** (siempre aplicado), **turno**, **sede**, y **búsqueda por nombre**. |
| Admin: búsqueda por nombre | Debe usar **el selector y la búsqueda de usuarios ya implementados en la app** (no un input nuevo desde cero). |
| Admin: origen de datos | Los turnos se cargan desde un **TXT**. |
| Agenda: colores | **Licencias = morado**, **turnos = celeste**, **actividades = verde**. |
| Navbar: QR | El QR es el **botón de más a la derecha** de la tab. |

---

# 🟢 PARTE 1 — ABM de horarios + horario personal en la Agenda

## P1.1 — Pantalla: Gestión de horarios (Admin, mobile)

**Archivos de referencia:** `Panel Horarios - Admin Movil.html` + `admin-movil.jsx`

### Propósito
El admin ve y edita los turnos del equipo **de a un día**. Carga turnos desde TXT y ajusta cualquier celda.

### Layout (de arriba hacia abajo)
Pantalla mobile (referencia 392px de ancho, pensada para **escalar responsive** a cualquier ancho de teléfono). Estructura en columna:

1. **Header de la app** (reutilizar el header existente — NO un header de "Admin"):
   - Título: **"Horarios"**
   - Subtítulo: **"Turnos del día · tocá uno para editarlo"**
2. **Navegador de día** (siempre presente — el filtro por día siempre se envía):
   - `‹`  **Miércoles 15/04/2026**  `›`  (botón anterior / siguiente)
   - Etiqueta = `DíaSemana DD/MM/AAAA`. Los botones se deshabilitan al inicio/fin del rango de fechas con datos.
3. **Tarjeta de importación TXT**:
   - Ícono (upload) + "Importar TXT" + "Planilla de turnos"
   - Botón **Subir** (abre file picker `.txt`) + botón **Ejemplo** (carga datos de muestra).
4. **Filtros**:
   - **Búsqueda** (full width): input con ícono de lupa, placeholder "Buscar empleado". ⚠️ Ver P1.4.
   - **Turno** (segmented, full width): `Todos` / `Mañana` / `Tarde`. Activo en **navy** (`#2b1f5c`) con texto blanco.
   - **Sede** (dropdown full width): "Sede [Todas ▾]" con opciones `Todas` + lista de sedes.
5. **Lista del día** (scroll): una tarjeta por turno de ese día (ver P1.2). Empty state: "No hay turnos para este día con los filtros aplicados."
6. **Barra inferior (info)**: "`N` en este día · `M` turnos · `K` empleados". **Sin** botón de guardar/sincronizar (ver nota abajo).
7. Barra de sistema del teléfono (decorativa).

> **Nota:** se eliminaron deliberadamente el botón flotante de "crear turno" y toda mención a **sincronizar/sincronizado**. Los turnos entran por TXT y se ajustan en el ABM; no hay acción de "sincronizar" en la UI.

### P1.2 — Componente: tarjeta de turno (fila de la lista)
Tarjeta clickeable (abre la hoja de edición). De izquierda a derecha:
- **Badge de turno**: cuadrado 42×42, radio 12. `M` → fondo celeste suave / texto celeste; `T` → fondo ámbar suave / texto ámbar. Contenido: la letra `M` o `T`.
- **Centro**: nombre y apellido (peso 700, 15px, con ellipsis); debajo, ícono de pin + sede de ingreso. Si la sede de egreso difiere, mostrar `Sede ingreso → Sede egreso`.
- **Derecha**: horario `HH:MM–HH:MM` (peso 800, tabular-nums) y debajo la etiqueta del turno ("Mañana"/"Tarde").
- **Chevron** derecho (›).
- Tarjetas recién importadas: animación de entrada con flash verde (`@keyframes cardin`).

### P1.3 — Componente: hoja de edición (bottom sheet)
Se abre al tocar una tarjeta. Bottom sheet que sube desde abajo (`translateY(100%)` → `0`, 0.3s `cubic-bezier(.22,.61,.36,1)`), con backdrop oscuro. Contenido:
- Grab handle.
- Título: **"Editar turno"**.
- Campos:
  - **Nombre y apellido** (input texto)
  - **Fecha** (input, formato `dd/mm/aaaa`)
  - **Turno** (segmented 2 opciones: "Mañana · M" / "Tarde · T"; activo en celeste)
  - **Ingreso** / **Egreso** (dos inputs en fila, formato `HH:MM`)
  - **Sede de ingreso** (dropdown)
  - **Sede de egreso** (dropdown)
- Acciones: **Eliminar** (outline rojo) + **Guardar cambios** (primario, color de acento).

> En el prototipo no existe "crear turno": el alta es por TXT. La hoja es solo para **editar** un turno existente.

### P1.4 — ⚠️ Búsqueda por nombre: reutilizar el selector existente
El input "Buscar empleado" del prototipo es un placeholder. En la implementación real, **la búsqueda por nombre debe usar el selector y la búsqueda de usuarios que ya están implementados en la app** (el mismo componente que se usa para elegir/buscar personas en otras pantallas). Es decir: integrar ese componente como filtro de la lista, no crear una búsqueda nueva.

### P1.5 — Filtros: comportamiento
- **Día**: SIEMPRE aplicado (la lista nunca muestra más de un día). Cambia con el navegador de día.
- **Turno**: `Todos` (default) | `M` | `T`.
- **Sede**: `Todas` (default) | una sede. Filtra por **sede de ingreso**.
- **Búsqueda**: filtra por nombre (case-insensitive). Se combina (AND) con los demás filtros.

### P1.6 — Importación TXT
- Botón **Subir** abre selector de archivos `.txt`. Botón **Ejemplo** inyecta filas de muestra (solo para la demo).
- **Columnas del TXT** (definidas por el cliente): `nombre y apellido`, `fecha`, `turno` (M o T), `ingreso`, `egreso`, `sede ingreso`, `sede egreso`.
- La lógica real de parseo del TXT se define en implementación. Las filas importadas se marcan como nuevas (flash verde).

---

## P1.7 — Agenda Personal (empleado): mostrar el horario asignado

**Archivos de referencia:** `Fichaje - App Empleado.html` + `fichaje-agenda.jsx` + `fichaje-icons.jsx`
(El archivo de la app también contiene el QR/fichaje, que es **Parte 2** — ver más abajo. En la Parte 1 solo se implementa la Agenda y la visualización del turno.)

### Propósito
El empleado abre su Agenda y ve, por día: su **turno** asignado (lo que cargó el admin), sus **licencias** y sus **actividades** personales.

### Estructura
Header de la app (reutilizar el existente): título "Agenda" + navegador de mes (`‹ Abril 2026 ›`) + segmented **Día / Semana / Mes**.

#### Vista **Día**
- **Tarjeta de turno** (celeste) arriba: etiqueta "Turno Mañana · M", bloque **Ingreso** `08:00` → **Egreso** `16:00`, y "Sede de ingreso · Centro".
  - Variante **Licencia** (morado): etiqueta "Licencia" + tipo/detalle.
  - Variante **Sin turno / Día libre** (gris neutro).
  - *(El botón "Fichar mi entrada" dentro de esta tarjeta es **Parte 2**.)*
- **Cronograma del día**: timeline por hora (07:00–17:00). Bloques de evento:
  - **Turno** (celeste): ingreso y fin de turno.
  - **Actividad** (verde): eventos personales.
  - **Licencia** (morado): cuando corresponde.

#### Vista **Semana**
Lista de tarjetas por día (LUN→DOM). Cada día muestra:
- Un **chip** de turno (celeste, `HH:MM–HH:MM · Turno X · Sede`), o chip de **Licencia** (morado), o "Día libre · sin turno".
- Debajo, las **actividades** (punto verde + hora + título).
- El día de hoy se resalta con borde/sombra celeste.

#### Vista **Mes**
Grilla de calendario. En cada día, marcas chicas:
- Barra **celeste** = turno asignado.
- Barra **morada** = licencia.
- Punto **verde** = actividad.
- Leyenda al pie: Turno / Licencia / Actividad.

### P1.8 — Código de colores semántico (CRÍTICO)
En toda la agenda:
- **Turnos → celeste** (`--turno`)
- **Licencias → morado** (`--licencia`)
- **Actividades → verde** (`--actividad`)

Estos colores son **semánticos y fijos** (no dependen del color de acento de la app).

---

## P1.9 — Modelo de datos (Parte 1)

Un **turno** (lo que carga el admin y se muestra al empleado):
```
Turno {
  id
  nombre        // "nombre y apellido" del empleado (idealmente FK a usuario)
  fecha         // dd/mm/aaaa
  turno         // "M" | "T"  (Mañana / Tarde)
  ingreso       // "HH:MM"
  egreso        // "HH:MM"
  sedeIngreso   // string (sede)
  sedeEgreso    // string (sede)
}
```
Para la agenda del empleado se derivan además:
```
Licencia  { fecha, tipo, detalle }      // morado
Actividad { fecha, hora, titulo, ... }  // verde (evento personal del usuario)
```
Sedes de ejemplo: `Centro`, `Sucursal Norte`, `Depósito Sur`, `Sucursal Oeste` (la lista real sale del sistema).

---

# 🔵 PARTE 2 — QR + marcar entrada/salida (implementar DESPUÉS)

> Se diseña ahora para tenerlo definido, pero **se implementa una vez completa la Parte 1**. La lógica de validación (matchear el QR escaneado contra el turno, tolerancias de horario, estados tarde/falta) se define más adelante.

**Archivos de referencia:** `Fichaje - App Empleado.html` + `fichaje-app.jsx`

- **Navbar / tab del QR**: el QR es el **botón de más a la derecha** de la tab (pill flotante). Se muestra con el color de acento.
- **Menú entrada/salida** (bottom sheet al tocar el QR): muestra el turno de hoy como contexto y dos opciones: **Marcar entrada** / **Marcar salida**.
- **Escáner** (pantalla completa): visor de cámara con marco QR y línea animada; indica si se está marcando entrada o salida; botón para cancelar. (En el prototipo hay un "Simular escaneo".)
- **Confirmación**: check grande, "Entrada/Salida registrada", hora marcada, y recap (tipo, turno asignado, sede, fecha).
- **Botón "Fichar mi entrada"** dentro de la tarjeta de turno (vista Día): atajo que abre el mismo flujo.

El color de acento del fichaje/QR es ajustable (en el prototipo hay un Tweak: Azul / Navy / Verde) — usar el acento del sistema de la app.

---

## 5. Interacciones y comportamiento

🟢 **Parte 1**
- Tocar tarjeta de turno → abre hoja de edición (bottom sheet).
- Editar campos → "Guardar cambios" persiste; "Eliminar" quita el turno.
- Navegar día (`‹ ›`) → recarga la lista del día (botones se deshabilitan en los extremos).
- Filtros turno/sede/búsqueda → combinan en AND sobre el día seleccionado.
- Importar TXT → agrega filas (flash verde de entrada).
- Agenda: cambiar entre Día/Semana/Mes; navegar mes.

🔵 **Parte 2** — flujo QR descripto arriba (menú → escáner → confirmación).

Animaciones: bottom sheets 0.3s `cubic-bezier(.22,.61,.36,1)`; flash de fila nueva ~0.4s; (Parte 2) badge de confirmación con `pop`, línea del escáner en loop.

---

## 6. State management

🟢 **Parte 1 — Admin mobile**
- `rows` (lista de turnos), `selDate` (día seleccionado), `filter` (turno), `sede`, `q` (búsqueda), `editing` (id en edición | null), `draft` (copia editable), `toast`.
- Derivados: `dates` (fechas únicas ordenadas), `dayRows` (filtradas por día + turno + sede + búsqueda), `empleados` (únicos).

🟢 **Parte 1 — Agenda**
- Vista activa (`Día`/`Semana`/`Mes`), datos de la semana/mes (turnos, licencias, actividades del usuario).

🔵 **Parte 2** — estado del flujo de fichaje (`flow`: menu/scan/confirm), acción (entrada/salida), hora marcada.

Data fetching: los turnos vienen del backend (alimentado por el TXT del admin). La búsqueda de usuarios usa el servicio/endpoint ya existente en la app.

---

## 7. Design Tokens

### Colores base (neutros / app)
| Token | Hex |
|---|---|
| `--ink` (texto) | `#1c2024` |
| `--muted` | `#7a8087` |
| `--muted2` | `#9aa3ab` |
| `--line` (bordes) | `#e8eaed` |
| `--card` (fondo tarjeta) | `#f6f7f9` |
| `--panel` | `#eef0f2` |
| `--navy` | `#2b1f5c` |
| `--red` | `#e2543b` |
| `--amber` | `#c98a1a` |
| Navbar/sistema oscuro | `#0e1116` / `#11151b` |

### Acento (fichaje/QR — ajustable)
| | Hex |
|---|---|
| Azul (default) | `#2f78e8` (soft `#e9f1fd`, line `#cfe0f9`) |
| Navy | `#2b1f5c` (soft `#ebe9f3`, line `#d3cee4`) |
| Verde | `#1f9d57` (soft `#e7f6ee`, line `#c4e7d2`) |

### Colores semánticos de la Agenda (fijos)
| Tipo | Color | Soft | Line |
|---|---|---|---|
| **Turno** (celeste) | `#2f86d6` | `#e7f2fb` | `#c6e1f4` |
| **Licencia** (morado) | `#7b5ce0` | `#efeafb` | `#dacef3` |
| **Actividad** (verde) | `#1f9d57` | `#e7f6ee` | `#c4e7d2` |

### Tipografía
- Familia: stack del sistema — `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Título de pantalla: 21–22px / 800 / letter-spacing -0.015em.
- Subtítulo: 13px / `--muted`.
- Nombre en tarjeta: 15px / 700. Horario: 14px / 800 tabular-nums.
- Labels de formulario: 12px / 700 / uppercase / letter-spacing 0.03em.

### Radios
- Tarjetas/inputs: 11–14px. Bottom sheet: 24px (sup.). Badges de turno: 12px. Pills/chips: 999px. Phone frame: 30px.

### Sombras
- Tarjeta navbar (pill): `0 8px 26px rgba(20,24,30,.16)`.
- Bottom sheet/elevación: sombras suaves equivalentes.
- FAB (Parte 2, si aplica): `0 10px 24px` con el acento al 40%.

### Espaciados
- Padding de pantalla: ~18px horizontal. Gap entre tarjetas: 9–12px. Padding interno tarjeta: 12–14px.

---

## 8. Assets
- **Íconos**: todos inline SVG (stroke 1.7–2.2), en `fichaje-icons.jsx` (app/agenda/navbar) y dentro de `admin-movil.jsx` (lupa, upload, pin, caret, chevrons). Reemplazar por la librería de íconos de la app.
- **Sin imágenes ni fuentes externas.** No hay assets de marca propietarios.

## 9. Archivos del bundle
| Archivo | Rol | Parte |
|---|---|---|
| `Panel Horarios - Admin Movil.html` | Pantalla admin (estilos + scaffolding) | 🟢 1 |
| `admin-movil.jsx` | Lógica/UI del ABM de horarios | 🟢 1 |
| `Fichaje - App Empleado.html` | App del empleado (estilos + scaffolding) | 🟢 1 (agenda) / 🔵 2 (QR) |
| `fichaje-agenda.jsx` | Agenda rediseñada (Día/Semana/Mes, colores semánticos) | 🟢 1 |
| `fichaje-icons.jsx` | Íconos compartidos de la app | 🟢 1 |
| `fichaje-app.jsx` | Router, navbar (QR a la derecha), flujo de fichaje | 🔵 2 |
| `tweaks-panel.jsx` | Panel de Tweaks (solo para el prototipo; no migrar) | — |

> Para correr los prototipos: abrir los `.html` en un navegador (cargan React + Babel por CDN). Son solo de referencia.
