"""Primer inicio de sesión en Garmin Connect (se ejecuta una sola vez, en tu ordenador).

Pide tu correo, tu contraseña y, si lo tienes activado, el código de
verificación en dos pasos. Genera los tokens de sesión y los guarda en
Supabase (tabla privada garmin_tokens). A partir de ahí, la sincronización
automática reutiliza y renueva esos tokens sin volver a pedir la contraseña.

Uso:
  export SUPABASE_URL=...  SUPABASE_SERVICE_KEY=...  SELF_USER_ID=...
  python sync/garmin_login.py

También puede ejecutarse desde GitHub Actions (flujo «Primer inicio de sesión
en Garmin») con los secretos GARMIN_EMAIL y GARMIN_PASSWORD, siempre que tu
cuenta de Garmin no tenga activada la verificación en dos pasos.

Si no defines las variables de Supabase, el script imprime los tokens para
que los pegues a mano como secreto GARMINTOKENS en GitHub.
"""
from __future__ import annotations

import getpass
import os

from garminconnect import Garmin


def main() -> None:
    print("Inicio de sesión en Garmin Connect")
    # Modo sin teclado (GitHub Actions): solo funciona sin verificación en dos pasos
    email = os.getenv("GARMIN_EMAIL") or input("Correo de Garmin: ").strip()
    password = os.getenv("GARMIN_PASSWORD") or getpass.getpass("Contraseña (no se muestra ni se guarda): ")

    api = Garmin(email, password, prompt_mfa=lambda: input("Código de verificación: ").strip())
    api.login()
    tokens = api.client.dumps()
    print("\nSesión iniciada correctamente.")

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
