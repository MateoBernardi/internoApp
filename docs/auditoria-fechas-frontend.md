# Auditoria frontend de fechas

Fecha de auditoria: 2026-03-18
Repositorio: internoApp
Alcance: frontend completo dentro del workspace

## 1) Objetivo
Este documento detalla todos los lugares del frontend donde se usan fechas/horas y documenta:
- Como se reciben
- Como se transforman
- Como se muestran
- Como se envian
- Que formato usan

Incluye endpoints y componentes/pantallas que manipulan fechas.
Cuando un formato no esta explicitado por contrato/tipo, se marca como INFERIDO con nivel de confianza.

## 2) Convenciones globales observadas

### 2.1 Capa HTTP
Referencia: [shared/apiRequest.ts](../shared/apiRequest.ts)
- `apiRequest` hace `JSON.stringify(body)` sin serializacion especial para Date.
- No hay normalizacion central de timezone.
- No hay parser global de fechas en respuestas.

Implicancia:
- Si se envia `Date` en payload, termina serializado por JSON nativo.
- Si se envia string (`YYYY-MM-DD` o ISO 8601), viaja tal cual.

### 2.2 Libreria y utilidades
- No se usa `date-fns`, `dayjs` ni `moment` para flujos core.
- Se usa API nativa de JS (`Date`, `toISOString`, `toLocaleDateString`, `toLocaleTimeString`, `toLocaleString`).

### 2.3 Selector cross-platform
Referencia: [components/ui/CrossPlatformDateTimePicker.tsx](../components/ui/CrossPlatformDateTimePicker.tsx)
- Web:
- Crea input dinamico `type=date` o `type=time`.
- Formatos internos:
- Fecha: `YYYY-MM-DD` (`toDateInputValue`).
- Hora: `HH:mm` (`toTimeInputValue`).
- Parseo:
- `applyDateToBase`: regex `^(\d{4})-(\d{2})-(\d{2})$`.
- `applyTimeToBase`: regex `^(\d{2}):(\d{2})$`.
- Emision por callback:
- `onChange({ type: 'set'|'dismissed', nativeEvent.timestamp })`
- `timestamp` en milisegundos (`Date.getTime()`).
- Native:
- Usa `@react-native-community/datetimepicker`.

## 3) Matriz por endpoint (detalle de fechas)

## 3.1 Solicitudes de licencias
Referencias:
- [features/solicitudesLicencias/models/SolicitudLicencia.ts](../features/solicitudesLicencias/models/SolicitudLicencia.ts)
- [features/solicitudesLicencias/services/solicitudesApi.ts](../features/solicitudesLicencias/services/solicitudesApi.ts)
- [features/solicitudesLicencias/views/CrearSolicitudesLicencias.tsx](../features/solicitudesLicencias/views/CrearSolicitudesLicencias.tsx)

Formato principal:
- Request fechas de negocio: `YYYY-MM-DD`
- Response mixto: `fecha_inicio/fecha_fin` en `YYYY-MM-DD`, y `created_at/fecha_respuesta` en ISO 8601 (string)

Endpoints:
1. `GET /licencias/tipos`
- Request fechas: no aplica.
- Response fechas: no aplica.

2. `GET /licencias/saldos`
- Request fechas: no aplica.
- Response fechas: no aplica (solo campos numericos de saldo).

3. `GET /licencias/solicitudes`
- Request fechas: filtros opcionales `fecha_desde`, `fecha_hasta` en `YYYY-MM-DD`.
- Response fechas:
- `fecha_inicio`: `YYYY-MM-DD`.
- `fecha_fin`: `YYYY-MM-DD`.
- `created_at`: ISO 8601 (string).
- `fecha_respuesta`: ISO 8601 (string, opcional).
- `archivos[].created_at`: ISO 8601 (string).
- Tratamiento cliente:
- No mapper de fechas en service.
- Parseo/display en componentes con `new Date(...).toLocaleDateString()`.

4. `GET /licencias/solicitudes/usuario`
- Igual que `GET /licencias/solicitudes` en campos de fecha.

