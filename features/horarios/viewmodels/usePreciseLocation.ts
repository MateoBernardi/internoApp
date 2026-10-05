import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FIX_TIMEOUT_MS, isFixUsable, pickBetterFix } from '../utils/locationFix';

export interface PreciseFixResult {
  /** Lectura precisa y reciente, o null si no se consiguió a tiempo. */
  fix: Location.LocationObject | null;
  /** Radio de incertidumbre (m) de la mejor lectura obtenida, aunque no alcance el umbral. */
  accuracy: number | null;
}

/**
 * Mantiene el GPS encendido mientras `enabled` es true, igual que hace Google
 * Maps: `getCurrentPositionAsync` con la precisión por defecto (Balanced) no
 * enciende el GPS y suele devolver una ubicación vieja de Wi-Fi/antenas, lo
 * que daba "fuera del área" hasta que el usuario abría Maps.
 *
 * En Android, `watchPositionAsync` ya muestra el diálogo de Google para
 * activar la ubicación precisa si está desactivada (`mayShowUserSettingsDialog`).
 *
 * Requiere que el permiso de ubicación ya esté concedido.
 */
export function usePreciseLocation(enabled: boolean) {
  const bestRef = useRef<Location.LocationObject | null>(null);
  const listenersRef = useRef(new Set<() => void>());
  // Resuelve a true si el seguimiento quedó activo; null si está apagado.
  const watchingRef = useRef<Promise<boolean> | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    watchingRef.current = Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0 },
      (location) => {
        bestRef.current = pickBetterFix(bestRef.current, location, Date.now());
        setCurrentAccuracy(bestRef.current.coords.accuracy ?? null);
        listenersRef.current.forEach((listener) => listener());
      }
    )
      .then((sub) => {
        if (cancelled) {
          sub.remove();
          return false;
        }
        subscription = sub;
        return true;
      })
      .catch(() => false);

    return () => {
      cancelled = true;
      subscription?.remove();
      watchingRef.current = null;
    };
  }, [enabled]);

  const waitForPreciseFix = useCallback(async (): Promise<PreciseFixResult> => {
    const result = (): PreciseFixResult => ({
      fix: isFixUsable(bestRef.current, Date.now()) ? bestRef.current : null,
      accuracy: bestRef.current?.coords.accuracy ?? null,
    });

    if (isFixUsable(bestRef.current, Date.now())) return result();

    const watching = (await watchingRef.current) ?? false;
    if (!watching) {
      // El seguimiento no pudo arrancar (p. ej. el usuario rechazó el diálogo de
      // precisión en Android): un último intento puntual, sin volver a mostrarlo.
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          mayShowUserSettingsDialog: false,
        });
        bestRef.current = pickBetterFix(bestRef.current, location, Date.now());
        setCurrentAccuracy(bestRef.current.coords.accuracy ?? null);
      } catch {
        // Sin ubicación: result() devuelve fix null.
      }
      return result();
    }

    return new Promise<PreciseFixResult>((resolve) => {
      const listeners = listenersRef.current;
      const done = () => {
        clearTimeout(timeout);
        listeners.delete(onFix);
        resolve(result());
      };
      const onFix = () => {
        if (isFixUsable(bestRef.current, Date.now())) done();
      };
      const timeout = setTimeout(done, FIX_TIMEOUT_MS);
      listeners.add(onFix);
    });
  }, []);

  return { waitForPreciseFix, currentAccuracy };
}
