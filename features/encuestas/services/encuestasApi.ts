import { apiRequest } from '@/shared/apiRequest';
import { idempotencyHeaders } from '@/shared/idempotency';
import type {
    Encuesta,
    EncuestaConPreguntas,
    Pregunta,
    Respuesta,
} from '../models/Encuesta';

export async function fetchEncuestas(accessToken: string){
    const response = await apiRequest({ method: 'GET', endpoint: '/encuestas/categoria/interna', token: accessToken });
    if (!response.ok) {
        console.error('Error fetching encuestas:', response.status, response.statusText);
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Intenta nuevamente');
    }
    const result = await response.json();
    
    // Mapear opciones a opcionesCompletas para que ResponderEncuesta lo encuentre
    const encuestasConOpciones = result.data?.map((encuesta: any) => ({
        ...encuesta,
        preguntas: encuesta.preguntas?.map((pregunta: any) => ({
            ...pregunta,
            opcionesCompletas: pregunta.opciones || [], // Mapear opciones a opcionesCompletas
        })) || []
    })) || [];

    encuestasConOpciones.forEach((encuesta: any) => {
        encuesta.preguntas?.forEach((pregunta: any) => {
            if (pregunta.opcionesCompletas) {
            }
        });
    });
    
    // El servidor retorna { data: [...], success: true }
    return encuestasConOpciones;
}   

export async function getRespuestasEncuesta(accessToken: string): Promise<EncuestaConPreguntas[]> {
    const response = await apiRequest({ method: 'GET', endpoint: '/encuestas/respuestas', token: accessToken });

    if (!response.ok) {
        console.error('Error fetching respuestas de encuestas:', response.status, response.statusText);
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Intenta nuevamente');
    }

    const result = await response.json();
    
    // El servidor retorna { data: [...], success: true }
    const encuestasConOpciones = result.data?.map((encuesta: any) => ({
        ...encuesta,
        preguntas: encuesta.preguntas?.map((pregunta: any) => ({
            ...pregunta,
            opcionesCompletas: pregunta.opciones || [],
        })) || []
    })) || [];

    return encuestasConOpciones;
}

export async function createEncuestaCompleta(accessToken: string, encuestaData: {encuesta: Encuesta, preguntas: Pregunta, invitados?: number[]}, idempotencyKey?: string): Promise<EncuestaConPreguntas> {
    const response = await apiRequest({ method: 'POST', endpoint: '/encuestas/completa', token: accessToken, body: encuestaData, headers: idempotencyHeaders(idempotencyKey) });

    if (!response.ok) {
        console.error('Error creating encuesta with preguntas:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Response body:', errorText);
        throw new Error(`${response.statusText}`);
    }

    const data: EncuestaConPreguntas = await response.json();
    return data;
}

export type EnviarRespuestasResult = {
    message: string;
    data: Respuesta[];
};

export async function enviarRespuestas(accessToken: string, data: {respuestas: Respuesta[]}, idempotencyKey?: string): Promise<EnviarRespuestasResult> {
    const response = await apiRequest({ method: 'POST', endpoint: '/encuestas/respuestas', token: accessToken, body: data, headers: idempotencyHeaders(idempotencyKey) });

    if (!response.ok) {
        if(response.status === 409){   
            throw new Error('Ya has respondido a esta encuesta');
        }
        const rawBody = await response.text();
        let errorMessage = rawBody || response.statusText;
        try {
            const parsed = JSON.parse(rawBody);
            errorMessage = parsed?.message || parsed?.mensaje || parsed?.error || errorMessage;
        } catch {
            // Ignore parse failures and keep raw text fallback.
        }
        console.error('Error sending respuestas de encuesta:', response.status, response.statusText);
        console.error('Response body:', rawBody);
        throw new Error(`${errorMessage}`);
    }

    const responseBody = await response.json().catch(() => null);

    if (Array.isArray(responseBody)) {
        return {
            message: 'Tu respuesta ha sido enviada correctamente',
            data: responseBody as Respuesta[],
        };
    }

    return {
        message: responseBody?.message || responseBody?.mensaje || 'Tu respuesta ha sido enviada correctamente',
        data: Array.isArray(responseBody?.data) ? responseBody.data : [],
    };
}

export async function registrarConvocatorias(
    accessToken: string,
    encuestaId: number,
    invitados: number[]
): Promise<void> {
    const response = await apiRequest({
        method: 'POST',
        endpoint: `/encuestas/${encuestaId}/convocatorias`,
        token: accessToken,
        body: { invitados },
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Error al registrar convocatorias');
    }
}

export async function actualizarParticipantesEncuesta(
    accessToken: string,
    encuestaId: number,
    action: 'add' | 'remove',
    invitados: number[]
): Promise<void> {
    const response = await apiRequest({
        method: 'PATCH',
        endpoint: `/encuestas/${encuestaId}/participantes?action=${action}`,
        token: accessToken,
        body: { invitados },
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Error al actualizar participantes');
    }
}

export async function eliminarEncuesta(accessToken: string, encuestaId: number): Promise<void> {
    const response = await apiRequest({
        method: 'DELETE',
        endpoint: `/encuestas/${encuestaId}`,
        token: accessToken
    });

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('Solo el creador de la encuesta puede eliminarla');
        }
        const errorText = await response.text();
        console.error('Error eliminando encuesta:', response.status, response.statusText);
        console.error('Response body:', errorText);
        throw new Error(`${errorText || response.statusText}`);
    }
}

export async function eliminarOpcionEncuesta(accessToken: string, opcionId: number): Promise<void> {
    const response = await apiRequest({
        method: 'DELETE',
        endpoint: `/encuestas/opciones/${opcionId}`,
        token: accessToken
    });

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('Solo el creador de la encuesta puede eliminar opciones');
        }
        const errorText = await response.text();
        console.error('Error eliminando opción de encuesta:', response.status, response.statusText);
        console.error('Response body:', errorText);
        throw new Error(`${errorText || response.statusText}`);
    }
}