5. `POST /licencias/solicitudes`
- Request fechas:
- `fecha_inicio` en `YYYY-MM-DD`.
- `fecha_fin` no se envia en create DTO actual; backend la determina/retorna (INFERIDO, confianza alta).
- Otros campos:
- `cantidad_dias` y `cantidad_horas` como `number|null`.
- Response fechas: mismas reglas de `SolicitudLicencia`.
- Generacion de fecha request:
- UI usa `formatDateYMD(date)`.

6. `POST /licencias/solicitudes/{id}/archivo`
- Request fechas: no aplica.
- Response fechas: no aplica (mensaje).

7. `POST /licencias/solicitudes/{id}/cancelar`
- Request fechas: no aplica.
- Response fechas: no aplica (mensaje).

8. `POST /licencias/solicitudes/{id}/aprobar`
- Request fechas: no aplica.
- Response fechas: backend puede actualizar `fecha_respuesta` en entidad (observado en modelo de dominio).

9. `POST /licencias/solicitudes/{id}/rechazar`
- Igual que aprobar para efecto de `fecha_respuesta`.

## 3.2 Solicitudes de actividades (solicitudes)
Referencias:
- [features/solicitudesActividades/models/Solicitud.ts](../features/solicitudesActividades/models/Solicitud.ts)
- [features/solicitudesActividades/services/solicitudesApi.ts](../features/solicitudesActividades/services/solicitudesApi.ts)
- [features/solicitudesActividades/viewmodels/useValidacionFechas.ts](../features/solicitudesActividades/viewmodels/useValidacionFechas.ts)

Formato principal:
- ISO 8601 string para `fecha_inicio`/`fecha_fin` y bitacora.

Endpoints:
1. `POST /solicitudes-actividades/solicitudes`
- Request fechas:
- `fecha_inicio`: ISO 8601 (`Date.toISOString()`) cuando aplica.
- `fecha_fin`: ISO 8601 (`Date.toISOString()`) cuando aplica.
- Para tipo `MANDATO` sin fechas, pueden omitirse/null (segun flujo UI y modelo).
- Response fechas:
- `fecha_inicio`, `fecha_fin` en ISO 8601 o null.

2. `POST /solicitudes-actividades/solicitudes/validar-fechas`
- Request fechas:
- `fecha_inicio`, `fecha_fin` en ISO 8601.
- Response fechas:
- `rangosOcupados[].desde/hasta` en ISO 8601 (INFERIDO por parseo `new Date`).
- Tratamiento UI:
- Modal convierte a `toLocaleDateString('es-ES', { day:'2-digit', month:'short' })` y `toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })`.

3. `DELETE /solicitudes-actividades/solicitudes/cancelar`
- Request fechas: no aplica.
- Response fechas: no aplica.

4. `PUT /solicitudes-actividades/solicitudes/modificar-fechas`
- Request fechas:
- `nuevaFechaInicio`, `nuevaFechaFin` ISO 8601.
- Response fechas:
- bitacora con campos `fecha_inicio_anterior/nueva`, `fecha_fin_anterior/nueva`, `fecha_modificacion`, `created_at` (ISO 8601).

5. `PUT /solicitudes-actividades/solicitudes/aceptar-modificaciones/{id}`
- Request fechas: no aplica.
- Response fechas: puede afectar bitacora en backend.

6. `POST /solicitudes-actividades/solicitudes/reenviar`
- Request fechas: depende del estado de solicitud (mantiene fechas ISO si viajan en body).

7. `GET /solicitudes-actividades/solicitudes/bitacora/{id}`
- Response fechas: campos de bitacora en ISO 8601.

8. `GET /solicitudes-actividades/solicitudes/creador`
- Response fechas: `fecha_inicio/fecha_fin` ISO 8601 o null.

9. `GET /solicitudes-actividades/solicitudes/invitados`
- Response fechas: `fecha_inicio/fecha_fin` ISO 8601 o null.

10. `PUT /solicitudes-actividades/solicitudes/invitados/estado`
- Request fechas: no aplica.

