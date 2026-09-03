import { Colors, UI } from '@/constants/theme';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { StyleSheet } from 'react-native';

const colors = Colors['light'];

/**
 * Estilos compartidos por las vistas de conversación de una solicitud
 * (`Solicitud` y `ConversacionChat`). Cada componente puede mezclar sus
 * estilos propios con `const styles = { ...conversacionStyles, ...localStyles }`.
 */
export const conversacionStyles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.componentBackground,
    zIndex: 1000,
    elevation: 10,
  },
  keyboardContainer: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  modalHeader: {
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // `lineHeight` explícito + `textAlignVertical` (Android) evitan que el
  // padding de fuente por defecto corra el texto hacia abajo dentro de la
  // fila — sin esto se ve centrado en iOS pero no en Android.
  modalHeaderTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '400',
    color: '#1c2024',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.35)',
    backgroundColor: 'rgba(26,115,232,0.12)',
  },
  // Botón de "volver" — deliberadamente gris/neutro, no el azul de acento
  // que usan el resto de los botones de icono del header (buscar, archivos, etc).
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  contentBlock: {
    gap: 6,
  },
  messagesCard: {
    padding: 14,
    ...glassStyles.card,
  },
  badgeRow: {
    marginTop: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lightTint,
    backgroundColor: colors.lightTint + '12',
  },
  chipText: {
    fontSize: 12,
    color: colors.lightTint,
    fontWeight: '700',
  },
  expiredBanner: {
    marginHorizontal: UI.spacing.lg,
    marginTop: UI.spacing.sm,
    marginBottom: UI.spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutralBorder,
    backgroundColor: colors.neutralSurface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expiredBannerTitle: {
    color: colors.neutralTextStrong,
    fontWeight: '700',
    fontSize: 14,
  },
  expiredBannerText: {
    color: colors.neutralText,
    fontSize: 13,
    marginTop: 2,
  },
  sectionActionText: {
    fontSize: 12,
    color: colors.lightTint,
    fontWeight: '600',
  },
  bitacoraContainer: {
    paddingTop: 10,
  },
  messagesListContent: {
    paddingTop: 4,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bitacoraItem: {
    width: '100%',
    marginBottom: 16,
  },
  bitacoraItemOwn: {
    alignItems: 'flex-end',
  },
  bitacoraItemOther: {
    alignItems: 'flex-start',
  },
  bitacoraCard: {
    width: '90%',
    backgroundColor: colors.neutralSurface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bitacoraCardOwn: {
    backgroundColor: colors.lightTint,
  },
  bitacoraHeader: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bitacoraBody: {
    paddingVertical: 2,
  },
  bitacoraUser: {
    fontWeight: 'bold',
    color: colors.text,
    fontSize: 13,
  },
  bitacoraUserOwn: {
    color: '#ffffff',
  },
  bitacoraDate: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  bitacoraDateOwn: {
    color: 'rgba(255,255,255,0.85)',
  },
  bitacoraAction: {
    color: colors.lightTint,
    fontSize: 14,
    fontWeight: '500',
  },
  bitacoraActionOwn: {
    color: '#ffffff',
  },
  bitacoraBubble: {
    marginTop: 3,
  },
  bitacoraText: {
    fontSize: 14,
    color: colors.text,
  },
  bitacoraTextOwn: {
    color: '#ffffff',
  },
  daySeparator: {
    alignItems: 'center',
    marginVertical: 10,
  },
  daySeparatorPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,28,0.06)',
  },
  daySeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: glassColors.textMuted,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  systemMessageBubble: {
    backgroundColor: colors.neutralSurface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.neutralBorder,
  },
  systemMessageText: {
    fontSize: 13,
    color: colors.neutralText,
    textAlign: 'center',
  },
  messageAttachments: {
    marginTop: 8,
    gap: 6,
  },
  messageAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageAttachmentName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  messageComposer: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutralBorder,
    backgroundColor: colors.componentBackground,
    overflow: 'hidden',
  },
  messageComposerAttachments: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  messageComposerAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  messageComposerAttachmentName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginRight: 8,
  },
  messageComposerAttachmentAction: {
    padding: 4,
  },
  messageComposerInput: {
    minHeight: 70,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: 14,
    color: colors.text,
  },
  messageActionsRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
  messageActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  messageActionButtonPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  messageActionButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    ...glassStyles.modalOverlay,
  },
  modalContent: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '85%',
    padding: 24,
    ...glassStyles.modalCard,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  modalBtnConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.35)',
    backgroundColor: 'rgba(26,115,232,0.12)',
  },
  modalBtnConfirmDanger: {
    borderColor: 'rgba(244,67,54,0.35)',
    backgroundColor: 'rgba(244,67,54,0.12)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  loadingMoreContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint + '12',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  sectionValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  participantesSection: {
    gap: 8,
  },
  selectorCard: {
    ...glassStyles.card,
    marginTop: 4,
    marginBottom: 4,
    padding: 12,
  },
  participanteAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightTint + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  participanteAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.lightTint,
  },
  collapsibleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  collapsibleToggleText: {
    fontSize: 13,
    color: colors.tint,
    fontWeight: '600',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inviteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});
