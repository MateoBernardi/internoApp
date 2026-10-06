import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import { confirmAction } from '@/shared/ui/confirmAction';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { showGlobalToast } from '@/shared/ui/toast';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import React, { useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MentionComposer, useMentionDraft } from '../components/MentionComposer';
import { MentionText } from '../components/MentionText';
import type { EntradaDTO, PersonaResumenDTO } from '../dto/HistoriaDTO';
import { formatFechaHora, nombreCompleto } from '../utils/format';
import { useAgregarMensaje, useCerrarHistoria, useHistoria } from '../viewmodels/useHistorias';

function Entrada({ entrada, personas }: { entrada: EntradaDTO; personas: Record<number, PersonaResumenDTO> }) {
  const autor = nombreCompleto(personas[entrada.autor_id]) || 'Usuario';
  if (entrada.tipo === 'cierre') {
    return (
      <View style={styles.closure}>
        <Text style={styles.closureText}>
          {autor} cerró la historia · {formatFechaHora(entrada.creado_en)}
        </Text>
        {!!entrada.cuerpo && <MentionText cuerpo={entrada.cuerpo} personas={personas} style={styles.closureBody} />}
      </View>
    );
  }
  return (
    <View style={[styles.entry, entrada.tipo === 'relato' && styles.relato]}>
      <View style={styles.entryHeader}>
        <Text style={styles.author}>{autor}</Text>
        <Text style={styles.date}>{formatFechaHora(entrada.creado_en)}</Text>
      </View>
      <MentionText cuerpo={entrada.cuerpo} personas={personas} />
    </View>
  );
}

export function HistoriaDetalle({ historiaId }: { historiaId: string }) {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useHistoria(historiaId);
  const scrollRef = useRef<ScrollView>(null);

  const draft = useMentionDraft();
  const mensajeKey = useIdempotencyKey();
  const cierreKey = useIdempotencyKey();
  const agregar = useAgregarMensaje(historiaId, mensajeKey.idempotencyKey);
  const cerrar = useCerrarHistoria(historiaId, cierreKey.idempotencyKey);

  if (isLoading) return <ScreenSkeleton rows={4} showHeader={false} />;
  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error instanceof Error ? error.message : 'No se encontró la historia.'}</Text>
      </View>
    );
  }

  const esCreador = user?.user_context_id === data.creador;
  const cuerpo = draft.serialize();

  const enviar = () => {
    agregar.mutate(cuerpo, {
      onSuccess: () => {
        mensajeKey.regenerateIdempotencyKey();
        draft.reset();
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      },
      onError: (e) => showGlobalToast(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.'),
    });
  };

  const cerrarHistoria = async () => {
    const ok = await confirmAction({
      title: 'Cerrar historia',
      message: 'Una vez cerrada nadie podrá agregar mensajes. Esta acción no se puede deshacer.',
      confirmText: 'Cerrar',
      destructive: true,
    });
    if (!ok) return;
    cerrar.mutate(undefined, {
      onSuccess: () => cierreKey.regenerateIdempotencyKey(),
      onError: (e) => showGlobalToast(e instanceof Error ? e.message : 'No se pudo cerrar la historia.'),
    });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
        {esCreador && !data.cerrada && (
          <View style={styles.closeRow}>
            <GlassButton
              label="Cerrar historia"
              variant="danger"
              onPress={cerrarHistoria}
              loading={cerrar.isPending}
              style={styles.closeButton}
            />
          </View>
        )}
        {data.entradas.map((e) => (
          <Entrada key={e.id} entrada={e} personas={data.personas} />
        ))}
      </ScrollView>

      {/* Composer fijo abajo, fuera del scroll (interno-ui-system §2). */}
      <View style={styles.composer}>
        {data.cerrada ? (
          <Text style={styles.closedNotice}>Esta historia está cerrada: no se pueden agregar mensajes.</Text>
        ) : (
          <>
            <MentionComposer draft={draft} placeholder="Escribí un mensaje… (@ para mencionar)" />
            <GlassButton
              label="Enviar"
              onPress={enviar}
              loading={agregar.isPending}
              disabled={cuerpo.length === 0 || agregar.isPending}
              style={styles.send}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: glassColors.error, textAlign: 'center' },
  thread: { padding: 16, gap: 10 },
  closeRow: { alignItems: 'flex-end' },
  closeButton: { paddingVertical: 8, paddingHorizontal: 16 },
  entry: { ...glassStyles.card, padding: 12 },
  relato: { backgroundColor: 'rgba(255,255,255,0.9)' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  author: { fontSize: 14, fontWeight: '700', color: glassColors.text, flexShrink: 1 },
  date: { fontSize: 12, color: glassColors.textMuted },
  closure: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  closureText: { fontSize: 13, fontWeight: '600', color: glassColors.textMuted },
  closureBody: { textAlign: 'center' },
  composer: { padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(17,24,28,0.08)', backgroundColor: '#ffffff', gap: 8 },
  send: { paddingVertical: 10 },
  closedNotice: { textAlign: 'center', color: glassColors.textMuted, fontSize: 14 },
});
