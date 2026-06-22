import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { UserSelector } from '@/components/UserSelector';
import { Colors } from '@/constants/theme';
import { RoleUserSelectionModal } from '@/features/solicitudesActividades/components/RoleUserSelectionModal';
import { KEYBOARD_BEHAVIOR } from '@/shared/ui/keyboard';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { UserSummary } from '@/shared/users/User';
import { allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Encuesta, Pregunta } from '../models/Encuesta';
import { useCreateEncuestaCompleta } from '../viewmodels/useEncuestas';
import { styles } from './crearEncuestaStyles';
import { EncuestasScreenHeader } from './EncuestasScreenHeader';
import { FormularioPregunta } from './FormularioPregunta';

interface CrearEncuestaProps {
  onEncuestaCreada: () => void;
  onVolver: () => void;
}

const colors = Colors['light'];

export const CrearEncuesta: React.FC<CrearEncuestaProps> = ({ onEncuestaCreada, onVolver }) => {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [esAnonima, setEsAnonima] = useState(false);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [mostrandoFormularioPregunta, setMostrandoFormularioPregunta] = useState(false);

  // Destinatarios
  const [todosEmpleados, setTodosEmpleados] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeRole, setActiveRole] = useState('');

  const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();
  const { mutate: crearEncuesta, isPending } = useCreateEncuestaCompleta();
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);

  const users = searchResults || [];
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  const onDateCancel = () => setShowDatePicker(false);
  const onDateConfirm = (selectedDate: Date) => {
    setFechaFin(selectedDate);
    setShowDatePicker(false);
  };

  const agregarPregunta = (pregunta: Pregunta) => {
    setPreguntas([...preguntas, { ...pregunta, orden: preguntas.length + 1 }]);
    setMostrandoFormularioPregunta(false);
  };

  const eliminarPregunta = (index: number) => {
    Alert.alert('Confirmar', '¿Deseas eliminar esta pregunta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const nuevasPreguntas = preguntas.filter((_, i) => i !== index);
          setPreguntas(nuevasPreguntas.map((p, i) => ({ ...p, orden: i + 1 })));
        },
      },
    ]);
  };

  const handleToggleUser = useCallback((user: UserSummary) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.user_context_id === user.user_context_id);
      return exists
        ? prev.filter((u) => u.user_context_id !== user.user_context_id)
        : [...prev, user];
    });
  }, []);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: UserSummary[]) => {
    setSelectedUsers((prev) => {
      const prevIds = new Set(prev.map((u) => u.user_context_id));
      return [...prev, ...usersToSelect.filter((u) => !prevIds.has(u.user_context_id))];
    });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((usersToDeselect: UserSummary[]) => {
    setSelectedUsers((prev) => {
      const idsToRemove = new Set(usersToDeselect.map((u) => u.user_context_id));
      return prev.filter((u) => !idsToRemove.has(u.user_context_id));
    });
  }, []);

  const handleRoleSelect = useCallback((role: string) => {
    setActiveRole(role);
    setShowRoleModal(true);
  }, []);

  const validarFormulario = (): boolean => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return false;
    }
    if (preguntas.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos una pregunta');
      return false;
    }
    if (!todosEmpleados && selectedUsers.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un destinatario o elegir "Todos los empleados"');
      return false;
    }
    return true;
  };

  const handleCrearEncuesta = () => {
    if (!validarFormulario()) return;

    const invitados = todosEmpleados ? [] : selectedUsers.map((u) => u.user_context_id);

    const encuestaData: Partial<Encuesta> = {
      titulo,
      descripcion: descripcion || undefined,
      categoria: 'interna',
      es_anonima: esAnonima,
      fecha_fin: fechaFin ? fechaFin.toISOString() : undefined,
    };

    crearEncuesta(
      { encuesta: encuestaData as Encuesta, preguntas: preguntas as any, invitados, idempotencyKey },
      {
        onSuccess: () => {
          regenerateIdempotencyKey();
          Alert.alert(
            '¡Éxito!',
            'La encuesta ha sido creada correctamente',
            [{ text: 'OK', onPress: onEncuestaCreada }]
          );
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  };

  const destinatariosLabel = useMemo(() => {
    if (todosEmpleados) return null;
    if (selectedUsers.length === 0) return 'Todavía no seleccionaste a nadie.';
    return `${selectedUsers.length} persona${selectedUsers.length > 1 ? 's' : ''} seleccionada${selectedUsers.length > 1 ? 's' : ''}`;
  }, [todosEmpleados, selectedUsers]);

  if (mostrandoFormularioPregunta) {
    return (
      <FormularioPregunta
        onAgregarPregunta={agregarPregunta}
        onCancelar={() => setMostrandoFormularioPregunta(false)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <EncuestasScreenHeader
        title="Crear Encuesta"
        left={
          <TouchableOpacity onPress={onVolver} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={colors.lightTint} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Información básica */}
        <View style={styles.section}>
          <TextInput
            style={styles.input}
            placeholder="Título de la encuesta *"
            placeholderTextColor={colors.secondaryText}
            value={titulo}
            onChangeText={setTitulo}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descripción (opcional)"
            placeholderTextColor={colors.secondaryText}
            multiline
            numberOfLines={3}
            value={descripcion}
            onChangeText={setDescripcion}
          />

          <ThemedText style={styles.subLabel}>Fecha de finalización (opcional)</ThemedText>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={[styles.dateButtonText, !fechaFin && { color: colors.secondaryText }]}>
              {fechaFin ? fechaFin.toLocaleDateString('es-ES') : 'Seleccionar fecha'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              visible={showDatePicker}
              value={fechaFin || new Date()}
              mode="date"
              onConfirm={onDateConfirm}
              onCancel={onDateCancel}
            />
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Encuesta anónima</Text>
            <Switch
              value={esAnonima}
              onValueChange={setEsAnonima}
              trackColor={{ false: colors.icon, true: colors.success }}
              thumbColor={colors.icon}
            />
          </View>
        </View>

        {/* Destinatarios */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>¿Quién verá la encuesta?</ThemedText>

          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.audOptionRow, todosEmpleados && styles.audOptionRowSelected]}
              onPress={() => setTodosEmpleados(true)}
            >
              <View style={[styles.radioDot, todosEmpleados && styles.radioDotSelected]}>
                {todosEmpleados && <View style={styles.radioDotInner} />}
              </View>
              <View style={styles.audOptionInfo}>
                <Text style={styles.audOptionTitle}>Todos los empleados</Text>
                <Text style={styles.audOptionSubtitle}>La encuesta se muestra a toda la organización.</Text>
              </View>
              <Ionicons name="people-outline" size={20} color={todosEmpleados ? colors.lightTint : colors.secondaryText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.audOptionRow, !todosEmpleados && styles.audOptionRowSelected]}
              onPress={() => setTodosEmpleados(false)}
            >
              <View style={[styles.radioDot, !todosEmpleados && styles.radioDotSelected]}>
                {!todosEmpleados && <View style={styles.radioDotInner} />}
              </View>
              <View style={styles.audOptionInfo}>
                <Text style={styles.audOptionTitle}>Elegir usuarios</Text>
                <Text style={styles.audOptionSubtitle}>Seleccioná por nombre o por rol.</Text>
              </View>
              <Ionicons name="person-add-outline" size={20} color={!todosEmpleados ? colors.lightTint : colors.secondaryText} />
            </TouchableOpacity>
          </View>

          {!todosEmpleados && (
            <>
              <View style={styles.audDivider}>
                <View style={styles.audDividerLine} />
                <Text style={styles.audDividerLabel}>DESTINATARIOS</Text>
                <View style={styles.audDividerLine} />
              </View>

              <UserSelector
                selectedUsers={selectedUsers}
                onSelectUsers={setSelectedUsers}
                users={users}
                roles={allRoles}
                isLoadingUsers={isLoadingUsers}
                isLoadingRoles={false}
                onSearch={setSearchQuery}
                onSelectRole={handleRoleSelect}
              />

              {destinatariosLabel && (
                <Text style={styles.audSummary}>{destinatariosLabel}</Text>
              )}
            </>
          )}
        </View>

        {/* Preguntas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Preguntas ({preguntas.length})
            </ThemedText>
            <TouchableOpacity
              style={styles.agregarPreguntaButton}
              onPress={() => setMostrandoFormularioPregunta(true)}
            >
              <Text style={styles.agregarPreguntaText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {preguntas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay preguntas agregadas</Text>
              <Text style={styles.emptySubtext}>
                Presiona &quot;+ Agregar&quot; para crear una pregunta
              </Text>
            </View>
          ) : (
            preguntas.map((pregunta, index) => (
              <View key={index} style={styles.preguntaCard}>
                <View style={styles.preguntaCardHeader}>
                  <Text style={styles.preguntaNumero}>Pregunta {index + 1}</Text>
                  <TouchableOpacity onPress={() => eliminarPregunta(index)}>
                    <Text style={styles.eliminarButton}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.preguntaTitulo}>{pregunta.titulo}</Text>
                <View style={styles.preguntaInfo}>
                  <Text style={styles.preguntaTipo}>Tipo: {pregunta.tipo_pregunta}</Text>
                  {pregunta.es_obligatoria && (
                    <Text style={styles.obligatoriaTag}>Obligatoria</Text>
                  )}
                </View>
                {pregunta.opciones && pregunta.opciones.length > 0 && (
                  <View style={styles.opcionesPreview}>
                    <Text style={styles.opcionesLabel}>
                      {pregunta.tipo_pregunta === 'horario' ? 'Horarios:' : 'Opciones:'}
                    </Text>
                    {pregunta.opciones.map((opcion, i) => (
                      <Text key={i} style={styles.opcionText}>
                        {pregunta.tipo_pregunta === 'horario'
                          ? `🕐 ${opcion}`
                          : `• ${opcion}`}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.footerDos, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.cancelarButton} onPress={onVolver}>
          <Text style={styles.cancelarButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.guardarButton, isPending && styles.crearButtonDisabled]}
          onPress={handleCrearEncuesta}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.componentBackground} />
          ) : (
            <Text style={styles.guardarButtonText}>Crear Encuesta</Text>
          )}
        </TouchableOpacity>
      </View>

      <RoleUserSelectionModal
        visible={showRoleModal}
        onClose={() => { setShowRoleModal(false); setActiveRole(''); }}
        roleName={activeRole}
        roleUsers={roleUsersData ?? []}
        selectedUsers={selectedUsers}
        onToggleUser={handleToggleUser}
        onSelectAll={handleSelectAllRoleUsers}
        onDeselectAll={handleDeselectAllRoleUsers}
      />
    </KeyboardAvoidingView>
  );
};
