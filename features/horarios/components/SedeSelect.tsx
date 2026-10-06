import { glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SedeDTO } from '../models/HorarioDTO';
import { INK, LINE, MUTED, TURNO_ACTIVE, TURNO_SOFT } from '../theme';

interface SedeSelectProps {
  value: number | null;
  sedes: SedeDTO[];
  onChange: (id: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Selector de sede (botón + menú modal). Compartido por la edición y el alta de turnos. */
export function SedeSelect({ value, sedes, onChange, disabled, placeholder = 'Elegí una sede' }: SedeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedName = value == null ? placeholder : sedes.find((s) => s.id === value)?.nombre ?? `Sede ${value}`;

  return (
    <>
      <TouchableOpacity
        style={[glassStyles.fieldGlass, styles.sedeBtn, disabled && styles.fieldDisabled]}
        onPress={() => setOpen(true)}
        disabled={disabled}
      >
        <Text style={[styles.sedeBtnText, value == null && { color: MUTED }]}>{selectedName}</Text>
        <Ionicons name="chevron-down" size={16} color={MUTED} />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={[glassStyles.modalOverlay, styles.sedeOverlay]} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[glassStyles.modalCard, styles.sedeMenu]}>
            {sedes.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sedeOption, value === s.id && styles.sedeOptionActive]}
                onPress={() => { onChange(s.id); setOpen(false); }}
              >
                <Text style={[styles.sedeOptionText, value === s.id && styles.sedeOptionTextActive]}>
                  {s.nombre}
                </Text>
                {value === s.id && <Ionicons name="checkmark" size={16} color={TURNO_ACTIVE} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sedeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sedeBtnText: {
    fontSize: 15,
    color: INK,
    flex: 1,
  },
  sedeOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sedeMenu: {
    paddingVertical: 8,
    width: '100%',
    maxWidth: 340,
  },
  sedeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  sedeOptionActive: {
    backgroundColor: TURNO_SOFT,
  },
  sedeOptionText: {
    fontSize: 16,
    color: INK,
  },
  sedeOptionTextActive: {
    color: TURNO_ACTIVE,
    fontWeight: '600',
  },
  // Mismo criterio que EditarTurnoSheet: un campo bloqueado se atenúa.
  fieldDisabled: {
    opacity: 0.55,
  },
});
