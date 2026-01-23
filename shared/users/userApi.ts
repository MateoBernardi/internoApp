import { apiRequest } from "../apiRequest";

export async function searchUsers(accessToken: string, query: string, signal?: AbortSignal) {
  console.log("Buscando usuarios con query:", query);
  const response = await apiRequest({method: "GET", endpoint: `/usuarios/search?q=${encodeURIComponent(query)}`, token: accessToken, signal: signal});
  
  if (!response.ok) {
    throw new Error('Error searching users');
  }
  const data = await response.json();
  console.log("Resultados búsqueda:", data);
  return data;
}

export async function getUserByRole(accessToken: string, rol_nombre: string) {
    const response = await apiRequest({method: "GET", endpoint: `/usuarios/role/${encodeURIComponent(rol_nombre)}`, token: accessToken});
    if (!response.ok) {
      throw new Error('Error getting users by role');
    }
    console.log("Se buscó el rol:", rol_nombre);
    const data = await response.json();
    console.log("Usuarios por rol:", data);
    return data;
}