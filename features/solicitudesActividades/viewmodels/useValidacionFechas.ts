import { useCallback, useState } from 'react';
import type { RangoOcupado } from '../models/Solicitud';

export type ValidacionState = 'idle' | 'validating' | 'success' | 'warnings' | 'error';

export interface ValidarFechasPayload {
  fechaInicio: string | Date;
  fechaFin: string | Date;
  participantes: number[];
  solicitudIdExcluir?: number | null;
  actividadIdExcluir?: number | null;
  tipo_actividad?: 'REUNION' | 'MANDATO';
}

interface UseValidacionFechasResult {
  state: ValidacionState;
  avisos: string[];
  rangosOcupados: RangoOcupado[];
  errorMessage?: string;
  validate: (payload: ValidarFechasPayload, onValid: () => void) => void;
  confirm: () => void;
  cancel: () => void;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function useValidacionFechas(): UseValidacionFechasResult {
  const [state, setState] = useState<ValidacionState>('idle');
  const [avisos, setAvisos] = useState<string[]>([]);
  const [rangosOcupados, setRangosOcupados] = useState<RangoOcupado[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setAvisos([]);
    setRangosOcupados([]);
    setErrorMessage(undefined);
    setPendingAction(null);
  }, []);

  const validate = useCallback((payload: ValidarFechasPayload, onValid: () => void) => {
    const inicio = toDate(payload.fechaInicio);
    const fin = toDate(payload.fechaFin);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      setState('error');
      setErrorMessage('Fechas inválidas. Revisá los valores ingresados.');
      return;
    }

    if (fin <= inicio) {
      setState('error');
      setErrorMessage('La fecha de fin debe ser mayor a la de inicio.');
      return;
    }

    // Mantiene la API de validación para el modal y futuras integraciones backend.
    setState('idle');
    setAvisos([]);
    setRangosOcupados([]);
    setErrorMessage(undefined);
    setPendingAction(null);
    onValid();
  }, []);

  const confirm = useCallback(() => {
    if (pendingAction) {
      const action = pendingAction;
      reset();
      action();
      return;
    }

    reset();
  }, [pendingAction, reset]);

  const cancel = useCallback(() => {
    reset();
  }, [reset]);

  return {
    state,
    avisos,
    rangosOcupados,
    errorMessage,
    validate,
    confirm,
    cancel,
  };
}
