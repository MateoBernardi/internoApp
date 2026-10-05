import type { LocationObject } from 'expo-location';
import { isFixUsable, MAX_ACCURACY_M, MAX_FIX_AGE_MS, pickBetterFix } from '../locationFix';

const NOW = 1_750_000_000_000;

function fix(accuracy: number | null, ageMs = 0): LocationObject {
  return {
    timestamp: NOW - ageMs,
    coords: {
      latitude: -31.4,
      longitude: -64.18,
      altitude: null,
      accuracy,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
  };
}

describe('isFixUsable', () => {
  it('acepta una lectura reciente dentro del umbral de precisión', () => {
    expect(isFixUsable(fix(MAX_ACCURACY_M), NOW)).toBe(true);
  });

  it('rechaza una lectura imprecisa', () => {
    expect(isFixUsable(fix(MAX_ACCURACY_M + 1), NOW)).toBe(false);
  });

  it('rechaza una lectura vieja aunque sea precisa', () => {
    expect(isFixUsable(fix(5, MAX_FIX_AGE_MS + 1), NOW)).toBe(false);
  });

  it('rechaza lecturas sin precisión informada o nulas', () => {
    expect(isFixUsable(fix(null), NOW)).toBe(false);
    expect(isFixUsable(null, NOW)).toBe(false);
  });
});

describe('pickBetterFix', () => {
  it('toma la nueva lectura si no hay una actual', () => {
    const candidate = fix(80);
    expect(pickBetterFix(null, candidate, NOW)).toBe(candidate);
  });

  it('se queda con la de menor radio de incertidumbre', () => {
    const precise = fix(10, 2000);
    const coarse = fix(120);
    expect(pickBetterFix(precise, coarse, NOW)).toBe(precise);
    expect(pickBetterFix(coarse, precise, NOW)).toBe(precise);
  });

  it('reemplaza una lectura vencida aunque sea más precisa', () => {
    const stale = fix(5, MAX_FIX_AGE_MS + 1);
    const candidate = fix(40);
    expect(pickBetterFix(stale, candidate, NOW)).toBe(candidate);
  });

  it('prefiere una lectura con precisión informada sobre una sin ella', () => {
    const unknown = fix(null);
    const known = fix(200);
    expect(pickBetterFix(unknown, known, NOW)).toBe(known);
  });
});
