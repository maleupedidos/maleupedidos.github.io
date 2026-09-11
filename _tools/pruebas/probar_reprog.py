# -*- coding: utf-8 -*-
u"""reprogramarEntrega contra PRODUCCION, ida y vuelta.

El camino que ESCRIBE se prueba reprogramando un pedido a la fecha que YA tiene:
ejercita el setValue de verdad y no mueve un solo dato de Tadeo. La celda se lee
antes y despues con la service account para confirmarlo.

  python probar_reprog.py <token>
"""
import io, json, sys, time, urllib.request, datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

API = ('https://script.google.com/macros/s/AKfycbxmrG5YVSshcYezk8lXFx_uxb7'
       'NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec')
TOK = sys.argv[1]
SS = '1ILXCc9ddbC_gJPNoUADBiSMXAWLM9v73ov2_xXb8YsY'
CRED = r'C:\Users\tadeu\maleu-service-account.json'
cred = service_account.Credentials.from_service_account_file(
    CRED, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
sv = build('sheets', 'v4', credentials=cred).spreadsheets().values()

ok = mal = 0
def chk(nom, cond, det=u''):
    global ok, mal
    if cond:
        ok += 1
        sys.stdout.write('  ok   %s\n' % nom)
    else:
        mal += 1
        sys.stdout.write('  MAL  %s%s\n' % (nom, ('\n         ' + str(det)[:200]) if det else ''))

def post(payload):
    payload = dict(payload)
    payload['token'] = TOK
    req = urllib.request.Request(
        API, data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'text/plain;charset=utf-8'})
    return json.loads(urllib.request.urlopen(req, timeout=180).read().decode('utf-8'))

def get(qs):
    return json.loads(urllib.request.urlopen(
        API + '?' + qs + '&t=' + str(int(time.time() * 1000)), timeout=180).read().decode('utf-8'))

def celda(hoja, fila, col):
    r = sv.get(spreadsheetId=SS, range='%s!R%dC%d' % (hoja, fila, col),
               valueRenderOption='UNFORMATTED_VALUE').execute().get('values', [[None]])
    return (r[0][0] if r and r[0] else None)

# ── 0. El mapa de productos en action=entregas ──────────────────────────
sys.stdout.write('\n=== 1. action=entregas manda nombre y unidad ===\n')
d = get('action=entregas&token=' + TOK)
pr = d.get('prods') or {}
chk('viene el mapa `prods`', len(pr) >= 30, 'tiene %d' % len(pr))
CORTES = ['CCo', 'CEn', 'CLo', 'CPi', 'CVa']
chk('los 5 cortes traen su nombre completo',
    all(pr.get(a, {}).get('n', '').lower().startswith('carne') for a in CORTES),
    json.dumps({a: pr.get(a, {}).get('n') for a in CORTES}, ensure_ascii=False))
chk('y dicen kg', all(pr.get(a, {}).get('u') == 'kg' for a in CORTES),
    json.dumps({a: pr.get(a, {}).get('u') for a in CORTES}))
otros = [a for a in pr if a not in CORTES]
chk('los otros %d dicen u' % len(otros), all(pr[a].get('u') == 'u' for a in otros),
    ', '.join('%s=%s' % (a, pr[a].get('u')) for a in otros if pr[a].get('u') != 'u'))
chk('ningun nombre vacio', all(pr[a].get('n') for a in pr),
    ', '.join(a for a in pr if not pr[a].get('n')))
# El peso del mapa: tiene que ser chico, va en cada respuesta de entregas
peso = len(json.dumps(pr, ensure_ascii=False).encode('utf-8'))
chk('el mapa pesa menos de 3 KB', peso < 3072, '%d bytes' % peso)

# ── Un pedido pendiente y uno entregado, para los casos ────────────────
ents = d.get('e') or []
cand = [e for e in ents if e.get('h') in ('Home', 'Pilar') and e.get('fe')]
chk('hay al menos un pedido pendiente para probar', len(cand) > 0, str(len(cand)))
if not cand:
    sys.stdout.write('\nsin pedidos pendientes no se puede seguir\n')
    sys.exit(1)
P0 = cand[0]
sys.stdout.write('  probando con: %s #%s (%s) fila %s  entrega %s\n'
                 % (P0.get('c'), P0.get('id'), P0.get('h'), P0.get('r'), P0.get('fe')))

COL = {'Home': 10, 'Pilar': 10, 'Clubes': 13, 'Red': 11}

# ── 2. Los rechazos: ninguno puede escribir ────────────────────────────
sys.stdout.write('\n=== 2. lo que tiene que rechazar (sin escribir nada) ===\n')
antes = celda(P0['h'], P0['r'], COL[P0['h']])

r = post({'action': 'reprogramarEntrega', 'hoja': P0['h'], 'id': str(P0['id']),
          'row': P0['r'], 'fecha': '11/09/2026'})
chk('una fecha en dd/mm/aaaa se rechaza', not r.get('ok') and 'fecha' in str(r.get('err', '')), r)

r = post({'action': 'reprogramarEntrega', 'hoja': P0['h'], 'id': str(P0['id']),
          'row': P0['r'], 'fecha': ''})
chk('sin fecha se rechaza', not r.get('ok'), r)

r = post({'action': 'reprogramarEntrega', 'hoja': 'HojaQueNoExiste', 'id': '1',
          'row': 2, 'fecha': '2026-09-12'})
chk('una hoja desconocida se rechaza', not r.get('ok'), r)

