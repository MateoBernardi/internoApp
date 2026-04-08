import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { confirmAction } from '@/shared/ui/confirmAction';
import { showGlobalToast } from '@/shared/ui/toast';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrearDocumento } from '../components/CrearDocumento';
import { DocumentOptionAction, DocumentOptionsModal } from '../components/DocumentOptionsModal';
import { EditCarpetaModal } from '../components/EditCarpetaModal';
import { Carpeta, UpdateCarpetaPayload } from '../models/Carpeta';
import { formatPartialWarnings } from '../utils/partialWarnings';
import { useCarpetas, useCreateCarpeta, useDeleteCarpeta, useSearchArchivos, useUpdateCarpeta } from '../viewmodels/useArchivos';
import DocumentosEmpresa from './DocumentosEmpresa';
import MisDocumentos from './MisDocumentos';

const colors = Colors['light'];

type TabType = 'empresa' | 'mios';

export default function Documentos() {
  const insets = useSafeAreaInsets();
  const canCreate = true;
  const canSeeMisDocumentos = true;
  const { data: carpetasData } = useCarpetas('list', true);
  const createCarpeta = useCreateCarpeta();
  const updateCarpeta = useUpdateCarpeta();
  const deleteCarpeta = useDeleteCarpeta();
  const [tab, setTab] = useState<TabType>('empresa');
  const [modalVisible, setModalVisible] = useState(false);
  const [pickedFile, setPickedFile] = useState<any>(null);
  const [query, setQuery] = useState('');
  const { data: searchResults } = useSearchArchivos(query);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderForOptions, setFolderForOptions] = useState<Carpeta | null>(null);
  const [folderToEdit, setFolderToEdit] = useState<Carpeta | null>(null);
  const [folderEditPartialWarning, setFolderEditPartialWarning] = useState<string | null>(null);
  const [folderDeleteConflictMessage, setFolderDeleteConflictMessage] = useState<string | null>(null);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  useEffect(() => {
    if (!canSeeMisDocumentos && tab === 'mios') {
      setTab('empresa');
    }
  }, [canSeeMisDocumentos, tab]);

  const folders = useMemo(
    () => (carpetasData?.items || []).filter((folder: Carpeta) => folder.id !== null && folder.type !== 'virtual'),
    [carpetasData]
  );

  const foldersById = useMemo(() => {
    const map = new Map<number, Carpeta>();
    for (const folder of folders) {
      if (folder.id !== null) {
        map.set(folder.id, folder);
      }
    }
    return map;
  }, [folders]);

  const childFolders = useMemo(
    () => folders.filter((folder) => (folder.id_carpeta_padre ?? null) === currentFolderId),
    [folders, currentFolderId]
  );

  const breadcrumbs = useMemo(() => {
    const path: Carpeta[] = [];
    let pointerId = currentFolderId;

    while (pointerId !== null) {
      const node = foldersById.get(pointerId);
      if (!node) break;
      path.unshift(node);
      pointerId = node.id_carpeta_padre ?? null;
    }

    return path;
  }, [currentFolderId, foldersById]);

  const isSearchingWithResults = query.trim().length > 0 && (searchResults?.length || 0) > 0;

  const folderHeader = !isSearchingWithResults ? (
    <View style={styles.folderSection}>
      <View style={styles.breadcrumbRow}>
        <TouchableOpacity style={styles.homeButton} onPress={() => setCurrentFolderId(null)}>
          <Ionicons name="home-outline" size={14} color={colors.tint} />
        </TouchableOpacity>
        {breadcrumbs.map((item) => (
          <View key={item.id} style={styles.breadcrumbItem}>
            <Ionicons name="chevron-forward" size={14} color={colors.secondaryText} />
            <TouchableOpacity onPress={() => item.id !== null && setCurrentFolderId(item.id)}>
              <ThemedText numberOfLines={1} style={styles.breadcrumbText}>{item.nombre}</ThemedText>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.folderList}>
        {childFolders.map((folder) => (
          <View key={folder.id} style={styles.folderRowItem}>
            <TouchableOpacity
              style={styles.folderRowMain}
              onPress={() => folder.id !== null && setCurrentFolderId(folder.id)}
              onLongPress={() => openFolderOptions(folder)}
            >
              <View style={styles.folderRowLeft}>
                <Ionicons name="folder-outline" size={18} color={colors.tint} />
                <ThemedText style={styles.folderRowText}>{folder.nombre}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.folderOptionsButton}
              onPress={() => openFolderOptions(folder)}
              accessibilityLabel={`Opciones de carpeta ${folder.nombre}`}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  ) : null;

  const handleCreateDocument = async () => {
    setFabMenuVisible(false);
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

  const handleClearSearch = () => {
    setQuery('');
  };

  const openCreateFolderModal = () => {
    setFabMenuVisible(false);
    setFolderName('');
    setFolderModalVisible(true);
  };

  const openEditFolderModal = (folder: Carpeta) => {
    if (folder.id === null) return;
    setFolderEditPartialWarning(null);
    setFolderToEdit(folder);
  };

  const openFolderOptions = (folder: Carpeta) => {
    setFolderForOptions(folder);
  };

  const handleDeleteFolder = async (folder: Carpeta) => {
    if (folder.id === null) return;
    const confirmed = await confirmAction({
      title: 'Eliminar carpeta',
      message: `Se eliminara ${folder.nombre} junto con subcarpetas y archivos asociados.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;

    deleteCarpeta.mutate(folder.id as number, {
      onSuccess: () => {
        if (currentFolderId === folder.id) {
          setCurrentFolderId(folder.id_carpeta_padre ?? null);
        }
        Alert.alert('Carpeta eliminada', 'Se elimino la carpeta y su contenido asociado');
      },
      onError: (error: unknown) => {
        const statusCode = (error as any)?.statusCode;
        const message = error instanceof Error ? error.message : 'No se pudo eliminar la carpeta';

        if (statusCode === 409) {
          setFolderDeleteConflictMessage(
            `${message}\n\nPrimero move el contenido de otro creador fuera de esta carpeta y luego intenta borrarla nuevamente.`
          );
          return;
        }

        Alert.alert('Error', message);
      },
    });
  };

  const buildFolderOptions = (folder: Carpeta): DocumentOptionAction[] => {
    const options: DocumentOptionAction[] = [
      {
        key: 'delete-folder',
        label: 'Eliminar',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => handleDeleteFolder(folder),
      },
    ];

    options.unshift({
      key: 'edit-folder-and-permissions',
      label: 'Editar y Administrar permisos',
      icon: 'create-outline',
      onPress: () => openEditFolderModal(folder),
    });

    return options;
  };

  const submitFolderModal = () => {
    const trimmed = folderName.trim();
    if (!trimmed) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para la carpeta');
      return;
    }

    createCarpeta.mutate(
      {
        nombre: trimmed,
        ...(currentFolderId !== null ? { id_carpeta_padre: currentFolderId } : {}),
      },
      {
        onSuccess: () => {
          setFolderModalVisible(false);
          setFolderName('');
          Alert.alert('Carpeta creada', 'La carpeta se creo correctamente');
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No se pudo crear la carpeta';
          Alert.alert('Error', message);
        },
      }
    );
  };

  const handleSubmitEditFolder = (payload: UpdateCarpetaPayload) => {
    if (!folderToEdit?.id) return;

    updateCarpeta.mutate(
      {
        id: folderToEdit.id,
        payload,
      },
      {
        onSuccess: (result) => {
          if (result.status === 'partial_success') {
            setFolderEditPartialWarning(formatPartialWarnings(result.warnings));
            showGlobalToast('Guardado parcial');
            return;
          }

          setFolderEditPartialWarning(null);
          setFolderToEdit(null);
          Alert.alert('Carpeta actualizada', 'Los cambios se guardaron correctamente');
        },
        onError: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'No se pudo actualizar la carpeta';
          Alert.alert('Error', message);
        },
      }
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header con tabs */}
      <View style={[styles.header, { backgroundColor: colors.componentBackground }]}>
        <View style={styles.headerContent}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                tab === 'empresa' && [
                  styles.tabActive,
                  { borderBottomColor: colors.tint },
                ],
              ]}
              onPress={() => setTab('empresa')}
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
            {canSeeMisDocumentos && (
              <TouchableOpacity
                style={[
                  styles.tab,
                  tab === 'mios' && [
                    styles.tabActive,
                    { borderBottomColor: colors.tint },
                  ],
                ]}
                onPress={() => setTab('mios')}
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
            )}
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar archivos..."
          onClear={handleClearSearch}
        />
      </View>

      {/* Content - Direct render without extra wrapper */}
      <View style={styles.contentContainer}>
        {tab === 'mios' && canSeeMisDocumentos
          ? <MisDocumentos query={query} selectedFolderId={currentFolderId} listHeader={folderHeader} />
          : <DocumentosEmpresa query={query} selectedFolderId={currentFolderId} listHeader={folderHeader} />}
      </View>

      {canCreate && (
        <CreateButton
          onPress={() => setFabMenuVisible(true)}
          style={{ ...styles.fab, bottom: insets.bottom + 8, right: 36 }}
        />
      )}

      {modalVisible && (
        <CrearDocumento
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setPickedFile(null);
          }}
          initialFile={pickedFile}
          initialFolderId={currentFolderId}
        />
      )}

      {canCreate && fabMenuVisible && (
        <View style={styles.fabMenuLayer} pointerEvents="box-none">
          <TouchableOpacity style={styles.fabOverlay} activeOpacity={1} onPress={() => setFabMenuVisible(false)} />
          <View style={[styles.fabMenu, { bottom: insets.bottom + 76 }]}>
            <TouchableOpacity style={styles.fabMenuItem} onPress={handleCreateDocument}>
              <Ionicons name="document-text-outline" size={18} color={colors.icon} />
              <ThemedText style={styles.fabMenuText}>Crear documento</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={openCreateFolderModal}>
              <Ionicons name="folder-outline" size={18} color={colors.icon} />
              <ThemedText style={styles.fabMenuText}>Crear carpeta</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'position' : undefined}
            keyboardVerticalOffset={insets.top + 12}
            style={styles.modalKavWrapper}
          >
            <View style={styles.modalCard}>
              <ThemedText style={styles.modalTitle}>Crear carpeta</ThemedText>

              <ThemedText style={styles.modalLabel}>Nombre</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: Legales"
                placeholderTextColor={colors.secondaryText}
                value={folderName}
                onChangeText={setFolderName}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setFolderModalVisible(false)}>
                  <ThemedText style={styles.modalCancelText}>Cancelar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={submitFolderModal}>
                  <ThemedText style={styles.modalConfirmText}>Crear</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <DocumentOptionsModal
        visible={!!folderForOptions}
        fileName={folderForOptions?.nombre || ''}
        title="Opciones de carpeta"
        actions={folderForOptions ? buildFolderOptions(folderForOptions) : []}
        onClose={() => setFolderForOptions(null)}
      />

      {folderToEdit && (
        <EditCarpetaModal
          visible={!!folderToEdit}
          carpeta={folderToEdit}
          isSaving={updateCarpeta.isPending}
          onClose={() => {
            setFolderToEdit(null);
            setFolderEditPartialWarning(null);
          }}
          partialWarningMessage={folderEditPartialWarning}
          onDismissPartialWarning={() => setFolderEditPartialWarning(null)}
          onSubmit={handleSubmitEditFolder}
        />
      )}

      <Modal
        visible={!!folderDeleteConflictMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderDeleteConflictMessage(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>No se puede borrar la carpeta</ThemedText>
            <ThemedText style={styles.modalLabel}>{folderDeleteConflictMessage}</ThemedText>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={() => setFolderDeleteConflictMessage(null)}>
                <ThemedText style={styles.modalConfirmText}>Entendido</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  header: {
    backgroundColor: colors.componentBackground,
  },
  headerContent: {
    paddingHorizontal: '4%',
    paddingVertical: '3%',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: '-4%',
    paddingHorizontal: '4%',
  },
  tab: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.tint,
  },
  tabText: {
    fontSize: 18,
    fontWeight: '500',
    paddingBottom: 10
  },
  searchContainer: {
    paddingHorizontal: '4%',
    paddingTop: '2%',
    paddingBottom: '2%',
    backgroundColor: colors.componentBackground,
  },
  contentContainer: {
    flex: 1,
  },
  folderSection: {
    paddingHorizontal: '4%',
    paddingBottom: '2%',
    gap: 10,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  homeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '75%',
    marginLeft: 4,
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  folderSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  folderList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.icon,
    borderRadius: 10,
    overflow: 'hidden',
  },
  folderRowItem: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.icon,
  },
  folderRowMain: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  folderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  folderOptionsButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderRowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: '6%',
  },
  modalKavWrapper: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: colors.componentBackground,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  modalInput: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.icon,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.componentBackground,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  modalCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.icon,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.lightTint,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.componentBackground,
  },
  fabMenuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  fabMenu: {
    position: 'absolute',
    right: 24,
    minWidth: 190,
    backgroundColor: colors.componentBackground,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.icon,
    overflow: 'hidden',
  },
  fabMenuItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.icon,
  },
  fabMenuText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 36,
  },
});
