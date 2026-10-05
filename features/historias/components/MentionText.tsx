import { glassColors } from '@/shared/ui/glass';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import type { PersonaResumenDTO } from '../dto/HistoriaDTO';
import { nombreCompleto } from '../utils/format';
import { splitMentions } from '../utils/mentionParser';

interface Props {
  cuerpo: string;
  /** Mapa id → persona que devuelve `GET /historias/:id`. */
  personas: Record<number, PersonaResumenDTO>;
  style?: StyleProp<TextStyle>;
}

/** Renderiza el cuerpo de una entrada resolviendo `@{id}` al nombre actual de la persona. */
export function MentionText({ cuerpo, personas, style }: Props) {
  const segments = useMemo(() => splitMentions(cuerpo), [cuerpo]);
  return (
    <Text style={[styles.text, style]}>
      {segments.map((s, i) =>
        s.type === 'text' ? (
          <Text key={i}>{s.value}</Text>
        ) : (
          <Text key={i} style={styles.mention}>
            @{nombreCompleto(personas[s.id]) || 'usuario'}
          </Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 15, lineHeight: 21, color: glassColors.text },
  mention: { color: glassColors.link, fontWeight: '600' },
});
