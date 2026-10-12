import { KEYBOARD_BEHAVIOR, useKeyboardHeight } from '@/shared/ui/keyboard';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Editor } from '../components/Editor';
import { useInformeAcciones } from '../hooks';
import type { AdjuntoPendiente } from '../dto/InformeDTO';

export function CrearInforme() {
  const router = useRouter();
  const acciones = useInformeAcciones();
  const keyboardHeight = useKeyboardHeight();

  const publicar = async (cuerpo: string, adjuntos: AdjuntoPendiente[]) => {
    const id = await acciones.crearInforme(cuerpo, adjuntos);
    router.replace(`/(extras)/informe-detalle?id=${id}` as Href);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: 16 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Con el teclado abierto el área de texto tiene alto acotado y scrollea por dentro: así el texto
            completo se puede recorrer y el botón Publicar queda a la vista sin cerrar el teclado. */}
        <Editor
          variante="nuevo"
          expandido={keyboardHeight > 0}
          placeholder="Escribí el informe…"
          submitLabel="Publicar"
          onSubmit={publicar}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12 },
});
