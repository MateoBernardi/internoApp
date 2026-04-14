import { apiRequest } from "@/shared/apiRequest";
import type { ApiOperationResult, ApiOperationStatus, ApiWarningDetail } from '@/shared/types/apiStatus';
import type { ArchivoDTO } from "../dto/ArchivoDTO";
import { mapArchivoDTOToArchivo } from "../mappers/archivoMapper";
import * as archivos from "../models/Archivo";
import type { ResourcePermisos } from '../models/Permisos';

type DocsApiError = Error & {
    status: ApiOperationStatus;
    statusCode: number;
};

const parseWarnings = (body: any): ApiWarningDetail[] => {
    if (!body) return [];

    if (Array.isArray(body.warnings)) {
        return body.warnings;
    }

    if (body.warnings && typeof body.warnings === 'object') {
        return [body.warnings];
    }

    if (body.invalid_roles || body.invalid_users || body.invalid_user_ids || body.reason) {
        return [
            {
                invalid_roles: body.invalid_roles,
                invalid_users: body.invalid_users,
                invalid_user_ids: body.invalid_user_ids,
                reason: body.reason,
            },
        ];
    }

    return [];
};

const parseBody = async (response: Response) => {
    const raw = await response.text();
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return { message: raw };
    }
};

const buildApiError = (statusCode: number, fallbackMessage: string, body: any): DocsApiError => {
    const message = body?.message || body?.error || fallbackMessage;
    let status: ApiOperationStatus = 'error';

    if (statusCode === 403) status = 'forbidden';
    if (statusCode === 409) status = 'conflict';
    if (statusCode === 400) status = 'validation_error';

    const err = new Error(message) as DocsApiError;
    err.status = status;
    err.statusCode = statusCode;
    return err;
};

const normalizeResourcePermisos = (raw: any): ResourcePermisos => {
    const resolved = raw?.data || raw || {};

    const roleList = Array.isArray(resolved.allowed_roles)
        ? resolved.allowed_roles.filter((role: unknown): role is string => typeof role === 'string' && role.trim().length > 0)
        : [];

    const userNameList = Array.isArray(resolved.allowed_users)
        ? resolved.allowed_users.filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
        : [];

    const rawUserIds = resolved.user_context_ids || resolved.ids || resolved.usuarios_id || resolved.user_ids || [];
    const userIds = Array.isArray(rawUserIds)
        ? rawUserIds.filter((id: unknown): id is number => Number.isInteger(id) && (id as number) > 0)
        : [];

    return {
        resource_type: resolved.resource_type === 'carpeta' ? 'carpeta' : 'archivo',
        resource_id: Number.isInteger(resolved.resource_id) ? resolved.resource_id : 0,
        owner_id: Number.isInteger(resolved.owner_id) ? resolved.owner_id : 0,
        allowed_roles: roleList,
        allowed_users: userNameList,
        ...(userIds.length > 0 ? { user_context_ids: userIds } : {}),
    };
};

