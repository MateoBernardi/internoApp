import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { confirmAction } from '@/shared/ui/confirmAction';
import { showGlobalToast } from '@/shared/ui/toast';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { DocumentoItem } from '../components/DocumentoItem';
import { DocumentOptionAction, DocumentOptionsModal } from '../components/DocumentOptionsModal';
import { EditArchivoModal } from '../components/EditArchivoModal';
import { FolderPickerModal } from '../components/FolderPickerModal';
import { Archivo } from '../models/Archivo';
import { formatPartialWarnings } from '../utils/partialWarnings';
import { useArchivos, useCarpetas, useDeleteArchivo, useGetArchivoUrlFirmada, useMoverArchivo, useSearchArchivos } from '../viewmodels/useArchivos';

const colors = Colors['light'];

export default function DocumentosEmpresa({ query = '', selectedFolderId }: { query?: string; selectedFolderId?: number | null }) {
  const { user } = useAuth();
  const { data: carpetasData } = useCarpetas('list', true);
  const [fileToEdit, setFileToEdit] = useState<Archivo | null>(null);
  const [fileToOpen, setFileToOpen] = useState<Archivo | null>(null);
  const [fileToMove, setFileToMove] = useState<Archivo | null>(null);
  const [fileForOptions, setFileForOptions] = useState<Archivo | null>(null);
  const deleteMutation = useDeleteArchivo();
  const moverArchivoMutation = useMoverArchivo();
  const [isDownloading, setIsDownloading] = useState(false);
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();

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
          
          const filename = file.nombre;
          const fileUri = FileSystem.documentDirectory + filename;
          
          const downloadRes = await FileSystem.downloadAsync(url, fileUri);
          
          if (downloadRes.status === 200) {
              if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(downloadRes.uri);
              } else {
                  Alert.alert("Descarga completa", `Archivo guardado en: ${downloadRes.uri}`);
              }
          } else {
              throw new Error("Download failed");
          }
      } catch (e) {
          console.error(e);
          Alert.alert("Error", "No se pudo descargar el archivo");
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

    if (isOwner) {
      options.push(
        {
          key: 'edit-and-permissions',
          label: 'Editar y Administrar permisos',
          icon: 'create-outline',
          onPress: () => setFileToEdit(file),
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

    options.push({
      key: 'move',
      label: 'Mover',
      icon: 'folder-open-outline',
      onPress: () => setFileToMove(file),
    });

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
