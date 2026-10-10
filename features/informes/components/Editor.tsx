import { useAuth } from '@/features/auth/context/AuthContext';
import { glassColors } from '@/shared/ui/glass';
import { useCameraCapture } from '@/shared/ui/useCameraCapture';
import { searchUsers } from '@/shared/users/userApi';
import { showGlobalToast } from '@/shared/ui/toast';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Adjunto, AdjuntoPendiente } from '../dto/InformeDTO';
import { elegirCamara, elegirDocumentos, elegirMedia, type AdjuntoElegido } from '../utils/adjuntos';
import { ordenesEnLinea } from '../utils/enLinea';
import { nombreCompleto } from '../utils/format';
import { AdjuntoTile } from './AdjuntoTile';
import EditorDom, { type AdjuntoInfoEditor, type AltoEditor, type OrigenAdjunto, type PersonaSugerida } from './editor/EditorDom';

export type VarianteEditor = 'compositor' | 'edicion' | 'nuevo';

const ALTO: Record<VarianteEditor, AltoEditor> = { compositor: 'compacto', edicion: 'libre', nuevo: 'alto' };

interface Props {
  variante: VarianteEditor;
  initialHtml?: string;
  existentes?: Adjunto[];
  /** Informe de la entrada que se edita; permite mostrar miniaturas de los adjuntos guardados. */
  informeId?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (cuerpo: string, nuevos: AdjuntoPendiente[], quitarIds: string[]) => Promise<void>;
  onCancel?: () => void;
}

