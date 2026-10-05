"""Primer inicio de sesión en Garmin Connect (se ejecuta una sola vez).

Genera los tokens de sesión de Garmin y los guarda en Supabase (tabla
privada garmin_tokens). Después, la sincronización automática los reutiliza
y renueva sin volver a pedir la contraseña.

Dos formas de usarlo:

1. Desde GitHub, sin ordenador (también con verificación en dos pasos):
   Actions → «Primer inicio de sesión en Garmin» → Run workflow.
   Si Garmin pide un código, el flujo abre una incidencia (pestaña Issues)
   llamada «Código de verificación de Garmin». Responde en ella con el código
   que te llegue por correo y el flujo continúa solo. Tienes 15 minutos.

2. Desde un ordenador:
     export SUPABASE_URL=...  SUPABASE_SERVICE_KEY=...  SELF_USER_ID=...
     python sync/garmin_login.py
   El código de verificación se pide por teclado.

Si no hay variables de Supabase, imprime los tokens para pegarlos a mano
como secreto GARMINTOKENS en GitHub.
"""
from __future__ import annotations

import getpass
import os
import re
import sys
import time

import requests
from garminconnect import Garmin

WAIT_MINUTES = 15


def code_from_github_issue() -> str:
    """Abre una incidencia en el repositorio y espera a que el dueño responda con el código."""
    repo = os.environ["GITHUB_REPOSITORY"]
    owner = os.environ.get("GITHUB_REPOSITORY_OWNER", repo.split("/")[0]).lower()
    api = f"https://api.github.com/repos/{repo}"
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}",
                      "Accept": "application/vnd.github+json"})

    body = (
        "Garmin acaba de enviarte un **código de verificación** por correo.\n\n"
        "**Responde a esta incidencia con un comentario que contenga solo el código** "
        "(por ejemplo `123456`). El inicio de sesión continuará solo en unos segundos.\n\n"
        f"Tienes {WAIT_MINUTES} minutos. Solo se aceptan comentarios de @{owner}. "
        "La incidencia se cerrará sola al terminar."
    )
    r = s.post(f"{api}/issues", json={"title": "Código de verificación de Garmin", "body": body}, timeout=30)
    r.raise_for_status()
    issue = r.json()
    number = issue["number"]
    print(f"Esperando el código en la incidencia #{number}: {issue['html_url']}", flush=True)

    deadline = time.time() + WAIT_MINUTES * 60
    try:
        while time.time() < deadline:
            time.sleep(8)
            comments = s.get(f"{api}/issues/{number}/comments", params={"per_page": 50}, timeout=30).json()
            for c in reversed(comments if isinstance(comments, list) else []):
                if (c.get("user") or {}).get("login", "").lower() != owner:
                    continue
                m = re.search(r"\b(\d{6})\b", c.get("body") or "")
                if m:
                    print("Código recibido.", flush=True)
                    return m.group(1)
        sys.exit("No se ha recibido el código a tiempo. Vuelve a lanzar el flujo.")
    finally:
        try:
            s.post(f"{api}/issues/{number}/comments", json={"body": "Proceso terminado. Ya puedes ignorar esta incidencia."}, timeout=30)
            s.patch(f"{api}/issues/{number}", json={"state": "closed"}, timeout=30)
        except requests.RequestException:
            pass


def main() -> None:
    print("Inicio de sesión en Garmin Connect", flush=True)
    in_actions = os.getenv("GITHUB_ACTIONS") == "true"
    email = os.getenv("GARMIN_EMAIL") or input("Correo de Garmin: ").strip()
    password = os.getenv("GARMIN_PASSWORD") or getpass.getpass("Contraseña (no se muestra ni se guarda): ")
    if not email or not password:
        sys.exit("Faltan los secretos GARMIN_EMAIL y GARMIN_PASSWORD.")

    prompt = code_from_github_issue if in_actions else (lambda: input("Código de verificación: ").strip())
    api = Garmin(email, password, prompt_mfa=prompt)
    api.login()
    tokens = api.client.dumps()
    print("Sesión iniciada correctamente.", flush=True)

    if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_KEY") and os.getenv("SELF_USER_ID"):
        from common import Supabase
        sb = Supabase()
        sb.upsert("garmin_tokens", [{"user_id": sb.user_id, "tokens": tokens}], "user_id")
        print("Tokens guardados en Supabase. La sincronización automática ya puede usarlos.")
    else:
        print("\nNo hay variables de Supabase definidas. Copia este texto completo y")
        print("guárdalo como secreto GARMINTOKENS en GitHub (Settings > Secrets > Actions):\n")
        print(tokens)


if __name__ == "__main__":
    main()