## 3.3 Actividades
Referencias:
- [features/solicitudesActividades/models/Actividad.ts](../features/solicitudesActividades/models/Actividad.ts)
- [features/solicitudesActividades/services/actividadesApi.ts](../features/solicitudesActividades/services/actividadesApi.ts)

Formato principal:
- ISO 8601 string para inicio/fin.

Endpoints:
1. `PUT /solicitudes-actividades/actividades/crear`
- Request: `fecha_inicio` y `fecha_fin` ISO 8601.
- Response: actividad con fechas ISO 8601.

2. `POST /solicitudes-actividades/actividades/participantes`
- Request fechas: no aplica.

3. `GET /solicitudes-actividades/actividades/participantes/semanales`
- Response fechas:
- `actividades[].fecha_inicio/fecha_fin` ISO 8601.
- `licencias[]` con fechas (INFERIDO por modelo de agregacion semanal).

4. `PUT /solicitudes-actividades/actividades/cancelar`
- Request fechas: no aplica.

5. `PUT /solicitudes-actividades/actividades/actualizar-horarios`
- Request: `nuevaFechaInicio`/`nuevaFechaFin` ISO 8601.

## 3.4 Reportes
Referencias:
- [features/reportes/models/Reporte.ts](../features/reportes/models/Reporte.ts)
- [features/reportes/services/reportesApi.ts](../features/reportes/services/reportesApi.ts)
- [features/reportes/views/CrearReporte.tsx](../features/reportes/views/CrearReporte.tsx)

Formato principal:
- Entidad reporte: campos de fecha como string.
- En create, `fecha_incidente` se envia como `YYYY-MM-DD` (no ISO completo) por `toISOString().split('T')[0]`.

Endpoints:
1. `POST /reportes`
- Request fecha:
- `fecha_incidente`: `YYYY-MM-DD` desde UI.
- Response fechas:
- `fecha_incidente`, `created_at`, `updated_at` como string (INFERIDO ISO en runtime por parseo con `new Date`).

2. `GET /reportes`
- Response fechas: idem.

3. `PUT /reportes/{id}`
- Request fechas: no se observa envio de fecha en update payload local.
- Response fechas: idem entidad.

4. `GET /reportes/stats`
- Fechas: no aplican en payload visible.

5. `GET /reportes/top-employee`
- Fechas: no aplican en payload visible (periodo se resuelve server-side).

6. `GET /reportes/upgraded-employee`
- Fechas: no aplican en payload visible.

7. `GET /reportesImagenes/{reporte_id}`
- Fechas: no contrato de fechas en respuesta de imagenes.

8. `POST /reportesImagenes/upload`
- Fechas request: no aplica.

9. `DELETE /reportesImagenes/unlink/{reporteId}/{imageId}/{orden}`
- Fechas request: no aplica.

10. `PUT /reportesImagenes/update-order/{reporteId}/{imageId}`
- Fechas request: no aplica.

## 3.5 Encuestas
Referencias:
- [features/encuestas/models/Encuesta.ts](../features/encuestas/models/Encuesta.ts)
- [features/encuestas/services/encuestasApi.ts](../features/encuestas/services/encuestasApi.ts)
- [features/encuestas/components/CrearEncuesta.tsx](../features/encuestas/components/CrearEncuesta.tsx)

Formato principal:
- `fecha_fin` en create: ISO 8601 (`toISOString()`).
- Response de encuesta/respuesta: strings de fecha (INFERIDO ISO por parseos y comparaciones).

Endpoints:
1. `GET /encuestas/categoria/interna`
- Response fechas:
- `fecha_creacion`, `fecha_fin` string (INFERIDO ISO).

2. `GET /encuestas/respuestas`
- Response fechas:
- `fecha_creacion`, `fecha_fin`, `respuesta.fecha_respuesta` string (INFERIDO ISO).

3. `POST /encuestas/completa`
- Request fechas:
- si `encuesta.fecha_fin` esta poblada, viaja desde estado UI en formato ISO 8601.

