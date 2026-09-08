# -*- coding: utf-8 -*-
"""Devuelve un token de sesion admin vivo, leyendo la hoja Sesiones con la
service account. Se imprime SOLO para que el test lo use en localhost: no va a
ningun archivo versionado."""
import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build

SS = '1ILXCc9ddbC_gJPNoUADBiSMXAWLM9v73ov2_xXb8YsY'
CRED = r'C:\Users\tadeu\maleu-service-account.json'

cred = service_account.Credentials.from_service_account_file(
    CRED, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
sv = build('sheets', 'v4', credentials=cred).spreadsheets().values()
filas = sv.get(spreadsheetId=SS, range='Sesiones!A1:F50').execute().get('values', [])
if not filas:
    print('SIN-SESIONES')
    sys.exit(1)
cab = [str(c).strip().lower() for c in filas[0]]
print('  columnas de Sesiones: ' + ', '.join(cab), file=sys.stderr)
for f in filas[1:]:
    if len(f) >= 3 and str(f[2]).strip().lower() == 'admin':
        print(f[0].strip())
        sys.exit(0)
print('SIN-ADMIN')
sys.exit(1)
