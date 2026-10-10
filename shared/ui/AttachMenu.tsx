import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { boxShadow } from './boxShadow';
import { glassColors, glassStyles } from './glass';

export interface Ancla {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ANCHO_MENU = 224;
const ALTO_FILA = 48;
const PADDING_MENU = 6;
const MARGEN = 8;
const SEPARACION = 6;

export const ALTO_MENU = ALTO_FILA * 3 + PADDING_MENU * 2;

/**
 * Posición del menú respecto del botón que lo abre: debajo si entra, si no arriba (los composers
 * de chat están al pie de la pantalla); alineado al borde izquierdo del botón o, si no entra, al derecho.
 * Siempre a `MARGEN` px de los bordes de la ventana.
 */
export function calcularPosicion(
  ancla: Ancla,
  ventana: { width: number; height: number },
  menu: { width: number; height: number } = { width: ANCHO_MENU, height: ALTO_MENU },
): { left: number; top: number; arriba: boolean } {
  const abajoCabe = ancla.y + ancla.height + SEPARACION + menu.height + MARGEN <= ventana.height;
  const arribaCabe = ancla.y - SEPARACION - menu.height >= MARGEN;
  const arriba = !abajoCabe && arribaCabe;

  const top = arriba
    ? ancla.y - SEPARACION - menu.height
    : Math.max(MARGEN, Math.min(ancla.y + ancla.height + SEPARACION, ventana.height - menu.height - MARGEN));

  const alineadoIzquierda = ancla.x;
  const alineadoDerecha = ancla.x + ancla.width - menu.width;
  const left = alineadoIzquierda + menu.width + MARGEN <= ventana.width ? alineadoIzquierda : alineadoDerecha;

  return { left: Math.max(MARGEN, Math.min(left, ventana.width - menu.width - MARGEN)), top, arriba };
}

interface Handlers {
  onGallery: () => void;
  onCamera: () => void;
  onFile: () => void;
}

type Opcion = 'galeria' | 'camara' | 'archivo';

const OPCIONES: { clave: Opcion; icono: React.ComponentProps<typeof Ionicons>['name']; titulo: string; detalle: string }[] = [
  { clave: 'galeria', icono: 'image-outline', titulo: 'Galería', detalle: 'Fotos y videos' },
  { clave: 'camara', icono: 'camera-outline', titulo: 'Cámara', detalle: 'Tomar foto o video' },
  { clave: 'archivo', icono: 'document-outline', titulo: 'Documento', detalle: 'PDF, Word, Excel…' },
];

// Si iOS no llega a emitir `onDismiss` (menú cerrado antes de terminar de presentarse), la acción pendiente
// se ejecuta igual pasado este tiempo, en vez de quedar colgada y dispararse en un cierre posterior.
const RESPALDO_DISMISS_MS = 1200;

/**
 * Menú de adjuntar con las mismas tres opciones en todos los módulos (galería, cámara, documento).
 * Dos formas de mostrarlo:
 *  - anclado: se despliega desde el botón que lo abre (Informes, Solicitudes, Chats);
 *  - centrado: tarjeta grande en el centro de la pantalla, para las pantallas completas donde medir el
 *    botón no es confiable (Objetivos, Licencias).
 *
 *   const { openAttachMenu, openAttachMenuCentered, AttachMenu } = useAttachMenu({ onGallery, onCamera, onFile });
 *   <TouchableOpacity ref={btnRef} onPress={() => openAttachMenu(btnRef)} />   // anclado
 *   <TouchableOpacity onPress={() => openAttachMenuCentered()} />               // centrado
 *   {AttachMenu}
 *
 * Si los handlers se definen más abajo que el hook (p. ej. después de un `return null`, y el hook no
 * puede ir después), se pasan al abrir: `useAttachMenu()` y `openAttachMenuCentered({ onGallery, … })`.
 */
export function useAttachMenu(handlersIniciales?: Handlers) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<'ancla' | 'centro'>('ancla');
  const [ancla, setAncla] = useState<Ancla | null>(null);
  const ventana = useWindowDimensions();
  // En iOS la acción corre cuando el Modal terminó de descartarse: si presenta el document picker o la
  // cámara mientras sigue la transición de cierre, UIKit descarta la presentación en silencio.
  const pendiente = useRef<(() => void) | null>(null);
  const respaldo = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita que un doble toque sobre una opción encole dos acciones.
  const cerrando = useRef(false);
  const handlers = useRef<Handlers | undefined>(handlersIniciales);
  useEffect(() => {
    handlers.current = handlersIniciales;
  });

  const limpiarPendiente = useCallback(() => {
    pendiente.current = null;
    if (respaldo.current) clearTimeout(respaldo.current);
    respaldo.current = null;
  }, []);

  useEffect(() => limpiarPendiente, [limpiarPendiente]);

  const preparar = useCallback(
    (handlersAlAbrir?: Handlers) => {
      if (handlersAlAbrir) handlers.current = handlersAlAbrir;
      // Una acción vieja que quedó pendiente no debe dispararse con el siguiente cierre.
      limpiarPendiente();
      cerrando.current = false;
    },
    [limpiarPendiente],
  );

