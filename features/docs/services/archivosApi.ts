import { apiRequest } from "@/shared/apiRequest";
import type { ArchivoDTO } from "../dto/ArchivoDTO";
import { mapArchivoDTOToArchivo } from "../mappers/archivoMapper";
import * as archivos from "../models/Archivo";

const uriToBlob = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

// Helper to get MIME type from file extension
const getMimeType = (fileName: string, providedType?: string): string => {
  // If a type is provided and it looks like a MIME type, use it
  if (providedType && providedType.includes('/')) {
    return providedType;
  }

  // Fallback: map by file extension
  const extension = fileName.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
  };

  return mimeTypes[extension] || 'application/octet-stream';
};

export async function fetchArchivos(accessToken: string) : Promise<archivos.Archivo[]> {   
    const response = await apiRequest({method: 'GET', endpoint: '/archivos', token: accessToken})

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[fetchArchivos] Error:', { status: response.status, statusText: response.statusText, body: errorText });
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    const data: ArchivoDTO[] = await response.json();
    const archivosFormateados = data.map(mapArchivoDTOToArchivo);
    return archivosFormateados;
}

export async function searchArchivosByNombre(accessToken: string, query: string) : Promise<archivos.Archivo[]> {
    const response = await apiRequest({method: 'GET', endpoint: `/archivos/searchByNombre?nombre=${encodeURIComponent(query)}`, token: accessToken});

    if (!response.ok) {
        console.error(`Error searching by name: ${response.status}`);
        return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        console.error("searchArchivosByNombre expected array but got:", data);
        return [];
    }
    const archivosFormateados = data.map(mapArchivoDTOToArchivo);
    return archivosFormateados;
}

export async function searchArchivosByPersona(accessToken: string, query: string) : Promise<archivos.Archivo[]> {
    const response = await apiRequest({method: 'GET', endpoint: `/archivos/?search=${encodeURIComponent(query)}`, token: accessToken});
    
    if (!response.ok) {
        console.error(`Error searching by person: ${response.status}`);
        return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        console.error("searchArchivosByPersona expected array but got:", data);
        return [];
    }
    const archivosFormateados = data.map(mapArchivoDTOToArchivo);
    return archivosFormateados;
}

export async function getArchivosByIdUsuario(accessToken: string, idUsuario: number) : Promise<archivos.Archivo[]> {
    const response = await apiRequest({method: 'GET', endpoint: `/archivos/usuario/${idUsuario}`, token: accessToken});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: ArchivoDTO[] = await response.json();
    const archivosFormateados = data.map(mapArchivoDTOToArchivo);
    return archivosFormateados;
}

export async function searchArchivos(query: string) : Promise<archivos.Archivo[]> {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 1) {
        return [];
    }

    try {
        const promises = [
            searchArchivosByNombre('', trimmedQuery).catch(err => {
                console.error('Error buscando archivos por nombre:', err);
                return [] as archivos.Archivo[];
            }),
            trimmedQuery.length >= 2
            ? searchArchivosByPersona('', trimmedQuery).catch(err => {
                console.error('Error buscando archivos por persona:', err);
                return [] as archivos.Archivo[];
            })
            : Promise.resolve([] as archivos.Archivo[])
        ]

    const [resultadosNombre, resultadosPersona] = await Promise.all(promises);

    const resultadosCombinados = [...resultadosNombre, ...resultadosPersona];

    const resultadosUnicos = resultadosCombinados.reduce((acc: archivos.Archivo[], actual) => {
      const existe = acc.find(item => item.id === actual.id);
      if (!existe) {
        acc.push(actual);
      }
      return acc;
    }, []);

    return resultadosUnicos;

    } catch (error) {
    console.error('Error en búsqueda de archivos:', error);
    return [];
    }
}

export async function getArchivosPersonales(accessToken: string) : Promise<archivos.Archivo[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/archivos/personales', token: accessToken});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: ArchivoDTO[] = await response.json();
    const archivosFormateados = data.map(mapArchivoDTOToArchivo);
    return archivosFormateados;
}

