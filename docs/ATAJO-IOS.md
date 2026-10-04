# Atajo de iOS: pasos y peso desde Apple Salud

Apple no permite leer Apple Salud desde una web, así que un Atajo del iPhone envía cada noche tus pasos del día y tu peso más reciente a Self. Se configura una vez y funciona solo.

## Qué necesitas

| Dato | Dónde encontrarlo |
|---|---|
| URL de tu proyecto | Supabase → Project Settings → API → Project URL |
| Clave pública (anon / publishable) | El mismo sitio |
| Token del Atajo | El que generaste en el paso 1 del README |

## 1. Crear el Atajo

Abre la app **Atajos → Atajos → +** y llama al atajo **«Enviar salud a Self»**. Añade estas acciones en orden:

1. **Fecha actual**.
2. **Formatear fecha**: formato *Personalizado*, cadena `yyyy-MM-dd`.
   Mantén pulsado el resultado y renómbralo **Día**.
3. **Buscar muestras de salud** con estos filtros:
   - *Tipo* es **Pasos**.
   - *Fecha de inicio* es **hoy**.
   - *Fuente* es **tu iPhone**. Este filtro es importante: si Garmin Connect también escribe pasos en Apple Salud, sin él se sumarían dos veces.
4. **Calcular estadísticas**: *Suma* de *Muestras de salud*. Renombra el resultado **Pasos**.
5. **Buscar muestras de salud**:
   - *Tipo* es **Peso**.
   - *Ordenar por* **Fecha de inicio**, de la más reciente a la más antigua.
   - *Limitar* a **1**.
6. **Obtener detalles de muestras de salud**: *Valor*. Renombra el resultado **Peso**.
7. **Obtener contenido de URL**:
   - URL: `https://TU-PROYECTO.supabase.co/rest/v1/rpc/ingest_apple_health`
   - *Método*: **POST**
   - *Cabeceras*:
     - `apikey` → tu clave pública
     - `Content-Type` → `application/json`
   - *Cuerpo de la solicitud*: **JSON**, con cuatro campos de tipo **Texto**:
     - `p_token` → tu token del Atajo
     - `p_day` → variable **Día**
     - `p_steps` → variable **Pasos**
     - `p_weight` → variable **Peso**

Pulsa ▶︎ para probarlo. Si todo va bien, la respuesta es `"ok"` y en Supabase verás la fila del día en la tabla `daily`.

Los números pueden llegar con formato español (`8.450` o `77,6`): la base de datos los interpreta correctamente. Si un día no te pesas, el campo de peso llega vacío y se ignora.

## 2. Ejecutarlo cada noche

**Atajos → Automatización → + → Hora del día**:

- Hora: **23:30**, todos los días.
- Marca **Ejecutar inmediatamente** (sin pedir confirmación).
- Acción: **Ejecutar atajo → Enviar salud a Self**.

## 3. Comprobar que funciona

Al día siguiente, en **Self → Ajustes → Fuentes de datos**, la línea **Apple Salud** debe mostrar «Ayer». Si muestra «Sin datos», ejecuta el Atajo a mano y revisa el mensaje de respuesta.

| Respuesta del Atajo | Significado |
|---|---|
| `"ok"` | Datos guardados |
| `Token no válido` | El token no coincide con el de la tabla `ingest_tokens` |
| `Invalid API key` | La clave pública no es correcta |
| `Could not find the function` | Falta ejecutar `supabase/schema.sql` |
