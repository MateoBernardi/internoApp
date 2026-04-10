import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { confirmAction } from '@/shared/ui/confirmAction';
import { showGlobalToast } from '@/shared/ui/toast';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { ArchivoViewersModal } from '../components/ArchivoViewersModal';
import { DocumentoItem } from '../components/DocumentoItem';
import { DocumentOptionAction, DocumentOptionsModal } from '../components/DocumentOptionsModal';
import { EditArchivoModal } from '../components/EditArchivoModal';
import { FolderPickerModal } from '../components/FolderPickerModal';
import { Archivo } from '../models/Archivo';
import { formatPartialWarnings } from '../utils/partialWarnings';
import { useArchivos, useArchivoViewers, useCarpetas, useDeleteArchivo, useGetArchivoUrlFirmada, useMoverArchivo, useSearchArchivos } from '../viewmodels/useArchivos';

const colors = Colors['light'];

type DocumentosEmpresaProps = {
  query?: string;
  selectedFolderId?: number | null;
  listHeader?: React.ReactElement | null;
};

export default function DocumentosEmpresa({ query = '', selectedFolderId, listHeader = null }: DocumentosEmpresaProps) {
  const { user } = useAuth();
  const { data: carpetasData } = useCarpetas('list', true);
  const [fileToEdit, setFileToEdit] = useState<Archivo | null>(null);
  const [fileToOpen, setFileToOpen] = useState<Archivo | null>(null);
  const [fileToMove, setFileToMove] = useState<Archivo | null>(null);
  const [fileForOptions, setFileForOptions] = useState<Archivo | null>(null);
  const [fileForViewers, setFileForViewers] = useState<Archivo | null>(null);
  const deleteMutation = useDeleteArchivo();
  const moverArchivoMutation = useMoverArchivo();
  const [isDownloading, setIsDownloading] = useState(false);
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();
  const {
    data: archivoViewers = [],
    isLoading: loadingViewers,
    error: viewersError,
  } = useArchivoViewers(fileForViewers?.id);

  const { data: allFiles, isLoading: loadingAll, isPending: pendingAll, error: errorAll, refetch: refetchAll } = useArchivos();
  const { data: searchResults, isLoading: loadingSearch, isPending: pendingSearch } = useSearchArchivos(query);

  const isSearching = query.trim().length > 0;
  const isSearchingWithResults = isSearching && (searchResults?.length || 0) > 0;
  const displayData = isSearchingWithResults ? searchResults : allFiles;
  const filteredData = isSearchingWithResults || selectedFolderId === undefined
    ? displayData
    : (displayData || []).filter((file) => (file.id_carpeta ?? null) === selectedFolderId);
  const isLoadingAny = isSearchingWithResults ? loadingSearch || pendingSearch : loadingAll || pendingAll;

  useEffect(() => {
    if (!fileToOpen) return;

    const openFile = async () => {
      try {
        const url = await getArchivoUrlFirmada(fileToOpen.id);
        if (url) {
          await Linking.openURL(url);
        }
      } catch (e) {
        console.error("Error opening file", e);
        Alert.alert("Error", "No se pudo abrir el archivo");
      } finally {
        setFileToOpen(null);
      }
    };

    openFile();
  }, [fileToOpen, getArchivoUrlFirmada]);

  const handleDownloadFile = async (file: Archivo) => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const url = await getArchivoUrlFirmada(file.id);

      if (Platform.OS === 'web') {
        // --- LÓGICA PARA WEB ---
        // 1. Descargamos el archivo como Blob para forzar la descarga en el navegador
        const response = await fetch(url);
        const blob = await response.blob();

        // 2. Creamos una URL temporal para el Blob
        const blobUrl = window.URL.createObjectURL(blob);

        // 3. Creamos un elemento <a> invisible y simulamos un clic
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.nombre; // Forzamos el nombre del archivo
        document.body.appendChild(link);
        link.click();

        // 4. Limpiamos el DOM y la memoria
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // --- LÓGICA PARA NATIVE (iOS / Android) ---
        // Tu código original se mantiene intacto aquí
        const destinationDir = new FileSystem.Directory(FileSystem.Paths.cache, 'Italo-Argentina');
        const destinationFile = new FileSystem.File(destinationDir, file.nombre);

        await destinationDir.create({ idempotent: true, intermediates: true });
        const output = await FileSystem.File.downloadFileAsync(url, destinationFile, { idempotent: true });

        if (output) {
          Alert.alert("Descarga completa", `Archivo guardado en: ${output.uri}`);
        } else {
          throw new Error("Download failed");
        }
      }
    } catch (e) {
      console.error(e);
      if (Platform.OS === 'web') {
        window.alert("Error: No se pudo descargar el archivo");
      } else {
        Alert.alert("Error", "No se pudo descargar el archivo");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const buildOptions = (file: Archivo): DocumentOptionAction[] => {
    const isOwner = user?.user_context_id === file.creadorId;
    const options: DocumentOptionAction[] = [
      {
        key: 'download',
        label: 'Descargar',
        icon: 'download-outline',
        onPress: () => handleDownloadFile(file),
      },
    ];

    options.push({
      key: 'move',
      label: 'Mover',
      icon: 'folder-open-outline',
      onPress: () => setFileToMove(file),
    });

    if (isOwner) {
      options.push(
        {
          key: 'edit-and-permissions',
          label: 'Editar y Administrar permisos',
          icon: 'create-outline',
          onPress: () => setFileToEdit(file),
        },
        {
          key: 'show-viewers',
          label: 'Mostrar quienes abrieron el archivo',
          icon: 'eye-outline',
          onPress: () => setFileForViewers(file),
        },
        {
          key: 'delete',
          label: 'Eliminar',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => confirmDelete(file),
        }
      );
    }

    return options;
  };

  const confirmDelete = async (file: Archivo) => {
    const confirmed = await confirmAction({
      title: 'Eliminar Archivo',
      message: `¿Estás seguro de eliminar ${file.nombre}?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;
    deleteMutation.mutate(file.id);
  };

  const renderItem = ({ item }: { item: Archivo }) => (
    <DocumentoItem
      archivo={item}
      currentUserId={user?.user_context_id}
      onPress={() => setFileToOpen(item)}
      onOptions={() => setFileForOptions(item)}
      onDelete={user?.user_context_id === item.creadorId ? () => confirmDelete(item) : undefined}
    />
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: colors.secondaryText }]} />
  );

  return (
    <ThemedView style={styles.container}>
      {isLoadingAny ? (
        <ScreenSkeleton rows={5} />
      ) : errorAll && !isSearching ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.secondaryText, fontSize: 13 }}>
            {errorAll instanceof Error ? errorAll.message : 'Intenta nuevamente'}
          </ThemedText>
        </View>
      ) : (
        <OwnFlatList<Archivo>
          data={filteredData || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText>No se encontraron documentos</ThemedText>
            </View>
          }
          onRefresh={refetchAll}
          refreshing={loadingAll}
        />
      )}

      {fileToEdit && (
        <EditArchivoModal
          visible={!!fileToEdit}
          onClose={() => setFileToEdit(null)}
          archivo={fileToEdit}
        />
      )}

      <DocumentOptionsModal
        visible={!!fileForOptions}
        fileName={fileForOptions?.nombre || ''}
        actions={fileForOptions ? buildOptions(fileForOptions) : []}
        onClose={() => setFileForOptions(null)}
      />

      <FolderPickerModal
        visible={!!fileToMove}
        title="Mover archivo a carpeta"
        folders={carpetasData?.items || []}
        selectedId={fileToMove?.id_carpeta ?? null}
        onClose={() => setFileToMove(null)}
        onSelect={(id) => {
          if (!fileToMove) return;
          moverArchivoMutation.mutate(
            { idArchivo: fileToMove.id, id_carpeta: id },
            {
              onSuccess: (result) => {
                if (result.status === 'partial_success') {
                  showGlobalToast('Guardado parcial');
                  Alert.alert('Guardado parcial', formatPartialWarnings(result.warnings));
                  return;
                }
                Alert.alert('Archivo movido', 'Se actualizo la carpeta del archivo');
              },
              onError: (error: unknown) => {
                const message = error instanceof Error ? error.message : 'Intenta nuevamente';
                Alert.alert('Error al mover archivo', message);
              },
            }
          );
        }}
      />

      <ArchivoViewersModal
        visible={!!fileForViewers}
        fileName={fileForViewers?.nombre || ''}
        viewers={archivoViewers}
        isLoading={loadingViewers}
        errorMessage={viewersError instanceof Error ? viewersError.message : null}
        onClose={() => setFileForViewers(null)}
      />

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.componentBackground,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5%',
    flex: 1
  },
  listContent: {
    paddingBottom: 80,
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: '4%',
  },
});
