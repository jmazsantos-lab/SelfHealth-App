# Self

Aplicación personal que reúne en un solo lugar tus datos de salud: Garmin (reloj y CIRQA), Apple Salud, nutrición, CrossFit, analíticas y clima, y explica cómo se relacionan entre sí.

- **Coste:** 0 €. Todo funciona con los planes gratuitos de Supabase y GitHub.
- **Privacidad:** tus datos viven en tu propio proyecto de Supabase. Cada tabla está protegida para que solo tu usuario pueda leerla.
- **Funcionamiento:** la app se instala en el iPhone desde Safari (PWA) y abre sin conexión con los últimos datos guardados.

---

## 1. Qué incluye

```
self-app/
├── web/                     Aplicación (se publica en GitHub Pages)
│   ├── index.html           Estructura y estilos
│   ├── config.js            Tu configuración de Supabase  ← lo editas tú
│   ├── js/app.js            Pantallas, gráficos y motor de relaciones
│   ├── js/data.js           Carga de tus datos desde Supabase
│   ├── js/demo.js           Datos ficticios para el modo demostración
│   ├── js/boot.js           Arranque, animación e inicio de sesión
│   ├── sw.js                Funcionamiento sin conexión
│   └── icons/               Iconos de la app
├── supabase/schema.sql      Base de datos completa con seguridad por usuario
├── sync/                    Sincronización automática (Python)
│   ├── garmin_login.py      Primer inicio de sesión en Garmin (una sola vez)
│   ├── garmin_sync.py       Salud diaria y actividades completas
│   ├── weather_sync.py      Clima diario (Open-Meteo)
│   └── common.py            Utilidades compartidas
├── .github/workflows/
│   ├── sync.yml             Sincroniza cada día a las 05:10 y a las 12:10
│   ├── pages.yml            Publica la app cuando cambias algo en web/
│   └── garmin-login.yml     Inicio de sesión en Garmin sin ordenador (opcional)
└── docs/ATAJO-IOS.md        Cómo enviar pasos y peso desde el iPhone
```

### Qué datos llegan y de dónde

| Dato | Origen | Cómo llega |
|---|---|---|
| Sueño, fases, HRV, FC en reposo, SpO₂, respiración, temperatura de la piel, estrés, Body Battery | Garmin (CIRQA y reloj) | Sincronización automática |
| Actividades: ruta GPS, ritmo, FC, altitud, cadencia, parciales, series, zonas, fuerza | Garmin | Sincronización automática |
| Pasos y peso | Apple Salud | Atajo de iOS cada noche |
| Clima de La Habana | Open-Meteo | Sincronización automática |
| Comidas, cafeína, alcohol, agua, WOD, marcas, analíticas, estado al despertar | Tú | Botón «+» de la app |
| Recuperación, esfuerzo, ratio de carga y relaciones entre datos | Self | Se calculan en la app |

---

## 2. Puesta en marcha (unos 30 minutos)

### Paso 1 · Base de datos en Supabase

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y un proyecto nuevo. Región recomendada: **East US (North Virginia)**, la más cercana a Cuba.
2. Abre **SQL Editor → New query**, pega el contenido completo de `supabase/schema.sql` y pulsa **Run**.
3. Crea tu usuario en **Authentication → Users → Add user → Create new user**, con tu correo y una contraseña, y marca **Auto Confirm User**.
4. Desactiva los registros públicos para que nadie más pueda crear cuenta: **Authentication → Sign In / Providers → Allow new users to sign up: desactivado**.
5. Genera el token del Atajo de iOS. En **SQL Editor**, ejecuta (con tu correo):
   ```sql
   insert into public.ingest_tokens (user_id)
   select id from auth.users where email = 'TU_CORREO' returning token;
   ```
   Guarda el token que aparece: lo usarás en el paso 6.
6. Anota estos cuatro datos:
   - **Project URL** y clave **anon / publishable**: en **Project Settings → API**.
   - Clave **service_role / secret**: en el mismo sitio. Es secreta: nunca la pongas en `config.js`.
   - **User UID**: en **Authentication → Users**, al pulsar sobre tu usuario.

### Paso 2 · Repositorio en GitHub

1. Crea un repositorio nuevo, por ejemplo `self-app`, y sube todo el contenido de esta carpeta.
   - Puede ser público, como Órbita: en el código no hay ningún dato ni clave secreta.
2. En **Settings → Secrets and variables → Actions → New repository secret**, crea:

   | Secreto | Valor |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SERVICE_KEY` | Clave service_role / secret |
   | `SELF_USER_ID` | Tu User UID |

3. En **Settings → Pages → Build and deployment → Source**, elige **GitHub Actions**.

### Paso 3 · Configurar la app

Edita `web/config.js` en GitHub y rellena:

```js
supabaseUrl: 'https://TU-PROYECTO.supabase.co',
supabaseAnonKey: 'TU_CLAVE_ANON',
```

Al guardar, el flujo **Publicar la app** la publica en `https://TU-USUARIO.github.io/self-app/`.

### Paso 4 · Conectar Garmin (una sola vez)

Elige una de las dos opciones:

