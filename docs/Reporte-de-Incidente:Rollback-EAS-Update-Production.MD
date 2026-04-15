Incidente: Fallo de Variables de Entorno tras EAS Update
Fecha: 15 de abril de 2026

1. Resumen

Se produjo una interrupción en el funcionamiento de la aplicación en producción luego de lanzar un EAS Update sobre el Build 20. El binario original (instalado desde la tienda) funcionaba correctamente, pero el update de JS no reconoció las variables de entorno, rompiendo la lógica de la app.

2. Causa Raíz

• Falta de Variables en el Runtime del Update: Al ejecutar `eas update` desde la terminal local, el proceso de compilación de JS no incluyó las variables de entorno necesarias. Esto suele ocurrir si las variables no están marcadas como `EXPO_PUBLIC_` o si no estaban presentes en el entorno local/dashboard de Expo al momento de disparar el comando.

• Sobrescritura: El update de JS tiene prioridad sobre el código "embedded" del binario, por lo que una actualización sin variables "pisa" a un binario que sí las tenía.

3. Resolución (Rollback)

Se aplicó un Rollback a Embedded Update en el canal `production`.

• Comando: `eas update:rollback`

• Acción: Se seleccionó la opción "Embedded Update". Esto instruye a la aplicación a ignorar cualquier actualización remota y volver a ejecutar el código base contenido en el archivo `.aab/.apk` (Build 20), el cual es estable y posee las variables correctamente inyectadas.

4. Medidas Preventivas

• Importar las variables de entorno directamente usando dotenv en el comando de `update`.

• Verificación Pre-Update: Antes de cada `eas update`, verificar la presencia de variables en el entorno local o usar archivos `.env` validados.

• Uso de Canales de Staging: Realizar updates primero en un canal de `preview` o `staging` antes de impactar `production`.



