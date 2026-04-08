import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ImageStyle,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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

const IMAGE_SIZE = 120;

const AnimatedImage = Animated.createAnimatedComponent(Image);

function ZoomableImage({
    uri,
    imageStyle,
}: {
    uri: string;
    imageStyle: ImageStyle;
}) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withTiming(1);
                savedScale.value = 1;
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (savedScale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onStart(() => {
            if (savedScale.value > 1) {
                scale.value = withTiming(1);
                savedScale.value = 1;
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                scale.value = withTiming(2.5);
                savedScale.value = 2.5;
            }
        });

    const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={composed}>
            <AnimatedImage
                source={{ uri }}
                style={[imageStyle, animatedStyle]}
                contentFit="contain"
            />
        </GestureDetector>
    );
}

export function ImagenesReporte({
    reporteId,
    imagenesUrl,
    canManage,
}: ImagenesReporteProps) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadDescription, setUploadDescription] = useState('');
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    // Datos completos solo se necesitan cuando el usuario puede gestionar imágenes
    const {
        data: imagenesDetalle,
        isLoading: loadingDetalle,
        refetch,
    } = useReporteImagenes(reporteId);

    const { mutate: uploadImage, isPending: uploading } = useUploadReporteImage();
    const { mutate: unlinkImage, isPending: unlinking } = useUnlinkReporteImage();

    const handlePickAndUpload = useCallback(async () => {
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
                    description: uploadDescription.trim() || 'Imagen de reporte',
                    orden: currentCount,
                },
                {
                    onSuccess: () => {
                        Alert.alert('Éxito', 'Imagen subida correctamente.');
                        setUploadDescription('');
                        setShowUploadForm(false);
                    },
                    onError: (error: any) => {
                        Alert.alert('Error', error?.message ?? 'Intenta nuevamente');
                    },
                },
            );
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Intenta nuevamente');
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
                                            error?.message ?? 'Intenta nuevamente',
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

    // Usamos imagenesDetalle cuando están disponibles, sino las URLs simples
    const hasImages = (imagenesDetalle?.length ?? 0) > 0
        || (imagenesUrl?.length ?? 0) > 0;

    const fullscreenImageStyle: ImageStyle = {
        width: Platform.OS === 'web'
            ? Math.min(windowWidth * 0.92, 1200)
            : windowWidth,
        height: Platform.OS === 'web'
            ? Math.min(windowHeight * 0.86, 920)
            : windowHeight * 0.8,
    };

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
                        placeholder="Descripción de la imagen (opcional)"
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
            {loadingDetalle ? (
                <ActivityIndicator size="small" color={colors.tint} style={styles.loader} />
            ) : hasImages ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {imagenesDetalle && imagenesDetalle.length > 0
                        ? imagenesDetalle.map((img) => (
                            <View key={img.id} style={styles.imageWrapper}>
                                <TouchableOpacity onPress={() => setFullscreenImage(img.url)}>
                                    <Image
                                        source={{ uri: img.url }}
                                        style={styles.image}
                                        contentFit="cover"
                                        placeholder={PLACEHOLDER}
                                    />
                                </TouchableOpacity>
                                {img.imagen_descripcion ? (
                                    <ThemedText style={styles.imageCaption} numberOfLines={2}>
                                        {img.imagen_descripcion}
                                    </ThemedText>
                                ) : null}
                                {canManage && (
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleUnlink(img.image_id, img.orden)}
                                        disabled={unlinking}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                        : (imagenesUrl ?? []).map((url, idx) => (
                            <View key={idx} style={styles.imageWrapper}>
                                <TouchableOpacity onPress={() => setFullscreenImage(url)}>
                                    <Image
                                        source={{ uri: url }}
                                        style={styles.image}
                                        contentFit="cover"
                                        placeholder={PLACEHOLDER}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}
                </ScrollView>
            ) : (
                <ThemedText style={styles.emptyText}>Sin imágenes adjuntas</ThemedText>
            )}

            {/* Modal pantalla completa con zoom */}
            <Modal
                visible={!!fullscreenImage}
                transparent
                animationType="fade"
                onRequestClose={() => setFullscreenImage(null)}
            >
                <GestureHandlerRootView
                    style={[
                        styles.fullscreenOverlay,
                        Platform.OS === 'web' && styles.fullscreenOverlayWeb,
                    ]}
                >
                    <ZoomableImage uri={fullscreenImage ?? ''} imageStyle={fullscreenImageStyle} />
                    <TouchableOpacity
                        style={[
                            styles.fullscreenCloseBtn,
                            Platform.OS === 'web' && styles.fullscreenCloseBtnWeb,
                        ]}
                        onPress={() => setFullscreenImage(null)}
                    >
                        <Ionicons name="close-circle" size={36} color="#fff" />
                    </TouchableOpacity>
                </GestureHandlerRootView>
            </Modal>
        </View>
    );
}

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
    fullscreenOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenOverlayWeb: {
        zIndex: 1000,
        pointerEvents: 'auto',
    },
    fullscreenCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
    },
    fullscreenCloseBtnWeb: {
        zIndex: 1001,
        pointerEvents: 'auto',
    },
});
