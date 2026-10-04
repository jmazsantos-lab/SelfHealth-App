"""Guarda el clima diario de tu ciudad (Open-Meteo, gratuito y sin registro).

Self cruza la temperatura nocturna con tu sueño y la máxima del día con tu
estrés, tus pasos y tu ritmo en carrera.

Uso:
  python sync/weather_sync.py --days 3
"""
from __future__ import annotations

import argparse

import requests

from common import LAT, LON, TZ, Supabase, date_range, num, today_local


def fetch(days: int) -> list[dict]:
    span = date_range(days)
    age = (today_local() - span[0]).days
    rows: list[dict] = []
    daily = "temperature_2m_min,temperature_2m_max,relative_humidity_2m_mean,wind_speed_10m_max"
    if age > 85:
        r = requests.get("https://archive-api.open-meteo.com/v1/archive", params={
            "latitude": LAT, "longitude": LON, "timezone": str(TZ), "daily": daily,
            "start_date": str(span[0]), "end_date": str(today_local()),
        }, timeout=60)
    else:
        r = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude": LAT, "longitude": LON, "timezone": str(TZ), "daily": daily,
            "past_days": min(92, days), "forecast_days": 1,
        }, timeout=60)
    r.raise_for_status()
    d = r.json()["daily"]
    wanted = {str(x) for x in span}
    for i, day in enumerate(d["time"]):
        if day not in wanted:
            continue
        rows.append({
            "day": day,
            "t_min": num(d["temperature_2m_min"][i], 1),
            "t_max": num(d["temperature_2m_max"][i], 1),
            "humidity": num(d["relative_humidity_2m_mean"][i], 0),
            "wind_kmh": num(d["wind_speed_10m_max"][i], 0),
        })
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Clima diario para Self")
    parser.add_argument("--days", type=int, default=3)
    args = parser.parse_args()
    sb = Supabase()
    rows = fetch(args.days)
    sb.upsert("weather", rows, "user_id,day")
    print(f"Clima guardado: {len(rows)} días")


if __name__ == "__main__":
    main()
