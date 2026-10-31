# -*- coding: utf-8 -*-
"""CUÁNTO TARDA EN QUEDAR GUARDADA CADA ACCIÓN, con lo que pasó de verdad (31/10/2026). Solo lee.
     python _tools/pruebas/medir_guardado.py [dias=7] [accion1,accion2,...]
De la base (order_command, con la Secret Key de ~/.maleu/supabase.env): cuántas hubo de cada acción y cuántas aceptó la
base directo (`payload._directo`). De la planilla («Log Candado», con la service account): cuánto tuvo Apps Script cada
POST de esa acción (Espero + Lo tuvo), mediana y p90. Eso es el piso del camino lento: el viaje y el arranque de Apps
Script van encima (1-3 s más, medido el 10/9). Una directa queda guardada cuando la base contesta (~0,3-0,6 s)."""
import json, os, sys, urllib.request, urllib.parse, statistics
from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build

DIAS = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 7
SOLO = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
env = {}
for l in open(os.path.join(os.path.expanduser('~'), '.maleu', 'supabase.env'), encoding='utf-8'):
    if '=' in l and not l.strip().startswith('#'):
        a, b = l.strip().split('=', 1); env[a.strip()] = b.strip().strip('"').strip("'")
K = env['SUPABASE_SECRET_KEY']; U = env['SUPABASE_URL'].rstrip('/') + '/rest/v1/'
desde = (datetime.utcnow() - timedelta(days=DIAS)).strftime('%Y-%m-%dT%H:%M:%SZ')
ords, off = [], 0
while True:
    q = 'order_command?select=action,payload->>_directo,received_at&received_at=gte.' + urllib.parse.quote(desde) + '&order=seq&limit=1000&offset=' + str(off)
    r = json.load(urllib.request.urlopen(urllib.request.Request(U + q, headers={'apikey': K, 'Authorization': 'Bearer ' + K}), timeout=60))
    ords += r; off += 1000
    if len(r) < 1000: break
por = {}
for o in ords:
    a = o['action']; d = por.setdefault(a, {'n': 0, 'dir': 0})
    d['n'] += 1; d['dir'] += 1 if str(o.get('_directo') or '') == '1' else 0

cred = service_account.Credentials.from_service_account_file(r'C:\Users\tadeu\maleu-service-account.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
sv = build('sheets', 'v4', credentials=cred).spreadsheets().values()
SS = '1ILXCc9ddbC_gJPNoUADBiSMXAWLM9v73ov2_xXb8YsY'
filas = sv.get(spreadsheetId=SS, range="'Log Candado'!A2:F").execute().get('values', [])
lim = datetime.now() - timedelta(days=DIAS)
ms = {}
for f in filas:
    if len(f) < 6 or not str(f[3]).startswith('POST '): continue
    try: t = datetime.strptime(f[0], '%d/%m/%Y %H:%M:%S')
    except Exception: continue
    if t < lim: continue
    try: v = float(str(f[4]).replace('.', '').replace(',', '.') or 0) + float(str(f[5]).replace('.', '').replace(',', '.') or 0)
    except Exception: continue
    ms.setdefault(f[3][5:].strip(), []).append(v)

acc = sorted(set(por) | set(ms), key=lambda a: -(por.get(a, {}).get('n', 0) + len(ms.get(a, []))))
print('accion'.ljust(28) + 'ordenes  directo  | POST Apps Script: n  mediana   p90 (ms)')
for a in acc:
    if SOLO and a not in SOLO: continue
    d = por.get(a, {'n': 0, 'dir': 0}); m = sorted(ms.get(a, []))
    med = int(statistics.median(m)) if m else '-'; p90 = int(m[int(len(m) * 0.9) - 1]) if len(m) >= 10 else '-'
    print(a.ljust(28) + str(d['n']).rjust(7) + str(d['dir']).rjust(9) + '  | ' + str(len(m)).rjust(18) + str(med).rjust(9) + str(p90).rjust(6))