4. `POST /encuestas/respuestas`
- Request fechas: no se genera fecha cliente explicitamente; backend suele setear `fecha_respuesta`.

5. `DELETE /encuestas/{id}`
- Fechas: no aplica.

## 3.6 Novedades
Referencias:
- [features/novedades/dto/NovedadesDTO.ts](../features/novedades/dto/NovedadesDTO.ts)
- [features/novedades/mappers/novedadesMapper.ts](../features/novedades/mappers/novedadesMapper.ts)
- [features/novedades/services/novedadesApi.ts](../features/novedades/services/novedadesApi.ts)
- [features/novedades/views/TablonNovedades.tsx](../features/novedades/views/TablonNovedades.tsx)

Formato principal:
- Backend entrega `created_at` string (ISO 8601).
- Mapper convierte a `Date` (`createdAt`).
- UI formatea manual a `dd/MM/yyyy` en tablon.

Endpoints:
1. `GET /novedades`
- Response fecha: `created_at` string ISO -> mapper -> `Date`.

2. `POST /novedades`
- Request fecha: no se fuerza en cliente (backend crea `created_at`).

3. `PUT /novedades/{id}`
- Request fecha: no aplica normalmente.

4. `DELETE /novedades/{id}`
- Fechas: no aplica.

## 3.7 Documentos (archivos y carpetas)
Referencias:
- [features/docs/services/archivosApi.ts](../features/docs/services/archivosApi.ts)
- [features/docs/services/carpetasApi.ts](../features/docs/services/carpetasApi.ts)
- [features/docs/dto/ArchivoDTO.ts](../features/docs/dto/ArchivoDTO.ts)
- [features/docs/mappers/archivoMapper.ts](../features/docs/mappers/archivoMapper.ts)
- [features/docs/components/DocumentoItem.tsx](../features/docs/components/DocumentoItem.tsx)

Formato principal:
- `ArchivoDTO.created_at` llega desde backend y se convierte a `Date` en mapper.
- Nota de tipado: DTO lo tipa como `Date`, pero en runtime se parsea como string mediante `new Date(dto.created_at)`.

Endpoints con fecha relevante:
1. `GET /archivos`
- Response fecha: `created_at` por archivo.
- Tratamiento: mapper `mapArchivoDTOToArchivo` => `createdAt: Date`.

2. `GET /archivos/searchByNombre`
- Response fecha: misma estructura de archivo.

3. `GET /archivos/?search=...`
- Response fecha: misma estructura.

4. `GET /archivos/usuario/{id}`
- Response fecha: misma estructura.

5. `GET /archivos/personales`
- Response fecha: misma estructura.

6. `POST /archivos/metadata`
- Response fecha: devuelve archivo con `created_at` (INFERIDO por DTO/mapping).

7. `POST /archivos/upload`
- Request fechas: no aplica.

8. Endpoints de carpetas (`/carpetas`, `/carpetas/{id}`, `/carpetas/{id}/permisos`)
- En codigo auditado no se observan campos de fecha tratados en cliente.

## 3.8 Auth y users
Referencias:
- [features/auth/types/index.ts](../features/auth/types/index.ts)
- [shared/users/UserDTO.ts](../shared/users/UserDTO.ts)

Endpoints y campos:
1. `POST /auth/solicitar-verificacion`
- Response fecha: `expiresAt` string.
- Tratamiento: no parseo a Date en los tipos de auth.

2. `POST /auth/validar-verificacion`
- Response fecha: `asociacion.fecha_asociacion` string.

3. `GET /usuario-contexto/asociaciones` y otros flujos users
- Tipado en `UsuarioEntidadDTO`:
- `fecha_asociacion: Date`
- `usuario_created_at: Date`
- `usuario_updated_at: Date`
- Riesgo: posible mismatch runtime string vs tipo Date (INFERIDO, confianza media-alta).

## 3.9 Kanban
Referencias:
- [features/kanban/hooks/useObjetivos.ts](../features/kanban/hooks/useObjetivos.ts)
- [features/kanban/views/KanbanBoard.tsx](../features/kanban/views/KanbanBoard.tsx)

