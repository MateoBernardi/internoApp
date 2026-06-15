const { AndroidConfig } = require("expo/config-plugins");

/**
 * Bloquea READ_MEDIA_IMAGES y READ_MEDIA_VIDEO en Android.
 *
 * Estos permisos los agrega por defecto el config plugin de expo-media-library,
 * pero la app NO los necesita en Android:
 *   - La selección de imágenes usa expo-image-picker (Android Photo Picker, sin permisos en Android 13+).
 *   - MediaLibrary.saveToLibraryAsync() solo se invoca en iOS (ver components/filePreview/useFileActions.ts).
 *
 * withBlockedPermissions agrega <uses-permission ... tools:node="remove" />, por lo que
 * el permiso queda fuera del manifest mergeado aunque alguna librería intente declararlo,
 * evitando el aviso de Google Play sobre permisos de fotos/vídeos no declarados.
 */
const withBlockedAndroidMediaPermissions = (config) =>
  AndroidConfig.Permissions.withBlockedPermissions(config, [
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
  ]);

module.exports = withBlockedAndroidMediaPermissions;
