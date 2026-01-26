import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { useAuth as useAuthContext } from '@/features/auth/context/AuthContext';
import { useAuth } from '@/features/auth/hooks/useAuthActions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CrearDocumento } from '../components/CrearDocumento';
import { EditArchivoModal } from '../components/EditArchivoModal';
import { Archivo } from '../models/Archivo';
import * as archivosApi from '../services/archivosApi';
import { useArchivos, useArchivosPersonales, useArchivosUsuario, useDeleteArchivo, useSearchArchivos } from '../viewmodels/useArchivos';

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getTipoIcon = (tipo: string): string => {
  switch (tipo?.toLowerCase()) {
    case 'pdf':
      return 'document';
    case 'word':
    case 'doc':
    case 'docx':
      return 'document-text';
    case 'excel':
    case 'xls':
    case 'xlsx':
      return 'document';
    case 'imagen':
    case 'image':
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'image';
    case 'txt':
    case 'texto':
      return 'document-text';
    default:
      return 'document-outline';
  }
};

const getTipoIconColor = (tipo: string, colors: typeof Colors.light): string => {
  switch (tipo?.toLowerCase()) {
    case 'pdf':
      return '#dc2626'; // red-600
    case 'word':
    case 'doc':
    case 'docx':
      return '#2563eb'; // blue-600
    case 'excel':
    case 'xls':
    case 'xlsx':
      return '#16a34a'; // green-600
    case 'imagen':
    case 'image':
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '#eab308'; // yellow-500
    case 'txt':
    case 'texto':
      return '#6b7280'; // gray-500
    default:
      return colors.tint;
  }
};

type TabType = 'empresa' | 'mios';

export default function Documentos() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { getValidAccessToken } = useAuth();
  const { user } = useAuthContext();

  const [tab, setTab] = useState<TabType>('empresa');
  const [query, setQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<{ id: number; name: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pickedFile, setPickedFile] = useState<any>(null);
  const [fileToEdit, setFileToEdit] = useState<Archivo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<Archivo | null>(null);

  const deleteMutation = useDeleteArchivo();

  // Queries
  const { data: allFiles, isLoading: loadingAll, refetch: refetchAll } = useArchivos();
  const { data: personalFiles, isLoading: loadingPersonal, refetch: refetchPersonal } = useArchivosPersonales();
  const { data: searchResults, isLoading: loadingSearch } = useSearchArchivos(query);
  const { data: creatorFiles, isLoading: loadingCreator } = useArchivosUsuario(selectedCreator?.id ?? 0);

  const isSearching = query.trim().length > 0;

  const creators = useMemo(() => {
    if (!isSearching || !searchResults) return [];
    const unique = new Map();
    searchResults.forEach(file => {
      if (!unique.has(file.creadorId)) {
        unique.set(file.creadorId, { 
          id: file.creadorId, 
          name: `${file.nombreCreador} ${file.apellidoCreador}` 
        });
      }
    });
    return Array.from(unique.values());
  }, [searchResults, isSearching]);

  const activeData = useMemo(() => {
    let data: Archivo[] = [];

    if (selectedCreator) {
      // Si hay creador seleccionado, mostrar archivos de ese creador
      data = creatorFiles || [];
    } else if (isSearching) {
      // Si está buscando, mostrar SOLO resultados de búsqueda por nombre
      data = searchResults?.filter(file => 
        file.nombre.toLowerCase().includes(query.toLowerCase())
      ) || [];
    } else {
      // Si no está buscando, mostrar todos o personales según tab
      data = tab === 'empresa' ? (allFiles || []) : (personalFiles || []);
    }

    // Filtrar por usuario si estamos en "Mis documentos"
    if (tab === 'mios' && !isSearching && !selectedCreator && user) {
      return data.filter(file => file.creadorId === user.user_context_id);
    }

    return data;
  }, [tab, selectedCreator, creatorFiles, isSearching, searchResults, allFiles, personalFiles, user, query]);

  const isLoading = 
    selectedCreator ? loadingCreator : 
    (isSearching ? loadingSearch : 
      (tab === 'empresa' ? loadingAll : loadingPersonal));

  const handleClearSearch = () => {
    setQuery('');
    setSelectedCreator(null);
  };

  const handleCreatePress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedFile(result.assets[0]);
        setModalVisible(true);
      }
    } catch (err) {
      console.error("Error seleccionando documento", err);
    }
  };

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
    setSelectedFile(file);
    setOptionsModalVisible(true);
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

  const renderSeparator = () => (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colorScheme === 'light' ? '#333333' : '#CCCCCC',
        marginHorizontal: 16,
      }}
    />
  );

  const renderItem = (item: Archivo, index: number) => (
    <React.Fragment key={item.id.toString()}>
      <DocumentoItem
        documento={item}
        tab={tab}
        onPress={() => handleOpenFile(item)}
        onOptions={() => showOptions(item)}
        colorScheme={colorScheme}
        colors={colors}
      />
      {index < activeData.length - 1 && renderSeparator()}
    </React.Fragment>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header con tabs */}
      <View style={[styles.header, { backgroundColor: '#fafafa' }]}>
        <View style={styles.headerContent}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                tab === 'empresa' && [
                  styles.tabActive,
                  { borderBottomColor: colors.tint },
                ],
              ]}
              onPress={() => {
                setTab('empresa');
                handleClearSearch();
              }}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  tab === 'empresa' && {
                    color: colors.tint,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Empresa
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                tab === 'mios' && [
                  styles.tabActive,
                  { borderBottomColor: colors.tint },
                ],
              ]}
              onPress={() => {
                setTab('mios');
                handleClearSearch();
              }}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  tab === 'mios' && {
                    color: colors.tint,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Mis Documentos
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (text.trim().length === 0) setSelectedCreator(null);
          }}
          placeholder="Buscar archivos..."
          onClear={handleClearSearch}
        />
      </View>

      {/* Creator Filter Chips */}
      {creators.length > 0 && (
        <View style={styles.creatorsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorsList}>
            {creators.map(creator => (
              <TouchableOpacity
                key={creator.id}
                style={[styles.creatorChip, selectedCreator?.id === creator.id && styles.creatorChipActive]}
                onPress={() => setSelectedCreator(selectedCreator?.id === creator.id ? null : creator)}
              >
                <ThemedText style={[styles.creatorChipText, selectedCreator?.id === creator.id && styles.creatorChipTextActive]} numberOfLines={1}>
                  {creator.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : activeData.length === 0 ? (
        <View style={styles.centerContainer}>
          <ThemedText type="subtitle">No se encontraron documentos</ThemedText>
          <ThemedText style={{ color: colors.icon, marginTop: 8 }}>
            {isSearching ? 'Prueba con otra búsqueda' : 'Aquí aparecerán los documentos'}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {activeData.map((item, index) => renderItem(item, index))}
        </View>
      )}

      <CreateButton onPress={handleCreatePress} style={styles.fab} />

      {fileToEdit && (
        <EditArchivoModal
          visible={!!fileToEdit}
          onClose={() => setFileToEdit(null)}
          archivo={fileToEdit}
        />
      )}

      {modalVisible && (
        <CrearDocumento
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setPickedFile(null);
            refetchAll();
            refetchPersonal();
          }}
          initialFile={pickedFile}
        />
      )}

      {/* Options Modal */}
      {selectedFile && (
        <Modal
          visible={optionsModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setOptionsModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setOptionsModalVisible(false)}
          >
            <View
              style={[
                styles.optionsModalContent,
                { backgroundColor: colors.background }
              ]}
            >
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  handleOpenFile(selectedFile);
                  setOptionsModalVisible(false);
                }}
              >
                <Ionicons name="open" size={20} color={colors.text} />
                <ThemedText style={styles.optionText}>Abrir</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  handleDownloadFile(selectedFile);
                  setOptionsModalVisible(false);
                }}
              >
                <Ionicons name="download" size={20} color={colors.text} />
                <ThemedText style={styles.optionText}>Descargar</ThemedText>
              </TouchableOpacity>

              {(tab === 'mios' || (user && selectedFile.creadorId === user.user_context_id)) && (
                <>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setFileToEdit(selectedFile);
                      setOptionsModalVisible(false);
                    }}
                  >
                    <Ionicons name="pencil" size={20} color={colors.text} />
                    <ThemedText style={styles.optionText}>Editar</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.optionButton, styles.optionButtonDanger]}
                    onPress={() => {
                      setOptionsModalVisible(false);
                      confirmDelete(selectedFile);
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#dc2626" />
                    <ThemedText style={[styles.optionText, { color: '#dc2626' }]}>Eliminar</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </ThemedView>
  );
}

