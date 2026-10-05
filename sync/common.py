"""Utilidades compartidas por los scripts de sincronización de Self.

Variables de entorno necesarias:
  SUPABASE_URL          https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY  clave "service_role" (secreta, nunca en la web)
  SELF_USER_ID          id de tu usuario en Supabase (Authentication > Users)
Opcionales:
  SELF_TZ               zona horaria (por defecto America/Havana)
  SELF_LAT / SELF_LON   coordenadas para el clima (por defecto La Habana)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import requests

TZ = ZoneInfo(os.getenv("SELF_TZ", "America/Havana"))
LAT = float(os.getenv("SELF_LAT", "23.1367"))
LON = float(os.getenv("SELF_LON", "-82.3830"))


def env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        sys.exit(f"Falta la variable de entorno {name}. Revisa los secretos del repositorio.")
    return value


def today_local() -> date:
    return datetime.now(TZ).date()


def date_range(days: int) -> list[date]:
    end = today_local()
    return [end - timedelta(days=n) for n in range(days - 1, -1, -1)]


def num(value, digits: int | None = None):
    """Convierte a número o None, sin fallar nunca."""
    if value is None or value == "":
        return None
    try:
        out = float(value)
    except (TypeError, ValueError):
        return None
    if out != out:  # NaN
        return None
    return round(out, digits) if digits is not None else out


def dig(data, *path, default=None):
    """Lee una clave anidada sin fallar: dig(d, 'a', 'b', 0, 'c')."""
    cur = data
    for key in path:
        if cur is None:
            return default
        try:
            cur = cur[key]
        except (KeyError, IndexError, TypeError):
            return default
    return default if cur is None else cur


def first(data, *keys):
    """Devuelve el primer valor no vacío entre varias claves posibles."""
    if not isinstance(data, dict):
        return None
    for key in keys:
        if data.get(key) is not None:
            return data[key]
    return None


def check_service_key(key: str) -> None:
    """Detecta el error más habitual: poner la clave pública en lugar de la secreta."""
    if key.startswith("sb_publishable_"):
        sys.exit("El secreto SUPABASE_SERVICE_KEY contiene la clave pública (sb_publishable_…). "
                 "Sustitúyelo por la clave secreta (sb_secret_…) de Supabase → Project Settings → API Keys.")
    if key.startswith("eyJ"):
        import base64
        try:
            part = key.split(".")[1]
            role = json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))).get("role")
        except Exception:
            role = None
        if role and role != "service_role":
            sys.exit(f"El secreto SUPABASE_SERVICE_KEY contiene la clave «{role}». "
                     "Sustitúyelo por la clave service_role (o la nueva sb_secret_…) de Supabase → Project Settings → API Keys.")


class Supabase:
    """Cliente REST mínimo con la clave de servicio."""

    def __init__(self) -> None:
        self.url = env("SUPABASE_URL").rstrip("/")
        self.key = env("SUPABASE_SERVICE_KEY")
        self.user_id = env("SELF_USER_ID")
        check_service_key(self.key)
        self.s = requests.Session()
        headers = {"apikey": self.key, "Content-Type": "application/json"}
        # Las claves antiguas (JWT) van también en Authorization; las nuevas (sb_secret_…) solo en apikey
        if not self.key.startswith("sb_"):
            headers["Authorization"] = f"Bearer {self.key}"
        self.s.headers.update(headers)

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> int:
        if not rows:
            return 0
        for row in rows:
            row.setdefault("user_id", self.user_id)
        total = 0
        for i in range(0, len(rows), 200):
            chunk = rows[i:i + 200]
            r = self.s.post(
                f"{self.url}/rest/v1/{table}",
                params={"on_conflict": on_conflict},
                headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
                data=json.dumps(chunk, default=str),
                timeout=60,
            )
            if r.status_code >= 300:
                raise RuntimeError(f"Error al guardar en {table}: {r.status_code} {r.text[:300]}")
            total += len(chunk)
        return total

    def select(self, table: str, **params) -> list[dict]:
        r = self.s.get(f"{self.url}/rest/v1/{table}", params=params, timeout=60)
        if r.status_code >= 300:
            raise RuntimeError(f"Error al leer {table}: {r.status_code} {r.text[:300]}")
        return r.json()

    def delete(self, table: str, **params) -> None:
        r = self.s.delete(f"{self.url}/rest/v1/{table}", params=params, timeout=60)
        if r.status_code >= 300:
            raise RuntimeError(f"Error al borrar en {table}: {r.status_code} {r.text[:300]}")


def weather_at(lat: float, lon: float, when: datetime) -> dict:
    """Temperatura, humedad y viento (Open-Meteo) a una hora local concreta."""
    day = when.date()
    age = (today_local() - day).days
    base = ("https://archive-api.open-meteo.com/v1/archive" if age > 60
            else "https://api.open-meteo.com/v1/forecast")
    params = {
        "latitude": lat, "longitude": lon, "timezone": str(TZ),
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
    }
    if age > 60:
        params.update(start_date=str(day), end_date=str(day))
    else:
        params.update(past_days=min(92, max(1, age + 1)), forecast_days=1)
    try:
        r = requests.get(base, params=params, timeout=30)
        r.raise_for_status()
        h = r.json()["hourly"]
        target = when.strftime("%Y-%m-%dT%H:00")
        idx = h["time"].index(target)
    except Exception:
        return {}
    deg = h["wind_direction_10m"][idx]
    points = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
    return {
        "temp_c": num(h["temperature_2m"][idx], 1),
        "humidity": num(h["relative_humidity_2m"][idx], 0),
        "wind_kmh": num(h["wind_speed_10m"][idx], 0),
        "wind_dir": points[int(((deg or 0) + 22.5) // 45) % 8] if deg is not None else None,
    }
