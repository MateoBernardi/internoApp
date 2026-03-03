import { useAuth } from '@/features/auth/context/AuthContext';
import { useCallback, useRef, useState } from 'react';
import type { ValidacionState } from '../components/ValidacionFechasModal';
import type { RangoOcupado, ValidarFechasRequest } from '../models/Solicitud';
import * as solicitudesApi from '../services/solicitudesApi';

interface ValidateParams {
    fechaInicio: string;
    fechaFin: string;
    participantes: number[];
    solicitudIdExcluir?: number;
}

/**
 * Hook reutilizable para manejar el flujo de validación de fechas.
 * 
 * Uso:
 * ```
 * const validacion = useValidacionFechas();
 * 
 * // Al enviar el formulario:
 * validacion.validate({
 *   fechaInicio: start.toISOString(),
 *   fechaFin: end.toISOString(),
 *   participantes: [1, 2, 3],
 * }, () => {
 *   // Callback que se ejecuta cuando se confirma (sin avisos o tras aceptar avisos)
 *   crearSolicitud(data);
 * });
 * 
 * // En el JSX:
 * <ValidacionFechasModal
 *   state={validacion.state}
 *   avisos={validacion.avisos}
 *   errorMessage={validacion.errorMessage}
 *   onConfirm={validacion.confirm}
 *   onCancel={validacion.cancel}
 * />
 * ```
 */
export function useValidacionFechas() {
    const { tokens } = useAuth();
    const [state, setState] = useState<ValidacionState>('idle');
    const [avisos, setAvisos] = useState<string[]>([]);
    const [rangosOcupados, setRangosOcupados] = useState<RangoOcupado[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const onConfirmRef = useRef<(() => void) | null>(null);

    const reset = useCallback(() => {
        setState('idle');
        setAvisos([]);
        setRangosOcupados([]);
        setErrorMessage(undefined);
        onConfirmRef.current = null;
    }, []);

    const validate = useCallback(async (params: ValidateParams, onConfirm: () => void) => {
        const accessToken = tokens?.accessToken;
        if (!accessToken) {
            setErrorMessage('No hay sesión activa');
            setState('error');
            return;
        }

        onConfirmRef.current = onConfirm;
        setState('validating');
        setAvisos([]);
        setRangosOcupados([]);
        setErrorMessage(undefined);

        try {
            const request: ValidarFechasRequest = {
                fecha_inicio: params.fechaInicio,
                fecha_fin: params.fechaFin,
                participantes: params.participantes,
                ...(params.solicitudIdExcluir ? { solicitudIdExcluir: params.solicitudIdExcluir } : {}),
            };

            const result = await solicitudesApi.validarFechas(accessToken, request);

            if (result.avisos && result.avisos.length > 0) {
                setAvisos(result.avisos);
                setRangosOcupados(result.rangosOcupados ?? []);
                setState('warnings');
            } else {
                setState('success');
                // Auto-proceder después de un breve momento
                setTimeout(() => {
                    onConfirmRef.current?.();
                    reset();
                }, 800);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Intenta nuevamente';
            setErrorMessage(msg);
            setState('error');
        }
    }, [tokens, reset]);

    const confirm = useCallback(() => {
        onConfirmRef.current?.();
        reset();
    }, [reset]);

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
