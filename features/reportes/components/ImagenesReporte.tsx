import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    useReporteImagenes,
    useUnlinkReporteImage,
    useUploadReporteImage,
} from '../viewmodels/useReportes';

interface ImagenesReporteProps {
    /** ID del reporte al que pertenecen las imágenes */
    reporteId: string | number;
    /**
     * URLs de imágenes que ya vienen en el objeto Reporte (GET /reportes).
     * Se muestran inmediatamente sin fetch extra.
     */
    imagenesUrl?: string[];
    /** Si el usuario tiene rol supervisor y puede subir/eliminar imágenes */
    canManage: boolean;
}

const colors = Colors['light'];
const PLACEHOLDER = require('@/assets/images/react-logo.png');

export function ImagenesReporte({
    reporteId,
    imagenesUrl,
    canManage,
}: ImagenesReporteProps) {
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadDescription, setUploadDescription] = useState('');

    // Datos completos solo se necesitan cuando el usuario puede gestionar imágenes
    const {
        data: imagenesDetalle,
        isLoading: loadingDetalle,
        refetch,
    } = useReporteImagenes(canManage ? reporteId : undefined);

    const { mutate: uploadImage, isPending: uploading } = useUploadReporteImage();
    const { mutate: unlinkImage, isPending: unlinking } = useUnlinkReporteImage();

    const handlePickAndUpload = useCallback(async () => {
        if (!uploadDescription.trim()) {
            Alert.alert('Descripción requerida', 'Ingresá una descripción para la imagen.');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const asset = result.assets[0];
            // Calcular el próximo orden según cantidad actual
            const currentCount = imagenesDetalle?.length ?? imagenesUrl?.length ?? 0;

            uploadImage(
                {
                    reporteId,
                    fileUri: asset.uri,
                    fileName: asset.name,
                    mimeType: asset.mimeType ?? 'image/jpeg',
                    description: uploadDescription.trim(),
                    orden: currentCount,
                },
                {
                    onSuccess: () => {
                        Alert.alert('Éxito', 'Imagen subida correctamente.');
                        setUploadDescription('');
                        setShowUploadForm(false);
                    },
                    onError: (error: any) => {
                        Alert.alert('Error', error?.message ?? 'No se pudo subir la imagen.');
                    },
                },
            );
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo abrir el selector de archivos.');
        }
    }, [uploadDescription, uploadImage, reporteId, imagenesDetalle, imagenesUrl]);

    const handleUnlink = useCallback(
        (imageId: number, orden: number) => {
            Alert.alert(
                'Eliminar imagen',
                '¿Desvincular esta imagen del reporte?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: () => {
                            unlinkImage(
                                { reporteId, imageId, orden },
                                {
                                    onError: (error: any) => {
                                        Alert.alert(
                                            'Error',
                                            error?.message ?? 'No se pudo eliminar la imagen.',
                                        );
                                    },
                                },
                            );
                        },
                    },
                ],
            );
        },
        [unlinkImage, reporteId],
    );

    // ── Render ──────────────────────────────────────────────────────────────────

    // Cuando canManage=true usamos imagenesDetalle; sino las URLs simples
    const hasImages = canManage
        ? (imagenesDetalle?.length ?? 0) > 0
        : (imagenesUrl?.length ?? 0) > 0;

    return (
        <View style={styles.container}>
            {/* Encabezado de la sección */}
            <View style={styles.header}>
                <ThemedText style={styles.sectionTitle}>Imágenes</ThemedText>
                {canManage && (
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setShowUploadForm((v) => !v)}
                        disabled={uploading || unlinking}
                    >
                        <Ionicons
                            name={showUploadForm ? 'close-circle-outline' : 'add-circle-outline'}
                            size={22}
                            color={colors.lightTint}
                        />
                        <ThemedText style={styles.addBtnText}>
                            {showUploadForm ? 'Cancelar' : 'Agregar'}
                        </ThemedText>
                    </TouchableOpacity>
                )}
            </View>

            {/* Formulario de upload */}
            {canManage && showUploadForm && (
                <View style={styles.uploadForm}>
                    <TextInput
                        style={styles.descInput}
                        placeholder="Descripción de la imagen"
                        placeholderTextColor={colors.secondaryText}
                        value={uploadDescription}
                        onChangeText={setUploadDescription}
                        maxLength={200}
                    />
                    <TouchableOpacity
                        style={[styles.pickBtn, uploading && styles.pickBtnDisabled]}
                        onPress={handlePickAndUpload}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator size="small" color={colors.componentBackground} />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={18} color={colors.componentBackground} />
                                <ThemedText style={styles.pickBtnText}>Seleccionar y subir imagen</ThemedText>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Lista de imágenes */}
            {canManage && loadingDetalle ? (
                <ActivityIndicator size="small" color={colors.tint} style={styles.loader} />
            ) : hasImages ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {canManage && imagenesDetalle
                        ? imagenesDetalle.map((img) => (
                              <View key={img.id} style={styles.imageWrapper}>
                                  <Image
                                      source={{ uri: img.url }}
                                      style={styles.image}
                                      contentFit="cover"
                                      placeholder={PLACEHOLDER}
                                  />
                                  {img.imagen_descripcion ? (
                                      <ThemedText style={styles.imageCaption} numberOfLines={2}>
                                          {img.imagen_descripcion}
                                      </ThemedText>
                                  ) : null}
                                  <TouchableOpacity
                                      style={styles.deleteBtn}
                                      onPress={() => handleUnlink(img.image_id, img.orden)}
                                      disabled={unlinking}
                                  >
                                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                                  </TouchableOpacity>
                              </View>
                          ))
                        : (imagenesUrl ?? []).map((url, idx) => (
                              <View key={idx} style={styles.imageWrapper}>
                                  <Image
                                      source={{ uri: url }}
                                      style={styles.image}
                                      contentFit="cover"
                                      placeholder={PLACEHOLDER}
                                  />
                              </View>
                          ))}
                </ScrollView>
            ) : (
                <ThemedText style={styles.emptyText}>Sin imágenes adjuntas</ThemedText>
            )}
        </View>
    );
}

const IMAGE_SIZE = 120;

const styles = StyleSheet.create({
    container: {
        marginTop: 18,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.text,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addBtnText: {
        fontSize: 14,
        color: colors.lightTint,
        fontWeight: '600',
    },
    uploadForm: {
        marginBottom: 12,
        gap: 8,
    },
    descInput: {
        borderWidth: 1,
        borderColor: colors.background,
        borderRadius: 6,
        padding: 8,
        fontSize: 14,
        color: colors.text,
    },
    pickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.lightTint,
        borderRadius: 6,
        paddingVertical: 10,
        gap: 6,
    },
    pickBtnDisabled: {
        opacity: 0.6,
    },
    pickBtnText: {
        color: colors.componentBackground,
        fontWeight: '600',
        fontSize: 14,
    },
    imageScroll: {
        paddingBottom: 4,
    },
    imageWrapper: {
        marginRight: 10,
        position: 'relative',
        alignItems: 'center',
    },
    image: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    imageCaption: {
        width: IMAGE_SIZE,
        fontSize: 11,
        color: colors.secondaryText,
        marginTop: 4,
        textAlign: 'center',
    },
    deleteBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: colors.componentBackground,
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    loader: {
        marginVertical: 12,
    },
    emptyText: {
        color: colors.secondaryText,
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 8,
    },
});