interface DocumentoItemProps {
  documento: Archivo;
  tab: TabType;
  onPress: () => void;
  onOptions: () => void;
  colorScheme: string | null | undefined;
  colors: typeof Colors.light;
}

function DocumentoItem({ documento, tab, onPress, onOptions, colorScheme, colors }: DocumentoItemProps) {
  const iconName = getTipoIcon(documento.tipo || '');
  const iconColor = getTipoIconColor(documento.tipo || '', colors);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.itemContainer,
        { backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' },
      ]}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Ionicons name={iconName as any} size={24} color={iconColor} style={styles.documentIcon} />
          <View style={styles.titleContainer}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
              {documento.nombre}
            </ThemedText>
          </View>
        </View>
        
        <ThemedText style={[styles.metadata, { color: colors.icon }]} numberOfLines={1}>
          {formatBytes(documento.tamaño)} • {new Date(documento.createdAt).toLocaleDateString()}
          {tab === 'empresa' && ` • ${documento.nombreCreador} ${documento.apellidoCreador}`}
        </ThemedText>

        <View style={styles.footerContainer}>
          <ThemedText style={[styles.dateText, { color: colors.icon }]}>
            {new Date(documento.createdAt).toLocaleDateString()}
          </ThemedText>
          <TouchableOpacity onPress={onOptions} style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {},
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  listContainer: {
    flex: 1,
  },
  itemContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  itemContent: {
    flexDirection: 'column',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  documentIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  metadata: {
    fontSize: 12,
    marginBottom: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 11,
  },
  moreButton: {
    padding: 8,
    marginRight: -8,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
  },
  creatorsContainer: {
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  creatorsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  creatorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  creatorChipActive: {
    backgroundColor: '#00054bff',
  },
  creatorChipText: {
    fontSize: 12,
  },
  creatorChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  optionButtonDanger: {
    marginTop: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
});