Formato principal:
- `created_at`/`updated_at` como string de fecha en entidad.
- En optimistic update se crea `new Date().toISOString()`.
- Display en board: `new Date(...).toLocaleDateString('es-ES', ...)`.

Endpoints:
1. `GET /objetivos...`
- Response fechas: `created_at`, `updated_at`, bitacora `created_at` (INFERIDO ISO).

2. `POST /objetivos`
- Request puede incluir fechas de bitacora (optimistic/local) en ISO.

3. `PATCH /objetivos/{id}`
- Fechas: no se observa serializacion manual en cliente, salvo campos de auditoria provenientes backend.

4. `DELETE /objetivos/{id}`
- Fechas: no aplica.

## 4) Matriz por componente/pantalla (detalle de tratamiento)

## 4.1 Componentes utilitarios

1. [components/ui/CrossPlatformDateTimePicker.tsx](../components/ui/CrossPlatformDateTimePicker.tsx)
- Recibe:
- `value: Date`, `mode`.
- Trata:
- Convierte a `YYYY-MM-DD` o `HH:mm` para web input.
- Aplica fecha/hora parseada sobre Date base.
- Emite:
- `Date` y `timestamp` (ms).

2. [shared/views/AsociarCuenta.tsx](../shared/views/AsociarCuenta.tsx)
- Recibe:
- `expiresAt` via API (token verification) pero el timer local usa `tokenSentAt`.
- Trata:
- countdown con `Date.now()`.
- `elapsed = floor((Date.now() - tokenSentAt)/1000)`.
- Muestra:
- `MM:ss` por `formatTime`.

## 4.2 Solicitudes actividades (UI)

1. [features/solicitudesActividades/views/CrearSolicitud.tsx](../features/solicitudesActividades/views/CrearSolicitud.tsx)
- Recibe:
- DateTimePicker para inicio/fin.
- Trata:
- Validacion `fechaInicio < fechaFin`.
- Modo all-day ajusta horas (`start` desde ahora+5m, `end` 23:59:59.999).
- Envia:
- `fecha_inicio`/`fecha_fin` como ISO (`toISOString()`).
- Muestra:
- fecha `toLocaleDateString('es-ES', { weekday, day, month })`.
- hora `toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })`.

2. [features/solicitudesActividades/components/ValidacionFechasModal.tsx](../features/solicitudesActividades/components/ValidacionFechasModal.tsx)
- Recibe:
- rangos ocupados `desde/hasta` string.
- Trata:
- parseo `new Date`.
- Muestra:
- rango corto en espanol (`dd mon hh:mm -> hh:mm`).

3. [features/solicitudesActividades/components/AgendaSemanal.tsx](../features/solicitudesActividades/components/AgendaSemanal.tsx)
- Recibe:
- activities con `date` (`YYYY-MM-DD`) y `time` (`HH:mm`).
- Trata:
- normaliza dia con `toISOString().split('T')[0]`.
- compara `today` igual formato.
- Muestra:
- etiqueta de fecha en `es-ES`.

4. [features/solicitudesActividades/components/AgendaDiaria.tsx](../features/solicitudesActividades/components/AgendaDiaria.tsx)
- Recibe:
- `time`, `fecha_fin`.
- Trata:
- extrae hora fin con regex `/[T ](\d{2}:\d{2})/`.
- ordena por `time` con `localeCompare`.

5. [features/solicitudesActividades/components/SolicitudesRecibidas.tsx](../features/solicitudesActividades/components/SolicitudesRecibidas.tsx)
- Muestra `fecha_inicio` con `new Date(...).toLocaleDateString()` o `Sin fecha`.

6. [features/solicitudesActividades/components/SolicitudesEnviadas.tsx](../features/solicitudesActividades/components/SolicitudesEnviadas.tsx)
- Preserva `fecha_inicio/fecha_fin` en agrupaciones.
- Display con `toLocaleDateString()` o `Sin fecha`.

## 4.3 Solicitudes licencias (UI)

