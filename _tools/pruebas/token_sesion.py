# -*- coding: utf-8 -*-
u"""Presta un token de sesion valido a una prueba, sin mostrarlo.

Un token de sesion es una llave: con el se le puede pedir al backend todo lo
que ese usuario puede ver. Por eso este script **imprime el token y nada mas**
en la salida estandar, para que otro programa lo capture, y manda todo lo
legible a la salida de error. Asi no queda en el historial de la terminal ni
se puede pegar por accidente en un chat.

    node prueba.js   # el test lo llama solo
    python token_sesion.py --a-mano   # si hace falta verlo

La hoja `Sesiones` es de SOLO LECTURA y aca solo se lee: A Token, B Usuario,
C Rol, D Creado, E Expira, F Ultimo Uso.
"""
from __future__ import annotations

import sys
import time

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

B = chr(92)
KEY = "C:" + B + "Users" + B + "tadeu" + B + "maleu-service-account.json"
SPREADSHEET_ID = "1ILXCc9ddbC_gJPNoUADBiSMXAWLM9v73ov2_xXb8YsY"
USUARIO = "tadeo"


def main() -> int:
    cred = Credentials.from_service_account_file(
        KEY, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"])
    valores = build("sheets", "v4", credentials=cred).spreadsheets().values()
    filas = valores.get(spreadsheetId=SPREADSHEET_ID,
                        range="Sesiones!A2:F500").execute().get("values", [])

    ahora = time.time()
    mejor = None
    for f in filas:
        if len(f) < 3:
            continue
        token, usuario = (f[0] or "").strip(), (f[1] or "").strip().lower()
        if not token or usuario != USUARIO:
            continue
        # La ultima que se uso es la que mas chance tiene de seguir viva.
        ultimo = (f[5] if len(f) > 5 else "") or (f[3] if len(f) > 3 else "")
        if mejor is None or str(ultimo) > str(mejor[1]):
            mejor = (token, str(ultimo))

    if not mejor:
        sys.stderr.write(
            u"No hay ninguna sesion de %r en la hoja `Sesiones`.\n"
            u"Abri el ERP, entra con tu usuario y PIN, y volve a correr esto.\n" % USUARIO)
        return 2

    sys.stderr.write(u"Token de %s listo (ultimo uso: %s). No se imprime.\n"
                     % (USUARIO, mejor[1] or "-"))
    if "--a-mano" in sys.argv[1:]:
        sys.stderr.write(u"OJO: lo que sigue es una llave. No la pegues en un chat.\n")
    sys.stdout.write(mejor[0])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
