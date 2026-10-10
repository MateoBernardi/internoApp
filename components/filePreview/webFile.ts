/** Descarga un archivo por blob (la URL firmada de R2 admite CORS desde los orígenes de la app). */
export async function descargarWeb(url: string, nombre: string): Promise<void> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${respuesta.status})`);
  const objeto = URL.createObjectURL(await respuesta.blob());
  const enlace = document.createElement('a');
  enlace.href = objeto;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(objeto), 10_000);
}

/**
 * Abre un documento (PDF, etc.) en una pestaña aparte, como el módulo de documentos. La pestaña
 * se abre al instante, dentro del gesto del click, para que el bloqueador de popups no la frene;
 * después se le asigna la URL firmada. Si el navegador no deja abrirla, se descarga el archivo.
 */
export async function abrirDocumentoWeb(obtenerUrl: () => Promise<string>, nombre: string): Promise<void> {
  const pestana = window.open('', '_blank');
  try {
    const url = await obtenerUrl();
    if (pestana) {
      pestana.opener = null;
      pestana.location.replace(url);
      return;
    }
    await descargarWeb(url, nombre);
  } catch (e) {
    pestana?.close();
    throw e;
  }
}
