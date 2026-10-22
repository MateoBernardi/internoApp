/**
 * Contrato real del backend (GET /horarios/extra): un array plano por usuario.
 * NO existe desglose por día (`dias[]`), ni `rol` ni `total`: el único agregado es
 * el saldo actual. Puede ser negativo.
 * `minutos` es el valor exacto; `horas` (2 decimales) queda por compatibilidad y es lo
 * único que manda un backend anterior a la migración a minutos.
 */
export interface HorasExtraDTO {
  userContextId: number;
  nombre: string;
  apellido: string;
  horas: number;
  minutos?: number;
}

/** Respuesta de POST /horarios/liquidar/:id. */
export interface LiquidarHorasExtraResult {
  horasDisponibles: number;
  horasConsumidas: number;
  minutosDisponibles?: number;
  minutosConsumidos?: number;
}

/**
 * Movimiento individual del historial de un usuario para un mes dado
 * (GET /horarios/movimientos). `cantidad` es siempre una magnitud positiva; el
 * signo se deriva de `tipo` en la UI. `saldoResultante` puede ser `null` cuando el
 * backend no lo calculó para ese movimiento. Los campos en minutos son los exactos.
 */
export interface MovimientoDTO {
  id: number;
  tipo: string;
  cantidad: number;
  saldoResultante: number | null;
  cantidadMinutos?: number;
  saldoResultanteMinutos?: number | null;
  createdAt: string;
}

/**
 * Horas trabajadas vs. objetivo semanal de un usuario (GET /horarios/objetivos/semanal).
 * Solo incluye usuarios que ya tienen un objetivo cargado. Los objetivos se editan en la
 * planilla de horarios. Los campos en minutos son los exactos.
 */
export interface HorasSemanalDTO {
  userContextId: number;
  nombre: string;
  apellido: string;
  horasObjetivo: number;
  /** Objetivo que rige desde la próxima semana (lo cargó la planilla); null si no hay cambio pendiente. */
  horasObjetivoPendiente: number | null;
  horasTrabajadas: number;
  minutosObjetivo?: number;
  minutosObjetivoPendiente?: number | null;
  minutosTrabajados?: number;
}

export type EstadoTurnoProyeccion = 'realizado' | 'en_curso' | 'proyectado' | 'ausente' | 'licencia';

/** Un turno de la semana en la proyección: cuántos minutos aporta y por qué. */
export interface TurnoProyeccionDTO {
  fecha: string; // YYYY-MM-DD
  turno: string;
  estado: EstadoTurnoProyeccion;
  minutos: number;
}

/**
 * Proyección semanal de un empleado (GET /horarios/semana/proyeccion), en minutos.
 * `minutosRealizados`: lo que lleva (turnos terminados, según marcas).
 * `minutosProyectados`: realizados + turnos en curso y futuros al horario esperado.
 * `minutosObjetivo` ya descuenta las licencias por horas de la semana.
 */
export interface HorasSemanaProyeccionDTO {
  userContextId: number;
  nombre: string;
  apellido: string;
  minutosObjetivo: number;
  minutosObjetivoPendiente: number | null;
  minutosRealizados: number;
  minutosProyectados: number;
  minutosSaldoFrancos: number;
  turnos: TurnoProyeccionDTO[];
}

interface MovimientoTipoInfo {
  label: string;
  sign: '+' | '−';
}

/** Etiqueta en español y signo a mostrar según `tipo`. Fallback genérico para tipos no mapeados. */
export const MOVIMIENTO_TIPO_INFO: Record<string, MovimientoTipoInfo> = {
  acreditacion: { label: 'Acreditación', sign: '+' },
  reintegro: { label: 'Reintegro', sign: '+' },
  consumo: { label: 'Consumo', sign: '−' },
  liquidacion: { label: 'Liquidación', sign: '−' },
  ajuste_manual: { label: 'Ajuste', sign: '+' },
};

export function getMovimientoTipoInfo(tipo: string): MovimientoTipoInfo {
  return MOVIMIENTO_TIPO_INFO[tipo] ?? { label: tipo, sign: '+' };
}
