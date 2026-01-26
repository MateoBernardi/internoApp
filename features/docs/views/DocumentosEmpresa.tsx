import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuthActions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { EditArchivoModal } from '../components/EditArchivoModal';
import { Archivo } from '../models/Archivo';
import * as archivosApi from '../services/archivosApi';
import { useArchivos, useDeleteArchivo } from '../viewmodels/useArchivos';

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function DocumentosEmpresa() {
  const colorScheme = useColorScheme();
  const iconColor = Colors[colorScheme ?? 'light'].text;
  const { getValidAccessToken } = useAuth();
  
  const [fileToEdit, setFileToEdit] = useState<Archivo | null>(null);
  const deleteMutation = useDeleteArchivo();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: allFiles, isLoading: loadingAll, refetch: refetchAll } = useArchivos();

  const handleOpenFile = async (file: Archivo) => {
      try {
          const token = await getValidAccessToken();
          if (!token) return;
          const url = await archivosApi.getArchivoUrlFirmada(token, file.id);
          if (url) {
              await Linking.openURL(url);
          }
      } catch (e) {
          console.error("Error opening file", e);
          Alert.alert("Error", "No se pudo abrir el archivo");
      }
  };

  const handleDownloadFile = async (file: Archivo) => {
      if (isDownloading) return;
      setIsDownloading(true);
      try {
          const token = await getValidAccessToken();
          if (!token) throw new Error("No hay token");
          
          const url = await archivosApi.getArchivoUrlFirmada(token, file.id);
          
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
              {
                  text: "Editar",
                  onPress: () => setFileToEdit(file)
              },
              {
                  text: "Eliminar",
                  style: "destructive",
                  onPress: () => confirmDelete(file)
              }
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
    <TouchableOpacity style={styles.itemContainer} onPress={() => handleOpenFile(item)}>
      <Ionicons name="document-text-outline" size={32} color={iconColor} style={styles.itemIcon} />
      <View style={styles.itemContent}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>{item.nombre}</ThemedText>
        <ThemedText style={styles.itemSubtext} numberOfLines={1}>
          {formatBytes(item.tamaño)} • {new Date(item.createdAt).toLocaleDateString()} • {item.nombreCreador} {item.apellidoCreador}
        </ThemedText>
      </View>
      <TouchableOpacity onPress={() => showOptions(item)} style={styles.moreButton}>
         <Ionicons name="ellipsis-vertical" size={20} color={iconColor} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {loadingAll ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        </View>
      ) : (
        <OwnFlatList<Archivo>
            data={allFiles || []}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
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
    backgroundColor: '#fafafa',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  itemIcon: {
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  moreButton: {
      padding: 8
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
});
