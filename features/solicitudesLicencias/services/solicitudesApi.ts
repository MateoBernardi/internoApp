import { apiRequest } from '../../../shared/apiRequest';
import * as solicitudLicencia from '../models/SolicitudLicencia';

export const getTiposLicencia = async (accessToken: string): Promise<solicitudLicencia.TipoLicencia[]> => {
    const response = await apiRequest({method: 'GET', endpoint: '/licencias/tipos', token: accessToken});

    if (!response.ok) {
        console.error('Error fetching tipos de licencia:', response.status, response.statusText);
        throw new Error(`No se pudieron obtener los tipos de licencia: ${response.statusText}`);
    }

    const data = await response.json();
    console.log ('Tipos de licencia fetched', data);
    return data;
};

export const getSaldosLicencia = async (accessToken: string): Promise<solicitudLicencia.SaldoLicencia[]> => {
    const response = await apiRequest({method: 'GET', endpoint: '/licencias/saldos', token: accessToken});

    if (!response.ok) {
        console.error('Error fetching saldos de licencia:', response.status, response.statusText);
        throw new Error(`No se pudieron obtener los saldos de licencia: ${response.statusText}`);
    }

    const raw = await response.json();
    const data: solicitudLicencia.SaldoLicencia[] = raw.map((item: solicitudLicencia.SaldoLicencia) => ({
        id: item.id,
        usuario_id: item.usuario_id,
        tipo_licencia_id: item.tipo_licencia_id,
        anio: item.anio,
        dias_otorgados: item.dias_otorgados,
        dias_consumidos: item.dias_consumidos,
        tipo_nombre: item.tipo_nombre,
    }));
    return data;
};

export const getSolicitudesLicencias = async (accessToken: string, filters?: solicitudLicencia.GetSolicitudesFilters): Promise<solicitudLicencia.SolicitudLicencia[]> => {
    const params = new URLSearchParams();
    
    if (filters?.usuario_id) params.append('usuario_id', filters.usuario_id.toString());
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.tipo_licencia_id) params.append('tipo_licencia_id', filters.tipo_licencia_id.toString());
    if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);

    const query = params.toString();
    const response = await apiRequest({method: 'GET', endpoint: `/licencias/solicitudes${query ? `?${query}` : ''}`, token: accessToken});

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`No se pudieron obtener las solicitudes de licencias: ${error.message}`);
    }

    const data = await response.json();
    return data;
};

export const getSolicitudesUsuario = async (accessToken: string): Promise<solicitudLicencia.SolicitudLicencia[]> => {
    const response = await apiRequest({method: 'GET', endpoint: '/licencias/solicitudes/usuario', token: accessToken});

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`No se pudieron obtener las solicitudes de licencias del usuario: ${error.message}`);
    }

    const data = await response.json();
    return data;
};    

export const createSolicitudLicencia = async (accessToken: string, data: solicitudLicencia.CreateSolicitudDTO): Promise<solicitudLicencia.SolicitudLicencia> => {
    const request = data;
    const response = await apiRequest({method: 'POST', endpoint: '/licencias/solicitudes', token: accessToken, body: data});
    await response.json();
    console.log('Create solicitud response:', response);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`No se pudo crear la solicitud de licencia: ${error.message}`);
    }

    const solicitud = await response.json();
    return solicitud;
};

export const adjuntarArchivo = async (accessToken: string, solicitudId: number, archivoId: number): Promise<{message: string}> => {
    const response = await apiRequest({method: 'POST', endpoint: `/licencias/solicitudes/${solicitudId}/archivo`, token: accessToken, body: { archivo_id: archivoId }});

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`No se pudo adjuntar el archivo: ${error.message}`);
    }

    return response.json();
};

export const cancelarSolicitudLicencia = async (accessToken: string, solicitudId: number): Promise<{message: string}> => {  
    const response = await apiRequest({method: 'POST', endpoint: `/licencias/solicitudes/${solicitudId}/cancelar`, token: accessToken});

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`No se pudo cancelar la solicitud de licencia: ${error.message}`);
    }

    return response.json();
};

export const aprobarSolicitudLicencia = async (accessToken: string, solicitudId: number, observacion?: string): Promise<{message: string}> => {  
    const body = observacion ? { observacion } : {};
    const response = await apiRequest({method: 'POST', endpoint: `/licencias/solicitudes/${solicitudId}/aprobar`, token: accessToken, body});

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`No se pudo aprobar la solicitud de licencia: ${error.message}`);
    }

    return response.json();
};

export const rechazarSolicitudLicencia = async (accessToken: string, solicitudId: number, observacion: string): Promise<{message: string}> => {  
    console.log('[rechazarSolicitudLicencia] Iniciando rechazo de solicitud:', { solicitudId, observacion, tokenPresente: !!accessToken });
    
    const response = await apiRequest({method: 'POST', endpoint: `/licencias/solicitudes/${solicitudId}/rechazar`, token: accessToken, body: { observacion }});
    
    console.log('[rechazarSolicitudLicencia] Respuesta del servidor:', { status: response.status, ok: response.ok });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[rechazarSolicitudLicencia] Error en la respuesta:', error);
        throw new Error(`No se pudo rechazar la solicitud de licencia: ${error.message}`);
    }

    const data = await response.json();
    console.log('[rechazarSolicitudLicencia] Solicitud rechazada exitosamente:', data);
    return data;
};  