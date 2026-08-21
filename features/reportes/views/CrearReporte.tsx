
import { AlertModal, type AlertModalAction } from '@/components/AlertModal';
import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type * as ImagePickerTypes from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { deriveIdempotencyKey } from '@/shared/idempotency';
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { GlassButton } from '@/shared/ui/GlassButton';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import { uploadReporteImage } from '../services/reportesApi';
import { useCreateReporte } from '../viewmodels/useReportes';

let ImagePicker: typeof ImagePickerTypes | null = null;
try {
	ImagePicker = require('expo-image-picker');
} catch {
	console.warn('expo-image-picker native module not available. Image picking will be disabled.');
}

const colors = Colors['light'];

interface CrearReporteProps {
	user_context_id?: string;
	user_nombre?: string;
	user_apellido?: string;
	visible?: boolean;
	onClose?: () => void;
}

interface PendingImage {
	uri: string;
	name: string;
	mimeType: string;
	description: string;
}

export default function CrearReporte(props?: CrearReporteProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const bottomInset = useSafeBottomInset();
	const params = useLocalSearchParams();
	const { tokens } = useAuth();
	const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();
	const { mutateAsync: crearReporte, isPending: isCreating } = useCreateReporte();
	const modalVisible = props?.visible ?? true;
	const handleClose = props?.onClose ?? (() => router.back());

	useEffect(() => {
		if (!modalVisible) return;
		const sub = BackHandler.addEventListener('hardwareBackPress', () => {
			handleClose();
			return true;
		});
		return () => sub.remove();
	}, [modalVisible, handleClose]);

	// Obtener user_context_id de props o de los parámetros de navegación
	const initialUserId = props?.user_context_id || (params.user_context_id as string) || '';
	const userNombre = props?.user_nombre || (params.user_nombre as string) || '';
	const userApellido = props?.user_apellido || (params.user_apellido as string) || '';
	const userFullName = userNombre && userApellido ? `${userNombre} ${userApellido}` : '';

	// Form state
	const [usuarioId, setUsuarioId] = useState(initialUserId);
	const [titulo, setTitulo] = useState('');
	const [descripcion, setDescripcion] = useState('');
	const [categoria, setCategoria] = useState<'NEGATIVO' | 'POSITIVO'>('NEGATIVO');
	const [fechaIncidente, setFechaIncidente] = useState<Date>(new Date());
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showTimePicker, setShowTimePicker] = useState(false);

	const [focusedField, setFocusedField] = useState<string | null>(null);
	// Estado de imágenes pendientes
	const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
	const [alertModal, setAlertModal] = useState<{
		visible: boolean;
		title: string;
		message?: string;
		actions: AlertModalAction[];
	}>({ visible: false, title: '', message: undefined, actions: [] });

	const isPending = isCreating || isUploading;

	// Validación simple
	const isFormValid = useMemo(() => {
		return (
			usuarioId.trim().length > 0 &&
			titulo.trim().length > 0 &&
			descripcion.trim().length > 0 &&
			!!categoria &&
			fechaIncidente instanceof Date
		);
	}, [usuarioId, titulo, descripcion, categoria, fechaIncidente]);

	const showModal = useCallback((title: string, message?: string, actions?: AlertModalAction[]) => {
		const normalizedActions: AlertModalAction[] = actions && actions.length > 0
			? actions
			: [{ key: 'ok', label: 'Aceptar', onPress: () => { }, variant: 'primary' }];

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

	// ── Imagen handlers ──────────────────────────────────────────────────────────

	const addAsset = useCallback((asset: ImagePickerTypes.ImagePickerAsset) => {
		const ext = asset.uri.split('.').pop() ?? 'jpg';
		const name = asset.fileName ?? `imagen_${Date.now()}.${ext}`;
		const mimeType = asset.mimeType ?? `image/${ext}`;
		setPendingImages((prev) => [...prev, { uri: asset.uri, name, mimeType, description: '' }]);
	}, []);

	const handlePickFromGallery = useCallback(async () => {
		if (!ImagePicker) {
			showModal('No disponible', 'El selector de imágenes no está disponible. Reconstruí la app con el módulo nativo.');
			return;
		}
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			showModal('Permiso denegado', 'Se necesita acceso a la galería para adjuntar imágenes.');
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: 'images',
			allowsMultipleSelection: false,
			quality: 0.8,
		});
		if (!result.canceled && result.assets.length > 0) {
			addAsset(result.assets[0]);
		}
	}, [addAsset, showModal]);

	const handleTakePhoto = useCallback(async () => {
		if (!ImagePicker) {
			showModal('No disponible', 'La cámara no está disponible. Reconstruí la app con el módulo nativo.');
			return;
		}
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== 'granted') {
			showModal('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos.');
			return;
		}
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: 'images',
			quality: 0.8,
		});
		if (!result.canceled && result.assets.length > 0) {
			addAsset(result.assets[0]);
		}
	}, [addAsset, showModal]);

	const removeImage = useCallback((index: number) => {
		setPendingImages((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const updateImageDescription = useCallback((index: number, text: string) => {
		setPendingImages((prev) =>
			prev.map((img, i) => (i === index ? { ...img, description: text } : img)),
		);
	}, []);

	// ── Submit ───────────────────────────────────────────────────────────────────

	const handleCrearReporte = useCallback(async () => {
		if (!isFormValid) {
			showModal('Formulario incompleto', 'Por favor completa todos los campos');
			return;
		}
		const token = tokens?.accessToken;
		if (!token) {
			showModal('Error', 'No hay sesión activa');
			return;
		}

		try {
			// La key base queda fijada a ESTE intento de creación: el reporte la usa
			// directa y cada imagen una sub-key derivada, estables entre reintentos.
			const baseKey = idempotencyKey;
			const nuevoReporte = await crearReporte({
				usuario_reportado_id: Number(usuarioId),
				titulo: titulo.trim(),
				descripcion: descripcion.trim(),
				categoria,
				fecha_incidente: fechaIncidente.toISOString(),
				idempotencyKey: baseKey,
			});
			// El reporte ya existe: rotar la key para que un próximo envío desde este
			// mismo formulario sea una operación nueva y no un replay del backend.
			regenerateIdempotencyKey();

			// Subir imágenes pendientes una por una
			if (pendingImages.length > 0 && !nuevoReporte?.id) {
				showModal(
					'Reporte creado',
					'El reporte se creó, pero no se pudo identificar para adjuntar las imágenes.',
					[{ key: 'ok', label: 'Aceptar', onPress: () => handleClose(), variant: 'primary' }],
				);
				return;
			}

			if (pendingImages.length > 0) {
				setIsUploading(true);
				setUploadProgress({ current: 0, total: pendingImages.length });
				try {
					for (let i = 0; i < pendingImages.length; i++) {
						const img = pendingImages[i];
						setUploadProgress({ current: i + 1, total: pendingImages.length });
						await uploadReporteImage(
							token,
							nuevoReporte.id,
							img.uri,
							img.name,
							img.mimeType,
							img.description || 'Imagen de reporte',
							i,
							deriveIdempotencyKey(baseKey, `img-${i}`),
						);
					}
				} catch (uploadError: any) {
					// El reporte ya se creó; avisamos del error pero navegamos igual
					showModal(
						'Reporte creado',
						`El reporte se creó correctamente, pero algunas imágenes no pudieron subirse: ${uploadError?.message ?? 'Error desconocido'}`,
						[
							{
								key: 'ok',
								label: 'Aceptar',
								onPress: () => router.back(),
								variant: 'primary',
							},
						],
					);
					return;
				} finally {
					setIsUploading(false);
					setUploadProgress(null);
				}
			}

			showModal('Éxito', 'Reporte creado correctamente', [
				{ key: 'ok', label: 'Aceptar', onPress: () => handleClose(), variant: 'primary' },
			]);
		} catch (error: any) {
			showModal('Error', error?.message || 'Intenta nuevamente');
		}
	}, [isFormValid, tokens, crearReporte, usuarioId, titulo, descripcion, categoria, fechaIncidente, pendingImages, handleClose, showModal, router, idempotencyKey, regenerateIdempotencyKey]);

	const handleDateConfirm = useCallback((selectedDate: Date) => {
		setFechaIncidente((prev) => {
			const next = new Date(prev);
			next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
			return next;
		});
		setShowDatePicker(false);
		setShowTimePicker(false);
	}, []);

	const handleTimeConfirm = useCallback((selectedDate: Date) => {
		setFechaIncidente((prev) => {
			const next = new Date(prev);
			next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
			return next;
		});
		setShowDatePicker(false);
		setShowTimePicker(false);
	}, []);

	if (!modalVisible) return null;

	return (
		<FullScreenPortal>
		<View style={[glassStyles.sheet, styles.fullScreen]}>
			<ModalKeyboardView style={styles.keyboardContainer}>
				<View style={[glassStyles.sheet, styles.container, { paddingBottom: bottomInset }]}>
					<View style={[glassStyles.sheetHeader, styles.modalHeader, { paddingTop: insets.top + 10 }]}>
						<AppBackButton onPress={handleClose} />
					</View>

						<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
							{/* Usuario reportado */}
							<View style={[glassStyles.fieldGlass, styles.inputSection, focusedField === 'usuario' && styles.inputFocused]}>
								<TextInput
									style={[styles.input, styles.inputNoOutline, initialUserId && styles.disabledInput]}
									placeholder={userFullName || "ID usuario reportado"}
									placeholderTextColor={userFullName ? colors.text : colors.secondaryText}
									value={userFullName || usuarioId}
									onChangeText={!initialUserId ? setUsuarioId : undefined}
									keyboardType="numeric"
									editable={!initialUserId}
									selectTextOnFocus={!initialUserId}
									onFocus={() => setFocusedField('usuario')}
									onBlur={() => setFocusedField(null)}
								/>
							</View>
							{/* Título */}
							<View style={[glassStyles.fieldGlass, styles.inputSection, focusedField === 'titulo' && styles.inputFocused]}>
								<TextInput
									style={[styles.input, styles.inputNoOutline]}
									placeholder="Título"
									placeholderTextColor={colors.secondaryText}
									value={titulo}
									onChangeText={setTitulo}
									maxLength={100}
									onFocus={() => setFocusedField('titulo')}
									onBlur={() => setFocusedField(null)}
								/>
							</View>
							{/* Descripción */}
							<View style={[glassStyles.fieldGlass, styles.messageInputContainer, focusedField === 'descripcion' && styles.inputFocused]}>
								<TextInput
									style={[styles.messageInput, styles.inputNoOutline]}
									placeholder="Descripción"
									placeholderTextColor={colors.secondaryText}
									value={descripcion}
									onChangeText={setDescripcion}
									multiline
									textAlignVertical="top"
									onFocus={() => setFocusedField('descripcion')}
									onBlur={() => setFocusedField(null)}
								/>
							</View>
							{/* Categoría */}
							<View style={styles.categorySection}>
								<ThemedText style={styles.fieldLabel}>Tipo de reporte</ThemedText>
								<View style={styles.categoryRow}>
									<TouchableOpacity
										style={[glassStyles.fieldGlass, styles.categoryOption, categoria === 'NEGATIVO' && styles.categoryOptionNegative]}
										onPress={() => setCategoria('NEGATIVO')}
										accessibilityState={{ selected: categoria === 'NEGATIVO' }}
									>
										<Ionicons name="remove-circle-outline" size={22} color={colors.error} />
										<ThemedText style={[styles.categoryText, { color: colors.error }]}>Negativo</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[glassStyles.fieldGlass, styles.categoryOption, categoria === 'POSITIVO' && styles.categoryOptionPositive]}
										onPress={() => setCategoria('POSITIVO')}
										accessibilityState={{ selected: categoria === 'POSITIVO' }}
									>
										<Ionicons name="add-circle-outline" size={22} color={colors.success} />
										<ThemedText style={[styles.categoryText, { color: colors.success }]}>Positivo</ThemedText>
									</TouchableOpacity>
								</View>
							</View>
							{/* Fecha incidente */}
							<View style={styles.dateSection}>
								<ThemedText style={styles.fieldLabel}>Fecha del reporte</ThemedText>
								<View style={styles.dateRow}>
									<TouchableOpacity onPress={() => {
										setShowTimePicker(false);
										setShowDatePicker(true);
									}} style={[glassStyles.buttonSecondary, styles.dateButton]}>
										<ThemedText style={[styles.dateValue, { color: colors.text }]}>
											{fechaIncidente.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
										</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity onPress={() => {
										setShowDatePicker(false);
										setShowTimePicker(true);
									}} style={[glassStyles.buttonSecondary, styles.timeButton]}>
										<ThemedText style={[styles.dateValue, styles.timeValue, { color: colors.text }]}>{fechaIncidente.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}</ThemedText>
									</TouchableOpacity>
								</View>
							</View>

							{/* Imágenes */}
							<View style={styles.imageSection}>
								<View style={styles.imageSectionHeader}>
									<ThemedText style={styles.imageSectionLabel}>
										Imágenes{pendingImages.length > 0 ? ` (${pendingImages.length})` : ' (opcional)'}
									</ThemedText>
									<View style={styles.imagePickerRow}>
										<TouchableOpacity
											style={[glassStyles.button, styles.imageActionBtn]}
											onPress={handlePickFromGallery}
											disabled={isPending}
										>
											<Ionicons name="image-outline" size={20} color={colors.lightTint} />
											<ThemedText style={styles.imageActionText}>Galería</ThemedText>
										</TouchableOpacity>
										<TouchableOpacity
											style={[glassStyles.button, styles.imageActionBtn]}
											onPress={handleTakePhoto}
											disabled={isPending}
										>
											<Ionicons name="camera-outline" size={20} color={colors.lightTint} />
											<ThemedText style={styles.imageActionText}>Cámara</ThemedText>
										</TouchableOpacity>
									</View>
								</View>

								{pendingImages.map((img, idx) => (
									<View key={idx} style={styles.pendingImageItem}>
										<Image
											source={{ uri: img.uri }}
											style={styles.pendingThumbnail}
											contentFit="cover"
										/>
										<View style={styles.pendingImageDetails}>
											<View style={[glassStyles.fieldGlass, focusedField === `image-${idx}` && styles.inputFocused]}>
												<TextInput
													style={[styles.pendingDescInput, styles.inputNoOutline]}
													placeholder="Descripción (opcional)"
													placeholderTextColor={colors.secondaryText}
													value={img.description}
													onChangeText={(text) => updateImageDescription(idx, text)}
													maxLength={200}
													onFocus={() => setFocusedField(`image-${idx}`)}
													onBlur={() => setFocusedField(null)}
												/>
											</View>
										</View>
										<TouchableOpacity
											onPress={() => removeImage(idx)}
											style={styles.removeImageBtn}
											disabled={isPending}
										>
											<Ionicons name="close-circle" size={24} color={colors.error} />
										</TouchableOpacity>
									</View>
								))}
							</View>
						</ScrollView>

						<View style={[styles.uploadButtonContainer, { paddingBottom: bottomInset }]}>
							<GlassButton
								label="Crear"
								onPress={handleCrearReporte}
								loading={isPending}
								icon={(color) => <Ionicons name="cloud-upload" size={20} color={color} />}
								style={styles.uploadButton}
							/>
						</View>

						{/* Date Picker */}
						{showDatePicker && (
							<DateTimePicker
								visible={showDatePicker}
								value={fechaIncidente}
								mode="date"
								onConfirm={handleDateConfirm}
								onCancel={() => {
									setShowDatePicker(false);
									setShowTimePicker(false);
								}}
							/>
						)}

						{/* Time Picker */}
						{showTimePicker && (
							<DateTimePicker
								visible={showTimePicker}
								value={fechaIncidente}
								mode="time"
								is24Hour
								onConfirm={handleTimeConfirm}
								onCancel={() => {
									setShowDatePicker(false);
									setShowTimePicker(false);
								}}
							/>
						)}

						<AlertModal
							visible={alertModal.visible}
							title={alertModal.title}
							message={alertModal.message}
							actions={alertModal.actions}
							onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
						/>
					</View>
			</ModalKeyboardView>
		</View>
		</FullScreenPortal>
	);
}

const styles = StyleSheet.create({
	fullScreen: {
		...StyleSheet.absoluteFillObject,
		zIndex: 1000,
		elevation: 8,
	},
	keyboardContainer: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	container: {
		flex: 1,
	},
	modalHeader: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.background,
		alignItems: 'flex-start',
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		paddingHorizontal: 16,
		paddingTop: 16,
		gap: 12,
		paddingBottom: 28,
	},
	inputSection: {
		flexDirection: 'row',
		paddingVertical: 14,
		paddingHorizontal: 14,
		minHeight: 48,
	},
	input: {
		flex: 1,
		fontSize: 16,
		color: colors.text,
		padding: 0,
	},
	disabledInput: {
		color: colors.secondaryText,
		opacity: 0.6,
	},
	fieldLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: glassColors.textMuted,
	},
	categorySection: {
		gap: 8,
	},
	categoryRow: {
		flexDirection: 'row',
		gap: 10,
	},
	categoryOption: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		minHeight: 52,
		paddingHorizontal: 12,
	},
	categoryOptionNegative: {
		backgroundColor: 'rgba(244,67,54,0.12)',
		borderColor: 'rgba(244,67,54,0.45)',
		borderWidth: 2,
	},
	categoryOptionPositive: {
		backgroundColor: 'rgba(46,125,50,0.12)',
		borderColor: 'rgba(46,125,50,0.45)',
		borderWidth: 2,
	},
	categoryText: {
		fontSize: 15,
		fontWeight: '800',
	},
	dateSection: {
		gap: 8,
	},
	dateRow: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'stretch',
	},
	dateButton: {
		flex: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	timeButton: {
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	dateValue: {
		fontSize: 16,
		color: colors.lightTint,
	},
	timeValue: {
		fontWeight: '600',
	},
	messageInputContainer: {
		minHeight: 120,
	},
	messageInput: {
		flex: 1,
		fontSize: 16,
		color: colors.text,
		padding: 14,
	},
	inputFocused: {
		borderColor: glassColors.link,
	},
	inputNoOutline: {
		outlineStyle: 'none',
		outlineWidth: 0,
	} as any,
	// ── Imágenes ──
	imageSection: {
		paddingVertical: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.background,
	},
	imageSectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 10,
		marginBottom: 10,
	},
	imageSectionLabel: {
		fontSize: 14,
		color: colors.secondaryText,
		fontWeight: '500',
	},
	imagePickerRow: {
		flexDirection: 'row',
		gap: 8,
	},
	imageActionBtn: {
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	imageActionText: {
		fontSize: 13,
		color: colors.lightTint,
		fontWeight: '600',
	},
	pendingImageItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		gap: 10,
	},
	pendingThumbnail: {
		width: 60,
		height: 60,
		borderRadius: 6,
		backgroundColor: colors.background,
	},
	pendingImageDetails: {
		flex: 1,
	},
	pendingDescInput: {
		paddingHorizontal: 8,
		paddingVertical: 6,
		fontSize: 13,
		color: colors.text,
	},
	removeImageBtn: {
		padding: 2,
	},
	uploadButtonContainer: {
		backgroundColor: '#ffffff',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: Colors['light'].icon,
		paddingHorizontal: '4%',
		paddingTop: 10,
		paddingBottom: 10,
	},
	uploadButton: {
		alignSelf: 'stretch',
	},
});
