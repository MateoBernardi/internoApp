import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

const colors = Colors['light'];

/** Estilos compartidos por `CrearEncuesta` y `FormularioPregunta`. */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: colors.componentBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.componentBackground,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.background,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.componentBackground,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.componentBackground,
    marginTop: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  agregarPreguntaButton: {
    backgroundColor: colors.lightTint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  agregarPreguntaText: {
    color: colors.componentBackground,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondaryText,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  preguntaCard: {
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.background,
  },
  preguntaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preguntaNumero: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightTint,
  },
  eliminarButton: {
    fontSize: 18,
  },
  preguntaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  preguntaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preguntaTipo: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  obligatoriaTag: {
    fontSize: 10,
    color: colors.error,
    backgroundColor: colors.error + '12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  opcionesPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  opcionesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
    marginBottom: 4,
  },
  opcionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  opcionText: {
    fontSize: 12,
    color: colors.secondaryText,
    flex: 1,
  },
  tiposContainer: {
    gap: 8,
  },
  tipoButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background,
    alignItems: 'center',
  },
  tipoButtonSelected: {
    borderColor: colors.lightTint,
    backgroundColor: colors.lightTint + '12',
  },
  tipoText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  tipoTextSelected: {
    color: colors.lightTint,
    fontWeight: '600',
  },
  opcionesSection: {
    marginTop: 12,
  },
  agregarOpcionContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: colors.lightTint,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.componentBackground,
    fontSize: 20,
    fontWeight: 'bold',
  },
  eliminarOpcion: {
    fontSize: 16,
    color: colors.error,
  },
  footerDos: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.componentBackground,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    gap: 12,
  },
  cancelarButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.secondaryText,
    alignItems: 'center',
  },
  cancelarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  guardarButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.lightTint,
    alignItems: 'center',
  },
  guardarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.componentBackground,
  },
  crearButtonDisabled: {
    backgroundColor: colors.secondaryText,
  },

  // ── Tipo horario en FormularioPregunta ───────────────────────────────────
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e9f1fd',
    borderWidth: 1,
    borderColor: '#cfe0f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  slotItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a4f86',
    flex: 1,
  },
  agregarSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.lightTint,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  agregarSlotText: {
    fontSize: 14,
    color: colors.lightTint,
    fontWeight: '600',
  },

  // ── Destinatarios en CrearEncuesta ───────────────────────────────────────
  audOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.background,
    borderRadius: 12,
    marginBottom: 10,
  },
  audOptionRowSelected: {
    borderColor: colors.lightTint,
    backgroundColor: '#e9f1fd',
  },
  radioDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.secondaryText,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDotSelected: {
    borderColor: colors.lightTint,
  },
  radioDotInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.lightTint,
  },
  audOptionInfo: {
    flex: 1,
  },
  audOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  audOptionSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  audDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  audDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.background,
  },
  audDividerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
    letterSpacing: 0.5,
  },
  audSummary: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 8,
  },
});