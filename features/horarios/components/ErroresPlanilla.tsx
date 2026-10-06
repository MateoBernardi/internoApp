import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { INK, RED_FLASH } from '../theme';
import type { ErrorPlanificacionUI } from '../utils/planificacionErrores';

interface Props {
  error: ErrorPlanificacionUI;
}

/** Error de preview/confirmación, con la lista de errores de planilla (fila/columna) si el backend la da. */
export const ErroresPlanilla = React.memo(function ErroresPlanilla({ error }: Props) {
  return (
    <View style={[glassStyles.errorBox, styles.box]} accessibilityRole="alert">
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={18} color={RED_FLASH} />
        <Text style={styles.titulo}>{error.titulo}</Text>
      </View>
      <Text style={styles.mensaje}>{error.mensaje}</Text>
      {error.items.length > 0 && (
        <View style={styles.items}>
          {error.items.map((item, i) => (
            <View key={`${i}-${item}`} style={styles.itemRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titulo: { flex: 1, fontSize: 15, fontWeight: '800', color: INK },
  mensaje: { fontSize: 13, lineHeight: 18, color: glassColors.textMuted },
  items: { marginTop: 4, gap: 4 },
  itemRow: { flexDirection: 'row', gap: 6 },
  bullet: { fontSize: 13, color: RED_FLASH, lineHeight: 18 },
  itemText: { flex: 1, fontSize: 13, lineHeight: 18, color: INK },
});
