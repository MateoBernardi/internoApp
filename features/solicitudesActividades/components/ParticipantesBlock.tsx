import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface Participante {
  id: number;
  nombre: string;
  subtitulo?: string;
}

interface Props {
  participantes: Participante[];
  onRemove?: (id: number) => void;
  onAgregar?: () => void;
  canManage?: boolean;
  isRemovable?: (id: number) => boolean;
  extraContent?: React.ReactNode;
  renderRowSub?: (id: number) => React.ReactNode;
  titulo?: string;
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function ParticipantesBlock({
  participantes,
  onRemove,
  onAgregar,
  canManage,
  isRemovable,
  extraContent,
  renderRowSub,
  titulo = 'Participantes',
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const stackAvatars = participantes.slice(0, 4);
  const overflow = participantes.length > 4 ? participantes.length - 4 : 0;

  const filtered =
    query.trim()
      ? participantes.filter(p =>
          p.nombre.toLowerCase().includes(query.toLowerCase()),
        )
      : participantes;

  const canRemoveRow = (id: number) =>
    !!canManage && !!onRemove && (isRemovable ? isRemovable(id) : true);

  return (
    <View>
      {/* Section header */}
      <View style={s.headerRow}>
        <Text style={s.headerLabel}>{titulo}</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.infoBtn}>
            <Text style={s.infoBtnText}>{'i'}</Text>
          </TouchableOpacity>
          {canManage && onAgregar && (
            <TouchableOpacity style={s.addPill} onPress={onAgregar}>
              <Text style={s.addPillText}>{'+ Agregar'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Extra content (e.g. UserSelector) injected by parent */}
      {extraContent}

      {/* Collapsible card */}
      <View style={s.card}>
        <TouchableOpacity
          style={s.collapsedRow}
          onPress={() => setExpanded(e => !e)}
          activeOpacity={0.72}
        >
          <View style={s.avatarStack}>
            {stackAvatars.map((p, i) => (
              <View key={p.id} style={[s.avatarXs, i > 0 && s.avatarXsOverlap]}>
                <Text style={s.avatarXsText}>{initials(p.nombre)}</Text>
              </View>
            ))}
            {overflow > 0 && (
              <View style={[s.overflowChip, s.avatarXsOverlap]}>
                <Text style={s.overflowText}>+{overflow}</Text>
              </View>
            )}
          </View>

          <View style={s.caption}>
            <Text style={s.captionTitle}>{participantes.length} participantes</Text>
            <Text style={s.captionSub}>
              {expanded ? 'Tocá para contraer' : 'Tocá para ver y administrar'}
            </Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={'#9aa3ab'}
          />
        </TouchableOpacity>

        {expanded && (
          <View style={s.expandedSection}>
            {participantes.length > 6 && (
              <View style={s.searchBar}>
                <Ionicons name="search" size={15} color={'#9aa3ab'} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Buscar participante"
                  placeholderTextColor={'#9aa3ab'}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
            )}

            <ScrollView style={s.list} nestedScrollEnabled showsVerticalScrollIndicator>
              {filtered.length === 0 ? (
                <Text style={s.emptyFilter}>Sin resultados</Text>
              ) : (
                filtered.map(p => (
                  <View key={p.id} style={s.row}>
                    <View style={s.avatarSm}>
                      <Text style={s.avatarSmText}>{initials(p.nombre)}</Text>
                    </View>
                    <View style={s.rowInfo}>
                      <Text style={s.rowName}>{p.nombre}</Text>
                      {renderRowSub
                        ? renderRowSub(p.id)
                        : p.subtitulo
                        ? <Text style={s.rowSub}>{p.subtitulo}</Text>
                        : null}
                    </View>
                    {canRemoveRow(p.id) && (
                      <TouchableOpacity
                        style={s.removeBtn}
                        onPress={() => onRemove!(p.id)}
                      >
                        <Text style={s.removeBtnText}>{'×'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            <View style={s.footer}>
              <Text style={s.footerCount}>{participantes.length} en total</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 16,
    color: Colors.light['text'],
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  infoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  addPill: {
    borderWidth: 2,
    borderColor: '#2b1f5c',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  addPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2b1f5c',
  },
  card: {
    backgroundColor: '#f6f7f9',
    borderWidth: 1,
    borderColor: '#e8eaed',
    borderRadius: 14,
    overflow: 'hidden',
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarXs: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#cfe0f7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarXsOverlap: {
    marginLeft: -10,
  },
  avatarXsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b6fd4',
  },
  overflowChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e1e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  overflowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5a6068',
  },
  caption: {
    flex: 1,
  },
  captionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c2024',
  },
  captionSub: {
    fontSize: 12,
    color: '#7a8087',
    marginTop: 1,
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: '#e8eaed',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1c2024',
  },
  list: {
    maxHeight: 160,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  emptyFilter: {
    textAlign: 'center',
    color: '#7a8087',
    fontSize: 14,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  avatarSm: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#cfe0f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b6fd4',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c2024',
  },
  rowSub: {
    fontSize: 12,
    color: '#7a8087',
    marginTop: 1,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#9aa3ab',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#e8eaed',
  },
  footerCount: {
    fontSize: 12,
    color: '#7a8087',
  },
});