const uriToBlob = async (uri: string) => {
    try {
        const response = await fetch(uri);

        if (!response.ok) {
            throw new Error(`No se pudo leer el archivo seleccionado (HTTP ${response.status})`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
            throw new Error('El archivo seleccionado esta vacio o ya no esta disponible');
        }

        return blob;
    } catch (error) {
        const isBlobUri = uri.startsWith('blob:');
        const details = error instanceof Error ? error.message : String(error);

        if (isBlobUri) {
            throw new Error(
                `No se pudo leer el archivo en web. Revisa la CSP (connect-src blob:) o vuelve a seleccionar el archivo. Detalle: ${details}`
            );
        }

        throw error;
    }
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

export async function fetchArchivos(accessToken: string): Promise<archivos.Archivo[]> {
    const response = await apiRequest({ method: 'GET', endpoint: '/archivos', token: accessToken })

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[fetchArchivos] Error:', { status: response.status, statusText: response.statusText, body: errorText });
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    const data: ArchivoDTO[] = await response.json();
    const archivosFormateados = data.map(mapArchivoDTOToArchivo);
    return archivosFormateados;
}

export async function searchArchivosByNombre(accessToken: string, query: string): Promise<archivos.Archivo[]> {
    const response = await apiRequest({ method: 'GET', endpoint: `/archivos/searchByNombre?nombre=${encodeURIComponent(query)}`, token: accessToken });

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

export async function searchArchivosByPersona(accessToken: string, query: string): Promise<archivos.Archivo[]> {
    const response = await apiRequest({ method: 'GET', endpoint: `/archivos/?search=${encodeURIComponent(query)}`, token: accessToken });

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

export async function getArchivosByIdUsuario(accessToken: string, idUsuario: number): Promise<archivos.Archivo[]> {
    const response = await apiRequest({ method: 'GET', endpoint: `/archivos/usuario/${idUsuario}`, token: accessToken });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: ArchivoDTO[] = await response.json();
    const archivosFormateados = data.map(mapArchivoDTOToArchivo);
    return archivosFormateados;
}

export async function searchArchivos(query: string): Promise<archivos.Archivo[]> {
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

export async function getArchivosPersonales(accessToken: string): Promise<archivos.Archivo[]> {
    const response = await apiRequest({ method: 'GET', endpoint: '/archivos/personales', token: accessToken });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: ArchivoDTO[] = await response.json();
    const archivosFormateados = data.map(mapArchivoDTOToArchivo);
    return archivosFormateados;
}

export async function getUrlCargaArchivo(accessToken: string, data: archivos.PedirUrlCargaRequest): Promise<archivos.PedirUrlCargaResponse> {
    const response = await apiRequest({ method: 'POST', endpoint: '/archivos/upload', token: accessToken, body: data });

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

export async function uploadArchivoR2(uploadUrl: string, fileUri: string, mimeType: string): Promise<void> {
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (fileUri.startsWith('blob:')) {
            console.error('Error durante upload a R2 (web/blob):', error);

            const isWeb = typeof window !== 'undefined';
            const isR2Upload = uploadUrl.includes('.r2.cloudflarestorage.com');
            const isNetworkLike = /Failed to fetch|NetworkError|Load failed/i.test(errorMessage);

            if (isWeb && isR2Upload && isNetworkLike) {
                throw new Error(
                    'Fallo la subida del archivo en web por CORS/preflight contra R2. Revisa la CORS policy del bucket (AllowedOrigins, AllowedMethods, AllowedHeaders y ExposeHeaders).'
                );
            }

            throw new Error(
                `Fallo la subida del archivo en web. Verifica CSP/connect-src para blob: y dominio de R2. Detalle: ${errorMessage}`
            );
        }

        console.error('Error durante upload a R2:', error);
        throw error instanceof Error ? error : new Error(errorMessage);
    }
}

export async function confirmarUploadArchivo(accessToken: string, archivoData: archivos.UploadArchivoPayload): Promise<archivos.Archivo> {
    const response = await apiRequest({ method: 'POST', endpoint: '/archivos/metadata', token: accessToken, body: archivoData });

    if (!response.ok) {
        const body = await parseBody(response);
        throw buildApiError(response.status, response.statusText || `Error ${response.status}`, body);
    }

    const body = await parseBody(response);
    const data: ArchivoDTO = body?.archivo || body?.resource || body?.data || body;
    const archivoConfirmado = mapArchivoDTOToArchivo(data);
    return archivoConfirmado;
}

export async function uploadArchivo(
    accessToken: string,
    archivo: archivos.MobileFile,
    archivoData: archivos.UploadArchivoPayload
): Promise<ApiOperationResult<archivos.Archivo>> {
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
            ...(archivoData.id_carpeta !== undefined ? { id_carpeta: archivoData.id_carpeta } : {}),
            allowed_roles: archivoData.allowed_roles || [],
            usuarios_asociados: archivoData.usuarios_asociados || [],
            usuarios_compartidos: archivoData.usuarios_compartidos || [],
        };

        const metadataResponse = await apiRequest({ method: 'POST', endpoint: '/archivos/metadata', token: accessToken, body: payloadConfirmacion });

        if (!metadataResponse.ok) {
            const body = await parseBody(metadataResponse);
            throw buildApiError(metadataResponse.status, metadataResponse.statusText, body);
        }

        const body = await parseBody(metadataResponse);
        const dto: ArchivoDTO = body?.archivo || body?.resource || body?.data || body;

        return {
            status: metadataResponse.status === 207 ? 'partial_success' : 'success',
            statusCode: metadataResponse.status,
            data: mapArchivoDTOToArchivo(dto),
            message: body?.message,
            warnings: parseWarnings(body),
        };
    } catch (error) {
        console.error('Error subiendo el archivo:', error);
        throw error;
    }
}

export async function updateArchivo(
    accessToken: string,
    idArchivo: number,
    archivoData: archivos.UpdateArchivoPayload
): Promise<ApiOperationResult<archivos.Archivo>> {
    const response = await apiRequest({ method: 'PUT', endpoint: `/archivos/${idArchivo}`, token: accessToken, body: archivoData });

    if (!response.ok) {
        const errData = await parseBody(response);
        throw buildApiError(response.status, response.statusText, errData);
    }

    const body = await parseBody(response);
    const data: ArchivoDTO = body?.archivo || body?.resource || body?.data || body;
    const archivoFormateado = mapArchivoDTOToArchivo(data);
    return {
        status: response.status === 207 ? 'partial_success' : 'success',
        statusCode: response.status,
        data: archivoFormateado,
        message: body?.message,
        warnings: parseWarnings(body),
    };
}

export async function deleteArchivo(accessToken: string, idArchivo: number): Promise<void> {
    const response = await apiRequest({ method: 'DELETE', endpoint: `/archivos/${idArchivo}`, token: accessToken });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }
}

export async function getArchivoUrlFirmada(accessToken: string, idArchivo: number): Promise<string> {
    const response = await apiRequest({ method: 'GET', endpoint: `/archivos/${idArchivo}/url`, token: accessToken });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: { url: string } = await response.json();
    return data.url;
}

export async function moverArchivo(
    accessToken: string,
    idArchivo: number,
    data: archivos.MoverArchivoPayload
): Promise<ApiOperationResult<archivos.Archivo>> {
    const response = await apiRequest({ method: 'POST', endpoint: `/archivos/${idArchivo}/mover`, token: accessToken, body: data });

    if (!response.ok) {
        const errData = await parseBody(response);
        if (response.status === 403) {
            throw buildApiError(response.status, 'No tenes permisos para mover este archivo', errData);
        }
        if (response.status === 404) {
            throw buildApiError(response.status, 'Archivo o carpeta destino no encontrado', errData);
        }
        if (response.status === 400) {
            throw buildApiError(response.status, 'Revisa el destino seleccionado e intenta nuevamente', errData);
        }
        throw buildApiError(response.status, response.statusText, errData);
    }

    const body = await parseBody(response);
    const moved: ArchivoDTO = body?.archivo || body?.resource || body?.data || body;
    return {
        status: response.status === 207 ? 'partial_success' : 'success',
        statusCode: response.status,
        data: mapArchivoDTOToArchivo(moved),
        message: body?.message,
        warnings: parseWarnings(body),
    };
}

export async function getArchivoPermisos(accessToken: string, idArchivo: number): Promise<ResourcePermisos> {
    const response = await apiRequest({ method: 'GET', endpoint: `/archivos/${idArchivo}/permisos`, token: accessToken });

    if (!response.ok) {
        const errData = await parseBody(response);
        if (response.status === 403) {
            throw buildApiError(response.status, 'Solo el creador puede ver los permisos completos', errData);
        }
        throw buildApiError(response.status, response.statusText, errData);
    }

    const body = await parseBody(response);
    return normalizeResourcePermisos(body);
}

export async function getArchivoViewers(
    accessToken: string,
    idArchivo: number
): Promise<archivos.ArchivoViewerResponse[]> {
    const response = await apiRequest({
        method: 'POST',
        endpoint: '/archivos/viewers',
        token: accessToken,
        body: { archivo_id: idArchivo },
    });

    if (!response.ok) {
        const errData = await parseBody(response);
        throw buildApiError(response.status, response.statusText, errData);
    }

    const body = await parseBody(response);
    const rawItems = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
            ? body.data
            : Array.isArray(body?.items)
                ? body.items
                : [];

    return rawItems
        .filter((item: any) => Number.isInteger(item?.user_context_id))
        .map((item: any) => ({
            user_context_id: item.user_context_id,
            nombre: typeof item.nombre === 'string' ? item.nombre : '',
            apellido: typeof item.apellido === 'string' ? item.apellido : '',
            visto_en: new Date(item.visto_en),
        }));
}