export function Editor({
  variante,
  initialHtml = '',
  existentes = [],
  informeId,
  placeholder = 'Escribí una entrada…',
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const { user, tokens } = useAuth();
  const token = tokens?.accessToken;
  const [html, setHtml] = useState(initialHtml);
  const [vacio, setVacio] = useState(!initialHtml);
  const [pendientes, setPendientes] = useState<AdjuntoPendiente[]>([]);
  const [bandejaQuitados, setBandejaQuitados] = useState<string[]>([]);
  const [resetNonce, setResetNonce] = useState(0);
  const [insercion, setInsercion] = useState<{ nonce: number; ordenes: number[] } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { openCamera, CameraModal } = useCameraCapture();

  // Adjuntos que ya estaban dentro del texto al abrir la edición; el resto (entradas viejas) va en una bandeja.
  const enLineaInicial = useMemo(() => ordenesEnLinea(initialHtml), [initialHtml]);
  const bandeja = existentes.filter((a) => !enLineaInicial.has(a.orden) && !bandejaQuitados.includes(a.id));
  // El orden de un adjunto nunca se reutiliza: se parte del máximo existente.
  const siguienteOrden = useRef(existentes.reduce((max, a) => Math.max(max, a.orden), -1) + 1);

  const adjuntosInfo = useMemo(() => {
    const info: Record<string, AdjuntoInfoEditor> = {};
    for (const a of existentes) info[String(a.orden)] = { nombre: a.nombre, tipo: a.tipo, tamano: a.tamano };
    for (const p of pendientes) {
      info[String(p.orden)] = {
        nombre: p.nombre,
        tipo: p.tipo,
        tamano: p.tamano,
        ...(Platform.OS === 'web' ? { uri: p.uri } : null),
      };
    }
    return info;
  }, [existentes, pendientes]);

  const puedeEnviar = !vacio && !enviando;

  const onChange = useCallback(async (nuevo: string, esVacio: boolean) => {
    setHtml(nuevo);
    setVacio(esVacio);
  }, []);

  const onBuscar = useCallback(
    async (consulta: string): Promise<PersonaSugerida[]> => {
      if (!token) return [];
      const res = await searchUsers(token, consulta);
      return (res.data as any[]).map((u) => ({
        id: u.user_context_id,
        nombre: nombreCompleto(u),
        rol: u.rol_nombre ?? '',
      }));
    },
    [token],
  );

  const enviar = async () => {
    if (!puedeEnviar) return;
    setEnviando(true);
    try {
      // Lo que no quedó referenciado en el texto (porque se borró el bloque) no se sube / se elimina.
      const enTexto = ordenesEnLinea(html);
      const nuevos = pendientes.filter((p) => enTexto.has(p.orden));
      const quitar = [
        ...bandejaQuitados,
        ...existentes.filter((a) => enLineaInicial.has(a.orden) && !enTexto.has(a.orden)).map((a) => a.id),
      ];
      await onSubmit(html, nuevos, quitar);
      if (variante !== 'edicion') {
        setHtml('');
        setVacio(true);
        setPendientes([]);
        setResetNonce((n) => n + 1);
      }
    } catch (e) {
      showGlobalToast(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setEnviando(false);
    }
  };

  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;
  const onEnviar = useCallback(async () => {
    await enviarRef.current();
  }, []);

  const insertar = (elegidos: AdjuntoElegido[]) => {
    if (elegidos.length === 0) return;
    const nuevos = elegidos.map((a) => ({ ...a, orden: siguienteOrden.current++ }));
    setPendientes((p) => [...p, ...nuevos]);
    setInsercion((i) => ({ nonce: (i?.nonce ?? 0) + 1, ordenes: nuevos.map((n) => n.orden) }));
  };

  // El menú (galería / cámara / documento) se despliega desde el botón de adjuntar, dentro del editor.
  const onAdjuntar = useCallback(
    async (origen: OrigenAdjunto) => {
      try {
        if (origen === 'documento') {
          insertar(await elegirDocumentos());
          return;
        }
        const { adjuntos, error } = origen === 'camara' ? await elegirCamara(openCamera) : await elegirMedia();
        if (error) showGlobalToast(error);
        insertar(adjuntos);
      } catch {
        showGlobalToast('No se pudo adjuntar el archivo.');
      }
    },
    // `insertar` solo usa setters y refs estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openCamera],
  );

  const dom = useMemo(() => ({ matchContents: true, scrollEnabled: false, hideKeyboardAccessoryView: true }), []);

  return (
    <View>
      {bandeja.length > 0 && (
        <View style={styles.tray}>
          {bandeja.map((a) => (
            <AdjuntoTile
              key={a.id}
              tipo={a.tipo}
              nombre={a.nombre}
              tamano={a.tamano}
              size={56}
              {...(informeId ? { informeId, adjuntoId: a.id } : null)}
              onRemove={() => setBandejaQuitados((q) => [...q, a.id])}
            />
          ))}
        </View>
      )}

      <EditorDom
        dom={dom}
        initialHtml={initialHtml}
        placeholder={placeholder}
        alto={ALTO[variante]}
        adjuntosInfo={adjuntosInfo}
        insercion={insercion}
        miId={user?.user_context_id ?? null}
        resetNonce={resetNonce}
        autoFocus={variante !== 'compositor'}
        deshabilitado={enviando}
        onChange={onChange}
        onBuscar={onBuscar}
        onAdjuntar={onAdjuntar}
        onEnviar={onEnviar}
      />

      <View style={styles.actions}>
        {onCancel && (
          <Pressable onPress={onCancel} disabled={enviando} style={styles.ghost} accessibilityRole="button">
            <Text style={styles.ghostText}>Cancelar</Text>
          </Pressable>
        )}
        <Pressable
          onPress={enviar}
          disabled={!puedeEnviar}
          style={[styles.send, !puedeEnviar && styles.sendDisabled]}
          accessibilityRole="button"
          accessibilityLabel={submitLabel ?? 'Enviar'}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.sendText}>{submitLabel ?? 'Enviar'}</Text>
              {variante === 'compositor' && <Ionicons name="send" size={16} color="#fff" />}
            </>
          )}
        </Pressable>
      </View>

      {CameraModal}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 10, paddingTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 },
  ghost: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999 },
  ghostText: { fontSize: 14, fontWeight: '600', color: glassColors.textMuted },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: glassColors.link,
    minHeight: 38,
  },
  sendDisabled: { backgroundColor: '#c9d7ee' },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