1. [features/solicitudesLicencias/views/CrearSolicitudesLicencias.tsx](../features/solicitudesLicencias/views/CrearSolicitudesLicencias.tsx)
- Recibe:
- `fechaInicio` como Date local.
- Trata:
- helper `formatDateYMD` para serializacion backend.
- Envia:
- `fecha_inicio` en `YYYY-MM-DD`.
- Muestra:
- fecha/hora con locale `es-ES` en partes del formulario.

2. [features/solicitudesLicencias/components/MisSolicitudes.tsx](../features/solicitudesLicencias/components/MisSolicitudes.tsx)
- Parsea `fecha_inicio`, `fecha_fin`, `created_at` con `new Date(...).toLocaleDateString()`.

3. [features/solicitudesLicencias/components/LicenciasSolicitadas.tsx](../features/solicitudesLicencias/components/LicenciasSolicitadas.tsx)
- Display de `fecha_inicio` con `toLocaleDateString()` o fallback.

4. [features/solicitudesLicencias/components/VacacionesPorEmpleado.tsx](../features/solicitudesLicencias/components/VacacionesPorEmpleado.tsx)
- Display de `fecha_inicio`, `fecha_fin`, `created_at` usando `toLocaleDateString()`.

5. [features/solicitudesLicencias/components/PermisosPorEmpleado.tsx](../features/solicitudesLicencias/components/PermisosPorEmpleado.tsx)
- Mismo patron de parseo/display.

6. [features/solicitudesLicencias/components/FrancosPorEmpleado.tsx](../features/solicitudesLicencias/components/FrancosPorEmpleado.tsx)
- Mismo patron de parseo/display.

## 4.4 Reportes (UI)

1. [features/reportes/views/CrearReporte.tsx](../features/reportes/views/CrearReporte.tsx)
- Recibe:
- `fechaIncidente: Date` (picker).
- Trata:
- serializa como `fechaIncidente.toISOString().split('T')[0]`.
- Envia:
- `fecha_incidente` en `YYYY-MM-DD`.

2. [features/reportes/components/ReporteModal.tsx](../features/reportes/components/ReporteModal.tsx)
- Parsea y muestra:
- `fecha_incidente`, `created_at`, `bitacora[].created_at` con `toLocaleString()`.

3. [features/reportes/components/ReportesEmpleado.tsx](../features/reportes/components/ReportesEmpleado.tsx)
- Display `fecha_incidente` y `created_at` con `toLocaleDateString()`.

4. [features/reportes/components/MisReportes.tsx](../features/reportes/components/MisReportes.tsx)
- Mismo patron de display.

## 4.5 Encuestas (UI)

1. [features/encuestas/components/CrearEncuesta.tsx](../features/encuestas/components/CrearEncuesta.tsx)
- Recibe:
- `fechaFin: Date|null` via picker.
- Envia:
- `fecha_fin` en ISO 8601 (`toISOString()`).
- Muestra:
- fecha seleccionada con `toLocaleDateString('es-ES')`.

2. [features/encuestas/components/ListaEncuestasPendientes.tsx](../features/encuestas/components/ListaEncuestasPendientes.tsx)
- Parsea `fecha_fin` y formatea `es-ES` `dd/mm/yyyy`.

3. [features/encuestas/components/VerResultadoEncuestas.tsx](../features/encuestas/components/VerResultadoEncuestas.tsx)
- Lógica temporal:
- `new Date(fecha_fin) > new Date()` para encuesta en curso.
- Display:
- `respuesta.fecha_respuesta` con `toLocaleDateString('es-ES')`.

## 4.6 Novedades (UI)

1. [features/novedades/views/TablonNovedades.tsx](../features/novedades/views/TablonNovedades.tsx)
- Recibe:
- `createdAt` (Date o string segun flujo).
- Trata:
- sort por timestamp (`new Date(...).getTime()`).
- formatea manual `dd/MM/yyyy`.

2. [components/NovedadModal.tsx](../components/NovedadModal.tsx)
- Display de fecha ya preformateada como string.

## 4.7 Docs (UI)