**A. Desde tu ordenador** (obligatoria si tienes la verificación en dos pasos de Garmin):
```bash
cd self-app
pip install -r sync/requirements.txt          # requiere Python 3.12 o superior
export SUPABASE_URL=...  SUPABASE_SERVICE_KEY=...  SELF_USER_ID=...
python sync/garmin_login.py
```
En Windows, usa `set` en lugar de `export`. El script pide tu correo, tu contraseña y el código de verificación, y guarda los tokens de sesión en Supabase. Tu contraseña no se guarda en ningún sitio.

**B. Desde GitHub, sin ordenador** (solo si tu cuenta de Garmin no tiene verificación en dos pasos):
crea los secretos `GARMIN_EMAIL` y `GARMIN_PASSWORD` y ejecuta el flujo **Actions → Primer inicio de sesión en Garmin → Run workflow**. Después puedes borrar esos dos secretos.

### Paso 5 · Cargar el histórico

En **Actions → Sincronizar datos → Run workflow**, escribe **120** en «Días a sincronizar» y ejecútalo. Tarda unos 15 minutos: descarga cuatro meses de salud diaria y todas tus actividades con su detalle completo.

A partir de ahí, se sincroniza solo dos veces al día. Self necesita al menos 12 días con datos para empezar a mostrar relaciones, y unas 6 semanas para que sean sólidas.

### Paso 6 · Instalar en el iPhone

1. Abre la dirección de la app en **Safari** e inicia sesión.
2. Pulsa **Compartir → Añadir a pantalla de inicio**.
3. Configura el Atajo de iOS siguiendo [`docs/ATAJO-IOS.md`](docs/ATAJO-IOS.md) para enviar pasos y peso cada noche.

---

## 3. Uso diario

- **Hoy:** tus bloques personalizados. Toca «Personalizar» para elegir, quitar y ordenar la información.
- **Botón +:** registra comidas y bebidas, tu estado al despertar, WOD, marcas personales y analíticas.
- **Cualquier dato:** al tocarlo verás qué lo explica, cómo te afecta, la evolución y los registros diarios.
- **Ajustes** (tus iniciales): los 5 colores de la app, fuentes de datos, actualizar y cerrar sesión.

Tu inicio personalizado y tus colores se guardan en Supabase, así que son los mismos en el iPhone y en el iPad.

---

## 4. Personalización

- **Logotipo:** está en la función `spine()` de `web/js/util.js` y en los PNG de `web/icons/`. Cuando elijas una de las 16 opciones, se sustituyen ambos.
- **Objetivos** (pasos, calorías, proteína, sueño): campo `goal` de cada dato en `web/js/app.js`, en el bloque «Registro de métricas».
- **Ciudad del clima:** variables `SELF_LAT` y `SELF_LON` en `.github/workflows/sync.yml`.
- **Horario de sincronización:** líneas `cron` de `.github/workflows/sync.yml`, en hora UTC.

---

## 5. Limitaciones que conviene conocer

- **API no oficial de Garmin.** Self usa la librería `python-garminconnect` (versión fijada 0.3.17), porque Garmin no ofrece acceso oficial a particulares. Si Garmin cambia algo, el flujo **Sincronizar datos** fallará y te llegará un correo de GitHub. La corrección se limita a `sync/garmin_sync.py`. La respuesta original de cada actividad se guarda en la columna `summary` para poder recalcular sin volver a descargar.
- **Nombres de campos sin verificar con tu cuenta.** Algunos datos (temperatura de la piel, RPE, series de fuerza) dependen de cómo los entregue Garmin para tus dispositivos. Tras la primera sincronización, revisa que aparezcan; si alguno sale vacío, se ajusta en un minuto.
- **Supabase gratuito** pausa los proyectos tras 7 días sin actividad. La sincronización diaria lo evita.
- **Sesión de Garmin.** Los tokens se renuevan solos en cada sincronización. Si un día caducan, basta con repetir el paso 4.
- **Mapas.** Las rutas se dibujan sobre OpenStreetMap y necesitan conexión. Sin conexión, la app muestra el trazado sin mapa de fondo.

---

## 6. Próximas fases

1. **Órbita y Summit:** volcar hábitos, agua, tareas y reuniones en la tabla `context_daily`. Mientras tanto, se registran desde el botón «+».
2. **Conector de Claude (MCP):** como el de Summit y Bolsillo, para preguntar a Claude por tus datos.
3. **Registro de comidas avanzado:** buscador de alimentos y comidas frecuentes.

---

## 7. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| La app muestra «Modo demostración» | `config.js` sin rellenar | Paso 3 |
| «Correo o contraseña incorrectos» | Usuario no creado o sin confirmar | Paso 1, punto 3 |
| La sincronización falla con «No hay tokens de Garmin» | Falta el primer inicio de sesión | Paso 4 |
| La sincronización falla con un error 401 o 403 de Garmin | Tokens caducados | Repite el paso 4 |
| No aparecen pasos ni peso del iPhone | El Atajo no se ejecuta | Revisa `docs/ATAJO-IOS.md` |
| La matriz de relaciones está vacía | Pocos días con datos | Espera a tener al menos 12 días |
