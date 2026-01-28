import { apiRequest } from '@/shared/apiRequest';
import type {
    Encuesta,
    EncuestaConPreguntas,
    Pregunta,
    Respuesta
} from '../models/Encuesta';

export async function fetchEncuestas(accessToken: string, filtros?: {categoria?: 'interna' | 'externa' | 'feedback_empleado'}): Promise<Encuesta[]> {
    let response;
    if (filtros) {
        const queryParams = new URLSearchParams();
        if (filtros.categoria) {
            queryParams.append('categoria', filtros.categoria);
        }
        const queryString = queryParams.toString();
        response = await apiRequest({ method: 'GET', endpoint: `/encuestas?${queryString}`, token: accessToken });
    } else {
        response = await apiRequest({ method: 'GET', endpoint: '/encuestas', token: accessToken });
    }

    const data: Encuesta[] = await response.json();
    return data;
}   

export async function getRespuestasEncuesta(accessToken: string): Promise<EncuestaConPreguntas[]> {
    const response = await apiRequest({ method: 'GET', endpoint: '/encuestas/respuestas', token: accessToken });

    if (!response.ok) {
        throw new Error('Error al obtener las respuestas de las encuestas');
    }

    const data: EncuestaConPreguntas[] = await response.json();
    return data;
}

export async function createEncuestaCompleta(accessToken: string, encuestaData: {encuesta: Encuesta, preguntas: Pregunta}): Promise<EncuestaConPreguntas> {
    const response = await apiRequest({ method: 'POST', endpoint: '/encuestas/crear_con_preguntas', token: accessToken, body: encuestaData });

    if (!response.ok) {
        throw new Error('Error al crear la encuesta con preguntas');
    }

    const data: EncuestaConPreguntas = await response.json();
    return data;
}

export async function enviarRespuestas(accessToken: string, data: {respuesta: Respuesta[]}): Promise<Respuesta[]> {
    const response = await apiRequest({ method: 'POST', endpoint: '/encuestas/responder', token: accessToken, body: data });

    if (!response.ok) {
        if(response.status === 409){   
            throw new Error('Ya has respondido a esta encuesta');
        }
        throw new Error('Error al enviar las respuestas de la encuesta');
    }

    const responseData: Respuesta[] = await response.json();
    return responseData;
}