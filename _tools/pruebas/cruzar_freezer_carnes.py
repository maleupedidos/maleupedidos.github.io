# -*- coding: utf-8 -*-
"""¿El Deposito Moresco del ERP y la planilla de Lucas dicen lo mismo del MISMO freezer?

POR QUE EXISTE
    Desde el 9/9/2026 el ERP tiene un **Deposito Moresco** con el stock de carne.
    Pero las ventas que lo vacian se cargan en la planilla de Lucas, no en el ERP:
    ese numero **solo cambia cuando alguien cuenta**. Son dos fuentes sobre la
    misma mercaderia y nada las cruzaba.

    Tambien verifica el ORDEN del array `kg[]` de Diagonal, que decide todo y no
    da ningun error si esta mal: con el orden cambiado el ERP cuenta picaña como
    vacio y nadie se entera.

    **Se verifica por COSTO, no por precio.** Picaña y vacio valen los DOS $26.000
    de precio de venta, asi que por ahi las posiciones 3 y 5 son indistinguibles
    — la verificacion del 9/9/2026 tenia ese hueco. Sus costos si difieren
    (17.500 vs 18.200).

    python cruzar_freezer_carnes.py <token>
"""
import json
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
V, R, D, B, X = '\033[32m', '\033[31m', '\033[2m', '\033[1m', '\033[0m'
TOK = sys.argv[1] if len(sys.argv) > 1 else ''
API = ('https://script.google.com/macros/s/'
       'AKfycbxmrG5YVSshcYezk8lXFx_uxb7NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec')
# El orden del array kg[] de las ventas y compras de Diagonal. Es el mismo
# CARNE_ABBR del Code.js; este script lo VERIFICA en vez de darlo por hecho.
ORDEN = ['CLo', 'CCo', 'CPi', 'CEn', 'CVa']
NOM = {'CLo': 'Lomo', 'CCo': 'Colita', 'CPi': 'Picaña', 'CEn': 'Entraña', 'CVa': 'Vacio'}
# Tolerancia de la balanza: el proveedor pesa con la suya y Diagonal con la
# propia. Es la misma constante que usa el ERP (DG_TOL_PESAJE).
TOL = 0.03

ok = mal = 0


def chk(t, c, x=None):
    global ok, mal
    if c:
        ok += 1
        print('  ' + V + 'ok  ' + X + t)
    else:
        mal += 1
        print('  ' + R + 'MAL ' + X + t + ('  -> ' + str(x)[:170] if x is not None else ''))


def get(a):
    u = API + '?action=' + a + '&token=' + TOK + '&t=' + str(int(time.time() * 1000))
    return json.loads(urllib.request.urlopen(u, timeout=240).read().decode('utf-8'))


print('\n' + B + '== El freezer de Lucas: el ERP contra su planilla ==' + X)
print(D + '  ' + time.strftime('%d/%m/%Y %H:%M') + X + '\n')

dg = get('diagonal')
sf = get('stock_full')
cat = get('catalogo')

costo = {}
for prov, items in (cat.get('productos') or {}).items():
    for it in items:
        if it.get('a') in ORDEN:
            costo[it['a']] = float(it.get('c') or 0)

# ── 1. El orden del array, por COSTO ───────────────────────────────────────
print(B + '【1】 El orden del array kg[], verificado por costo' + X + '\n')
porPos = {i: [] for i in range(5)}
for c in (dg.get('compras') or []):
    kg, im = c.get('kg') or [], c.get('im') or []
    for i in range(5):
        k = float(kg[i] or 0) if i < len(kg) else 0
        m = float(im[i] or 0) if i < len(im) else 0
        if k > 0 and m > 0:
            porPos[i].append(round(m / k, 2))
deducido = []
for i in range(5):
    vals = porPos[i]
    if not vals:
        deducido.append('?')
        continue
    # El costo ACTUAL es el mas alto observado: los mas bajos son compras
    # anteriores a un aumento. Comparar contra el primero da falsos negativos.
    alto = max(vals)
    cand = [a for a in ORDEN if abs(costo.get(a, -1) - alto) < 1]
    deducido.append(cand[0] if len(cand) == 1 else '?')
    print('  pos %d  costos %-24s -> %s' % (i + 1, str(sorted(set(vals)))[:24],
                                            NOM.get(cand[0], '??') if len(cand) == 1 else '??'))
chk('el array kg[] esta en el orden que dice CARNE_ABBR', deducido == ORDEN,
    'deducido=%s  codigo=%s' % (deducido, ORDEN))

# Y la prueba de por que el PRECIO no alcanza
pv = {}
for i, a in enumerate(ORDEN):
    pv.setdefault(round(float(costo.get(a, 0))), []).append(a)
