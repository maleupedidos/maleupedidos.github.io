# -*- coding: utf-8 -*-
"""Genera data/lotes-ubicacion.json: el indice (sub-barrio, lote) -> lat/lng
que usa el boton "Ubicacion" de la tab Ruta.

Por que un archivo generado y no una consulta al backend: Ruta es offline-first
y Tadeo maneja por adentro del barrio, donde la senal se corta. Un JSON estatico
lo cachea el service worker y funciona sin datos. Ademas evita duplicar en Ruta
la geometria (point-in-polygon) que ya vive en el mapa del panel.

Se regenera a mano cuando se mueven puntos en el mapa de Estancias:
    python _tools/lotes-ubicacion.py

NO lleva un solo dato de cliente: solo sub-barrio, numero de lote y coordenadas.
El repo es publico (GitHub Pages) -- ver la memoria repo-web-nunca-datos-clientes.
"""
import io, json, os, re, sys, unicodedata

from google.oauth2 import service_account
from googleapiclient.discovery import build

SA_KEY = r'C:\Users\tadeu\maleu-service-account.json'
SHEET_ID = '1ILXCc9ddbC_gJPNoUADBiSMXAWLM9v73ov2_xXb8YsY'

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEOJSON = os.path.join(RAIZ, 'data', 'estancias-nros.geojson')
SALIDA = os.path.join(RAIZ, 'data', 'lotes-ubicacion.json')


def leer(sv, rango):
    return sv.get(spreadsheetId=SHEET_ID, range=rango).execute().get('values', [])


def num(x):
    """Los numeros de la planilla vienen con coma decimal (formato AR)."""
    s = str(x or '').strip().replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None


def norm_sub(s):
    s = str(s or '').lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s).strip()


def lote_norm(s):
    s = re.sub(r'\s+', ' ', str(s or '').strip().lower())
    return re.sub(r'^0+(?=\d)', '', s) or '0'


def lote_tokens(n):
    """Una casa puede ocupar varios lotes: "78, 79 y 80", "78/80", "78-80"."""
    s = str(n if n is not None else '').strip()
    if not s:
        return ['0']
    partes = [p.strip() for p in re.split(r'\s*,\s*|\s*;\s*|\s*/\s*|\s+y\s+', s, flags=re.I) if p.strip()]
    if not partes:
        partes = [s]
    out = []
    for p in partes:
        m = re.match(r'^(\d+)\s*-\s*(\d+)$', p)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            if b >= a and b - a <= 100:
                out.extend(lote_norm(i) for i in range(a, b + 1))
                continue
        out.append(lote_norm(p))
    return out


def pip(lat, lng, poly):
    """Point in polygon por ray casting. poly = [[lat,lng], ...]"""
    dentro = False
    j = len(poly) - 1
    for i in range(len(poly)):
        yi, xi = poly[i][0], poly[i][1]
        yj, xj = poly[j][0], poly[j][1]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi):
            dentro = not dentro
        j = i
    return dentro


def main():
    creds = service_account.Credentials.from_service_account_file(
        SA_KEY, scopes=['https://www.googleapis.com/auth/spreadsheets'])
    sv = build('sheets', 'v4', credentials=creds, cache_discovery=False).spreadsheets().values()

    # 1. correcciones de puntos (hoja Lotes Puntos): movidos, renombrados,
    #    borrados y agregados a mano desde el editor del mapa.
    ov = {}
    for f in leer(sv, "'Lotes Puntos'!A2:H1000"):
        f = f + [''] * (8 - len(f))
        if not str(f[0]).strip():
            continue
        ov[str(f[0]).strip()] = {
            'lote': str(f[1]).strip(), 'lat': num(f[2]), 'lng': num(f[3]),
            'borrado': str(f[4]).strip().lower() in ('true', 'si', 'si', '1', 'x'),
            'tipo': str(f[6]).strip().lower()}

    # 2. zonas: los poligonos que le dan sub-barrio a cada punto.
    subzonas, exclzonas = [], []
    for f in leer(sv, "'Lotes Zonas'!A2:D80"):
        f = f + [''] * (4 - len(f))
        nombre, pj, tipo = str(f[0]).strip(), str(f[1]).strip(), str(f[3]).strip().lower()
        if not nombre or not pj:
            continue
        try:
            poly = json.loads(pj)
        except Exception:
            continue
        if len(poly) < 3:
            continue
        (exclzonas if tipo == 'excluir' else subzonas).append({'nombre': nombre, 'poly': poly})

    if not subzonas:
        print('X No hay sub-barrios en "Lotes Zonas". Abortando sin escribir.')
        return 1

    # 3. puntos = geojson base + overrides + agregados - borrados
    gj = json.load(io.open(GEOJSON, encoding='utf-8'))
    puntos = []
    for i, f in enumerate(gj.get('features', [])):
        o = ov.get('b%d' % i)
        if o and o['borrado']:
            continue
        c = f['geometry']['coordinates']
        puntos.append({
            'n': (o['lote'] if (o and o['lote']) else f['properties'].get('n', '')),
            'lat': (o['lat'] if (o and o['lat']) else c[1]),
            'lng': (o['lng'] if (o and o['lng']) else c[0]),
            'tipo': (o or {}).get('tipo', '') or 'casa'})
    for k, o in ov.items():
        if not k.startswith('a') or o['borrado'] or not o['lat']:
            continue
        puntos.append({'n': o['lote'], 'lat': o['lat'], 'lng': o['lng'],
                       'tipo': o['tipo'] or 'casa'})

    # 4. indice sub|lote -> [lat, lng], y centroide de cada sub-barrio (plan B)
    idx, acum, fuera, sin_zona = {}, {}, 0, 0
    for p in puntos:
        if any(pip(p['lat'], p['lng'], z['poly']) for z in exclzonas):
            fuera += 1
            continue
        sub = None
        for z in subzonas:
            if pip(p['lat'], p['lng'], z['poly']):
                sub = z['nombre']
                break
        if not sub:
            sin_zona += 1
            continue
        sn = norm_sub(sub)
        a = acum.setdefault(sn, [0.0, 0.0, 0])
        a[0] += p['lat']; a[1] += p['lng']; a[2] += 1
        # Un baldio o anexo no es una casa a la que se entrega, pero igual sirve
        # como referencia de ubicacion: solo no pisa a una casa ya indexada.
        for t in lote_tokens(p['n']):
            k = sn + '|' + t
            if k not in idx or p['tipo'] == 'casa':
                idx[k] = [round(p['lat'], 6), round(p['lng'], 6)]

    centros = {sn: [round(a[0] / a[2], 6), round(a[1] / a[2], 6)] for sn, a in acum.items() if a[2]}

    salida = {
        'generado': __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M'),
        'lotes': idx,
        'centros': centros}
    tmp = SALIDA + '.tmp'
    io.open(tmp, 'w', encoding='utf-8').write(
        json.dumps(salida, ensure_ascii=False, separators=(',', ':')))
    os.replace(tmp, SALIDA)

    kb = os.path.getsize(SALIDA) / 1024.0
    print('OK  %s' % SALIDA)
    print('    %d lotes ubicables | %d sub-barrios | %.1f KB' % (len(idx), len(centros), kb))
    print('    descartados: %d fuera del barrio, %d sin sub-barrio' % (fuera, sin_zona))
    return 0


if __name__ == '__main__':
    sys.exit(main())
