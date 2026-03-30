import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
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
import { useArchivosPersonales, useCarpetas, useDeleteArchivo, useGetArchivoUrlFirmada, useMoverArchivo, useSearchArchivos } from '../viewmodels/useArchivos';

const colors = Colors['light'];

type MisDocumentosProps = {
  query?: string;
  selectedFolderId?: number | null;
  listHeader?: React.ReactElement | null;
};

export default function MisDocumentos({ query = '', selectedFolderId, listHeader = null }: MisDocumentosProps) {
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

  const { data: files, isLoading, isPending, error, refetch } = useArchivosPersonales();
  const { data: searchResults, isLoading: loadingSearch, isPending: pendingSearch } = useSearchArchivos(query);

  const isSearching = query.trim().length > 0;
  const isSearchingWithResults = isSearching && (searchResults?.length || 0) > 0;
  const displayData = isSearchingWithResults ? searchResults : files;
  const filteredData = isSearchingWithResults || selectedFolderId === undefined
    ? displayData
    : (displayData || []).filter((file) => (file.id_carpeta ?? null) === selectedFolderId);
  const isLoadingAny = isSearchingWithResults ? loadingSearch || pendingSearch : isLoading || isPending;

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

  const confirmDelete = (file: Archivo) => {
      Alert.alert(
          "Eliminar Archivo",
          `¿Estás seguro de eliminar ${file.nombre}?`,
          [
              { text: "Cancelar", style: "cancel" },
              { 
                  text: "Eliminar", 
                  style: "destructive",
                  onPress: () => deleteMutation.mutate(file.id)
               }
          ]
      );
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
      ) : error && !isSearching ? (
        <View style={styles.center}>
          <ThemedText style={{ color: colors.secondaryText, fontSize: 13 }}>
            {error instanceof Error ? error.message : 'Intenta nuevamente'}
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
                    <ThemedText>No hay documentos</ThemedText>
                </View>
            }
            onRefresh={refetch}
            refreshing={isLoading}
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
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5%'
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
