import { useAuth } from '@/features/auth/context/AuthContext';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { searchUsers } from '@/shared/users/userApi';
import { showGlobalToast } from '@/shared/ui/toast';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Adjunto, AdjuntoPendiente } from '../dto/InformeDTO';
import { elegirDocumentos, elegirMedia } from '../utils/adjuntos';
import { nombreCompleto } from '../utils/format';
import { AdjuntoTile } from './AdjuntoTile';
import EditorDom, { type AltoEditor, type PersonaSugerida } from './editor/EditorDom';

export type VarianteEditor = 'compositor' | 'edicion' | 'nuevo';

const ALTO: Record<VarianteEditor, AltoEditor> = { compositor: 'compacto', edicion: 'libre', nuevo: 'alto' };

interface Props {
  variante: VarianteEditor;
  initialHtml?: string;
  existentes?: Adjunto[];
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (cuerpo: string, nuevos: AdjuntoPendiente[], quitarIds: string[]) => Promise<void>;
  onCancel?: () => void;
}

export function Editor({
  variante,
  initialHtml = '',
  existentes = [],
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
  const [quitados, setQuitados] = useState<string[]>([]);
  const [resetNonce, setResetNonce] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const visibles = existentes.filter((a) => !quitados.includes(a.id));
  const puedeEnviar = (!vacio || pendientes.length > 0 || visibles.length > 0) && !enviando;

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
      await onSubmit(html, pendientes, quitados);
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

  const onAdjuntar = useCallback(async () => {
    setMenuAbierto(true);
  }, []);

  const agregar = async (origen: 'media' | 'doc') => {
    setMenuAbierto(false);
    try {
      if (origen === 'media') {
        const { adjuntos, error } = await elegirMedia();
        if (error) showGlobalToast(error);
        setPendientes((p) => [...p, ...adjuntos]);
      } else {
        const adjuntos = await elegirDocumentos();
        setPendientes((p) => [...p, ...adjuntos]);
      }
    } catch {
      showGlobalToast('No se pudo adjuntar el archivo.');
    }
  };

  const dom = useMemo(() => ({ matchContents: true, scrollEnabled: false, hideKeyboardAccessoryView: true }), []);

  return (
    <View>
      {(visibles.length > 0 || pendientes.length > 0) && (
        <View style={styles.tray}>
          {visibles.map((a) => (
            <AdjuntoTile
              key={a.id}
              tipo={a.tipo}
              nombre={a.nombre}
              tamano={a.tamano}
              size={56}
              onRemove={() => setQuitados((q) => [...q, a.id])}
            />
          ))}
          {pendientes.map((a, i) => (
            <AdjuntoTile
              key={`${a.uri}-${i}`}
              tipo={a.tipo}
              nombre={a.nombre}
              tamano={a.tamano}
              uri={a.uri}
              size={56}
              onRemove={() => setPendientes((p) => p.filter((_, j) => j !== i))}
            />
          ))}
        </View>
      )}

      <EditorDom
        dom={dom}
        initialHtml={initialHtml}
        placeholder={placeholder}
        alto={ALTO[variante]}
        popoverArriba={variante !== 'edicion'}
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

      <Modal visible={menuAbierto} transparent animationType="fade" onRequestClose={() => setMenuAbierto(false)}>
        <Pressable style={glassStyles.modalOverlay} onPress={() => setMenuAbierto(false)}>
          <View style={[glassStyles.modalCard, styles.menu]}>
            <Pressable style={styles.menuItem} onPress={() => agregar('media')} accessibilityRole="button">
              <Ionicons name="image-outline" size={20} color={glassColors.text} />
              <Text style={styles.menuText}>Foto o video</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => agregar('doc')} accessibilityRole="button">
              <Ionicons name="document-outline" size={20} color={glassColors.text} />
              <Text style={styles.menuText}>Documento</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  menu: { width: 260, padding: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  menuText: { fontSize: 15, fontWeight: '600', color: glassColors.text },
});
