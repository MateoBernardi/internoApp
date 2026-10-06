/**
 * Banderas de funcionalidades que viven en el código pero todavía no se publican.
 * El código de cada feature no se toca: solo se oculta su punto de entrada en la UI.
 */

/**
 * Historias: el backend está en otra rama que no entra en este release.
 * Pasar a `true` cuando se publique; con `false` no aparece en el menú.
 * Ojo: las rutas (`/(extras)/historias`, etc.) siguen existiendo y se pueden abrir por link directo.
 */
export const HISTORIAS_HABILITADAS = false;
