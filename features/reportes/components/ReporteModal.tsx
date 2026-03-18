import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EstadoReporte, Reporte } from '../models/Reporte';
import { useUpdateReporte } from '../viewmodels/useReportes';
import { ImagenesReporte } from './ImagenesReporte';

interface ReporteModalProps {
	visible: boolean;
	onClose: () => void;
	reporte: Reporte;
	origen: 'mis' | 'empleado'; // 'mis' = MisReportes, 'empleado' = ReportesEmpleado
}

const estadoOptions: { value: EstadoReporte; label: string }[] = [
	{ value: 'PENDIENTE', label: 'Pendiente' },
	{ value: 'DISPUTA', label: 'En disputa' },
	{ value: 'ASENTADO', label: 'Asentado' },
	{ value: 'DESESTIMADO', label: 'Desestimado' },
];

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
	// En otros estados (DISPUTA, PENDIENTE), cualquiera puede modificar
	const canModify = !isReporteFinal || isGerencia;

	// Roles supervisores que pueden gestionar imágenes
	const hasSupervisorRole = hasRole(['gerencia', 'personasRelaciones', 'encargado']);
	// Solo el creador del reporte puede adjuntar/eliminar imágenes
	const isCreator = !!(user?.user_context_id && reporte.creador_id && user.user_context_id === reporte.creador_id);
	const canManageImages = hasSupervisorRole && isCreator;

	// Para MisReportes: solo puede aceptar (ASENTADO, obs opcional) o responder (DISPUTA, obs obligatoria)
	// Para ReportesEmpleado: puede cambiar a cualquier estado, obs obligatoria

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

	// Renderiza controles según origen
	const renderControles = () => {
		// Si está en estado final y el usuario no es gerencia, no mostrar controles
		if (isReporteFinal && !isGerencia) {
			return null;
		}

		if (origen === 'mis') {
			return (
				<View style={styles.accionesContainer}>
					<ThemedText style={styles.accionesTitle}>Acciones</ThemedText>
					<View style={styles.selectorContainer}>
						<Picker
							selectedValue={nuevoEstado || ''}
							onValueChange={(value: string) => setNuevoEstado(value as EstadoReporte)}
							style={styles.picker}
						>
							<Picker.Item label="Selecciona un estado..." value="" />
							<Picker.Item label="Aceptar (Asentado)" value="ASENTADO" />
							<Picker.Item label="Responder (En disputa)" value="DISPUTA" />
						</Picker>
					</View>
					<TextInput
						style={styles.input}
						placeholder={nuevoEstado === 'DISPUTA' ? 'Observación (obligatoria)' : 'Observación (opcional)'}					placeholderTextColor={colors.text}						value={observacion}
						onChangeText={setObservacion}
						multiline
					/>
					<TouchableOpacity style={styles.confirmBtn} onPress={handleAccion} disabled={isPending}>
						{isPending ? <ActivityIndicator color={colors.componentBackground} /> : <ThemedText style={{ color: colors.componentBackground }}>Confirmar</ThemedText>}
					</TouchableOpacity>
				</View>
			);
		} else {
			// origen === 'empleado'
			return (
				<View style={styles.accionesContainer}>
					<ThemedText style={styles.accionesTitle}>Modificar estado</ThemedText>
					<View style={styles.selectorContainer}>
						<Picker
							selectedValue={nuevoEstado || ''}
							onValueChange={(value: string) => setNuevoEstado(value as EstadoReporte)}
							style={styles.picker}
						>
							<Picker.Item label="Selecciona un estado..." value="" />
							<Picker.Item label="Pendiente" value="PENDIENTE" />
							<Picker.Item label="En disputa" value="DISPUTA" />
							<Picker.Item label="Asentado" value="ASENTADO" />
							<Picker.Item label="Desestimar" value="DESESTIMADO" />
						</Picker>
					</View>
					<TextInput
						style={styles.input}
						placeholder="Observación (obligatoria)"					placeholderTextColor={colors.text}						value={observacion}
						onChangeText={setObservacion}
						multiline
					/>
					<TouchableOpacity style={styles.confirmBtn} onPress={handleAccion} disabled={isPending}>
						{isPending ? <ActivityIndicator color={colors.componentBackground} /> : <ThemedText style={{ color: colors.secondaryText }}>Confirmar</ThemedText>}
					</TouchableOpacity>
				</View>
			);
		}
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					style={styles.overlay}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				>
					<View style={[styles.modal, { backgroundColor: colors.componentBackground }]}>  
						<ScrollView contentContainerStyle={styles.scrollContent}>
						<TouchableOpacity style={styles.closeBtn} onPress={onClose}>
							<ThemedText style={{ fontSize: 18, color: colors.error }}>Cerrar</ThemedText>
						</TouchableOpacity>
						<ThemedText type="title" style={styles.title}>{reporte.titulo}</ThemedText>
						<ThemedText style={styles.label}>Descripción</ThemedText>
						<ThemedText style={styles.value}>{reporte.descripcion}</ThemedText>
						<ThemedText style={styles.label}>Categoría</ThemedText>
						<ThemedText style={styles.value}>{reporte.categoria}</ThemedText>
						<ThemedText style={styles.label}>Estado</ThemedText>
						<ThemedText style={styles.value}>{reporte.estado}</ThemedText>
						<ThemedText style={styles.label}>Fecha incidente</ThemedText>
						<ThemedText style={styles.value}>{new Date(reporte.fecha_incidente).toLocaleString()}</ThemedText>
						<ThemedText style={styles.label}>Creado</ThemedText>
						<ThemedText style={styles.value}>{new Date(reporte.created_at).toLocaleString()}</ThemedText>
						<ThemedText style={styles.label}>Creador</ThemedText>
						<ThemedText style={styles.value}>{reporte.creador_nombre} {reporte.creador_apellido}</ThemedText>
						{/* Bitácora */}
						<View style={styles.sectionHeader}>
							<ThemedText style={styles.sectionTitle}>Bitácora</ThemedText>
						</View>
						<View style={styles.bitacoraContainer}>
							{reporte.bitacora && reporte.bitacora.length > 0 ? (
								reporte.bitacora.map((b) => (
									<View key={b.id} style={styles.bitacoraItem}>
										<View style={styles.bitacoraHeader}>
											<ThemedText style={styles.bitacoraUser}>{b.usuario_nombre} {b.usuario_apellido}</ThemedText>
											<ThemedText style={styles.bitacoraDate}>{new Date(b.created_at).toLocaleString()}</ThemedText>
										</View>
										<View style={styles.bitacoraBody}>
											<ThemedText style={styles.bitacoraAction}>{b.tipo_accion}</ThemedText>
											{b.observacion && (
												<View style={styles.bitacoraBubble}>
													<ThemedText style={styles.bitacoraText}>{b.observacion}</ThemedText>
												</View>
											)}
										</View>
									</View>
								))
							) : (
								<ThemedText style={{ color: colors.icon, textAlign: 'center', marginTop: 20 }}>No hay actividad reciente</ThemedText>
							)}
						</View>
						{/* Imágenes */}
						<ImagenesReporte
							reporteId={reporte.id}
							imagenesUrl={reporte.imagenes}
							canManage={canManageImages}
						/>
						{/* Acciones */}
						{renderControles()}
					</ScrollView>
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.componentBackground,
	},
	overlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modal: {
		width: '92%',
		maxHeight: '92%',
		borderRadius: 16,
		padding: '4%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 5,
	},
	scrollContent: {
		paddingBottom: '8%',
	},
	closeBtn: {
		alignSelf: 'flex-end',
		marginBottom: 8,
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 8,
		color: colors.text,
	},
	label: {
		fontWeight: '600',
		marginTop: 10,
		fontSize: 15,
		color: colors.lightTint,
	},
	value: {
		fontSize: 15,
		marginTop: 2,
		color: colors.secondaryText
	},
	sectionHeader: {
		marginTop: 18,
		marginBottom: 4,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: 'bold',
		color: colors.text,
	},
	bitacoraContainer: {
		marginBottom: 12,
	},
	bitacoraItem: {
		marginBottom: 10,
		backgroundColor: colors.componentBackground,
		borderRadius: 8,
		padding: '2%',
	},
	bitacoraHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	bitacoraUser: {
		fontWeight: '600',
		color: colors.text,
	},
	bitacoraDate: {
		fontSize: 12,
		color: colors.secondaryText,
	},
	bitacoraBody: {
		marginTop: 4,
	},
	bitacoraAction: {
		fontWeight: '500',
		marginBottom: 2,
		color: colors.lightTint,
	},
	bitacoraBubble: {
		backgroundColor: colors.componentBackground,
		borderRadius: 6,
		padding: '1.5%',
		marginTop: 2,
	},
	bitacoraText: {
		fontSize: 14,
		color: colors.text,
	},
	accionesContainer: {
		marginTop: 18,
		marginBottom: 8,
	},
	accionesTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	accionesRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 8,
	},
	selectorContainer: {
		borderWidth: 1,
		borderColor: colors.background,
		borderRadius: 6,
		marginBottom: 8,
		overflow: 'hidden',
	},
	picker: {
		height: 50,
		color: colors.text,
	},
	accionBtn: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 6,
		backgroundColor: colors.componentBackground,
	},
	accionBtnActive: {
		backgroundColor: colors.lightTint,
	},
	accionBtnText: {
		color: colors.text,
		fontWeight: '600',
	},
	input: {
		borderWidth: 1,
		borderColor: colors.background,
		borderRadius: 6,
		padding: '2%',
		minHeight: 40,
		marginBottom: 8,
		marginTop: 2,
		fontSize: 15,
	},
	confirmBtn: {
		backgroundColor: colors.success,
		borderRadius: 6,
		paddingVertical: 10,
		alignItems: 'center',
		marginTop: 6,
	},
});
