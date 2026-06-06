import { AlertModal, type AlertModalAction } from '@/components/AlertModal';
import { FilePreview, useOpenFilePreview } from '@/components/filePreview';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DocsList, PendingFile } from '@/features/docs/components/DocsList';
import { Archivo, ArchivoUso } from '@/features/docs/models/Archivo';
import { useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { ApiOperationResult } from '@/shared/types/apiStatus';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
	Alert,
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { EstadoReporte, Reporte } from '../models/Reporte';
import { useArchivoReporte, useUpdateReporte } from '../viewmodels/useReportes';

interface ReporteModalProps {
	visible: boolean;
	onClose: () => void;
	reporte: Reporte;
	origen: 'mis' | 'empleado';
}

const colors = Colors['light'];

export function ReporteModal({ visible, onClose, reporte, origen }: ReporteModalProps) {
	const { mutate: updateReporte, isPending } = useUpdateReporte();
	const { hasRole } = useRoleCheck();
	const { user } = useAuth();
	const { mutateAsync: uploadArchivo } = useUploadArchivo();
	const archivoMutation = useArchivoReporte();
	const { previewFile, openFile, closePreview } = useOpenFilePreview();

	// ── Estado: formulario de actualización ──────────────────────────────────
	const [nuevoEstado, setNuevoEstado] = useState<EstadoReporte | null>(null);
	const [observacion, setObservacion] = useState('');
	const [alertModal, setAlertModal] = useState<{
		visible: boolean;
		title: string;
		message?: string;
		actions: AlertModalAction[];
	}>({ visible: false, title: '', message: undefined, actions: [] });

	// ── Estado: archivos ─────────────────────────────────────────────────────
	const [localArchivos, setLocalArchivos] = useState<Archivo[]>([]);
	const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
	const [isUploadingFile, setIsUploadingFile] = useState(false);

	useEffect(() => {
		if (!visible) {
			setPendingFiles([]);
			return;
		}
		setLocalArchivos(reporte.archivos ?? []);
	}, [visible, reporte.archivos]);

	// ── Permisos ─────────────────────────────────────────────────────────────
	const isReporteFinal = reporte.estado === 'ASENTADO' || reporte.estado === 'DESESTIMADO';
	const isGerencia = hasRole('gerencia');
	const canModify = !isReporteFinal || isGerencia;
	const hasSupervisorRole = hasRole(['gerencia', 'personasRelaciones', 'encargado']);
	const isCreator = !!(user?.user_context_id && reporte.creador_id && user.user_context_id === reporte.creador_id);
	const canManageFiles = hasSupervisorRole && isCreator;

	// ── Helpers ───────────────────────────────────────────────────────────────
	const showModal = useCallback((title: string, message?: string, actions?: AlertModalAction[]) => {
		const normalizedActions = actions && actions.length > 0
			? actions
			: [{ key: 'ok', label: 'Aceptar', onPress: () => { }, variant: 'primary' as const }];

		setAlertModal({
			visible: true,
			title,
			message,
			actions: normalizedActions.map((action) => ({
				...action,
				onPress: () => {
					setAlertModal((prev) => ({ ...prev, visible: false }));
					action.onPress();
				},
			})),
		});
	}, []);

	// ── Archivos ─────────────────────────────────────────────────────────────

	const isSuccess = <T,>(r: ApiOperationResult<T>): r is ApiOperationResult<T> & { data: T } =>
		r.status === 'success' && r.data !== undefined;

	const handleSeleccionarArchivo = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				multiple: true,
				type: '*/*',
				copyToCacheDirectory: true,
			});
			if (result.canceled || !result.assets || result.assets.length === 0) return;

			const nuevosArchivos: PendingFile[] = result.assets.map((asset) => ({
				name: asset.name,
				uri: asset.uri,
				type: asset.mimeType ?? 'application/octet-stream',
				size: asset.size,
			}));

			setPendingFiles((prev) => [...prev, ...nuevosArchivos]);
			setIsUploadingFile(true);

			try {
				const response = await uploadArchivo({
					item: nuevosArchivos.map((file) => ({
						archivo: { uri: file.uri, name: file.name, type: file.type, size: file.size },
						archivoData: {
							nombre: file.name,
							tamaño: file.size,
							tipo: file.type,
							uso: ArchivoUso.TAREA,
						},
					})),
				});

				const resultados = response?.exitosos ?? [];
				const fallidos = response?.fallidos ?? [];
				const validos = resultados.filter(isSuccess);
				const nuevosIds = validos.map((r) => r.data.id);
				const nuevosArchivosData = validos.map((r) => r.data) as Archivo[];

				if (validos.length === 0) {
					Alert.alert('Error de archivos', 'No se pudo subir ningún archivo.');
				} else if (fallidos.length > 0) {
					Alert.alert('Archivos parciales', `Se subieron ${validos.length} de ${nuevosArchivos.length}`);
				}

				if (nuevosIds.length > 0) {
					setLocalArchivos((prev) => [...prev, ...nuevosArchivosData]);
					await archivoMutation.mutateAsync({ id: reporte.id, action: 'add', archivosIds: nuevosIds });
				}
			} catch {
				Alert.alert('Error de archivos', 'No se pudieron subir los archivos.');
			} finally {
				setIsUploadingFile(false);
				setPendingFiles((prev) =>
					prev.filter((file) => !nuevosArchivos.some((nuevo) => nuevo.uri === file.uri))
				);
			}
		} catch {
			Alert.alert('Error', 'No se pudo seleccionar el documento. Intentá nuevamente.');
		}
	};

	const handleOpenArchivo = (archivoId: number) => {
		const archivo = localArchivos.find(a => a.id === archivoId);
		if (!archivo) {
			Alert.alert('Error', 'No se pudo encontrar el archivo');
			return;
		}
		void openFile(archivo);
	};

	const handleRemoveArchivo = (archivoId: number) => {
		Alert.alert('Eliminar archivo', '¿Querés quitar este archivo?', [
			{ text: 'Cancelar', style: 'cancel' },
			{
				text: 'Eliminar',
				style: 'destructive',
				onPress: () => {
					setLocalArchivos((prev) => prev.filter((a) => a.id !== archivoId));
					void archivoMutation.mutateAsync({ id: reporte.id, action: 'remove', archivosIds: [archivoId] });
				},
			},
		]);
	};

	// ── Actualización de estado ───────────────────────────────────────────────

	const handleAccion = () => {
		if (!nuevoEstado) {
			showModal('Selecciona un estado');
			return;
		}
		if ((origen === 'mis' && nuevoEstado === 'DISPUTA' && !observacion.trim()) ||
			(origen === 'empleado' && !observacion.trim())) {
			showModal('La observación es obligatoria');
			return;
		}
		updateReporte(
			{ id: reporte.id, data: { estado: nuevoEstado, observacion } },
			{
				onSuccess: () => {
					showModal('Éxito', 'Reporte actualizado', [
						{
							key: 'ok',
							label: 'Aceptar',
							onPress: () => {
								setNuevoEstado(null);
								setObservacion('');
								onClose();
							},
							variant: 'primary',
						},
					]);
				},
				onError: (error: any) => {
					showModal('Error', error?.message || 'Intenta nuevamente');
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
						{/* Header */}
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

							{/* Archivos enlazados */}
							<View style={styles.section}>
								<View style={styles.sectionHeaderRow}>
									<ThemedText style={styles.sectionLabel}>Archivos enlazados</ThemedText>
									{canManageFiles && (
										<TouchableOpacity style={styles.actionButton} onPress={handleSeleccionarArchivo}>
											<Ionicons name="add" size={14} color={colors.lightTint} />
											<Text style={styles.actionButtonText}>
												{isUploadingFile ? 'Subiendo...' : 'Agregar'}
											</Text>
										</TouchableOpacity>
									)}
								</View>
								<DocsList
									archivos={localArchivos}
									pendingFiles={pendingFiles}
									onOpen={handleOpenArchivo}
									onRemove={canManageFiles ? handleRemoveArchivo : undefined}
								/>
							</View>

							{/* Acciones del formulario */}
							{renderControles()}

						</ScrollView>

						<AlertModal
							visible={alertModal.visible}
							title={alertModal.title}
							message={alertModal.message}
							actions={alertModal.actions}
							onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
						/>
					</View>
				</KeyboardAvoidingView>
			</View>

			<FilePreview file={previewFile} onClose={closePreview} />
		</Modal>
	);
}

const styles = StyleSheet.create({
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
		paddingBottom: 60,
	},
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
	section: {
		marginTop: 24,
		paddingTop: 24,
		borderTopWidth: 1,
		borderTopColor: '#f3f4f6',
		gap: 12,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sectionLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.lightTint,
		backgroundColor: colors.lightTint + '12',
	},
	actionButtonText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.lightTint,
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
