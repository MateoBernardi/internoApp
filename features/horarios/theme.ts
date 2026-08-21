import { glassColors } from '@/shared/ui/glass';

// Chrome tokens — aliased to the shared glass system so every consumer of
// this module picks up the app-wide accent/text/border colors from one place.
export const NAVY = glassColors.link;
export const INK = glassColors.text;
export const MUTED = glassColors.textMuted;
export const LINE = 'rgba(17,24,28,0.08)';
export const CARD = 'rgba(255,255,255,0.6)';

// Semantic status colors — these signal shift/hora-extra state, not chrome,
// so they stay hardcoded per the "never glass-ify semantic colors" rule.
export const TURNO_COLOR = '#2f86d6';
export const TURNO_ACTIVE = TURNO_COLOR;
export const TURNO_SOFT = '#e7f2fb';
export const AMBER = '#c98a1a';
export const TARDE_COLOR = AMBER;
export const TARDE_SOFT = '#fff8e7';
export const ACEPTADO_COLOR = '#16a34a';
export const RED_FLASH = '#ef4444';

export const horariosColors = {
  morning: TURNO_COLOR,
  afternoon: AMBER,
} as const;