1. [features/docs/components/DocumentoItem.tsx](../features/docs/components/DocumentoItem.tsx)
- Recibe:
- `archivo.createdAt` (Date tras mapper).
- Muestra:
- `new Date(archivo.createdAt).toLocaleDateString()`.

## 4.8 Kanban (UI)

1. [features/kanban/views/KanbanBoard.tsx](../features/kanban/views/KanbanBoard.tsx)
- Display de bitacora `created_at` con `toLocaleDateString('es-ES', ...)`.

2. [features/kanban/hooks/useObjetivos.ts](../features/kanban/hooks/useObjetivos.ts)
- Genera `created_at` local con `new Date().toISOString()` en optimistic update.

## 5) Formatos detectados

1. `YYYY-MM-DD`
- Uso:
- Licencias create/filtros.
- Reportes create (`fecha_incidente`).
- Web date input del picker.

2. `HH:mm`
- Uso:
- Web time input del picker.
- Agenda y display de horarios.

3. ISO 8601 string (ej: `2026-03-18T14:32:10.000Z`)
- Uso:
- Solicitudes/actividades.
- Encuestas (create y respuesta inferida).
- Novedades/docs en origen backend (`created_at`).
- Kanban optimistic timestamp.

4. Localized string (`toLocaleDateString`, `toLocaleTimeString`, `toLocaleString`)
- Uso:
- Casi toda la capa de presentacion.
- Mezcla de `es-ES` explicito y locale default.

## 6) Hallazgos y riesgos

1. Mezcla de formatos entre dominios
- `YYYY-MM-DD` (licencias/reportes create) convive con ISO 8601 (solicitudes/actividades/encuestas).
- Riesgo: errores de conversion y confusion entre fecha local vs UTC.
- Severidad: media.

2. Timezone sin politica central
- No existe conversion central ni helper unico para timezone.
- Dependencia de comportamiento de `Date` del dispositivo y locale.
- Severidad: media-alta.

3. Mappers parciales
- Solo algunos dominios convierten DTO->Date explicitamente (docs, novedades).
- Otros mantienen string y parsean en UI repetidamente.
- Severidad: media.

4. Tipado potencialmente inconsistente en users/docs
- `UserDTO` usa `Date` para campos que suelen llegar como string.
- `ArchivoDTO.created_at` tipado como `Date` pero mapper hace `new Date(dto.created_at)`.
- Severidad: media.

5. Display con locale mixto
- Se usa `es-ES` en muchos casos, pero tambien `toLocaleDateString()` sin locale.
- Severidad: baja-media.

## 7) Recomendaciones priorizadas

1. Definir contrato unico por dominio
- Opcion A: todo transporte en ISO 8601 UTC.
- Opcion B: dominios de solo fecha (`licencias`, `reporte incidente`) en `YYYY-MM-DD` y documentarlo formalmente.

2. Crear utilitario central de fechas
- Parse/format/serialize unificados.
- Helpers:
- `toApiDateYMD(Date): string`
- `toApiIsoUtc(Date): string`
- `fromApiDate(value): Date|null`
- `formatUiDate(value, locale='es-ES')`

3. Normalizar tipados DTO
- Cambiar DTOs a `string` cuando eso llega realmente por red.
- Convertir a `Date` solo en mappers del dominio si hace falta.

4. Estandarizar locale en UI
- Elegir siempre `es-ES` (o config global) para evitar diferencias por dispositivo.

5. Agregar test de contratos de fecha
- Unit tests de serializacion/deserializacion por feature.
- Casos de borde: timezone offset, cambio de dia, horario verano, nullables.

## 8) Cobertura de auditoria

Features con fechas auditados:
- solicitudesLicencias
- solicitudesActividades
- reportes
- encuestas
- novedades
- docs
- kanban
- auth/users
- shared (countdown/token)
- componentes cross-platform de date/time picker

Resultado:
- Se relevaron endpoints y componentes con manipulado de fecha en el frontend actual.
- Los formatos inferidos fueron marcados como INFERIDO cuando no habia contrato explicito.
