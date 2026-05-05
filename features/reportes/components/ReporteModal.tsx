import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import { EstadoReporte, Reporte } from '../models/Reporte';
import { useUpdateReporte } from '../viewmodels/useReportes';
import { ImagenesReporte } from './ImagenesReporte';

interface ReporteModalProps {
	visible: boolean;
	onClose: () => void;
	reporte: Reporte;
	origen: 'mis' | 'empleado'; // 'mis' = MisReportes, 'empleado' = ReportesEmpleado
}

const colors = Colors['light'];

export function ReporteModal({ visible, onClose, reporte, origen }: ReporteModalProps) {
	const { mutate: updateReporte, isPending } = useUpdateReporte();
	const { hasRole } = useRoleCheck();
	const { user } = useAuth();

	// Estado para controles
	const [nuevoEstado, setNuevoEstado] = useState<EstadoReporte | null>(null);
	const [observacion, setObservacion] = useState('');

	// Verificar si el reporte está en un estado final (no editable)
	const isReporteFinal = reporte.estado === 'ASENTADO' || reporte.estado === 'DESESTIMADO';

	// Verificar si el usuario tiene rol 'gerencia'
	const isGerencia = hasRole('gerencia');

	// Solo gerencia puede modificar si está en estado final
	const canModify = !isReporteFinal || isGerencia;

	// Roles supervisores que pueden gestionar imágenes
	const hasSupervisorRole = hasRole(['gerencia', 'personasRelaciones', 'encargado']);
	const isCreator = !!(user?.user_context_id && reporte.creador_id && user.user_context_id === reporte.creador_id);
	const canManageImages = hasSupervisorRole && isCreator;

	const handleAccion = () => {
		if (!nuevoEstado) {
			Alert.alert('Selecciona un estado');
			return;
		}
		if ((origen === 'mis' && nuevoEstado === 'DISPUTA' && !observacion.trim()) ||
			(origen === 'empleado' && !observacion.trim())) {
			Alert.alert('La observación es obligatoria');
			return;
		}
		updateReporte(
			{ id: reporte.id, data: { estado: nuevoEstado, observacion } },
			{
				onSuccess: () => {
					Alert.alert('Éxito', 'Reporte actualizado');
					setNuevoEstado(null);
					setObservacion('');
					onClose();
				},
				onError: (error: any) => {
					Alert.alert('Error', error?.message || 'Intenta nuevamente');
				},
			}
		);
	};

	const renderControles = () => {
		if (isReporteFinal && !isGerencia) return null;

		const isMisReportes = origen === 'mis';

		return (
			<View style={styles.section}>
				<View style={styles.sectionHeaderRow}>
					<ThemedText style={styles.sectionLabel}>
						{isMisReportes ? 'Acciones' : 'Modificar estado'}
					</ThemedText>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>Estado</ThemedText>
					<View style={styles.pickerContainer}>
						<Picker
							selectedValue={nuevoEstado || ''}
							onValueChange={(value: string) => setNuevoEstado(value as EstadoReporte)}
							style={styles.picker}
						>
							<Picker.Item label="Selecciona un estado..." value="" color="#999" />
							{isMisReportes ? (
								<>
									<Picker.Item label="Aceptar (Asentado)" value="ASENTADO" />
									<Picker.Item label="Responder (En disputa)" value="DISPUTA" />
								</>
							) : (
								<>
									<Picker.Item label="Pendiente" value="PENDIENTE" />
									<Picker.Item label="En disputa" value="DISPUTA" />
									<Picker.Item label="Asentado" value="ASENTADO" />
									<Picker.Item label="Desestimar" value="DESESTIMADO" />
								</>
							)}
						</Picker>
					</View>
				</View>

				<View style={styles.formGroup}>
					<ThemedText style={styles.label}>
						{(isMisReportes && nuevoEstado !== 'DISPUTA') ? 'Observación (opcional)' : 'Observación (obligatoria)'}
					</ThemedText>
					<TextInput
						style={[styles.input, styles.textArea]}
						placeholder="Escribe aquí tu observación..."
						placeholderTextColor="#999"
						value={observacion}
						onChangeText={setObservacion}
						multiline
						numberOfLines={4}
						textAlignVertical="top"
					/>
				</View>

				<TouchableOpacity
					style={[styles.confirmBtn, isPending && styles.confirmBtnDisabled]}
					onPress={handleAccion}
					disabled={isPending}
				>
					{isPending ? (
						<ActivityIndicator color="#fff" />
					) : (
						<ThemedText style={styles.confirmBtnText}>Confirmar Cambios</ThemedText>
					)}
				</TouchableOpacity>
			</View>
		);
	};

	return (
		<Modal
			visible={visible}
			transparent={true}
			animationType="slide"
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<KeyboardAvoidingView
					style={styles.modalKeyboardAvoiding}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					keyboardVerticalOffset={0}
				>
					<View style={styles.modalContainer}>
						{/* Header con botón cerrar */}
						<View style={styles.modalHeader}>
							<View style={styles.modalHeaderActions}>
								<TouchableOpacity onPress={onClose} style={styles.modalIconButton}>
									<Ionicons name="close" size={24} color="#999" />
								</TouchableOpacity>
							</View>
						</View>

						<ScrollView
							style={styles.modalFormContent}
							contentContainerStyle={styles.modalFormContentContainer}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							{/* Información del Reporte */}
							<ThemedText type="title" style={styles.title}>{reporte.titulo}</ThemedText>

							<View style={styles.infoGrid}>
								<View style={styles.infoItem}>
									<ThemedText style={styles.infoLabel}>Categoría</ThemedText>
									<ThemedText style={styles.infoValue}>{reporte.categoria}</ThemedText>
								</View>
								<View style={styles.infoItem}>
									<ThemedText style={styles.infoLabel}>Estado</ThemedText>
									<View style={styles.badge}>
										<ThemedText style={styles.badgeText}>{reporte.estado}</ThemedText>
									</View>
								</View>
								<View style={styles.infoItem}>
									<ThemedText style={styles.infoLabel}>Fecha incidente</ThemedText>
									<ThemedText style={styles.infoValue}>{new Date(reporte.fecha_incidente).toLocaleDateString()}</ThemedText>
								</View>
								<View style={styles.infoItem}>
									<ThemedText style={styles.infoLabel}>Creador</ThemedText>
									<ThemedText style={styles.infoValue}>{reporte.creador_nombre} {reporte.creador_apellido}</ThemedText>
								</View>
							</View>

							<View style={styles.descriptionContainer}>
								<ThemedText style={styles.infoLabel}>Mensaje</ThemedText>
								<ThemedText style={styles.descriptionText}>{reporte.descripcion}</ThemedText>
							</View>

							{/* Imágenes */}
							<View style={styles.section}>
								<ImagenesReporte
									reporteId={reporte.id}
									imagenesUrl={reporte.imagenes}
									canManage={canManageImages}
								/>
							</View>

							{/* Acciones del formulario */}
							{renderControles()}

						</ScrollView>
					</View>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	// ============================================
	// Layout Principal (Bottom Sheet)
	// ============================================
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
	modalKeyboardAvoiding: {
		flex: 1,
		width: '100%',
	},
	modalContainer: {
		flex: 1,
		marginTop: '5%',
		backgroundColor: '#fff',
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		overflow: 'hidden',
	},
	modalHeader: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	modalHeaderActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	modalIconButton: {
		padding: 4,
	},
	modalFormContent: {
		flex: 1,
	},
	modalFormContentContainer: {
		padding: 20,
		paddingBottom: 60, // Espacio extra al final
	},

	// ============================================
	// Tipografía e Información
	// ============================================
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#1a1a1a',
		marginBottom: 20,
	},
	infoGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		marginBottom: 20,
	},
	infoItem: {
		width: '45%',
	},
	infoLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 8,
	},
	infoValue: {
		fontSize: 15,
		color: '#111827',
		fontWeight: '500',
	},
	descriptionContainer: {
		marginBottom: 24,
		padding: 16,
		backgroundColor: '#f9fafb',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	descriptionText: {
		fontSize: 15,
		color: '#374151',
		lineHeight: 22,
	},
	badge: {
		alignSelf: 'flex-start',
		backgroundColor: colors.lightTint + '15',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
	},
	badgeText: {
		color: colors.lightTint,
		fontSize: 12,
		fontWeight: '700',
	},

	// ============================================
	// Secciones y Formularios
	// ============================================
	section: {
		marginTop: 24,
		paddingTop: 24,
		borderTopWidth: 1,
		borderTopColor: '#f3f4f6',
	},
	sectionHeaderRow: {
		marginBottom: 16,
	},
	sectionLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	formGroup: {
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#f9fafb',
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 15,
		color: '#111827',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	textArea: {
		height: 100,
		paddingTop: 12,
	},
	pickerContainer: {
		backgroundColor: '#f9fafb',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		overflow: 'hidden',
	},
	picker: {
		height: 50,
		color: '#111827',
	},

	// ============================================
	// Botones
	// ============================================
	confirmBtn: {
		backgroundColor: colors.lightTint,
		borderRadius: 10,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 12,
		shadowColor: colors.lightTint,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	confirmBtnDisabled: {
		backgroundColor: '#9ca3af',
		shadowOpacity: 0,
		elevation: 0,
	},
	confirmBtnText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
});