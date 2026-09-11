# -*- coding: utf-8 -*-
"""Pone al dia las piezas de carne de los pedidos que YA se entregaron.

Desde el backend @583 la pieza pasa sola a 'Entregada' al marcar la entrega,
pero eso vale de ahi en adelante: las que se entregaron ANTES quedaron
'Asignada', o sea contando como stock del freezer. Este script las regulariza.
Es un conjunto CERRADO -las de hoy y antes-, como OC_PAGADAS_FUERA_LEDGER.

Corre en SECO por defecto:   python regularizar_piezas.py
Para escribir:               python regularizar_piezas.py --escribir

Escribe la hoja 'Piezas Carne' con la service account, y eso es seguro aca:
  · esa hoja NO tiene onEdit (onEditHandler mira las hojas de pedidos y Productos),
    asi que no hay trigger que se pierda -que es el motivo por el que las piezas
    se CARGAN por piezasRecibir y no a mano;
  · no toca el stock: solo el Estado y la Salida. El stock del deposito ya bajo
    cuando se marco la entrega; lo que esto evita es que la proxima
    sincronizacion se lo DEVUELVA.
Al final vuelve a leer y muestra el cuadre: suma de piezas en freezer vs col R/S.
11/9/2026."""
import sys, collections
from google.oauth2 import service_account
from googleapiclient.discovery import build
sys.stdout.reconfigure(encoding='utf-8')

ESCRIBIR = '--escribir' in sys.argv
SS = '1ILXCc9ddbC_gJPNoUADBiSMXAWLM9v73ov2_xXb8YsY'
ALC = ['https://www.googleapis.com/auth/spreadsheets'] if ESCRIBIR else \
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
cred = service_account.Credentials.from_service_account_file(
    'C:/Users/tadeu/maleu-service-account.json', scopes=ALC)
sv = build('sheets', 'v4', credentials=cred).spreadsheets()
def leer(r):
    return sv.values().get(spreadsheetId=SS, range=r,
                           valueRenderOption='UNFORMATTED_VALUE').execute().get('values', [])
def num(v):
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v).strip()

# ── el estado de cada pedido ──
ped = {}
for hoja in ('Home', 'Pilar', 'Clubes'):
    d = leer("'%s'!A1:CC2000" % hoja)
    h = [str(x).strip() for x in d[0]]
    cN = next((h.index(x) for x in ('N\u00b0', 'N Pedido', 'N') if x in h), None)
    assert cN is not None, 'no encontre la columna del N en ' + hoja
    cE, cC = h.index('Estado de Entrega'), h.index('Cliente')
    for f in d[1:]:
        n = num(f[cN]) if cN < len(f) else ''
        if not n or n == '-':
            continue
        ped['%s #%s' % (hoja, n)] = (str(f[cE]).strip() if cE < len(f) else '',
                                     str(f[cC]).strip() if cC < len(f) else '')

# ── las piezas ──
pz = leer("'Piezas Carne'!A1:L500")
h = [str(x).strip() for x in pz[0]]
iID, iAb, iKg, iEst, iDep, iPed, iSal = (h.index('ID'), h.index('Abreviatura'), h.index('Peso kg'),
                                         h.index('Estado'), h.index('Deposito'), h.index('Pedido'),
                                         h.index('Salida'))
mover, huerf = [], []
for r, f in enumerate(pz[1:], start=2):
    def g(i):
        return f[i] if i < len(f) else ''
    if not str(g(iID)).strip():
        continue
    if str(g(iEst)).strip().lower() != 'asignada':
        continue
    ref = str(g(iPed)).strip()
    est, cli = ped.get(ref, (None, ''))
    if est is None:
        huerf.append((g(iID), ref))
    elif est == 'Entregado':
        mover.append({'fila': r, 'id': str(g(iID)).strip(), 'ab': str(g(iAb)).strip(),
                      'kg': float(g(iKg) or 0), 'ref': ref, 'cli': cli})

print('\npiezas Asignada sobre un pedido YA ENTREGADO: %d  ·  %.3f kg'
      % (len(mover), sum(x['kg'] for x in mover)))
for x in mover:
    print('   fila %-4d %-8s %-4s %6.3f kg  %-12s %s' % (x['fila'], x['id'], x['ab'], x['kg'], x['ref'], x['cli'][:22]))
if huerf:
    print('\nOJO, piezas cuyo pedido no existe (cancelado: el N pasa a "-"): %s'
          % ', '.join('%s -> %s' % (a, b) for a, b in huerf))
    print('   esas NO se tocan aca: si el pedido se cancelo, la pieza tendria que volver a Disponible.')

if not mover:
    print('\nno hay nada que regularizar.')
    sys.exit(0)

if not ESCRIBIR:
    print('\n(seco) con --escribir se ponen en Entregada, con la Salida de hoy.')
    sys.exit(0)

hoy = __import__('datetime').datetime.now().strftime('%d/%m/%Y')
datos = []
for x in mover:
    datos.append({'range': "'Piezas Carne'!E%d" % x['fila'], 'values': [['Entregada']]})
    datos.append({'range': "'Piezas Carne'!K%d" % x['fila'], 'values': [[hoy]]})
sv.values().batchUpdate(spreadsheetId=SS, body={'valueInputOption': 'USER_ENTERED', 'data': datos}).execute()
print('\nescritas %d piezas.' % len(mover))

# ── el cuadre, releyendo ──
pz2 = leer("'Piezas Carne'!A1:L500")
suma = collections.Counter()
for f in pz2[1:]:
    def g(i):
        return f[i] if i < len(f) else ''
    if str(g(iEst)).strip().lower() not in ('disponible', 'asignada'):
        continue
    suma[(str(g(iAb)).strip(), str(g(iDep)).strip().lower() or 'ustariz')] += float(g(iKg) or 0)
prod = leer("'Productos'!A1:U60")
ph = [str(x).strip() for x in prod[0]]
cAb, cF, cR, cSS = ph.index('Abreviatura'), ph.index('Stock F\u00edsico'), ph.index('F\u00edsico Ustariz'), ph.index('F\u00edsico Moresco')
print('\nel cuadre despues de escribir (piezas en freezer vs el stock del deposito):')
malo = 0
for f in prod[1:]:
    ab = str(f[cAb]).strip() if cAb < len(f) else ''
    if ab not in ('CCo', 'CEn', 'CLo', 'CPi', 'CVa'):
        continue
    def n(c):
        try:
            return float(f[c]) if c < len(f) and f[c] not in (None, '') else 0
        except (TypeError, ValueError):
            return 0
    su = round(suma.get((ab, 'ustariz'), 0), 3)
    df = round(su - n(cR), 3)
    if abs(df) > 0.001:
        malo += 1
    print('   %-4s  Ustariz=%7.3f  piezas=%7.3f  %s' % (ab, n(cR), su, 'OK' if abs(df) <= 0.001 else 'DIFERENCIA %+.3f' % df))
print('\n%s' % ('todo cuadrado: la proxima tanda no va a devolver nada.' if not malo
                else 'quedan %d cortes sin cuadrar: mirar antes de la proxima tanda.' % malo))
