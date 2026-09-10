import type { EstadoReporte } from './models/Reporte';

export interface ReporteEstadoPresentation {
  label: string;
  color: string;
  backgroundColor: string;
}

const ESTADO_PRESENTATION: Record<EstadoReporte, ReporteEstadoPresentation> = {
  PENDIENTE: {
    label: 'Pendiente',
    color: '#F57C00',
    backgroundColor: 'rgba(245,124,0,0.12)',
  },
  DISPUTA: {
    label: 'En disputa',
    color: '#D32F2F',
    backgroundColor: 'rgba(211,47,47,0.12)',
  },
  ASENTADO: {
    label: 'Asentado',
    color: '#2E7D32',
    backgroundColor: 'rgba(46,125,50,0.12)',
  },
  DESESTIMADO: {
    label: 'Desestimado',
    color: '#7B1FA2',
    backgroundColor: 'rgba(123,31,162,0.12)',
  },
};

export function getReporteEstadoPresentation(estado: EstadoReporte): ReporteEstadoPresentation {
  return ESTADO_PRESENTATION[estado] ?? {
    label: estado,
    color: '#687076',
    backgroundColor: 'rgba(104,112,118,0.12)',
  };
}
