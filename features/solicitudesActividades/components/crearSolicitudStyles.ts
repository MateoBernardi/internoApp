import { Colors, UI } from '@/constants/theme';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { StyleSheet } from 'react-native';

const colors = Colors['light'];

/** Estilos del formulario de creación de solicitud/chat. */
export const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.componentBackground,
    zIndex: 1000,
    elevation: 8,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  modalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Botón de "volver" — gris/neutro, no el azul de acento del resto de los
  // botones de icono (ver conversacion/styles.ts:backButton, misma receta).
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  fabContainer: {
    position: 'absolute',
    bottom: UI.fab.offsetBottom,
    right: UI.fab.offsetRight,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  inputSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
  },
  inputSectionPill: {
    borderRadius: 24,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.componentBackground,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  dateSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.componentBackground,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateSectionTitle: {
    fontSize: 16,
    color: colors.text,
  },
  dateFieldGroup: {
    gap: 8,
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: glassColors.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  dateButton: {
    ...glassStyles.buttonSecondary,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeButton: {
    ...glassStyles.buttonSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateValue: {
    fontSize: 16,
    color: colors.lightTint,
    textAlign: 'center',
  },
  timeValue: {
    fontSize: 16,
    color: colors.lightTint,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
  },
  messageInput: {
    fontSize: 16,
    color: colors.text,
    padding: 16,
    minHeight: 150,
  },
  messageBox: {
    ...glassStyles.fieldGlass,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageFooter: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  attachmentsList: {
    ...glassStyles.fieldGlass,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginRight: 8,
  },
  attachmentAction: {
    padding: 4,
  },
  attachmentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint + '12',
  },
  uploadButtonContainer: {
    backgroundColor: Colors['light'].componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17,24,28,0.08)',
    paddingHorizontal: '4%',
    paddingTop: 10,
  },
  section: {
    marginTop: 12,
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});