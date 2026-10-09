import { glassColors } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Adjunto, Entrada, Persona } from '../dto/InformeDTO';
import { formatFechaHora, iniciales, nombreCompleto } from '../utils/format';
import { AdjuntoTile } from './AdjuntoTile';
import { Editor } from './Editor';
import { InformeHtml } from './InformeHtml';
import type { AdjuntoPendiente } from '../dto/InformeDTO';

interface Props {
  entrada: Entrada;
  personas: Record<number, Persona>;
  miId: number | null;
  editable: boolean;
  editando: boolean;
  onEditar: (entradaId: string) => void;
  onCancelarEdicion: () => void;
  onGuardar: (entradaId: string, cuerpo: string, nuevos: AdjuntoPendiente[], quitarIds: string[]) => Promise<void>;
  onAbrirAdjunto: (adjunto: Adjunto, autor: string, fecha: string) => void;
}

export const EntradaItem = memo(
  ({ entrada, personas, miId, editable, editando, onEditar, onCancelarEdicion, onGuardar, onAbrirAdjunto }: Props) => {
    const autor = nombreCompleto(personas[entrada.autor_id]) || 'Usuario';
    const fecha = formatFechaHora(entrada.creado_en);

    if (entrada.tipo === 'cierre') {
      return (
        <View style={styles.closure}>
          <View style={styles.closureIcon}>
            <Ionicons name="lock-closed" size={14} color="#fff" />
          </View>
          <View style={styles.closureBody}>
            <Text style={styles.closureTitle}>
              <Text style={styles.bold}>{autor}</Text> cerró el informe · {fecha}
            </Text>
            {!!entrada.cuerpo && <InformeHtml html={entrada.cuerpo} miId={miId} />}
          </View>
        </View>
      );
    }

    const inicial = entrada.tipo === 'relato';
    const mencionaAMi = miId !== null && entrada.autor_id !== miId && entrada.menciones.includes(miId);
    const puedeEditar = editable && miId !== null && entrada.autor_id === miId;

    return (
      <View style={inicial ? styles.initial : styles.entry}>
        {inicial && <Text style={styles.initialLabel}>INFORME INICIAL</Text>}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciales(autor)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.author} numberOfLines={1}>
              {autor}
            </Text>
            <Text style={styles.date}>
              {fecha}
              {entrada.editado_en ? ' (editado)' : ''}
            </Text>
          </View>
          {mencionaAMi && (
            <View style={[styles.tag, inicial && styles.tagOnInitial]}>
              <Text style={styles.tagText}>Te mencionó</Text>
            </View>
          )}
          {puedeEditar && !editando && (
            <Pressable onPress={() => onEditar(entrada.id)} style={styles.editButton} accessibilityRole="button" accessibilityLabel="Editar entrada">
              <Ionicons name="pencil" size={13} color="#4a5058" />
              <Text style={styles.editText}>Editar</Text>
            </Pressable>
          )}
        </View>

        {editando ? (
          <View style={styles.editor}>
            <Editor
              variante="edicion"
              initialHtml={entrada.cuerpo}
              existentes={entrada.adjuntos}
              submitLabel="Guardar"
              onSubmit={(cuerpo, nuevos, quitar) => onGuardar(entrada.id, cuerpo, nuevos, quitar)}
              onCancel={onCancelarEdicion}
            />
          </View>
        ) : (
          <View style={inicial ? styles.bodyInitial : styles.body}>
            <InformeHtml html={entrada.cuerpo} miId={miId} />
            {entrada.adjuntos.length > 0 && (
              <View style={styles.attachments}>
                {entrada.adjuntos.map((a) => (
                  <AdjuntoTile
                    key={a.id}
                    tipo={a.tipo}
                    nombre={a.nombre}
                    tamano={a.tamano}
                    onPress={() => onAbrirAdjunto(a, autor, fecha)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  },
);
EntradaItem.displayName = 'EntradaItem';

const styles = StyleSheet.create({
  initial: {
    marginHorizontal: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(26,115,232,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.2)',
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  initialLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, color: '#1558b0', marginBottom: 10 },
  entry: {
    paddingTop: 13,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,28,0.08)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(26,115,232,0.18)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12.5, fontWeight: '700', color: '#1558b0' },
  headerText: { flex: 1 },
  author: { fontSize: 14.5, fontWeight: '700', color: glassColors.text },
  date: { fontSize: 12, color: glassColors.textMuted },
  tag: { backgroundColor: 'rgba(26,115,232,0.12)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  tagOnInitial: { backgroundColor: '#ffffff' },
  tagText: { fontSize: 11, fontWeight: '700', color: '#1558b0' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
  },
  editText: { fontSize: 12.5, fontWeight: '600', color: '#4a5058' },
  body: { paddingLeft: 42 },
  bodyInitial: {},
  editor: { marginTop: 2 },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 },
  closure: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 14,
    padding: 12,
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    borderRadius: 14,
  },
  closureIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: glassColors.text, alignItems: 'center', justifyContent: 'center' },
  closureBody: { flex: 1, gap: 4, justifyContent: 'center' },
  closureTitle: { fontSize: 13.5, color: glassColors.text },
  bold: { fontWeight: '700' },
});
