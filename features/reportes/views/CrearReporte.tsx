
import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type * as ImagePickerTypes from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
	const params = useLocalSearchParams();
	const { tokens } = useAuth();
	const { mutateAsync: crearReporte, isPending: isCreating } = useCreateReporte();
	const modalVisible = props?.visible ?? true;
	const handleClose = props?.onClose ?? (() => router.back());

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

	// Estado de imágenes pendientes
	const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

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

	// ── Imagen handlers ──────────────────────────────────────────────────────────

	const addAsset = useCallback((asset: ImagePickerTypes.ImagePickerAsset) => {
		const ext = asset.uri.split('.').pop() ?? 'jpg';
		const name = asset.fileName ?? `imagen_${Date.now()}.${ext}`;
		const mimeType = asset.mimeType ?? `image/${ext}`;
		setPendingImages((prev) => [...prev, { uri: asset.uri, name, mimeType, description: '' }]);
	}, []);

	const handlePickFromGallery = useCallback(async () => {
		if (!ImagePicker) {
			Alert.alert('No disponible', 'El selector de imágenes no está disponible. Reconstruí la app con el módulo nativo.');
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
			addAsset(result.assets[0]);
		}
	}, [addAsset]);

	const handleTakePhoto = useCallback(async () => {
		if (!ImagePicker) {
			Alert.alert('No disponible', 'La cámara no está disponible. Reconstruí la app con el módulo nativo.');
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
			addAsset(result.assets[0]);
		}
	}, [addAsset]);

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
			Alert.alert('Formulario incompleto', 'Por favor completa todos los campos');
			return;
		}
		const token = tokens?.accessToken;
		if (!token) {
			Alert.alert('Error', 'No hay sesión activa');
			return;
		}

		try {
			const nuevoReporte = await crearReporte({
				usuario_reportado_id: Number(usuarioId),
				titulo: titulo.trim(),
				descripcion: descripcion.trim(),
				categoria,
				fecha_incidente: fechaIncidente.toISOString(),
			});

			// Subir imágenes pendientes una por una
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
						);
					}
				} catch (uploadError: any) {
					// El reporte ya se creó; avisamos del error pero navegamos igual
					Alert.alert(
						'Reporte creado',
						`El reporte se creó correctamente, pero algunas imágenes no pudieron subirse: ${uploadError?.message ?? 'Error desconocido'}`,
					);
					router.back();
					return;
				} finally {
					setIsUploading(false);
					setUploadProgress(null);
				}
			}

			Alert.alert('Éxito', 'Reporte creado correctamente');
			handleClose();
		} catch (error: any) {
			Alert.alert('Error', error?.message || 'Intenta nuevamente');
		}
	}, [isFormValid, tokens, crearReporte, usuarioId, titulo, descripcion, categoria, fechaIncidente, pendingImages, handleClose]);

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

	return (
		<Modal visible={modalVisible} transparent animationType="slide" onRequestClose={handleClose}>
			<View style={styles.overlay}>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={styles.keyboardContainer}
				>
					<View style={styles.container}>
						<View style={styles.modalHeader}>
							<TouchableOpacity onPress={handleClose} style={styles.closeButton}>
								<Ionicons name="close" size={24} color="#999" />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
							{/* Usuario reportado */}
							<View style={styles.inputSection}>
								<TextInput
									style={[styles.input, initialUserId && styles.disabledInput]}
									placeholder={userFullName || "ID usuario reportado"}
									placeholderTextColor={userFullName ? colors.text : colors.secondaryText}
									value={userFullName || usuarioId}
									onChangeText={!initialUserId ? setUsuarioId : undefined}
									keyboardType="numeric"
									editable={!initialUserId}
									selectTextOnFocus={!initialUserId}
								/>
							</View>
							{/* Título */}
							<View style={styles.inputSection}>
								<TextInput
									style={styles.input}
									placeholder="Título"
									placeholderTextColor={colors.secondaryText}
									value={titulo}
									onChangeText={setTitulo}
									maxLength={100}
								/>
							</View>
							{/* Descripción */}
							<TextInput
								style={styles.messageInput}
								placeholder="Descripción"
								placeholderTextColor={colors.secondaryText}
								value={descripcion}
								onChangeText={setDescripcion}
								multiline
								textAlignVertical="top"
							/>
							{/* Categoría */}
							<View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10, alignItems: 'center' }]}>
								<TouchableOpacity
									style={[styles.chip, categoria === 'NEGATIVO' && { borderColor: colors.error, backgroundColor: 'transparent', borderWidth: 1 }]}
									onPress={() => setCategoria('NEGATIVO')}
								>
									<ThemedText style={[styles.chipText, categoria === 'NEGATIVO' ? { color: colors.error, fontWeight: 'bold' } : { color: colors.secondaryText }]}>Negativo</ThemedText>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.chip, categoria === 'POSITIVO' && { borderColor: colors.success, backgroundColor: 'transparent', borderWidth: 1 }]}
									onPress={() => setCategoria('POSITIVO')}
								>
									<ThemedText style={[styles.chipText, categoria === 'POSITIVO' ? { color: colors.success, fontWeight: 'bold' } : { color: colors.secondaryText }]}>Positivo</ThemedText>
								</TouchableOpacity>
							</View>
							{/* Fecha incidente */}
							<View style={styles.inputSection}>
								<TouchableOpacity onPress={() => {
									setShowTimePicker(false);
									setShowDatePicker(true);
								}} style={{ flex: 1 }}>
									<ThemedText style={[styles.dateValue, { color: colors.text }]}>
										{fechaIncidente.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
									</ThemedText>
								</TouchableOpacity>
								<TouchableOpacity onPress={() => {
									setShowDatePicker(false);
									setShowTimePicker(true);
								}}>
									<ThemedText style={[styles.dateValue, styles.timeValue, { color: colors.text }]}>
										{fechaIncidente.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}
									</ThemedText>
								</TouchableOpacity>
							</View>

							{/* Imágenes */}
							<View style={styles.imageSection}>
								<View style={styles.imageSectionHeader}>
									<ThemedText style={styles.imageSectionLabel}>
										Imágenes{pendingImages.length > 0 ? ` (${pendingImages.length})` : ' (opcional)'}
									</ThemedText>
									<View style={styles.imagePickerRow}>
										<TouchableOpacity
											style={styles.imageActionBtn}
											onPress={handlePickFromGallery}
											disabled={isPending}
										>
											<Ionicons name="image-outline" size={20} color={colors.lightTint} />
											<ThemedText style={styles.imageActionText}>Galería</ThemedText>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.imageActionBtn}
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
											<TextInput
												style={styles.pendingDescInput}
												placeholder="Descripción (opcional)"
												placeholderTextColor={colors.secondaryText}
												value={img.description}
												onChangeText={(text) => updateImageDescription(idx, text)}
												maxLength={200}
											/>
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

						{/* Floating Send Button */}
						<View style={[styles.uploadButtonContainer]}>
							<TouchableOpacity
								onPress={handleCrearReporte}
								style={[styles.uploadButton, { backgroundColor: Colors['light'].componentBackground }]}
							>
								<Ionicons name="cloud-upload" size={20} color={Colors['light'].lightTint} />
								<ThemedText style={styles.uploadButtonText}>{'Crear'}</ThemedText>

							</TouchableOpacity>
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
					</View>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
	keyboardContainer: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	container: {
		flex: 1,
		marginTop: '5%',
		backgroundColor: colors.componentBackground,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		overflow: 'hidden',
	},
	modalHeader: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.background,
		alignItems: 'flex-end',
	},
	closeButton: {
		padding: 6,
		borderRadius: 16,
		backgroundColor: '#f3f4f6',
		marginLeft: 8,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		paddingBottom: 80,
	},
	inputSection: {
		flexDirection: 'row',
		paddingVertical: '3.5%',
		paddingHorizontal: '4%',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.background,
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
	chip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.background,
		marginRight: 8,
	},
	chipText: {
		fontSize: 14,
	},
	dateValue: {
		fontSize: 16,
		color: colors.lightTint,
	},
	timeValue: {
		fontWeight: '600',
	},
	messageInput: {
		flex: 1,
		fontSize: 16,
		color: colors.text,
		padding: '4%',
		minHeight: 120,
	},
	fab: {
		position: 'absolute',
		bottom: 80,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
	},
	fabLoading: {
		alignItems: 'center',
		gap: 2,
	},
	fabProgressText: {
		fontSize: 10,
		color: colors.componentBackground,
		fontWeight: '700',
	},
	// ── Imágenes ──
	imageSection: {
		paddingHorizontal: '4%',
		paddingVertical: '3%',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.background,
	},
	imageSectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
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
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.lightTint,
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
		borderWidth: 1,
		borderColor: colors.background,
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
		fontSize: 13,
		color: colors.text,
	},
	removeImageBtn: {
		padding: 2,
	},
	uploadButtonContainer: {
		backgroundColor: Colors['light'].componentBackground,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: Colors['light'].icon,
		paddingHorizontal: '4%',
		paddingTop: 10,
	},
	uploadButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		borderRadius: 8,
		gap: 8,
	},
	uploadButtonText: {
		color: Colors['light'].lightTint,
		fontWeight: '600',
		fontSize: 16,
	},
});