export async function getUrlCargaArchivo(accessToken: string, data:archivos.PedirUrlCargaRequest ) : Promise<archivos.PedirUrlCargaResponse> {
    const response = await apiRequest({method: 'POST', endpoint: '/archivos/upload', token: accessToken, body: data});

    if (!response.ok) {
        let errorDetails = '';
        try {
            const errorData = await response.json();
            errorDetails = errorData.message || JSON.stringify(errorData);
        } catch {
            errorDetails = response.statusText || `Error ${response.status}`;
        }
        throw new Error(errorDetails);
    }

    const responseData = await response.json();
    const { uploadUrl, ruta_r2, fileName } = responseData;
    return { uploadUrl, ruta_r2, fileName };
}

export async function uploadArchivoR2(uploadUrl: string, fileUri: string, mimeType: string) : Promise<void> {
    try {        
        const archivoBlob = await uriToBlob(fileUri);

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': mimeType,
            },
            body: archivoBlob,
        });


        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error en R2:', { status: response.status, statusText: response.statusText, body: errorText });
            try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
        }
        
    } catch (error) {
        console.error('Error durante upload a R2:', error);
        throw error;
    }
}

export async function confirmarUploadArchivo(accessToken: string, archivoData: archivos.UploadArchivoPayload) : Promise<archivos.Archivo> {
    const response = await apiRequest({method: 'POST', endpoint: '/archivos/metadata', token: accessToken, body: archivoData});

    if (!response.ok) {
        let errorDetails = '';
        try {
            const errorData = await response.json();
            errorDetails = errorData.message || JSON.stringify(errorData);
        } catch {
            errorDetails = response.statusText || `Error ${response.status}`;
        }
        throw new Error(errorDetails);
    }

    const data: ArchivoDTO = await response.json();
    const archivoConfirmado = mapArchivoDTOToArchivo(data);
    return archivoConfirmado;
}   

export async function uploadArchivo(accessToken: string, archivo: archivos.MobileFile, archivoData: archivos.UploadArchivoPayload) : Promise<archivos.Archivo> {
    try {
        // Get proper MIME type from file name and provided type
        const contentType = getMimeType(archivo.name, archivo.type);
        
        // 1. Pedir URL de carga
        const urlCargaResponse = await getUrlCargaArchivo(accessToken, {
            fileName: archivoData.nombre,
            contentType: contentType,
        });
        const uploadUrl = urlCargaResponse.uploadUrl;
        const rutaR2 = urlCargaResponse.ruta_r2;
    
        // 2. Subir archivo a R2
        await uploadArchivoR2(uploadUrl, archivo.uri, contentType);

        // 3. Confirmar subida con datos adicionales
        const payloadConfirmacion: archivos.UploadArchivoPayload = {
            nombre: archivoData.nombre,
            titulo: archivoData.titulo,
            ruta_r2: rutaR2,
            tamaño: archivo.size,
            tipo: contentType,
            ...(archivoData.uso ? { uso: archivoData.uso } : {}),
            allowed_roles: archivoData.allowed_roles || [],
            usuarios_asociados: archivoData.usuarios_asociados || [],
            usuarios_compartidos: archivoData.usuarios_compartidos || [],
        };

        const archivoConfirmado = await confirmarUploadArchivo(accessToken, payloadConfirmacion);

        return archivoConfirmado; 
    } catch (error) {
        console.error('Error subiendo el archivo:', error);
        throw error;
    }
}

export async function updateArchivo(accessToken: string, idArchivo: number, archivoData: archivos.UpdateArchivoPayload) : Promise<archivos.Archivo> {
    const response = await apiRequest({method: 'PUT', endpoint: `/archivos/${idArchivo}`, token: accessToken, body: archivoData});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: ArchivoDTO = await response.json();
    const archivoFormateado = mapArchivoDTOToArchivo(data);
    return archivoFormateado;
}

export async function deleteArchivo(accessToken: string, idArchivo: number) : Promise<void> {
    const response = await apiRequest({method: 'DELETE', endpoint: `/archivos/${idArchivo}`, token: accessToken});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }
}

export async function getArchivoUrlFirmada(accessToken: string, idArchivo: number) : Promise<string> {
    const response = await apiRequest({method: 'GET', endpoint: `/archivos/${idArchivo}/url`, token: accessToken});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: { url: string } = await response.json();
    return data.url;
}