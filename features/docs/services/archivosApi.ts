import { apiRequest } from "@/shared/apiRequest";
import type { ArchivoDTO } from "../dto/ArchivoDTO";
import { mapArchivoDTOToArchivo } from "../mappers/archivoMapper";
import * as archivos from "../models/Archivo";

const uriToBlob = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

export async function fetchArchivos(accessToken: string) : Promise<archivos.Archivo[]> {   
    const response = await apiRequest({method: 'GET', endpoint: '/archivos', token: accessToken})

    if (!response.ok) {
        throw new Error(`No se pudo obtener los archivos: ${response.statusText}`);
    }

    const data: ArchivoDTO[] = await response.json();
    return data.map(mapArchivoDTOToArchivo);
}

export async function searchArchivosByNombre(accessToken: string, query: string) : Promise<archivos.Archivo[]> {
    const response = await apiRequest({method: 'GET', endpoint: `/archivos/searchByNombre?nombre=${encodeURIComponent(query)}`, token: accessToken});

    if (!response.ok) {
        console.error(`Error searching by name: ${response.status}`);
        console.log(response.json)
        return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        console.error("searchArchivosByNombre expected array but got:", data);
        return [];
    }
    return data.map(mapArchivoDTOToArchivo);
}

export async function searchArchivosByPersona(accessToken: string, query: string) : Promise<archivos.Archivo[]> {
    const response = await apiRequest({method: 'GET', endpoint: `/archivos/?search=${encodeURIComponent(query)}`, token: accessToken});
    
    if (!response.ok) {
        console.error(`Error searching by person: ${response.status}`);
        console.log(response.json)
        return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        console.error("searchArchivosByPersona expected array but got:", data);
        return [];
    }
    return data.map(mapArchivoDTOToArchivo);
}

export async function getArchivosByIdUsuario(accessToken: string, idUsuario: number) : Promise<archivos.Archivo[]> {
    const response = await apiRequest({method: 'GET', endpoint: `/archivos/usuario/${idUsuario}`, token: accessToken});

    if (!response.ok) {
        throw new Error(`No se pudo obtener los archivos del usuario: ${response.statusText}`);
    }

    const data: ArchivoDTO[] = await response.json();
    return data.map(mapArchivoDTOToArchivo);
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
        throw new Error(`No se pudo obtener los archivos personales: ${response.statusText}`);
    }

    const data: ArchivoDTO[] = await response.json();
    return data.map(mapArchivoDTOToArchivo);
}

export async function getUrlCargaArchivo(accessToken: string, data:archivos.PedirUrlCargaRequest ) : Promise<archivos.PedirUrlCargaResponse> {
    const response = await apiRequest({method: 'POST', endpoint: '/archivos/upload', token: accessToken, body: data});

    if (!response.ok) {
        throw new Error(`No se pudo obtener el enlace de subida: ${response.statusText}`);
    }

    return await response.json();
}

export async function uploadArchivoR2(url: string, fileUri: string, mimeType: string) : Promise<void> {
    const archivoBlob = await uriToBlob(fileUri);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': mimeType,
        },
        body: archivoBlob,
    });

    if (!response.ok) {
        throw new Error(`No se pudo subir el archivo a R2: ${response.statusText}`);
    }
}

export async function confirmarUploadArchivo(accessToken: string, archivoData: archivos.UploadArchivoPayload) : Promise<archivos.Archivo> {
    const response = await apiRequest({method: 'POST', endpoint: '/archivos/metadata', token: accessToken, body: archivoData});

    if (!response.ok) {
        throw new Error(`No se pudo confirmar la subida del archivo: ${response.statusText}`);
    }

    const data: ArchivoDTO = await response.json();
    return mapArchivoDTOToArchivo(data);
}   

export async function uploadArchivo(accessToken: string, archivo: archivos.MobileFile, archivoData: archivos.UploadArchivoPayload) : Promise<archivos.Archivo> {
    try {
        // 1. Pedir URL de carga
        const urlCargaResponse = await getUrlCargaArchivo(accessToken, {
            nombreArchivo: archivoData.nombre,
            tipoArchivo: archivo.type,
        });
        const uploadUrl = urlCargaResponse.uploadUrl;
    
        // 2. Subir archivo a R2
        await uploadArchivoR2(uploadUrl, archivo.uri, archivo.type);

        // 3. Confirmar subida
        const archivoConfirmado = await confirmarUploadArchivo(accessToken, archivoData);

        return archivoConfirmado; 
    } catch (error) {
        console.error('Error subiendo el archivo:', error);
        throw error;
    }
}

export async function updateArchivo(accessToken: string, idArchivo: number, archivoData: archivos.UpdateArchivoPayload) : Promise<archivos.Archivo> {
    const response = await apiRequest({method: 'PUT', endpoint: `/archivos/${idArchivo}`, token: accessToken, body: archivoData});

    if (!response.ok) {
        throw new Error(`No se pudo actualizar el archivo: ${response.statusText}`);
    }

    const data: ArchivoDTO = await response.json();
    return mapArchivoDTOToArchivo(data);
}

export async function deleteArchivo(accessToken: string, idArchivo: number) : Promise<void> {
    const response = await apiRequest({method: 'DELETE', endpoint: `/archivos/${idArchivo}`, token: accessToken});

    if (!response.ok) {
        throw new Error(`No se pudo eliminar el archivo: ${response.statusText}`);
    }
}

export async function getArchivoUrlFirmada(accessToken: string, idArchivo: number) : Promise<string> {
    const response = await apiRequest({method: 'GET', endpoint: `/archivos/${idArchivo}/url`, token: accessToken});

    if (!response.ok) {
        throw new Error(`No se pudo obtener la URL del archivo: ${response.statusText}`);
    }

    const data: { url: string } = await response.json();
    return data.url;
}