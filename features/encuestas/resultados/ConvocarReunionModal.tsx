import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { GlassButton } from '@/shared/ui/GlassButton';
import { focusBorderStyles, glassColors } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Respuesta } from '../models/Encuesta';
import { ConvocarReunionesResult, ReunionPersonaRequest, useConvocarReuniones } from '../viewmodels/useEncuestas';
import { formatHorarioSlot } from './utils';
import { styles } from './styles';

interface PersonaConSlot {
  voter: Respuesta;
  opcionTexto: string; // ISO datetime del slot elegido
}

interface ConvocarReunionModalProps {
  visible: boolean;
  encuestaId: number;
  personas: PersonaConSlot[];
  onClose: () => void;
  onSuccess: () => void;
}

const colors = Colors['light'];

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export const ConvocarReunionModal: React.FC<ConvocarReunionModalProps> = ({
  visible,
  encuestaId,
  personas,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { enviar, isPending } = useConvocarReuniones();

  const [titulo, setTitulo] = useState('Reunión de equipo');
  const tituloFocus = useFocusBorder();
  const notaFocus = useFocusBorder();
  const [nota, setNota] = useState('');
  const [resultado, setResultado] = useState<ConvocarReunionesResult | null>(null);

  // fecha_fin por usuario_id (default: slot + 30min)
  const [fechasFinMap, setFechasFinMap] = useState<Map<number, Date>>(() => {
    const map = new Map<number, Date>();
    personas.forEach((p) => {
      const fechaInicio = new Date(p.opcionTexto);
      map.set(p.voter.usuario_id!, addMinutes(fechaInicio, 30));
    });
    return map;
  });

  // Para el date picker de fecha_fin
  const [pickerVoterId, setPickerVoterId] = useState<number | null>(null);
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null);
  const [pickerCurrentDate, setPickerCurrentDate] = useState<Date>(new Date());

  const abrirPickerFechaFin = (userId: number) => {
    setPickerVoterId(userId);
    setPickerCurrentDate(fechasFinMap.get(userId) ?? new Date());
    setPickerStep('date');
  };

  const onPickerDateConfirm = (date: Date) => {
    setPickerCurrentDate(date);
    setPickerStep('time');
  };

  const onPickerTimeConfirm = (time: Date) => {
    if (pickerVoterId === null) return;
    setFechasFinMap((prev) => {
      const next = new Map(prev);
      next.set(pickerVoterId, time);
      return next;
    });
    setPickerStep(null);
    setPickerVoterId(null);
  };

  const onPickerCancel = () => {
    setPickerStep(null);
    setPickerVoterId(null);
  };

  // Agrupar personas por slot para el preview
  const gruposPorSlot = useMemo(() => {
    const map = new Map<string, PersonaConSlot[]>();
    personas.forEach((p) => {
      const key = p.opcionTexto;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [personas]);

  const handleEnviar = useCallback(async () => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    const requests: ReunionPersonaRequest[] = personas.map((p) => ({
      voter: p.voter,
      titulo: titulo.trim(),
      descripcion: nota.trim(),
      fechaInicio: new Date(p.opcionTexto),
      fechaFin: fechasFinMap.get(p.voter.usuario_id!) ?? addMinutes(new Date(p.opcionTexto), 30),
    }));

    const res = await enviar(encuestaId, requests);
    setResultado(res);
  }, [titulo, nota, personas, fechasFinMap, enviar]);

  const handleCerrar = () => {
    if (resultado && resultado.exitosas > 0) {
      onSuccess();
    }
    setResultado(null);
    setTitulo('Reunión de equipo');
    setNota('');
    onClose();
  };

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCerrar();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleCerrar]);

  if (!visible) return null;

  return (
    <FullScreenPortal>
    <View style={localStyles.fullScreen}>
      <View style={[localStyles.sheetFull, { paddingBottom: insets.bottom + 16 }]}>

          <View style={[styles.convocarHeader, { paddingTop: insets.top + 12 }]}>
            <View style={localStyles.headerTopRow}>
              <AppBackButton onPress={handleCerrar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.convocarTitle}>Solicitud de reunión</Text>
                <Text style={styles.convocarSubtitle}>
                  {personas.length} persona{personas.length !== 1 ? 's' : ''} · cada una recibe su invitación en el horario que eligió.
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.convocarBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {resultado ? (
              // Vista de resultados post-envío
              <View style={{ paddingTop: 16 }}>
                <Text style={styles.resultadosTitulo}>Resultado del envío</Text>
                {resultado.exitosas > 0 && (
                  <View style={styles.exitosasRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.exitosasText}>
                      {resultado.exitosas} solicitud{resultado.exitosas !== 1 ? 'es' : ''} enviada{resultado.exitosas !== 1 ? 's' : ''} correctamente
                    </Text>
                  </View>
                )}
                {resultado.fallidas.length > 0 && (
                  <View style={styles.fallidasContainer}>
                    <Text style={[styles.convocarFieldLabel, { color: colors.error }]}>
                      {resultado.fallidas.length} fallo{resultado.fallidas.length !== 1 ? 's' : ''}:
                    </Text>
                    {resultado.fallidas.map((f, i) => (
                      <View key={i} style={styles.fallidaRow}>
                        <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                        <View>
                          <Text style={styles.fallidaNombre}>{f.nombre} {f.apellido}</Text>
                          <Text style={styles.fallidaError}>{f.error}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.convocarFieldLabel}>Título / motivo *</Text>
                <TextInput
                  style={[
                    styles.convocarInput,
                    focusBorderStyles.inputNoOutline,
                    tituloFocus.isFocused && { borderColor: glassColors.link },
                  ]}
                  value={titulo}
                  onChangeText={setTitulo}
                  onFocus={tituloFocus.onFocus}
                  onBlur={tituloFocus.onBlur}
                  placeholder="Título de la reunión"
                  placeholderTextColor={colors.secondaryText}
                />

                <Text style={styles.convocarFieldLabel}>Nota para cada persona (opcional)</Text>
                <TextInput
                  style={[
                    styles.convocarInput,
                    styles.convocarTextArea,
                    focusBorderStyles.inputNoOutline,
                    notaFocus.isFocused && { borderColor: glassColors.link },
                  ]}
                  value={nota}
                  onChangeText={setNota}
                  onFocus={notaFocus.onFocus}
                  onBlur={notaFocus.onBlur}
                  placeholder="Mensaje adicional..."
                  placeholderTextColor={colors.secondaryText}
                  multiline
                />

                <View style={styles.sepNote}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.lightTint} />
                  <Text style={styles.sepNoteText}>
                    Se crea una invitación <Text style={{ fontWeight: '700' }}>separada por persona</Text>, agendada en el horario que cada uno votó. Podés editar la hora de fin individualmente.
                  </Text>
                </View>

                {/* Preview agrupado por slot */}
                {gruposPorSlot.map(([slotIso, grupo]) => (
                  <View key={slotIso}>
                    <View style={styles.convocarGroupHeader}>
                      <Ionicons name="time-outline" size={14} color={colors.lightTint} />
                      <Text style={styles.convocarGroupSlot}>{formatHorarioSlot(slotIso)}</Text>
                      <Text style={styles.convocarGroupCount}>
                        {grupo.length} invitación{grupo.length !== 1 ? 'es' : ''}
                      </Text>
                    </View>
                    {grupo.map((p) => {
                      const fechaFin = fechasFinMap.get(p.voter.usuario_id!) ?? addMinutes(new Date(slotIso), 30);
                      return (
                        <View key={p.voter.usuario_id} style={styles.personaReunionRow}>
                          <Text style={styles.personaReunionNombre}>
                            {p.voter.nombre} {p.voter.apellido}
                          </Text>
                          <TouchableOpacity
                            style={styles.fechaFinButton}
                            onPress={() => abrirPickerFechaFin(p.voter.usuario_id!)}
                          >
                            <Ionicons name="flag-outline" size={12} color={colors.lightTint} />
                            <Text style={styles.fechaFinText}>
                              hasta {fechaFin.getHours().toString().padStart(2, '0')}:{fechaFin.getMinutes().toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <View style={styles.convocarFooter}>
            <Text style={styles.convocarFooterCount}>
              {resultado
                ? `${resultado.exitosas + resultado.fallidas.length} procesadas`
                : `${personas.length} solicitud${personas.length !== 1 ? 'es' : ''}`}
            </Text>
            {resultado ? (
              <GlassButton label="Cerrar" onPress={handleCerrar} />
            ) : (
              <GlassButton
                label="Enviar"
                onPress={handleEnviar}
                disabled={!titulo.trim() || isPending}
                loading={isPending}
              />
            )}
          </View>
        </View>

      {pickerStep === 'date' && (
        <DateTimePicker
          visible
          value={pickerCurrentDate}
          mode="date"
          onConfirm={onPickerDateConfirm}
          onCancel={onPickerCancel}
        />
      )}
      {pickerStep === 'time' && (
        <DateTimePicker
          visible
          value={pickerCurrentDate}
          mode="time"
          is24Hour
          onConfirm={onPickerTimeConfirm}
          onCancel={onPickerCancel}
        />
      )}
    </View>
    </FullScreenPortal>
  );
};

const localStyles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.componentBackground,
    zIndex: 1000,
    elevation: 8,
  },
  sheetFull: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
