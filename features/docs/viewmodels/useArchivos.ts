import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archivo, MobileFile, UpdateArchivoPayload, UploadArchivoPayload } from '../models/Archivo';
import { CarpetaView, CreateCarpetaPayload, UpdateCarpetaPayload } from '../models/Carpeta';
import type { ResourcePermisos } from '../models/Permisos';
import * as archivosApi from '../services/archivosApi';
import * as carpetasApi from '../services/carpetasApi';

export const ARCHIVOS_KEYS = {
    all: ['archivos'] as const,
    lists: () => [...ARCHIVOS_KEYS.all, 'list'] as const,
    personales: () => [...ARCHIVOS_KEYS.all, 'personales'] as const,
    usuario: (id: number) => [...ARCHIVOS_KEYS.all, 'usuario', id] as const,
    search: (query: string) => [...ARCHIVOS_KEYS.all, 'search', query] as const,
    detail: (id: number) => [...ARCHIVOS_KEYS.all, 'detail', id] as const,
    url: (id: number) => [...ARCHIVOS_KEYS.all, 'url', id] as const,
    carpetaPermisos: (id: number) => [...ARCHIVOS_KEYS.all, 'carpeta', id, 'permisos'] as const,
    archivoPermisos: (id: number) => [...ARCHIVOS_KEYS.all, 'archivo', id, 'permisos'] as const,
    carpetas: (view: CarpetaView = 'tree', includeSinCarpeta = true) =>
        [...ARCHIVOS_KEYS.all, 'carpetas', view, includeSinCarpeta ? 'with-sin-carpeta' : 'no-sin-carpeta'] as const,
};

export function useArchivos() {
    const { tokens } = useAuth();
    
    return useQuery({
        queryKey: ARCHIVOS_KEYS.lists(),
        queryFn: async () => {
             const token = tokens?.accessToken;
             if (!token) throw new Error("No authentification token found");
             return archivosApi.fetchArchivos(token);
        },
        enabled: !!tokens?.accessToken
    });
}

export function useSearchArchivos(query: string) {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: ARCHIVOS_KEYS.search(query),
        queryFn: async () => {
            if (!query || query.trim().length === 0) return [];
            const token = tokens?.accessToken;
            if (!token) throw new Error("No authentification token found");
            
            const trimmedQuery = query.trim();
            const promises = [
                archivosApi.searchArchivosByNombre(token, trimmedQuery).catch((err) => {
                    console.error('Error searching files by name:', err);
                    return [] as Archivo[];
                }),
                trimmedQuery.length >= 2
                    ? archivosApi.searchArchivosByPersona(token, trimmedQuery).catch((err) => {
                        console.error('Error searching files by person:', err);
                        return [] as Archivo[];
                    })
                    : Promise.resolve([] as Archivo[])
            ];
            
            const [resultadosNombre, resultadosPersona] = await Promise.all(promises);
            const resultadosCombinados = [...resultadosNombre, ...resultadosPersona];
            
            const resultadosUnicos = resultadosCombinados.reduce((acc: Archivo[], actual) => {
                if (!acc.find(item => item.id === actual.id)) {
                    acc.push(actual);
                }
                return acc;
            }, []);
            
            return resultadosUnicos;
        },
        enabled: query.trim().length > 0 && !!tokens?.accessToken
    });
}

export function useArchivosPersonales() {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: ARCHIVOS_KEYS.personales(),
        queryFn: async () => {
             const token = tokens?.accessToken;
             if (!token) throw new Error("No authentification token found");
             return archivosApi.getArchivosPersonales(token);
        },
        enabled: !!tokens?.accessToken
    });
}

export function useArchivosUsuario(idUsuario: number) {
    const { tokens } = useAuth();

     return useQuery({
        queryKey: ARCHIVOS_KEYS.usuario(idUsuario),
        queryFn: async () => {
             const token = tokens?.accessToken;
             if (!token) throw new Error("No authentification token found");
             return archivosApi.getArchivosByIdUsuario(token, idUsuario);
        },
        enabled: !!idUsuario && !!tokens?.accessToken
    });
}

