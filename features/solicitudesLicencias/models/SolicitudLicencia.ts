// Estados de Solicitud (según API)
export type EstadoSolicitud = 
  | 'PENDIENTE'
  | 'PENDIENTE_DOCUMENTACION'
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'CONSUMIDA';

// Tipo de Licencia (TipoLicenciaDTO según API)
export interface TipoLicencia {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  requiere_saldo: boolean;      // Si consume días del saldo
  requiere_adjunto: boolean;     // Si necesita documentación
}

// Saldo de Ausencia (SaldoAusenciaDTO según API)
export interface SaldoLicencia {
  id: number;
  usuario_id: number;
  tipo_licencia_id: number;
  anio: number;
  dias_otorgados: number;
  dias_consumidos: number;
  tipo_nombre?: string;           // Nombre del tipo (joined)
}

// Solicitud de Ausencia (SolicitudAusenciaDTO según API)
export interface SolicitudLicencia {
  id: number;
  usuario_id: number;
  tipo_licencia_id: number;
  fecha_inicio: string;           // YYYY-MM-DD
  fecha_fin: string;              // YYYY-MM-DD
  cantidad_dias: number;          // Días calendario solicitados
  estado: EstadoSolicitud;
  aprobador_id?: number;
  fecha_respuesta?: string;       // ISO 8601
  observacion_solicitud?: string;
  observacion_respuesta?: string;
  created_at: string;             // ISO 8601
  
  // Campos joined (solo en consultas)
  usuario_nombre?: string;
  usuario_apellido?: string;
  tipo_nombre?: string;
  archivos_adjuntos?: boolean;    // true si tiene archivos
  archivos?: ArchivoAdjunto[];     // Array de archivos adjuntos
  aprobador_nombre?: string;       // Nombre completo del aprobador
  aprobador_apellido?: string;     // Apellido del aprobador
}

// Archivo adjunto en solicitud
export interface ArchivoAdjunto {
  id: number;
  nombre: string;
  ruta_r2: string;
  tamaño: number;
  tipo: string | null;
  created_at: string;
}

// DTO para crear una solicitud
export interface CreateSolicitudDTO {
  tipo_licencia_id: number;
  fecha_inicio: string;  // YYYY-MM-DD
  fecha_fin: string;      // YYYY-MM-DD
  observacion?: string;  // Opcional
}

export interface GetSolicitudesFilters {
  usuario_id?: number;
  estado?: EstadoSolicitud | string;
  tipo_licencia_id?: number;
  fecha_desde?: string;  // YYYY-MM-DD
  fecha_hasta?: string;  // YYYY-MM-DD
}