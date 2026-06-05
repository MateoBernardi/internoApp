import { useCallback, useState } from 'react';
import { generateIdempotencyKey } from './idempotency';

export interface UseIdempotencyKeyResult {
  /**
   * UUID v4 estable durante todo el ciclo de vida del componente. Se genera UNA
   * sola vez al montar y NO cambia entre re-renders, por lo que los reintentos
   * automáticos de TanStack Query reutilizan exactamente la misma key.
   */
  idempotencyKey: string;
  /**
   * Genera y guarda una nueva key. Llamar SOLO cuando empieza una operación
   * lógica distinta (p. ej. tras crear un registro con éxito, antes de crear el
   * siguiente). Devuelve la nueva key por conveniencia.
   */
  regenerateIdempotencyKey: () => string;
}

/**
 * Hook reutilizable que encapsula el ciclo de vida de una idempotency key.
 *
 * Uso típico:
 *   const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();
 *   const { mutate, isPending } = useCrearAlgo(idempotencyKey);
 *   // ...al éxito: regenerateIdempotencyKey();
 *
 * La key vive en estado (useState con inicializador perezoso) para garantizar
 * que se genere una única vez y persista entre re-renders.
 */
export function useIdempotencyKey(): UseIdempotencyKeyResult {
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  const regenerateIdempotencyKey = useCallback(() => {
    const next = generateIdempotencyKey();
    setIdempotencyKey(next);
    return next;
  }, []);

  return { idempotencyKey, regenerateIdempotencyKey };
}
