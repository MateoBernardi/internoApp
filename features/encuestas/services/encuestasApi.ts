import { apiRequest } from '@/shared/apiRequest';
import type {
    Encuesta,
    EncuestaConPreguntas,
    Pregunta,
    Respuesta
} from '../models/Encuesta';

export async function fetchEncuestas(accessToken: string){
    const response = await apiRequest({ method: 'GET', endpoint: '/encuestas/categoria/interna', token: accessToken });
    if (!response.ok) {
        console.error('Error fetching encuestas:', response.status, response.statusText);
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Intenta nuevamente');
    }
    const result = await response.json();
    console.log('Encuestas completas:', result);
    console.log('Array de encuestas:', result.data);
    
    // Mapear opciones a opcionesCompletas para que ResponderEncuesta lo encuentre
    const encuestasConOpciones = result.data?.map((encuesta: any) => ({
        ...encuesta,
        preguntas: encuesta.preguntas?.map((pregunta: any) => ({
            ...pregunta,
            opcionesCompletas: pregunta.opciones || [], // Mapear opciones a opcionesCompletas
        })) || []
    })) || [];

    encuestasConOpciones.forEach((encuesta: any) => {
        console.log(`Encuesta: ${encuesta.titulo}`, encuesta.preguntas);
        encuesta.preguntas?.forEach((pregunta: any) => {
            console.log(`  Pregunta: ${pregunta.titulo} (${pregunta.tipo_pregunta})`, pregunta);
            if (pregunta.opcionesCompletas) {
                console.log(`    Opciones:`, JSON.stringify(pregunta.opcionesCompletas, null, 2));
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
    console.log('Respuestas de encuestas:', result);
    
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

export async function createEncuestaCompleta(accessToken: string, encuestaData: {encuesta: Encuesta, preguntas: Pregunta}): Promise<EncuestaConPreguntas> {
    const response = await apiRequest({ method: 'POST', endpoint: '/encuestas/completa', token: accessToken, body: encuestaData });

    if (!response.ok) {
        console.error('Error creating encuesta with preguntas:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Response body:', errorText);
        throw new Error(`${response.statusText}`);
    }

    const data: EncuestaConPreguntas = await response.json();
    return data;
}

export async function enviarRespuestas(accessToken: string, data: {respuestas: Respuesta[]}): Promise<Respuesta[]> {
    console.log('Enviando respuestas:', JSON.stringify(data, null, 2));
    const response = await apiRequest({ method: 'POST', endpoint: '/encuestas/respuestas', token: accessToken, body: data });

    if (!response.ok) {
        if(response.status === 409){   
            throw new Error('Ya has respondido a esta encuesta');
        }
        const errorText = await response.text();
        console.error('Error sending respuestas de encuesta:', response.status, response.statusText);
        console.error('Response body:', errorText);
        throw new Error(`${errorText || response.statusText}`);
    }

    const responseData: Respuesta[] = await response.json();
    return responseData;
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