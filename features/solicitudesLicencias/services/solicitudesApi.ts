import { apiRequest } from '../../../shared/apiRequest';
import { idempotencyHeaders } from '@/shared/idempotency';
import * as solicitudLicencia from '../models/SolicitudLicencia';

export const getLicenciasUnseenCount = async (accessToken: string): Promise<number> => {
    const response = await apiRequest({ method: 'GET', endpoint: '/licencias/solicitudes/unseen', token: accessToken });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || response.statusText);
    }

    const data = await response.json();
    return typeof data?.unseenCount === 'number' ? data.unseenCount : 0;
};

export const getTiposLicencia = async (accessToken: string): Promise<solicitudLicencia.TipoLicencia[]> => {
    const response = await apiRequest({ method: 'GET', endpoint: '/licencias/tipos', token: accessToken });

    if (!response.ok) {
        console.error('Error fetching tipos de licencia:', response.status, response.statusText);
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data = await response.json();
    return data;
};

export const getSaldosLicencia = async (accessToken: string): Promise<solicitudLicencia.SaldosLicenciaResponse> => {
    const response = await apiRequest({ method: 'GET', endpoint: '/licencias/saldos', token: accessToken });

    if (!response.ok) {
        console.error('Error fetching saldos de licencia:', response.status, response.statusText);
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const raw = await response.json();
    const rawAusencias = Array.isArray(raw?.ausencias) ? raw.ausencias : [];

    const ausencias: solicitudLicencia.SaldoLicencia[] = rawAusencias.map((item: any) => {
        const diasOtorgados = Number(item?.dias_otorgados ?? 0);
        const diasConsumidos = Number(item?.dias_consumidos ?? 0);
        const diasDisponibles = item?.dias_disponibles !== undefined && item?.dias_disponibles !== null
            ? Number(item.dias_disponibles)
            : diasOtorgados - diasConsumidos;

        return {
            id: Number(item?.id),
            usuario_id: item?.usuario_id !== undefined && item?.usuario_id !== null ? Number(item.usuario_id) : undefined,
            tipo_licencia_id: item?.tipo_licencia_id !== undefined && item?.tipo_licencia_id !== null ? Number(item.tipo_licencia_id) : undefined,
            anio: Number(item?.anio ?? new Date().getFullYear()),
            dias_otorgados: diasOtorgados,
            dias_consumidos: diasConsumidos,
            dias_disponibles: Number.isNaN(diasDisponibles) ? undefined : diasDisponibles,
            residuo: item?.residuo !== undefined && item?.residuo !== null ? Number(item.residuo) : undefined,
            tipo_nombre: item?.tipo_nombre,
        };
    }).filter((item: solicitudLicencia.SaldoLicencia) => Number.isFinite(item.id));

    const francos: solicitudLicencia.FrancosSaldo = {
        horas_disponibles: Number(raw?.francos?.horas_disponibles ?? 0),
        horas_consumidas: Number(raw?.francos?.horas_consumidas ?? 0),
    };

    return { ausencias, francos };
};

export const getSolicitudesLicencias = async (accessToken: string, filters?: solicitudLicencia.GetSolicitudesFilters): Promise<solicitudLicencia.SolicitudLicencia[]> => {
    const params = new URLSearchParams();

    if (filters?.usuario_id) params.append('usuario_id', filters.usuario_id.toString());
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.tipo_licencia_id) params.append('tipo_licencia_id', filters.tipo_licencia_id.toString());
    if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);

    const query = params.toString();
    const response = await apiRequest({ method: 'GET', endpoint: `/licencias/solicitudes${query ? `?${query}` : ''}`, token: accessToken });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || response.statusText);
    }

    const data = await response.json();
    return data;
};

export const getSolicitudesUsuario = async (accessToken: string): Promise<solicitudLicencia.SolicitudLicencia[]> => {
    const response = await apiRequest({ method: 'GET', endpoint: '/licencias/solicitudes/usuario', token: accessToken });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || response.statusText);
    }

    const data = await response.json();
    return data;
};

export const createSolicitudLicencia = async (accessToken: string, data: solicitudLicencia.CreateSolicitudDTO, idempotencyKey?: string): Promise<solicitudLicencia.SolicitudLicencia> => {
    const response = await apiRequest({ method: 'POST', endpoint: '/licencias/solicitudes', token: accessToken, body: data, headers: idempotencyHeaders(idempotencyKey) });

    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.message || body.error || response.statusText);
    }

    return body;
};

export const adjuntarArchivo = async (accessToken: string, solicitudId: number, archivoId: number, idempotencyKey?: string): Promise<{ message: string }> => {
    const response = await apiRequest({ method: 'POST', endpoint: `/licencias/solicitudes/${solicitudId}/archivo`, token: accessToken, body: { archivo_id: archivoId }, headers: idempotencyHeaders(idempotencyKey) });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(body.message || body.error || response.statusText);
    }

    return body;
};

export const cancelarSolicitudLicencia = async (accessToken: string, solicitudId: number): Promise<{ message: string }> => {
    const response = await apiRequest({ method: 'POST', endpoint: `/licencias/solicitudes/${solicitudId}/cancelar`, token: accessToken });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(body.message || body.error || response.statusText);
    }

    return body;
};

export const aprobarSolicitudLicencia = async (accessToken: string, solicitudId: number, observacion?: string): Promise<{ message: string }> => {
    const body = observacion ? { observacion } : {};
    const response = await apiRequest({ method: 'POST', endpoint: `/licencias/solicitudes/${solicitudId}/aprobar`, token: accessToken, body });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || data.error || response.statusText);
    }

    return data;
};

export const rechazarSolicitudLicencia = async (accessToken: string, solicitudId: number, observacion: string): Promise<{ message: string }> => {

    const response = await apiRequest({ method: 'POST', endpoint: `/licencias/solicitudes/${solicitudId}/rechazar`, token: accessToken, body: { observacion } });


    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[rechazarSolicitudLicencia] Error en la respuesta:', error);
        throw new Error(error.message || error.error || response.statusText);
    }

    const data = await response.json();
    return data;
};  