import { StyleSheet } from 'react-native';

export const glassColors = {
  text: '#11181C',
  textMuted: '#687076',
  link: '#1a73e8',
  placeholder: '#8a8f98',
  disabledText: '#9aa0a6',
  error: '#F44336',
  success: '#2e7d32',
};

export const glassStyles = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    borderRadius: 16,
    // Sin elevation: en Android, elevation + backgroundColor translúcido fuerza
    // una capa de sombra opaca que se ve como una caja blanca detrás del input.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,115,232,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.35)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  successBox: {
    backgroundColor: 'rgba(46,125,50,0.08)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
  },
  // Content/list-item card sitting on the flat page background.
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  // Dim backdrop behind centered dialogs / bottom sheets.
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,28,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Centered dialog box. Higher opacity than `card` since it sits over a
  // dark overlay with no page content behind it to blur.
  modalCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  // FullScreenPortal sheet background. Solid: these are full screens, not
  // cards — glass identity comes from inner chrome (fieldGlass, button).
  sheet: {
    backgroundColor: '#ffffff',
  },
  sheetHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,28,0.08)',
  },
  // Red-family counterpart of `button`, same opacity recipe.
  buttonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,67,54,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.35)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  // Green-family counterpart of `button`, same opacity recipe.
  buttonSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,125,50,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.35)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  // Floating "minimized draft" pill.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  // Neutral field background for inputs/dropdowns/rows.
  fieldGlass: {
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    borderRadius: 8,
  },
});
