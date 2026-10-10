import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import { glassColors } from '@/shared/ui/glass';
import { showGlobalToast } from '@/shared/ui/toast';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CerrarInformeSheet } from '../components/CerrarInformeSheet';
import { Editor } from '../components/Editor';
import { EntradaItem } from '../components/EntradaItem';
import { VisorAdjunto, type AdjuntoAbierto } from '../components/VisorAdjunto';
import type { Adjunto, AdjuntoPendiente } from '../dto/InformeDTO';
import { useInforme, useInformeAcciones } from '../hooks';
import { abrirDocumentoWeb } from '@/components/filePreview/webFile';

/**
 * Con `empleadoId` es la vista de solo lectura de management (informes que mencionan al empleado):
 * quien mira puede no participar del informe, así que no se muestran acciones de escritura.
 */
export function InformeDetalle({ informeId, empleadoId }: { informeId: string; empleadoId?: number }) {
  const { user } = useAuth();
  const miId = user?.user_context_id ?? null;
  const { informe, isLoading, error } = useInforme(informeId, empleadoId);
  const acciones = useInformeAcciones();
  const scrollRef = useRef<ScrollView>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cerrarAbierto, setCerrarAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [visor, setVisor] = useState<AdjuntoAbierto | null>(null);

  const abrirAdjunto = useCallback(
    (adjunto: Adjunto, autor: string, fecha: string) => {
      // En web los documentos (PDF, etc.) se abren en una pestaña aparte, o se descargan si el navegador no la deja abrir.
      if (Platform.OS === 'web' && adjunto.tipo === 'documento') {
        abrirDocumentoWeb(
          async () => (await acciones.obtenerUrlAdjunto(informeId, adjunto.id, empleadoId)).url,
          adjunto.nombre,
        ).catch((e) => showGlobalToast(e instanceof Error ? e.message : 'No se pudo abrir el archivo.'));
        return;
      }
      setVisor({ informeId, adjunto, autor, fecha });
    },
    [acciones, informeId, empleadoId],
  );
  const cancelarEdicion = useCallback(() => setEditandoId(null), []);

  const guardar = useCallback(
    async (entradaId: string, cuerpo: string, nuevos: AdjuntoPendiente[], quitarIds: string[]) => {
      await acciones.editarEntrada(informeId, entradaId, cuerpo, nuevos, quitarIds);
      setEditandoId(null);
    },
    [acciones, informeId],
  );

  if (isLoading) return <ScreenSkeleton rows={4} showHeader={false} />;
  if (!informe) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'No se encontró el informe.'}</Text>
      </View>
    );
  }

  const soloLectura = empleadoId !== undefined;
  const esCreador = !soloLectura && miId !== null && informe.creador === miId;
  const abierto = !informe.cerrada;

  const enviar = async (cuerpo: string, nuevos: AdjuntoPendiente[]) => {
    await acciones.agregarEntrada(informeId, cuerpo, nuevos);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const cerrar = async (texto: string) => {
    setCerrando(true);
    try {
      await acciones.cerrarInforme(informeId, texto || undefined);
      setCerrarAbierto(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e) {
      showGlobalToast(e instanceof Error ? e.message : 'No se pudo cerrar el informe.');
    } finally {
      setCerrando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        {abierto ? (
          <View style={[styles.status, styles.statusOpen]}>
            <View style={styles.dot} />
            <Text style={[styles.statusText, { color: '#1558b0' }]}>Abierto</Text>
          </View>
        ) : (
          <View style={[styles.status, styles.statusClosed]}>
            <Ionicons name="lock-closed" size={12} color="#5a6068" />
            <Text style={[styles.statusText, { color: '#5a6068' }]}>Cerrado</Text>
          </View>
        )}
        {esCreador && abierto && (
          <Pressable onPress={() => setCerrarAbierto(true)} style={styles.closeButton} accessibilityRole="button">
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        )}
      </View>

      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
        {informe.entradas.map((e) => (
          <EntradaItem
            key={e.id}
            entrada={e}
            personas={informe.personas}
            miId={miId}
            editable={abierto && !soloLectura}
            editando={editandoId === e.id}
            onEditar={setEditandoId}
            onCancelarEdicion={cancelarEdicion}
            onGuardar={guardar}
            onAbrirAdjunto={abrirAdjunto}
            {...(empleadoId !== undefined ? { empleadoId } : null)}
          />
        ))}
        {!abierto && <Text style={styles.readOnly}>Informe cerrado · solo lectura</Text>}
      </ScrollView>

      {abierto && !soloLectura && (
        <View style={styles.composer}>
          <Editor variante="compositor" placeholder="Escribí una entrada…" submitLabel="Enviar" onSubmit={enviar} />
        </View>
      )}

      <CerrarInformeSheet visible={cerrarAbierto} cerrando={cerrando} onCancel={() => setCerrarAbierto(false)} onConfirm={cerrar} />
      <VisorAdjunto
        abierto={visor}
        obtenerUrl={(idInforme, idAdjunto) => acciones.obtenerUrlAdjunto(idInforme, idAdjunto, empleadoId)}
        onClose={() => setVisor(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: glassColors.error, textAlign: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(17,24,28,0.08)' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  statusOpen: { backgroundColor: 'rgba(26,115,232,0.12)' },
  statusClosed: { backgroundColor: '#eef0f2' },
  statusText: { fontSize: 12.5, fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: glassColors.link },
  closeButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(17,24,28,0.15)' },
  closeText: { fontSize: 13.5, fontWeight: '700', color: glassColors.text },
  thread: { paddingTop: 12, paddingBottom: 18 },
  readOnly: { textAlign: 'center', fontSize: 12.5, color: '#9aa3ab', marginTop: 16 },
  composer: { paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(17,24,28,0.08)', backgroundColor: '#ffffff' },
});
