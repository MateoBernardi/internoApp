import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { glassColors } from '@/shared/ui/glass';
import { KEYBOARD_BEHAVIOR, useKeyboardVisible } from '@/shared/ui/keyboard';
import { showGlobalToast } from '@/shared/ui/toast';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Editor } from '../components/Editor';
import { EntradaItem } from '../components/EntradaItem';
import { VisorAdjunto, type AdjuntoAbierto } from '../components/VisorAdjunto';
import type { Adjunto, AdjuntoPendiente } from '../dto/InformeDTO';
import { useInforme, useInformeAcciones } from '../hooks';
import { abrirDocumentoWeb } from '@/components/filePreview/webFile';

/**
 * Con `empleadoId` es la vista de management (informes que mencionan al empleado): quien mira puede no
 * participar del informe. Gerencia siempre puede escribir; el resto solo si es autor o fue mencionado.
 */
export function InformeDetalle({ informeId, empleadoId }: { informeId: string; empleadoId?: number }) {
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();
  const miId = user?.user_context_id ?? null;
  const { informe, isLoading, error } = useInforme(informeId, empleadoId);
  const acciones = useInformeAcciones();
  const scrollRef = useRef<ScrollView>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [visor, setVisor] = useState<AdjuntoAbierto | null>(null);
  const teclado = useKeyboardVisible();

  // Al cerrar el teclado vuelve el hilo: se lo deja en la última entrada una vez que el layout se asentó.
  useEffect(() => {
    const alOcultar = Keyboard.addListener('keyboardDidHide', () => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    });
    return () => alOcultar.remove();
  }, []);

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

  const participa = miId !== null && informe.entradas.some((e) => e.autor_id === miId || e.menciones.includes(miId));
  const puedeEscribir = empleadoId === undefined || hasRole('gerencia') || participa;
  // Con el teclado abierto en el compositor se muestra solo el editor. Se ocultan con estilos (sin desmontar):
  // si el Editor se remontara, el WebView perdería el foco y se cerraría el teclado.
  const soloEditor = teclado && puedeEscribir && editandoId === null;

  const enviar = async (cuerpo: string, nuevos: AdjuntoPendiente[]) => {
    await acciones.agregarEntrada(informeId, cuerpo, nuevos);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={[styles.flex, soloEditor && styles.oculto]}
        contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
        {informe.entradas.map((e) => (
          <EntradaItem
            key={e.id}
            entrada={e}
            personas={informe.personas}
            miId={miId}
            editable={puedeEscribir}
            editando={editandoId === e.id}
            onEditar={setEditandoId}
            onCancelarEdicion={cancelarEdicion}
            onGuardar={guardar}
            onAbrirAdjunto={abrirAdjunto}
            {...(empleadoId !== undefined ? { empleadoId } : null)}
          />
        ))}
      </ScrollView>

      {puedeEscribir && (
        // Siempre un ScrollView (cambiar el tipo de contenedor remontaría el editor y cerraría el teclado):
        // con el teclado abierto, si el editor y Enviar no entran, se llega a ellos scrolleando.
        <ScrollView
          style={soloEditor ? styles.composerExpandido : styles.composerFijo}
          contentContainerStyle={[styles.composer, soloEditor && styles.composerSinBorde]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <Editor
            variante="compositor"
            expandido={soloEditor}
            placeholder="Escribí una entrada…"
            submitLabel="Enviar"
            onSubmit={enviar}
          />
        </ScrollView>
      )}

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
  thread: { paddingTop: 12, paddingBottom: 18 },
  oculto: { display: 'none' },
  composer: { paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(17,24,28,0.08)', backgroundColor: '#ffffff' },
  composerFijo: { flexGrow: 0 },
  composerExpandido: { flex: 1 },
  composerSinBorde: { borderTopWidth: 0 },
});
