import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { EstadoReporte, Reporte } from '../models/Reporte';
import { useUpdateReporte } from '../viewmodels/useReportes';

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

	// Estado para controles
	const [nuevoEstado, setNuevoEstado] = useState<EstadoReporte | null>(null);
	const [observacion, setObservacion] = useState('');

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
					Alert.alert('Error', error?.message || 'No se pudo actualizar');
				},
			}
		);
	};

	// Renderiza controles según origen
	const renderControles = () => {
		if (origen === 'mis') {
			return (
				<View style={styles.accionesContainer}>
					<ThemedText style={styles.accionesTitle}>Acciones</ThemedText>
					<View style={styles.accionesRow}>
						<TouchableOpacity
							style={[styles.accionBtn, nuevoEstado === 'ASENTADO' && styles.accionBtnActive]}
							onPress={() => setNuevoEstado('ASENTADO')}
						>
							<ThemedText style={styles.accionBtnText}>Aceptar</ThemedText>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.accionBtn, nuevoEstado === 'DISPUTA' && styles.accionBtnActive]}
							onPress={() => setNuevoEstado('DISPUTA')}
						>
							<ThemedText style={styles.accionBtnText}>Responder</ThemedText>
						</TouchableOpacity>
					</View>
					<TextInput
						style={styles.input}
						placeholder={nuevoEstado === 'DISPUTA' ? 'Observación (obligatoria)' : 'Observación (opcional)'}
						value={observacion}
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
					<View style={styles.accionesRow}>
						{estadoOptions.map(opt => (
							<TouchableOpacity
								key={opt.value}
								style={[styles.accionBtn, nuevoEstado === opt.value && styles.accionBtnActive]}
								onPress={() => setNuevoEstado(opt.value)}
							>
								<ThemedText style={styles.accionBtnText}>{opt.label}</ThemedText>
							</TouchableOpacity>
						))}
					</View>
					<TextInput
						style={styles.input}
						placeholder="Observación (obligatoria)"
						value={observacion}
						onChangeText={setObservacion}
						multiline
					/>
					<TouchableOpacity style={styles.confirmBtn} onPress={handleAccion} disabled={isPending}>
						{isPending ? <ActivityIndicator color={colors.componentBackground} /> : <ThemedText style={{ color: colors.text }}>Confirmar</ThemedText>}
					</TouchableOpacity>
				</View>
			);
		}
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<View style={[styles.modal, { backgroundColor: colors.componentBackground }]}>  
					<ScrollView contentContainerStyle={styles.scrollContent}>
						<TouchableOpacity style={styles.closeBtn} onPress={onClose}>
							<ThemedText style={{ fontSize: 18, color: colors.icon }}>Cerrar</ThemedText>
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
						{/* Acciones */}
						{renderControles()}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: colors.componentBackground,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modal: {
		width: '92%',
		maxHeight: '92%',
		borderRadius: 16,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 5,
	},
	scrollContent: {
		paddingBottom: 32,
	},
	closeBtn: {
		alignSelf: 'flex-end',
		marginBottom: 8,
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	label: {
		fontWeight: '600',
		marginTop: 10,
		fontSize: 15,
	},
	value: {
		fontSize: 15,
		marginTop: 2,
	},
	sectionHeader: {
		marginTop: 18,
		marginBottom: 4,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: 'bold',
	},
	bitacoraContainer: {
		marginBottom: 12,
	},
	bitacoraItem: {
		marginBottom: 10,
		backgroundColor: colors.componentBackground,
		borderRadius: 8,
		padding: 8,
	},
	bitacoraHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	bitacoraUser: {
		fontWeight: '600',
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
	},
	bitacoraBubble: {
		backgroundColor: colors.componentBackground,
		borderRadius: 6,
		padding: 6,
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
		padding: 8,
		minHeight: 40,
		marginBottom: 8,
		marginTop: 2,
		fontSize: 15,
	},
	confirmBtn: {
		backgroundColor: colors.lightTint,
		borderRadius: 6,
		paddingVertical: 10,
		alignItems: 'center',
		marginTop: 6,
	},
});
