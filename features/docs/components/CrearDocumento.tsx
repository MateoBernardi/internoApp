import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { showGlobalToast } from '@/shared/ui/toast';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArchivoAProcesar, MobileFile } from '../models/Archivo';
import { formatPartialWarnings } from '../utils/partialWarnings';
import { useUploadArchivo } from '../viewmodels/useArchivos';
import { PartialSaveBanner } from './PartialSaveBanner';

const colors = Colors['light'];

interface CrearDocumentoProps {
  visible: boolean;
  onClose: () => void;
  initialFiles?: MobileFile[];
  initialFolderId?: number | null;
}

export function CrearDocumento({ visible, onClose, initialFiles, initialFolderId }: CrearDocumentoProps) {
  const insets = useSafeAreaInsets();
  const [partialWarning, setPartialWarning] = useState<string | null>(null);
  const [didPartialSuccess, setDidPartialSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const { mutateAsync: uploadArchivoMutate } = useUploadArchivo();

  const isFormValid = useMemo(
    () => (initialFiles?.length || 0) > 0,
    [initialFiles]
  );

  const BUTTON_HEIGHT = 48;
  const BUTTON_MARGIN = 16;
  const bottomBarHeight = BUTTON_HEIGHT + BUTTON_MARGIN * 2 + insets.bottom;

  const resetForm = useCallback(() => {
    setPartialWarning(null);
    setDidPartialSuccess(false);
    setIsUploading(false);
    setUploadedCount(0);
  }, []);

  const handleCrearDocumento = useCallback(async () => {
    if (didPartialSuccess) {
      onClose();
      resetForm();
      return;
    }

    if (!isFormValid || !initialFiles || initialFiles.length === 0) {
      Alert.alert('Error', 'Por favor proporciona al menos un archivo');
      return;
    }

    setIsUploading(true);
    setUploadedCount(0);

    try {
      // 1. Armamos el DTO de todos los archivos de forma síncrona
      const archivosAProcesar: ArchivoAProcesar[] = initialFiles.map((file) => ({
        archivoData: {
          nombre: file.name,
          ...(initialFolderId !== undefined ? { id_carpeta: initialFolderId } : {}),
        },
        archivo: {
          uri: file.uri,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
        }
      }));

      // 2. Enviamos TODO el lote de archivos en UNA SOLA petición
      const result = await uploadArchivoMutate({ item: archivosAProcesar });

      // 3. Actualizamos el contador con los que realmente fueron exitosos
      const exitososCount = result.exitosos?.length || 0;
      setUploadedCount(exitososCount);

      // 4. Verificamos si hubo fallos (Error total o éxito parcial)
      if (result.fallidos && result.fallidos.length > 0) {

        // Si NINGUNO se subió, es un error total
        if (exitososCount === 0) {
          // Puedes extraer el mensaje del primer fallo si tu backend lo envía
          Alert.alert('Error', 'No se pudo subir ningún archivo');
          return;
        }

        // Si ALGUNOS se subieron, manejamos el éxito parcial
        const warningsMensaje = formatPartialWarnings(result.fallidos);
        setDidPartialSuccess(true);
        setPartialWarning(warningsMensaje);
        showGlobalToast('Guardado parcial');
        return;
      }

      // 5. Si llegamos aquí, fue un éxito rotundo (0 fallos)
      Alert.alert('Éxito', initialFiles.length > 1 ? 'Archivos subidos correctamente' : 'Archivo subido correctamente');
      onClose();
      resetForm();

    } catch (error) {
      // Este catch atrapará errores de red graves o excepciones del Mutation
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la subida';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [didPartialSuccess, initialFiles, initialFolderId, isFormValid, onClose, resetForm, uploadArchivoMutate]);

  const handleCancel = useCallback(() => {
    if (isUploading) {
      return;
    }
    const hasUnsavedChanges = !!(
      initialFiles && initialFiles.length > 0
    );

    if (hasUnsavedChanges) {
      if (Platform.OS === 'web') {
        const shouldDiscard = typeof globalThis.confirm === 'function'
          ? globalThis.confirm('¿Deseas descartar los cambios?')
          : true;

        if (shouldDiscard) {
          onClose();
          resetForm();
        }
        return;
      }

      Alert.alert('Descartar cambios', '¿Deseas descartar los cambios?', [
        { text: 'Cancelar', onPress: () => { } },
        { text: 'Descartar', onPress: () => { onClose(); resetForm(); } },
      ]);
    } else {
      onClose();
    }
  }, [initialFiles, isUploading, onClose, resetForm]);

  const totalFiles = initialFiles?.length || 0;
  const isMultiFile = totalFiles > 1;
  const fileTitle = isMultiFile
    ? `${totalFiles} archivos seleccionados`
    : initialFiles?.[0]?.name;
  const fileType = isMultiFile ? 'Varios tipos' : initialFiles?.[0]?.type;
  const uploadLabel = didPartialSuccess
    ? 'Cerrar'
    : isMultiFile
      ? 'Subir archivos'
      : 'Subir archivo';
  const progressLabel = `Subidos ${uploadedCount} de ${totalFiles}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header fijo con safe-area top */}
          <View style={[styles.header, { paddingTop: insets.top || 12 }]}>
            <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomBarHeight + 8 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {partialWarning ? (
              <PartialSaveBanner message={partialWarning} onClose={() => setPartialWarning(null)} />
            ) : null}

            {/* File Info */}
            {initialFiles && initialFiles[0] && (
              <View style={styles.fileInfoSection}>
                <View style={styles.fileInfoText}>
                  <Text style={styles.label}>Archivos seleccionados</Text>
                </View>
                <View style={styles.fileInfoText}>
                  <Ionicons name="document-text" size={32} color={colors.tint} />
                  <ThemedText type="defaultSemiBold" numberOfLines={2}>{fileTitle}</ThemedText>
                  <ThemedText style={{ color: colors.secondaryText, fontSize: 12 }}>{fileType}</ThemedText>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Botón fijo fuera del KAV — nunca se mueve con el teclado */}
          <View style={[styles.uploadButtonContainer, { paddingBottom: (insets.bottom || 0) + BUTTON_MARGIN }]}>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: !isFormValid || isUploading ? colors.icon : colors.lightTint }]}
              onPress={handleCrearDocumento}
              disabled={!isFormValid || isUploading}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color={colors.componentBackground} />
                  <ThemedText style={styles.uploadButtonText}>{progressLabel}</ThemedText>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color={colors.componentBackground} />
                  <ThemedText style={styles.uploadButtonText}>{uploadLabel}</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const BUTTON_MARGIN = 16;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)' // Sombra de fondo
  },
  container: {
    flex: 1,
    marginTop: '5%', // Empuja el modal hacia abajo
    backgroundColor: Colors['light'].componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: Colors['light'].icon,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: '4%',
    paddingTop: 12,
  },
  fileInfoSection: {
    marginTop: 12,
    gap: 10,
  },
  fileInfoText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  uploadButtonContainer: {
    backgroundColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.icon,
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
    color: colors.componentBackground,
    fontWeight: '600',
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
});