r = post({'action': 'reprogramarEntrega', 'hoja': 'Home', 'id': '99999999',
          'row': 2, 'fecha': '2026-09-12'})
chk('un pedido inexistente se rechaza', not r.get('ok')
    and 'encontre' in str(r.get('err', '')) + json.dumps(r.get('resultados', [])), r)

# Un pedido YA ENTREGADO: el corte que evita moverle el mes a una venta hecha
adm = None
try:
    adm = get('action=admin&light=1&token=' + TOK)
except Exception:
    pass
entregado = None
if adm and adm.get('pedidos'):
    for p in adm['pedidos']:
        if p.get('h') in ('Home', 'Pilar') and p.get('es') == 'Entregado' and p.get('n'):
            entregado = p
            break
if entregado:
    r = post({'action': 'reprogramarEntrega', 'hoja': entregado['h'],
              'id': str(entregado['n']), 'fecha': '2026-09-12'})
    txt = json.dumps(r, ensure_ascii=False)
    chk('un pedido YA ENTREGADO se rechaza', not r.get('ok') and 'entregado' in txt,
        txt[:220])
else:
    sys.stdout.write('  --   no pude conseguir un pedido entregado para ese caso\n')

desp = celda(P0['h'], P0['r'], COL[P0['h']])
chk('NINGUN rechazo escribio la celda', antes == desp, '%s -> %s' % (antes, desp))

# ── 3. El camino que escribe, con la MISMA fecha ───────────────────────
sys.stdout.write('\n=== 3. el camino que escribe (a la fecha que ya tiene) ===\n')
r = post({'action': 'reprogramarEntrega', 'hoja': P0['h'], 'id': str(P0['id']),
          'row': P0['r'], 'fecha': P0['fe']})
chk('contesta ok', r.get('ok') is True, r)
chk('movidos = 1', r.get('movidos') == 1, r)
chk('devuelve el resultado de ese pedido', len(r.get('resultados') or []) == 1, r)
res0 = (r.get('resultados') or [{}])[0]
chk('con el nombre del cliente', res0.get('cliente') == P0.get('c'),
    '%s vs %s' % (res0.get('cliente'), P0.get('c')))
chk('y la fecha formateada dd/MM/yyyy',
    bool(res0.get('ahora')) and res0['ahora'].count('/') == 2, res0)
chk('antes y ahora son la misma fecha', res0.get('antes') == res0.get('ahora'), res0)

desp2 = celda(P0['h'], P0['r'], COL[P0['h']])
chk('la celda quedo EXACTAMENTE igual', antes == desp2, '%s -> %s' % (antes, desp2))

# Que la fecha que se lee de vuelta sea la misma que estaba
d2 = get('action=entregas&fresh=1&token=' + TOK)
p2 = [e for e in (d2.get('e') or []) if str(e.get('id')) == str(P0['id']) and e.get('h') == P0['h']]
chk('el endpoint la sigue devolviendo igual', p2 and p2[0].get('fe') == P0['fe'],
    (p2[0].get('fe') if p2 else 'no aparece') + ' vs ' + P0['fe'])

# ── 4. Varios pedidos en un POST ───────────────────────────────────────
sys.stdout.write('\n=== 4. varios en un POST (cada uno a su propia fecha actual) ===\n')
# El dia con MAS pedidos, no el del primero de la lista: es el caso que se va a
# usar de verdad -los 5 atrasados de un jueves de un toque- y con `cand[0]` no
# se ejercitaba nunca.
_porDia = {}
for e in cand:
    _porDia.setdefault(e['fe'], []).append(e)
_dia = max(_porDia, key=lambda k: len(_porDia[k]))
mismos = _porDia[_dia][:5]
sys.stdout.write('  el dia con mas pendientes: %s (%d)\n' % (_dia, len(_porDia[_dia])))
if len(mismos) >= 2:
    t0 = time.time()
    r = post({'action': 'reprogramarEntrega', 'fecha': _dia,
              'pedidos': [{'hoja': e['h'], 'id': str(e['id']), 'row': e['r']} for e in mismos]})
    seg = time.time() - t0
    chk('los %d en un solo POST' % len(mismos), r.get('movidos') == len(mismos), r)
    chk('y cruzando las dos hojas' if len(set(e['h'] for e in mismos)) > 1 else 'en una hoja',
        True)
    chk('y en una sola llamada (menos de 25 s)', seg < 25, '%.1f s' % seg)
    sys.stdout.write('     %d pedidos en %.1f s (de a uno serian ~%.0f s)\n'
                     % (len(mismos), seg, len(mismos) * 5.0))
    todas = [celda(e['h'], e['r'], COL[e['h']]) for e in mismos]
    chk('ninguna celda se movio', all(t is not None for t in todas), str(todas))
else:
    sys.stdout.write('  --   no hay 2 pedidos del mismo dia para este caso\n')

# ── 5. El tope ─────────────────────────────────────────────────────────
sys.stdout.write('\n=== 5. el tope de 60 ===\n')
r = post({'action': 'reprogramarEntrega', 'fecha': '2026-09-12',
          'pedidos': [{'hoja': 'Home', 'id': '1', 'row': 2}] * 61})
chk('mas de 60 se rechaza', not r.get('ok') and 'demasiados' in str(r.get('err', '')), r)

sys.stdout.write('\n%s: %d ok - %d mal\n' % ('ROJO' if mal else 'VERDE', ok, mal))
sys.exit(1 if mal else 0)