  const abrirCentrado = useCallback(
    (handlersAlAbrir?: Handlers) => {
      preparar(handlersAlAbrir);
      setModo('centro');
      setAbierto(true);
    },
    [preparar],
  );

  const abrir = useCallback(
    (anchorRef?: React.RefObject<any>, handlersAlAbrir?: Handlers) => {
      preparar(handlersAlAbrir);
      const nodo = anchorRef?.current;
      if (!nodo?.measureInWindow) {
        setModo('centro');
        setAbierto(true);
        return;
      }
      let resuelto = false;
      const mostrar = (nueva: Ancla | null) => {
        if (resuelto) return;
        resuelto = true;
        setAncla(nueva);
        setModo(nueva ? 'ancla' : 'centro');
        setAbierto(true);
      };
      nodo.measureInWindow((x: number, y: number, width: number, height: number) => mostrar({ x, y, width, height }));
      // Si la medición nunca responde (vista desmontada), el menú igual se abre, centrado.
      setTimeout(() => mostrar(null), 300);
    },
    [preparar],
  );

  const cerrar = useCallback(() => setAbierto(false), []);

  const ejecutarPendiente = useCallback(() => {
    const accion = pendiente.current;
    limpiarPendiente();
    accion?.();
  }, [limpiarPendiente]);

  const elegir = useCallback(
    (opcion: Opcion) => {
      const actuales = handlers.current;
      if (!actuales || cerrando.current) return;
      cerrando.current = true;
      const accion = opcion === 'galeria' ? actuales.onGallery : opcion === 'camara' ? actuales.onCamera : actuales.onFile;
      setAbierto(false);
      if (Platform.OS === 'ios') {
        pendiente.current = accion;
        respaldo.current = setTimeout(ejecutarPendiente, RESPALDO_DISMISS_MS);
      } else {
        accion();
      }
    },
    [ejecutarPendiente],
  );

  const posicion = useMemo(() => (ancla ? calcularPosicion(ancla, ventana) : null), [ancla, ventana]);

  const filas = (grande: boolean) =>
    OPCIONES.map((o) => (
      <Pressable
        key={o.clave}
        onPress={() => elegir(o.clave)}
        accessibilityRole="button"
        accessibilityLabel={o.titulo}
        style={({ pressed }) => [grande ? styles.filaGrande : styles.fila, pressed && styles.filaPresionada]}
      >
        <Ionicons name={o.icono} size={grande ? 24 : 20} color={glassColors.link} />
        <View style={styles.textos}>
          <Text style={grande ? styles.tituloGrande : styles.titulo}>{o.titulo}</Text>
          <Text style={grande ? styles.detalleGrande : styles.detalle}>{o.detalle}</Text>
        </View>
      </Pressable>
    ));

  const menu = (
    <Modal visible={abierto} transparent animationType="fade" onRequestClose={cerrar} onDismiss={ejecutarPendiente}>
      {modo === 'centro' || !posicion ? (
        <Pressable style={glassStyles.modalOverlay} onPress={cerrar} accessibilityLabel="Cerrar menú de adjuntar">
          <Pressable style={styles.tarjetaCentro} onPress={() => {}}>
            <Text style={styles.encabezadoCentro}>Adjuntar archivo</Text>
            {filas(true)}
            <Pressable
              onPress={cerrar}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              style={({ pressed }) => [styles.cancelar, pressed && styles.filaPresionada]}
            >
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      ) : (
        <Pressable style={styles.fondo} onPress={cerrar} accessibilityLabel="Cerrar menú de adjuntar">
          <View style={[styles.menu, { left: posicion.left, top: posicion.top, width: ANCHO_MENU }]}>{filas(false)}</View>
        </Pressable>
      )}
    </Modal>
  );

  return { openAttachMenu: abrir, openAttachMenuCentered: abrirCentrado, AttachMenu: menu };
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  menu: {
    position: 'absolute',
    padding: PADDING_MENU,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    boxShadow: boxShadow({ width: 0, height: 12 }, 0.18, 32),
  },
  fila: {
    height: ALTO_FILA,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  filaPresionada: { backgroundColor: 'rgba(26,115,232,0.08)' },
  // Variante centrada: más grande, pensada para el centro de la pantalla.
  tarjetaCentro: {
    ...glassStyles.modalCard,
    width: '88%',
    maxWidth: 360,
    padding: 10,
  },
  encabezadoCentro: { fontSize: 17, fontWeight: '700', color: glassColors.text, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 },
  filaGrande: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, borderRadius: 12 },
  tituloGrande: { fontSize: 16, fontWeight: '700', color: glassColors.text },
  detalleGrande: { fontSize: 13, color: glassColors.textMuted },
  cancelar: { marginTop: 6, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cancelarTexto: { fontSize: 15, fontWeight: '600', color: glassColors.textMuted },
  textos: { flex: 1 },
  titulo: { fontSize: 14.5, fontWeight: '700', color: glassColors.text },
  detalle: { fontSize: 12, color: glassColors.textMuted },
});
