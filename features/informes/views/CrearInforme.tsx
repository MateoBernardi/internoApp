import { glassColors } from '@/shared/ui/glass';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Editor } from '../components/Editor';
import { useInformeAcciones } from '../hooks';
import type { AdjuntoPendiente } from '../dto/InformeDTO';

export function CrearInforme() {
  const router = useRouter();
  const acciones = useInformeAcciones();

  const publicar = async (cuerpo: string, adjuntos: AdjuntoPendiente[]) => {
    const id = await acciones.crearInforme(cuerpo, adjuntos);
    router.replace(`/(extras)/informe-detalle?id=${id}` as Href);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Mencioná con <Text style={styles.bold}>@</Text> a quienes tienen que verlo.
        </Text>
        <Editor variante="nuevo" placeholder="Escribí el informe…" submitLabel="Publicar" onSubmit={publicar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12 },
  hint: { fontSize: 13, lineHeight: 19, color: glassColors.textMuted },
  bold: { fontWeight: '700' },
});