precios = {}
for v in (dg.get('ventas') or []):
    kg, im = v.get('kg') or [], v.get('im') or []
    for i in range(5):
        k = float(kg[i] or 0) if i < len(kg) else 0
        m = float(im[i] or 0) if i < len(im) else 0
        if k > 0 and m > 0:
            precios.setdefault(i, set()).add(round(m / k))
p3 = max(precios.get(2) or {0})
p5 = max(precios.get(4) or {0})
chk('  (y por precio serian indistinguibles: pos3=%s pos5=%s)' % (p3, p5), p3 == p5,
    'si difirieran, el precio alcanzaria')

# ── 2. El cruce ────────────────────────────────────────────────────────────
print('\n' + B + '【2】 El freezer, por corte' + X + '\n')
comp = {a: 0.0 for a in ORDEN}
vend = {a: 0.0 for a in ORDEN}
for c in (dg.get('compras') or []):
    kg = c.get('kg') or []
    for i, a in enumerate(ORDEN):
        if i < len(kg):
            comp[a] += float(kg[i] or 0)
for v in (dg.get('ventas') or []):
    kg = v.get('kg') or []
    for i, a in enumerate(ORDEN):
        if i < len(kg):
            vend[a] += float(kg[i] or 0)

print('  %-9s %9s %9s %9s   %9s %9s' %
      ('corte', 'comprado', 'vendido', 'saldo', 'ERP', 'difer.'))
totA = totE = 0.0
peor = []
for a in ORDEN:
    saldo = comp[a] - vend[a]
    # Un saldo negativo NO es stock: es la balanza. El freezer no puede deber kilos.
    saldoReal = max(0.0, saldo)
    erp = float(((sf.get(a) or {}).get('pd') or {}).get('moresco', 0))
    dif = erp - saldoReal
    totA += saldoReal
    totE += erp
    marca = ''
    if comp[a] > 0 and abs(dif) / comp[a] > TOL:
        marca = ' <-'
        peor.append((a, dif))
    print('  %-9s %9.3f %9.3f %9.3f   %9.3f %9.3f%s'
          % (NOM[a], comp[a], vend[a], saldo, erp, dif, marca))
print('  %-9s %9.3f %9.3f %9.3f   %9.3f %9.3f'
      % ('TOTAL', sum(comp.values()), sum(vend.values()), totA, totE, totE - totA))

chk('el freezer del ERP coincide con la planilla de Lucas (tolerancia %d%%)' % (TOL * 100),
    not peor, ['%s %+.3f kg' % (NOM[a], d) for a, d in peor])
base = sum(comp.values())
chk('  y el total no se despega mas del %d%% de lo comprado' % (TOL * 100),
    base > 0 and abs(totE - totA) / base <= TOL,
    '%.3f kg sobre %.1f comprados = %.1f%%' % (totE - totA, base,
                                               100 * abs(totE - totA) / base if base else 0))

# ── 3. Cuando fue la ultima reposicion ─────────────────────────────────────
print('\n' + B + '【3】 La reposicion' + X + '\n')


def dmy(s):
    p = str(s or '').split('/')
    try:
        return (int(p[2]), int(p[1]), int(p[0]))
    except Exception:
        return None


import datetime
hoy = datetime.date.today()
fc = sorted([f for f in (dmy(c.get('f')) for c in (dg.get('compras') or [])) if f])
if fc:
    y, m, d = fc[-1]
    dias = (hoy - datetime.date(y, m, d)).days
    print('  ultima compra cargada: %02d/%02d/%d — hace %d dias' % (d, m, y, dias))
    # Lucas repone cada ~1 semana y la carne dura 2. Mas de 14 dias sin cargar
    # una compra es o que no repuso, o que no la cargo.
    chk('  hay una compra cargada en las ultimas 2 semanas', dias <= 14,
        'hace %d dias — o no repuso, o no la cargo' % dias)
fv = sorted([f for f in (dmy(v.get('f')) for v in (dg.get('ventas') or [])) if f])
if fv:
    y, m, d = fv[-1]
    print('  ultima venta cargada : %02d/%02d/%d' % (d, m, y))

# ── 4. Cobertura ───────────────────────────────────────────────────────────
print('\n' + B + '【4】 Cuanto le dura' + X + '\n')
dem = {}
for prov, items in (cat.get('productos') or {}).items():
    for it in items:
        if it.get('a') in ORDEN:
            dem[it['a']] = float(it.get('dem') or 0)
tdem = sum(dem.values())
print('  en el freezer : %.3f kg' % totE)
print('  demanda       : %.1f kg/semana' % tdem)
if tdem > 0:
    print('  le dura       : %.1f dias' % (totE / tdem * 7))

print('\n' + (R if mal else V) + '  %d ok · %d mal' % (ok, mal) + X + '\n')
sys.exit(1 if mal else 0)
