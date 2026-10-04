"""Sincroniza Garmin Connect con Supabase.

Descarga, para los últimos N días:
  - Salud diaria: sueño y sus fases, HRV, FC en reposo, SpO2, respiración,
    temperatura de la piel, estrés, Body Battery, pasos y calorías activas.
  - Actividades completas: resumen, ruta GPS, ritmo, FC, altitud y cadencia
    segundo a segundo (reducidos a ~400 puntos), parciales por km, vueltas,
    zonas de FC, series de fuerza y condiciones meteorológicas al inicio.

Uso:
  python sync/garmin_sync.py --days 3          # diario (lo hace GitHub Actions)
  python sync/garmin_sync.py --days 120        # carga inicial del histórico
  python sync/garmin_sync.py --days 30 --refresh-details

Usa la librería no oficial python-garminconnect. Si Garmin cambia su API,
este es el único archivo que habrá que ajustar.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime, timedelta, timezone

from garminconnect import Garmin
from garminconnect.activity_details import parse_activity_detail_metrics

from common import LAT, LON, Supabase, date_range, dig, first, num, weather_at

RUN_TYPES = {"running", "treadmill_running", "trail_running", "track_running",
             "indoor_running", "virtual_run", "ultra_run", "street_running"}
CF_TYPES = {"strength_training", "hiit", "indoor_cardio", "fitness_equipment",
            "crossfit", "cardio_training", "boxing", "mixed_martial_arts"}
# Garmin: 0 profundo, 1 ligero, 2 REM, 3 despierto  ->  Self: 0 despierto, 1 REM, 2 ligero, 3 profundo
STAGE_MAP = {0: 3, 1: 2, 2: 1, 3: 0}
LAP_NAMES = {"WARMUP": "Calentamiento", "COOLDOWN": "Vuelta a la calma", "REST": "Recuperación",
             "RECOVERY": "Recuperación", "INTERVAL": "Serie", "ACTIVE": "Serie"}
EXERCISES = {"SQUAT": "Sentadilla", "DEADLIFT": "Peso muerto", "BENCH_PRESS": "Press de banca",
             "SHOULDER_PRESS": "Press de hombro", "OLYMPIC_LIFT": "Halterofilia", "PULL_UP": "Dominadas",
             "PUSH_UP": "Flexiones", "LUNGE": "Zancadas", "ROW": "Remo", "CORE": "Core",
             "PLANK": "Plancha", "CARDIO": "Cardio", "TOTAL_BODY": "Cuerpo completo"}
PAUSE = 0.35


def call(fn, *args, **kwargs):
    """Llama a Garmin sin detener la sincronización si un dato concreto falla."""
    try:
        out = fn(*args, **kwargs)
        time.sleep(PAUSE)
        return out
    except Exception as exc:  # noqa: BLE001
        print(f"  Aviso: {fn.__name__} no disponible ({type(exc).__name__})")
        return None


def local_ts(ms):
    """Garmin entrega las horas 'locales' como milisegundos de época sin zona."""
    if not ms:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).replace(tzinfo=None)


# ----------------------------------------------------------------------------
# Inicio de sesión con tokens guardados
# ----------------------------------------------------------------------------
def login(sb: Supabase) -> Garmin:
    tokens = None
    try:
        rows = sb.select("garmin_tokens", select="tokens", user_id=f"eq.{sb.user_id}")
        tokens = rows[0]["tokens"] if rows else None
    except RuntimeError:
        pass
    tokens = tokens or os.getenv("GARMINTOKENS")
    if not tokens:
        sys.exit("No hay tokens de Garmin. Ejecuta antes: python sync/garmin_login.py")
    api = Garmin()
    api.login(tokens)
    return api


def save_tokens(sb: Supabase, api: Garmin) -> None:
    try:
        sb.upsert("garmin_tokens", [{"user_id": sb.user_id, "tokens": api.client.dumps(),
                                     "updated_at": datetime.now(timezone.utc).isoformat()}], "user_id")
    except Exception as exc:  # noqa: BLE001
        print(f"Aviso: no se pudieron renovar los tokens ({exc})")


# ----------------------------------------------------------------------------
# Salud diaria
# ----------------------------------------------------------------------------
def sync_day(api: Garmin, day: str):
    stats = call(api.get_stats, day) or {}
    sleep = call(api.get_sleep_data, day) or {}
    dto = sleep.get("dailySleepDTO") or {}
    hrv = call(api.get_hrv_data, day) or {}

    row = {
        "day": day,
        "steps_garmin": int(stats["totalSteps"]) if stats.get("totalSteps") is not None else None,
        "active_kcal": num(stats.get("activeKilocalories"), 0),
        "rhr": num(first(stats, "restingHeartRate") or first(sleep, "restingHeartRate"), 0),
        "stress_avg": num(stats.get("averageStressLevel"), 0),
        "bb_max": num(stats.get("bodyBatteryHighestValue"), 0),
        "hrv": num(dig(hrv, "hrvSummary", "lastNightAvg") or first(sleep, "avgOvernightHrv"), 0),
        "sleep_score": None, "sleep_min": None, "deep_min": None, "light_min": None,
        "rem_min": None, "awake_min": None, "bed_local": None, "wake_local": None,
        "spo2": None, "resp": None, "skin_temp_dev": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if row["stress_avg"] is not None and row["stress_avg"] < 0:
        row["stress_avg"] = None

    stages = []
    if dto.get("sleepTimeSeconds"):
        m = lambda k: num((dto.get(k) or 0) / 60, 0)  # noqa: E731
        row.update(
            sleep_min=m("sleepTimeSeconds"), deep_min=m("deepSleepSeconds"),
            light_min=m("lightSleepSeconds"), rem_min=m("remSleepSeconds"),
            awake_min=m("awakeSleepSeconds"),
            sleep_score=num(dig(dto, "sleepScores", "overall", "value"), 0),
            resp=num(first(dto, "averageRespirationValue"), 1),
            spo2=num(first(dto, "averageSpO2Value", "avgSpO2"), 1),
            bed_local=local_ts(dto.get("sleepStartTimestampLocal")),
            wake_local=local_ts(dto.get("sleepEndTimestampLocal")),
            skin_temp_dev=num(first(sleep, "avgSkinTempDeviationC", "skinTempDeviationC")
                              or first(dto, "avgSkinTempDeviationC", "skinTempDeviationC"), 1),
        )
        offset = (dto.get("sleepStartTimestampLocal") or 0) - (dto.get("sleepStartTimestampGMT") or 0)
        for lvl in sleep.get("sleepLevels") or []:
            try:
                start = datetime.fromisoformat(lvl["startGMT"][:19]) + timedelta(milliseconds=offset)
                end = datetime.fromisoformat(lvl["endGMT"][:19]) + timedelta(milliseconds=offset)
                stage = STAGE_MAP.get(int(lvl["activityLevel"]))
            except (KeyError, TypeError, ValueError):
                continue
            if stage is not None and end > start:
                stages.append({"day": day, "start_local": start, "end_local": end, "stage": stage})

    if row["spo2"] is None:
        spo2 = call(api.get_spo2_data, day) or {}
        row["spo2"] = num(first(spo2, "avgSleepSpO2", "averageSpO2"), 1)
    return row, stages


# ----------------------------------------------------------------------------
# Actividades
# ----------------------------------------------------------------------------
def kind_of(type_key: str | None) -> str:
    if type_key in RUN_TYPES:
        return "run"
    if type_key in CF_TYPES:
        return "cf"
    return "other"


def summary_row(a: dict) -> dict:
    type_key = dig(a, "activityType", "typeKey")
    kind = kind_of(type_key)
    start = a.get("startTimeLocal")
    dist = num(a.get("distance"))
    dur = num(a.get("duration"))
    pace = dur / (dist / 1000) if kind == "run" and dist and dur else None
    max_speed = num(a.get("maxSpeed"))
    rpe = num(first(a, "directWorkoutRpe", "workoutRpe"))
    cad = num(first(a, "averageRunningCadenceInStepsPerMinute", "averageBikingCadenceInRevPerMinute"), 0)
    stride = num(a.get("avgStrideLength"))
    return {
        "id": int(a["activityId"]),
        "day": start[:10] if start else None,
        "start_local": start,
        "kind": kind,
        "type_key": type_key,
        "name": a.get("activityName"),
        "distance_m": num(dist, 0),
        "duration_s": num(dur, 0),
        "avg_hr": num(a.get("averageHR"), 0),
        "max_hr": num(a.get("maxHR"), 0),
        "avg_pace_s": num(pace, 0),
        "best_pace_s": num(1000 / max_speed, 0) if kind == "run" and max_speed else None,
        "avg_cadence": cad,
        "stride_m": num(stride / 100, 2) if stride else None,
        "elevation_gain": num(a.get("elevationGain"), 0),
        "calories": num(a.get("calories"), 0),
        "te_aerobic": num(a.get("aerobicTrainingEffect"), 1),
        "te_anaerobic": num(a.get("anaerobicTrainingEffect"), 1),
        "training_load": num(a.get("activityTrainingLoad"), 0),
        "avg_power": num(a.get("avgPower"), 0),
        "vert_osc_cm": num(a.get("avgVerticalOscillation"), 1),
        "gct_ms": num(a.get("avgGroundContactTime"), 0),
        "sweat_ml": num(a.get("waterEstimated"), 0),
        "vo2max": num(a.get("vO2MaxValue"), 0),
        "bb_impact": num(a.get("differenceBodyBattery"), 0),
        "rpe": num(rpe / 10 if rpe and rpe > 10 else rpe, 0),
        "location": a.get("locationName"),
        "summary": a,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def downsample(points: list[dict], max_points: int = 400) -> list[dict]:
    if len(points) <= max_points:
        return points
    step = len(points) / max_points
    return [points[int(i * step)] for i in range(max_points)] + [points[-1]]


def rolling(values, window=5):
    out = []
    for i in range(len(values)):
        chunk = [v for v in values[max(0, i - window // 2): i + window // 2 + 1] if v is not None]
        out.append(round(sum(chunk) / len(chunk), 1) if chunk else None)
    return out


def detail_rows(api: Garmin, base: dict) -> dict:
    """Detalle completo de una actividad: muestras, ruta, parciales, vueltas, zonas y series."""
    aid = base["id"]
    out: dict = {"detail_synced": True}
    details = call(api.get_activity_details, aid) or {}
    raw = [s for s in parse_activity_detail_metrics(details) if s] if details else []
    raw = downsample(raw)

    samples = {"dist": [], "t": [], "pace": [], "hr": [], "elev": [], "cad": []}
    track = []
    for s in raw:
        dist = num(s.get("sumDistance"))
        speed = num(s.get("directSpeed"))
        cad = num(s.get("directDoubleCadence")) or num(s.get("directRunCadence"))
        if cad and cad < 120 and base["kind"] == "run":
            cad *= 2
        pace = 1000 / speed if speed and speed > 0.5 else None
        samples["dist"].append(round(dist / 1000, 3) if dist is not None else None)
        samples["t"].append(num(first(s, "sumDuration", "sumElapsedDuration"), 0))
        samples["pace"].append(round(pace, 1) if pace and 120 <= pace <= 900 else None)
        samples["hr"].append(num(s.get("directHeartRate"), 0))
        samples["elev"].append(num(s.get("directElevation"), 1))
        samples["cad"].append(num(cad, 0))
        lat, lon = num(s.get("directLatitude")), num(s.get("directLongitude"))
        if lat and lon:
            track.append([round(lat, 5), round(lon, 5)])
    if not track:
        poly = dig(details, "geoPolylineDTO", "polyline") or []
        track = [[round(p["lat"], 5), round(p["lon"], 5)] for p in poly if p.get("lat") and p.get("lon")]
        if len(track) > 400:
            step = len(track) / 400
            track = [track[int(i * step)] for i in range(400)]
    if any(v is not None for v in samples["pace"]):
        samples["pace"] = rolling(samples["pace"], 7)
    if any(v is not None for v in samples["cad"]):
        samples["cad"] = rolling(samples["cad"], 5)
    out["samples"] = samples if raw else None
    out["track"] = track or None

    # Parciales por kilómetro
    splits = []
    if base["kind"] == "run" and raw:
        km_mark, t0, i0 = 1.0, 0.0, 0
        dists, times = samples["dist"], samples["t"]
        for i, d in enumerate(dists):
            if d is None or times[i] is None:
                continue
            last = i == len(dists) - 1
            if d >= km_mark or last:
                seg = range(i0, i + 1)
                up = sum(max(0, (samples["elev"][j] or 0) - (samples["elev"][j - 1] or 0)) for j in seg if j > 0)
                span = d - (km_mark - 1)
                if span > 0.05:
                    t = times[i] - t0
                    hrs = [samples["hr"][j] for j in seg if samples["hr"][j]]
                    cads = [samples["cad"][j] for j in seg if samples["cad"][j]]
                    splits.append({"k": int(km_mark), "dd": round(min(1, span), 2), "t": round(t),
                                   "p": round(t / min(1, span)),
                                   "hr": round(sum(hrs) / len(hrs)) if hrs else None,
                                   "cad": round(sum(cads) / len(cads)) if cads else None,
                                   "up": round(up)})
                km_mark += 1
                t0, i0 = times[i], i
    out["splits"] = splits or None

    # Vueltas o series
    laps_raw = dig(call(api.get_activity_splits, aid) or {}, "lapDTOs", default=[])
    laps = []
    for lap in laps_raw:
        dist, dur = num(lap.get("distance")), num(lap.get("duration"))
        laps.append({"label": LAP_NAMES.get(str(lap.get("intensityType", "")).upper(), "Vuelta"),
                     "d": round(dist or 0), "t": round(dur or 0),
                     "p": round(dur / (dist / 1000)) if dist and dur else None,
                     "hr": num(lap.get("averageHR"), 0),
                     "rep": str(lap.get("intensityType", "")).upper() in ("INTERVAL", "ACTIVE")})
    out["laps"] = laps if len(laps) > 1 else None

    # Zonas de frecuencia cardíaca
    zones = call(api.get_activity_hr_in_timezones, aid) or []
    if isinstance(zones, list) and zones:
        secs = [0, 0, 0, 0, 0]
        for z in zones:
            n = int(z.get("zoneNumber") or 0)
            if 1 <= n <= 5:
                secs[n - 1] = round(num(z.get("secsInZone")) or 0)
        out["hr_zones"] = secs

    # Series de fuerza (CrossFit, gimnasio)
    if base["kind"] == "cf":
        sets_raw = dig(call(api.get_activity_exercise_sets, aid) or {}, "exerciseSets", default=[])
        sets = []
        for s in sets_raw:
            if str(s.get("setType", "")).upper() != "ACTIVE":
                continue
            cat = dig(s, "exercises", 0, "category") or ""
            weight = num(s.get("weight"))
            if weight and weight > 1000:
                weight = weight / 1000  # Garmin lo entrega en gramos
            sets.append({"ex": EXERCISES.get(cat, cat.replace("_", " ").capitalize() or "Ejercicio"),
                         "reps": s.get("repetitionCount"), "kg": num(weight, 1),
                         "dur": num(s.get("duration"), 0)})
        out["sets"] = sets or None

    # Condiciones meteorológicas al inicio (Open-Meteo, unidades fiables)
    start = base.get("start_local")
    if start:
        lat = track[0][0] if track else num(base["summary"].get("startLatitude")) or LAT
        lon = track[0][1] if track else num(base["summary"].get("startLongitude")) or LON
        out.update(weather_at(lat, lon, datetime.fromisoformat(start[:19])))
    return out


# ----------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="Sincroniza Garmin Connect con Self")
    parser.add_argument("--days", type=int, default=3)
    parser.add_argument("--refresh-details", action="store_true")
    args = parser.parse_args()

    sb = Supabase()
    api = login(sb)
    days = date_range(args.days)
    print(f"Sincronizando {len(days)} días ({days[0]} a {days[-1]})")

    daily, stage_days = [], {}
    for d in days:
        row, stages = sync_day(api, str(d))
        daily.append(row)
        if stages:
            stage_days[str(d)] = stages
    sb.upsert("daily", daily, "user_id,day")
    for day, stages in stage_days.items():
        sb.delete("sleep_stages", user_id=f"eq.{sb.user_id}", day=f"eq.{day}")
        sb.upsert("sleep_stages", stages, "user_id,day,start_local")
    print(f"Días guardados: {len(daily)}; noches con fases: {len(stage_days)}")

    acts = call(api.get_activities_by_date, str(days[0]), str(days[-1])) or []
    done = set()
    if acts and not args.refresh_details:
        ids = ",".join(str(a["activityId"]) for a in acts)
        done = {r["id"] for r in sb.select("activities", select="id", id=f"in.({ids})", detail_synced="eq.true")}
    rows = []
    for a in acts:
        base = summary_row(a)
        if not base["day"]:
            continue
        if base["id"] not in done:
            base.update(detail_rows(api, base))
        rows.append(base)
    # PostgREST exige las mismas columnas en cada fila de un lote
    keys = set().union(*(r.keys() for r in rows)) if rows else set()
    for r in rows:
        for k in keys:
            r.setdefault(k, None)
        if r["id"] in done:
            for k in ("samples", "track", "splits", "laps", "hr_zones", "sets", "detail_synced",
                      "temp_c", "humidity", "wind_kmh", "wind_dir"):
                r.pop(k, None)
    full = [r for r in rows if "detail_synced" in r]
    light = [r for r in rows if "detail_synced" not in r]
    sb.upsert("activities", full, "id")
    sb.upsert("activities", light, "id")
    print(f"Actividades: {len(rows)} ({len(full)} con detalle nuevo)")

    save_tokens(sb, api)


if __name__ == "__main__":
    main()