export function useUpdateArchivo() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateArchivoPayload }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error("No authentification token found");
            return archivosApi.updateArchivo(token, id, data);
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ARCHIVOS_KEYS.all });
        }
    });
}

export function useDeleteArchivo() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (id: number) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error("No authentification token found");
            return archivosApi.deleteArchivo(token, id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ARCHIVOS_KEYS.all });
        }
    });
}

export function useUploadArchivo() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ archivo, data }: { archivo: MobileFile; data: UploadArchivoPayload }) => {
             const token = tokens?.accessToken;
             if (!token) throw new Error("No authentification token found");
             return archivosApi.uploadArchivo(token, archivo, data);
        },
         onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ARCHIVOS_KEYS.all });
        }
    });
}

export function useCarpetas(view: CarpetaView = 'tree', includeSinCarpeta = true) {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: ARCHIVOS_KEYS.carpetas(view, includeSinCarpeta),
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No authentification token found');
            return carpetasApi.fetchCarpetas(token, view, includeSinCarpeta);
        },
        enabled: !!tokens?.accessToken,
    });
}

export function useCreateCarpeta() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateCarpetaPayload) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No authentification token found');
            return carpetasApi.createCarpeta(token, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ARCHIVOS_KEYS.all });
        },
    });
}

export function useUpdateCarpeta() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: number; payload: UpdateCarpetaPayload }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No authentification token found');
            return carpetasApi.updateCarpeta(token, id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ARCHIVOS_KEYS.all });
        },
    });
}

export function useDeleteCarpeta() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No authentification token found');
            return carpetasApi.deleteCarpeta(token, id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ARCHIVOS_KEYS.all });
        },
    });
}

export function useMoverArchivo() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ idArchivo, id_carpeta }: { idArchivo: number; id_carpeta: number | null }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No authentification token found');
            return archivosApi.moverArchivo(token, idArchivo, { id_carpeta });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ARCHIVOS_KEYS.all });
        },
    });
}

export function useArchivoUrl(id?: number) {
    const { tokens } = useAuth();
    
    return useQuery({
        queryKey: id ? ARCHIVOS_KEYS.url(id) : ['url', 'null'],
         queryFn: async () => {
            if (!id) return null;
             const token = tokens?.accessToken;
             if (!token) throw new Error("No authentification token found");
             return archivosApi.getArchivoUrlFirmada(token, id);
        },
        enabled: !!id && !!tokens?.accessToken,
        staleTime: 1000 * 60 * 5, // URL signed might be valid for some time, e.g. 5 minutes
    });
}

export function useGetArchivoUrlFirmada() {
    const { tokens } = useAuth();

    const getArchivoUrlFirmada = async (id: number) => {
        const token = tokens?.accessToken;
        if (!token) throw new Error("No se identificó al usuario");
        return archivosApi.getArchivoUrlFirmada(token, id);
    };

    return { getArchivoUrlFirmada };
}   

export function useCarpetaPermisos(id?: number) {
    const { tokens } = useAuth();

    return useQuery<ResourcePermisos>({
        queryKey: id ? ARCHIVOS_KEYS.carpetaPermisos(id) : ['carpeta', 'permisos', 'null'],
        queryFn: async () => {
            if (!id) throw new Error('No se indico carpeta');
            const token = tokens?.accessToken;
            if (!token) throw new Error('No authentification token found');
            return carpetasApi.getCarpetaPermisos(token, id);
        },
        enabled: !!id && !!tokens?.accessToken,
    });
}

export function useArchivoPermisos(id?: number) {
    const { tokens } = useAuth();

    return useQuery<ResourcePermisos>({
        queryKey: id ? ARCHIVOS_KEYS.archivoPermisos(id) : ['archivo', 'permisos', 'null'],
        queryFn: async () => {
            if (!id) throw new Error('No se indico archivo');
            const token = tokens?.accessToken;
            if (!token) throw new Error('No authentification token found');
            return archivosApi.getArchivoPermisos(token, id);
        },
        enabled: !!id && !!tokens?.accessToken,
    });
}
 