import { AlertModal, type AlertModalAction } from '@/components/AlertModal';
import { FilePreview, getExt, useOpenFilePreview } from '@/components/filePreview';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Image } from 'expo-image';
import type * as ImagePickerTypes from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
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
import { EstadoReporte, Reporte, ReporteImagen } from '../models/Reporte';
import { useReporteImagenes, useUnlinkReporteImage, useUpdateReporte, useUploadReporteImage } from '../viewmodels/useReportes';

let ImagePicker: typeof ImagePickerTypes | null = null;
try {
	ImagePicker = require('expo-image-picker');
} catch {
	console.warn('expo-image-picker native module not available. Image picking will be disabled.');
}

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
	const { previewFile, openWithUri, closePreview } = useOpenFilePreview();

	// ── Estado: formulario de actualización ──────────────────────────────────
	const [nuevoEstado, setNuevoEstado] = useState<EstadoReporte | null>(null);
	const [observacion, setObservacion] = useState('');
	const [alertModal, setAlertModal] = useState<{
		visible: boolean;
		title: string;
		message?: string;
		actions: AlertModalAction[];
	}>({ visible: false, title: '', message: undefined, actions: [] });

	// ── Estado: imágenes ─────────────────────────────────────────────────────
	const { data: imagenes = [], isLoading: imagenesLoading } = useReporteImagenes(visible ? reporte.id : undefined);
	const { mutateAsync: uploadImagen } = useUploadReporteImage();
	const { mutateAsync: unlinkImagen } = useUnlinkReporteImage();
	const [isUploadingImage, setIsUploadingImage] = useState(false);

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

	// ── Imágenes ─────────────────────────────────────────────────────────────
	// Solo imágenes (por decisión); se suben/listan vía el sistema reportesImagenes.

	const uploadAsset = useCallback(async (asset: ImagePickerTypes.ImagePickerAsset) => {
		const ext = asset.uri.split('.').pop() ?? 'jpg';
		const name = asset.fileName ?? `imagen_${Date.now()}.${ext}`;
		const mimeType = asset.mimeType ?? `image/${ext}`;
		setIsUploadingImage(true);
		try {
			await uploadImagen({
				reporteId: reporte.id,
				fileUri: asset.uri,
				fileName: name,
				mimeType,
				description: 'Imagen de reporte',
				orden: imagenes.length,
			});
		} catch (error: any) {
			Alert.alert('Error', error?.message ?? 'No se pudo subir la imagen.');
		} finally {
			setIsUploadingImage(false);
		}
	}, [uploadImagen, reporte.id, imagenes.length]);

	const handlePickFromGallery = useCallback(async () => {
		if (!ImagePicker) {
			Alert.alert('No disponible', 'El selector de imágenes no está disponible.');
			return;
		}
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para adjuntar imágenes.');
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: 'images',
			allowsMultipleSelection: false,
			quality: 0.8,
		});
		if (!result.canceled && result.assets.length > 0) {
			await uploadAsset(result.assets[0]);
		}
	}, [uploadAsset]);

	const handleTakePhoto = useCallback(async () => {
		if (!ImagePicker) {
			Alert.alert('No disponible', 'La cámara no está disponible.');
			return;
		}
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== 'granted') {
			Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos.');
			return;
		}
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: 'images',
			quality: 0.8,
		});
		if (!result.canceled && result.assets.length > 0) {
			await uploadAsset(result.assets[0]);
		}
	}, [uploadAsset]);

	const handleOpenImagen = useCallback((img: ReporteImagen) => {
		openWithUri({
			id: String(img.image_id),
			kind: 'image',
			name: img.imagen_descripcion || `Imagen ${img.orden + 1}`,
			ext: getExt(undefined, img.url),
			uri: img.url,
		});
	}, [openWithUri]);

	const handleRemoveImagen = useCallback((img: ReporteImagen) => {
		Alert.alert('Eliminar imagen', '¿Querés quitar esta imagen?', [
			{ text: 'Cancelar', style: 'cancel' },
			{
				text: 'Eliminar',
				style: 'destructive',
				onPress: () => {
					unlinkImagen({ reporteId: reporte.id, imageId: img.image_id, orden: img.orden })
						.catch((error: any) => Alert.alert('Error', error?.message ?? 'No se pudo eliminar la imagen.'));
				},
			},
		]);
	}, [unlinkImagen, reporte.id]);

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

							{/* Imágenes del reporte */}
							<View style={styles.section}>
								<View style={styles.sectionHeaderRow}>
									<ThemedText style={styles.sectionLabel}>Imágenes</ThemedText>
									{canManageFiles && (
										<View style={styles.imagePickerRow}>
											<TouchableOpacity
												style={styles.actionButton}
												onPress={handlePickFromGallery}
												disabled={isUploadingImage}
											>
												<Ionicons name="image-outline" size={14} color={colors.lightTint} />
												<Text style={styles.actionButtonText}>Galería</Text>
											</TouchableOpacity>
											<TouchableOpacity
												style={styles.actionButton}
												onPress={handleTakePhoto}
												disabled={isUploadingImage}
											>
												<Ionicons name="camera-outline" size={14} color={colors.lightTint} />
												<Text style={styles.actionButtonText}>Cámara</Text>
											</TouchableOpacity>
										</View>
									)}
								</View>

								{imagenesLoading ? (
									<ActivityIndicator color={colors.lightTint} style={{ marginVertical: 12 }} />
								) : imagenes.length === 0 ? (
									<ThemedText style={styles.emptyText}>No hay imágenes.</ThemedText>
								) : (
									<View style={styles.imageGrid}>
										{imagenes.map((img) => (
											<View key={img.id} style={styles.imageThumbWrap}>
												<TouchableOpacity onPress={() => handleOpenImagen(img)} activeOpacity={0.85}>
													<Image source={{ uri: img.url }} style={styles.imageThumb} contentFit="cover" />
												</TouchableOpacity>
												{canManageFiles && (
													<TouchableOpacity
														style={styles.imageRemoveBtn}
														onPress={() => handleRemoveImagen(img)}
														disabled={isUploadingImage}
													>
														<Ionicons name="close-circle" size={22} color={colors.error} />
													</TouchableOpacity>
												)}
											</View>
										))}
									</View>
								)}

								{isUploadingImage && (
									<View style={styles.uploadingRow}>
										<ActivityIndicator size="small" color={colors.lightTint} />
										<ThemedText style={styles.uploadingText}>Subiendo imagen...</ThemedText>
									</View>
								)}
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
	imagePickerRow: {
		flexDirection: 'row',
		gap: 8,
	},
	emptyText: {
		fontSize: 13,
		color: colors.secondaryText,
	},
	imageGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	imageThumbWrap: {
		position: 'relative',
	},
	imageThumb: {
		width: 90,
		height: 90,
		borderRadius: 8,
		backgroundColor: '#f3f4f6',
	},
	imageRemoveBtn: {
		position: 'absolute',
		top: -8,
		right: -8,
		backgroundColor: '#fff',
		borderRadius: 11,
	},
	uploadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 10,
	},
	uploadingText: {
		fontSize: 13,
		color: colors.secondaryText,
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
