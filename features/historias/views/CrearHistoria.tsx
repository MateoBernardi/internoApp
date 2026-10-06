import { showGlobalToast } from '@/shared/ui/toast';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors } from '@/shared/ui/glass';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MentionComposer, useMentionDraft } from '../components/MentionComposer';
import { useCrearHistoria } from '../viewmodels/useHistorias';

export function CrearHistoria() {
  const router = useRouter();
  const draft = useMentionDraft();
  const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();
  const crear = useCrearHistoria(idempotencyKey);

  const cuerpo = draft.serialize();
  const canSubmit = cuerpo.length > 0 && !crear.isPending;

  const submit = () => {
    crear.mutate(cuerpo, {
      onSuccess: (relato) => {
        regenerateIdempotencyKey();
        draft.reset();
        // Se reemplaza la pantalla para que "volver" no regrese al formulario.
        router.replace(`/(extras)/historia-detalle?id=${relato.historia_id}` as Href);
      },
      onError: (e) => showGlobalToast(e instanceof Error ? e.message : 'No se pudo crear la historia.'),
    });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.help}>
          Contá qué pasó. Escribí @ para mencionar a alguien: va a poder ver toda la conversación y participar.
        </Text>
        <MentionComposer draft={draft} placeholder="Escribí tu relato…" minHeight={160} />
        <View style={styles.actions}>
          <GlassButton label="Publicar historia" onPress={submit} loading={crear.isPending} disabled={!canSubmit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 14 },
  help: { fontSize: 14, lineHeight: 20, color: glassColors.textMuted },
  actions: { marginTop: 4 },
});
