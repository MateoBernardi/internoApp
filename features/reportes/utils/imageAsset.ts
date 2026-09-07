// Deriva nombre/mimeType para un asset de expo-image-picker de forma segura.
//
// `asset.uri` en Android suele ser un content:// sin extensión con punto
// (p. ej. "content://media/external/images/media/12345"), así que no se
// puede confiar en `uri.split('.').pop()` — produce un "ext" con el URI
// entero, lo que arma un filename/mimeType basura que Cloudflare Images
// rechaza. Como el picker está restringido a `mediaTypes: 'images'`, una
// imagen real siempre está detrás del URI aunque no se pueda leer la
// extensión — por eso el fallback a jpg/jpeg es seguro.
const EXTENSION_PATTERN = /\.([a-z0-9]{2,5})$/i;

export function inferImageExtension(uri: string): string {
    const withoutQuery = uri.split('?')[0].split('#')[0];
    const lastSegment = withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1);
    const match = lastSegment.match(EXTENSION_PATTERN);
    return match ? match[1].toLowerCase() : 'jpg';
}

function extensionToMimeType(ext: string): string {
    return ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
}

export function buildImageAssetUpload(asset: { uri: string; fileName?: string | null; mimeType?: string | null }): {
    name: string;
    mimeType: string;
} {
    const ext = inferImageExtension(asset.uri);
    const name = asset.fileName ?? `imagen_${Date.now()}.${ext}`;
    const mimeType = asset.mimeType ?? extensionToMimeType(ext);
    return { name, mimeType };
}
