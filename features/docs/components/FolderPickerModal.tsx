import { ThemedText } from '@/components/themed-text';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Carpeta } from '../models/Carpeta';

interface FolderPickerModalProps {
  visible: boolean;
  title: string;
  folders: Carpeta[];
  selectedId?: number | null;
  onClose: () => void;
  onSelect: (id: number | null, name: string) => void;
}

type FlatFolder = {
  id: number | null;
  name: string;
  depth: number;
};

function flattenFolders(folders: Carpeta[], depth = 0): FlatFolder[] {
  return folders.flatMap((folder) => {
    if (folder.id === null) {
      return [];
    }

    const current: FlatFolder = {
      id: folder.id ?? null,
      name: folder.nombre,
      depth,
    };

    const children = folder.children && folder.children.length > 0
      ? flattenFolders(folder.children, depth + 1)
      : [];

    return [current, ...children];
  });
}

export function FolderPickerModal({
  visible,
  title,
  folders,
  selectedId,
  onClose,
  onSelect,
}: FolderPickerModalProps) {
  const items = useMemo(() => {
    const flattened = flattenFolders(folders);
    return [{ id: null, name: 'Sin carpeta', depth: 0 }, ...flattened];
  }, [folders]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={glassColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.listContent}>
            {items.map((item) => {
              const isSelected = selectedId === item.id;
              const isVirtual = item.id === null;

              return (
                <TouchableOpacity
                  key={`${item.id ?? 'null'}-${item.name}`}
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => {
                    onSelect(item.id, item.name);
                    onClose();
                  }}
                >
                  <View style={[styles.indent, { width: item.depth * 14 }]} />
                  <Ionicons
                    name={isVirtual ? 'folder-open-outline' : 'folder-outline'}
                    size={18}
                    color={isSelected ? glassColors.link : glassColors.textMuted}
                  />
                  <ThemedText style={styles.rowText}>{item.name}</ThemedText>
                  {isSelected && <Ionicons name="checkmark" size={18} color={glassColors.link} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...glassStyles.modalOverlay,
    paddingHorizontal: '6%',
  },
  card: {
    maxHeight: '70%',
    width: '100%',
    paddingVertical: 10,
    ...glassStyles.modalCard,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: '4%',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,28,0.08)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  listContent: {
    paddingHorizontal: '3%',
    paddingTop: 8,
    paddingBottom: 16,
    gap: 2,
  },
  row: {
    minHeight: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  rowSelected: {
    backgroundColor: 'rgba(26,115,232,0.12)',
  },
  indent: {
    height: 1,
  },
  rowText: {
    flex: 1,
  },
});
