import { useEffect, useState } from 'react';
import { segundosRestantes } from '../utils/planificacionDiff';

/** Segundos que faltan para `expiraAt` (ISO), actualizados cada segundo. Con `null` no cuenta. */
export function useCuentaRegresiva(expiraAt: string | null): { segundos: number; vencido: boolean } {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!expiraAt) return;
    // setState solo desde callbacks: primero una lectura inmediata del reloj y luego cada segundo.
    const inmediato = setTimeout(() => setAhora(Date.now()), 0);
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => {
      clearTimeout(inmediato);
      clearInterval(intervalo);
    };
  }, [expiraAt]);

  const segundos = expiraAt ? segundosRestantes(expiraAt, ahora) : 0;
  return { segundos, vencido: expiraAt != null && segundos === 0 };
}
