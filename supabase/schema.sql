-- =====================================================================
-- Self · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- Es idempotente: se puede volver a ejecutar sin perder datos.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Datos diarios de salud (Garmin + Apple Salud)
--    Un registro por persona y día. El día es la fecha en la que te
--    despiertas: el sueño de la noche del 2 al 3 se guarda en el día 3.
-- ---------------------------------------------------------------------
create table if not exists public.daily (
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  day            date not null,
  -- Sueño (Garmin)
  sleep_score    numeric,
  sleep_min      numeric,
  deep_min       numeric,
  light_min      numeric,
  rem_min        numeric,
  awake_min      numeric,
  bed_local      timestamp,          -- hora local de acostarse
  wake_local     timestamp,          -- hora local de levantarse
  -- Recuperación y fisiología (Garmin)
  hrv            numeric,            -- ms, media nocturna
  rhr            numeric,            -- lpm
  spo2           numeric,            -- %
  resp           numeric,            -- respiraciones por minuto
  skin_temp_dev  numeric,            -- °C sobre la base
  stress_avg     numeric,            -- 0-100
  bb_max         numeric,            -- Body Battery máximo
  -- Actividad
  steps_garmin   integer,
  steps_phone    integer,            -- desde el Atajo de iOS (Apple Salud)
  active_kcal    numeric,
  -- Cuerpo
  weight_kg      numeric,            -- desde el Atajo de iOS (Apple Salud)
  updated_at     timestamptz not null default now(),
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------
-- 2. Fases del sueño (hipnograma)
--    stage: 0 despierto, 1 REM, 2 ligero, 3 profundo
-- ---------------------------------------------------------------------
create table if not exists public.sleep_stages (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  day         date not null,
  start_local timestamp not null,
  end_local   timestamp not null,
  stage       smallint not null check (stage between 0 and 3),
  primary key (user_id, day, start_local)
);

-- ---------------------------------------------------------------------
-- 3. Actividades de Garmin (con todo el detalle)
-- ---------------------------------------------------------------------
create table if not exists public.activities (
  id             bigint primary key,                 -- id de Garmin
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  day            date not null,
  start_local    timestamp,
  kind           text not null,                       -- run | cf | other
  type_key       text,                                -- tipo original de Garmin
  name           text,
  distance_m     numeric,
  duration_s     numeric,
  avg_hr         numeric,
  max_hr         numeric,
  avg_pace_s     numeric,                             -- s/km
  best_pace_s    numeric,
  avg_cadence    numeric,
  stride_m       numeric,
  elevation_gain numeric,
  calories       numeric,
  te_aerobic     numeric,
  te_anaerobic   numeric,
  training_load  numeric,
  avg_power      numeric,
  vert_osc_cm    numeric,
  gct_ms         numeric,
  sweat_ml       numeric,
  vo2max         numeric,
  bb_impact      numeric,
  rpe            numeric,
  temp_c         numeric,                             -- Open-Meteo al inicio
  humidity       numeric,
  wind_kmh       numeric,
  wind_dir       text,
  location       text,
  samples        jsonb,      -- {dist:[], t:[], pace:[], hr:[], elev:[], cad:[]}
  track          jsonb,      -- [[lat, lon], ...]
  splits         jsonb,      -- parciales por km
  laps           jsonb,      -- vueltas o series
  hr_zones       jsonb,      -- segundos en Z1..Z5
  sets           jsonb,      -- series de fuerza detectadas por Garmin
  summary        jsonb,      -- respuesta original de Garmin (para remapear)
  detail_synced  boolean not null default false,
  updated_at     timestamptz not null default now()
);
create index if not exists activities_user_day on public.activities (user_id, day desc);

-- ---------------------------------------------------------------------
-- 4. Registros manuales desde Self
-- ---------------------------------------------------------------------
create table if not exists public.nutrition (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  day            date not null default (now() at time zone 'America/Havana')::date,
  ts             timestamptz not null default now(),
  meal           text,
  description    text,
  kcal           numeric,
  protein_g      numeric,
  carbs_g        numeric,
  fat_g          numeric,
  caffeine_mg    numeric,
  alcohol_units  numeric,
  water_glasses  numeric
);
create index if not exists nutrition_user_day on public.nutrition (user_id, day desc);

create table if not exists public.wods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  day          date not null default (now() at time zone 'America/Havana')::date,
  activity_id  bigint references public.activities on delete set null,
  name         text not null,
  description  text,
  result       text,
  rx           boolean default true,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.personal_records (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  name      text not null,
  unit      text not null check (unit in ('kg','time')),
  value     numeric not null,          -- kg, o segundos si unit = 'time'
  day       date not null default (now() at time zone 'America/Havana')::date
);

create table if not exists public.lab_results (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  day       date not null,
  marker    text not null,
  value     numeric not null,
  unit      text,
  ref_low   numeric,
  ref_high  numeric
);

-- Contexto diario: estado al despertar, trabajo y hábitos
create table if not exists public.context_daily (
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  day          date not null,
  energy       numeric,          -- 1-5
  mood         numeric,          -- 1-5
  tasks_done   numeric,          -- Summit
  meetings     numeric,
  habits_pct   numeric,          -- Órbita
  updated_at   timestamptz not null default now(),
  primary key (user_id, day)
);

-- Clima diario (Open-Meteo)
create table if not exists public.weather (
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  day       date not null,
  t_min     numeric,
  t_max     numeric,
  humidity  numeric,
  wind_kmh  numeric,
  primary key (user_id, day)
);

-- Ajustes de la app (inicio personalizado y colores)
create table if not exists public.settings (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  home       jsonb,
  colors     jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Tablas privadas del sistema (solo accesibles con la clave de servicio)
-- ---------------------------------------------------------------------
create table if not exists public.garmin_tokens (
  user_id    uuid primary key references auth.users on delete cascade,
  tokens     text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ingest_tokens (
  token      text primary key default encode(gen_random_bytes(24), 'hex'),
  user_id    uuid not null references auth.users on delete cascade,
  label      text default 'Atajo iPhone',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Seguridad: cada persona solo ve y modifica sus propios datos
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['daily','sleep_stages','activities','nutrition','wods',
                           'personal_records','lab_results','context_daily','weather','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "propietario" on public.%I', t);
    execute format('create policy "propietario" on public.%I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Tablas del sistema: RLS activado y sin políticas = nadie puede leerlas
-- desde la app; solo los scripts con la clave de servicio.
alter table public.garmin_tokens enable row level security;
alter table public.ingest_tokens enable row level security;

-- ---------------------------------------------------------------------
-- 7. Función para el Atajo de iOS (pasos y peso desde Apple Salud)
--    Se llama con la clave pública (anon) y un token secreto personal.
-- ---------------------------------------------------------------------
-- Convierte textos como "8.450", "77,6" o "77.6" en número (formato español o inglés)
create or replace function public.parse_num(p text) returns numeric
language sql immutable as $$
  select case
    when p is null or btrim(p) = '' then null
    when btrim(p) ~ ',' then replace(replace(btrim(p), '.', ''), ',', '.')::numeric
    when btrim(p) ~ '^\d{1,3}(\.\d{3})+$' then replace(btrim(p), '.', '')::numeric
    else btrim(p)::numeric
  end
$$;

drop function if exists public.ingest_apple_health(text, date, integer, numeric);
create or replace function public.ingest_apple_health(
  p_token  text,
  p_day    text,
  p_steps  text default null,
  p_weight text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid;
  v_steps  integer := round(public.parse_num(p_steps));
  v_weight numeric := round(public.parse_num(p_weight), 1);
begin
  select user_id into v_user from public.ingest_tokens where token = btrim(p_token);
  if v_user is null then
    raise exception 'Token no válido';
  end if;

  insert into public.daily (user_id, day, steps_phone, weight_kg, updated_at)
  values (v_user, left(btrim(p_day), 10)::date, v_steps, v_weight, now())
  on conflict (user_id, day) do update set
    steps_phone = coalesce(excluded.steps_phone, daily.steps_phone),
    weight_kg   = coalesce(excluded.weight_kg,   daily.weight_kg),
    updated_at  = now();

  return 'ok';
end $$;

revoke all on function public.ingest_apple_health(text, text, text, text) from public;
grant execute on function public.ingest_apple_health(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Después de crear tu usuario (Authentication > Users), ejecuta esto
--    para generar el token del Atajo de iOS y anotarlo:
--
--    insert into public.ingest_tokens (user_id)
--    select id from auth.users where email = 'TU_CORREO' returning token;
-- ---------------------------------------------------------------------
