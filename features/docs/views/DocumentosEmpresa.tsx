import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { DocumentoItem } from '../components/DocumentoItem';
import { EditArchivoModal } from '../components/EditArchivoModal';
import { Archivo } from '../models/Archivo';
import { useArchivos, useDeleteArchivo, useGetArchivoUrlFirmada, useSearchArchivos } from '../viewmodels/useArchivos';

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const colors = Colors['light'];

export default function DocumentosEmpresa({ query = '' }: { query?: string }) {
  const [fileToEdit, setFileToEdit] = useState<Archivo | null>(null);
  const [fileToOpen, setFileToOpen] = useState<Archivo | null>(null);
  const deleteMutation = useDeleteArchivo();
  const [isDownloading, setIsDownloading] = useState(false);
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();

  const { data: allFiles, isLoading: loadingAll, refetch: refetchAll } = useArchivos();
  const { data: searchResults, isLoading: loadingSearch } = useSearchArchivos(query);

  const isSearching = query.trim().length > 0;
  const displayData = isSearching ? searchResults : allFiles;

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

  const showOptions = (file: Archivo) => {
      Alert.alert(
          "Opciones de archivo",
          file.nombre,
          [
              {
                  text: "Cancelar",
                  style: "cancel"
              },
              {
                  text: "Descargar",
                  onPress: () => handleDownloadFile(file)
              },
          ]
      );
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
      onOptions={() => showOptions(item)}
    />
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: colors.secondaryText }]} />
  );

  return (
    <ThemedView style={styles.container}>
      {isSearching ? loadingSearch : loadingAll ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <OwnFlatList<Archivo>
            data={displayData || []}
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
    padding: 20,
    flex: 1
  },
  listContent: {
    paddingBottom: 80,
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
