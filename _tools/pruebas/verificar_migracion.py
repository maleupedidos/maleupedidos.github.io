# -*- coding: utf-8 -*-
"""Le pregunta a Supabase si una migracion esta aplicada, Y si la PANTALLA la
puede leer. Son dos preguntas distintas.

Supabase no lleva registro de que migracion corrio: el unico registro es
`estancias/database/migrations/ESTADO.md`, escrito a mano. La unica forma de
saberlo de verdad es preguntarle a la base por la tabla o la columna que la
migracion crea.

POR QUE ENTRA POR EL TOKEN DEL FRONT, y no con la Secret Key
------------------------------------------------------------
Pide el permiso a `action=sbToken`, o sea que mide con el rol `authenticated`:
**exactamente lo que ve una pantalla del ERP**. Con la Secret Key se mediria con
`service_role`, que bypasea RLS y tiene todos los grants, y entonces una tabla
sin permiso de lectura daria verde igual.

No es teorico. El 1/10/2026 asi se encontro que `supplier_payment` existia,
tenia datos y estaba replicando, pero devolvia **403 42501** para el rol de la
pantalla: la 010 la creo y la 011 le dio permisos solo a `service_role`. Medido
con la Secret Key habria dado "ya esta", y el 403 habria aparecido recien en la
pantalla migrada.

Regla: `service_role` contesta "el dato esta". `authenticated` contesta "la
pantalla lo puede ver". Antes de migrar una pantalla, la que importa es la
segunda.

COMO LEER LA SALIDA
-------------------
    200 / 206   la columna existe y este rol la puede leer
    403         la tabla existe, el rol NO tiene SELECT en esa columna
                (si es a proposito, como `unit_cost` por la 015, esta BIEN)
    400 42703   la tabla existe, la columna no
    404 PGRST205  la tabla no existe: la migracion NO esta aplicada

LOS DOS CONTROLES
-----------------
Agrega siempre dos consultas que **tienen que fallar**: una columna inventada y
una tabla inventada. Si alguna de las dos da 200, el instrumento esta mintiendo
y el resto de la salida no vale. Un verificador sin control negativo da verde
sobre cualquier cosa.

USO
---
    python verificar_migracion.py                      # el set de PAGOS (default)
    python verificar_migracion.py sales_order:zone purchase_order_line:order_no
    python verificar_migracion.py --filas sales_order:zone

`--filas` agrega cuantas filas tiene la tabla y cuantas tienen esa columna con
dato (`Prefer: count=exact`). Es como salio la tabla de columnas flacas del
relevo del 1/10: una columna puede estar aplicada y casi vacia, que para migrar
una pantalla es igual de inservible que no estar.

Solo lectura: ningun POST, no escribe nada, no toca la planilla.
"""
import json
import subprocess
import sys
import os
import urllib.error
import urllib.parse
import urllib.request

API = ('https://script.google.com/macros/s/'
       'AKfycbxmrG5YVSshcYezk8lXFx_uxb7NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec')
LECTOR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leer_sesion.py')

# El set por defecto: lo que necesita Abastecimiento > PAGOS para leer de
# PostgreSQL. Cambialo por el dominio que estes mirando, o pasalo por argumento.
DEFAULT = [
    ('purchase_order_line', 'order_no', 'lineas de OC (015)'),
    ('purchase_order_line', 'unit_cost', 'costo: el 403 es correcto, GRANT por columna'),
    ('supplier_payment', 'supplier_name', 'pagos: 403 hasta que se aplique la 027'),
    ('supplier_payment_line', 'amount', 'lineas de pago: idem'),
    ('inventory_product', 'sku', 'catalogo'),
]

CONTROLES = [
    ('purchase_order_line', 'columna_que_no_existe_control', 'CONTROL: tiene que dar 400'),
    ('tabla_que_no_existe_control', 'x', 'CONTROL: tiene que dar 404 PGRST205'),
]


def pedir(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, dict(r.headers), r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode('utf-8', 'replace')


def permiso_de_supabase():
    """Token de sesion admin -> el permiso que el ERP usa para hablar con la base."""
    p = subprocess.run([sys.executable, LECTOR], capture_output=True, text=True)
    tok = p.stdout.strip()
    if not tok or tok.startswith('SIN-'):
        raise SystemExit('no hay token de sesion admin: %s %s' % (tok, p.stderr[-200:]))
    st, _, body = pedir(API + '?' + urllib.parse.urlencode(
        {'action': 'sbToken', 'token': tok}))
    if st != 200:
        raise SystemExit('sbToken devolvio HTTP %s: %s' % (st, body[:200]))
    sb = (json.loads(body) or {}).get('sb')
    if not sb:
        raise SystemExit('sb es null: este usuario no tiene token de Supabase '
                         '(no esta en SB_USUARIOS_CON_TOKEN_), o Supabase esta caido')
    return sb


def veredicto(st, body):
    code = ''
    try:
        j = json.loads(body)
        if isinstance(j, dict):
            code = j.get('code') or ''
    except Exception:
        pass
    if st in (200, 206):
        return 'OK  la pantalla la lee'
    if code == 'PGRST205':
        return 'NO EXISTE la tabla — migracion sin aplicar'
    if code in ('PGRST204', '42703') or 'does not exist' in body:
        return 'tabla si, columna no'
    if code == '42501' or 'permission denied' in body:
        return 'existe, SIN permiso para este rol'
    return (code or body[:50]).strip()


def solo_total(content_range):
    """`0-0/1350` -> `1350`. Lo de la izquierda es el tramo que pedi, no un dato."""
    return content_range.split('/')[-1] if content_range else '?'


def con_dato(url, tabla, col, H):
    """Cuantas filas tienen ESA columna con algo adentro.

    OJO, y es la razon por la que esta funcion existe: casi todas las columnas
    de texto de la replica se crean con `DEFAULT ''`, asi que una columna vacia
    **no es NULL**: es cadena vacia. Preguntar solo `not.is.null` devuelve el
    total de la tabla y el instrumento informa 100% sobre una columna vacia.
    Paso al escribir esto: `sales_order.zone` dio "1350 con dato" cuando lo
    medido son 205.

    Entonces se pregunta por las dos: `neq.` (distinto de vacio) y, si el tipo
    no lo admite —numeros, timestamps—, `not.is.null`. Se informa la mas
    restrictiva de las dos que la base acepte.
    """
    base = '%s/rest/v1/%s?select=%s&limit=1' % (url, tabla, col)
    vistos = []
    for filtro in ('&%s=neq.' % col, '&%s=not.is.null' % col):
        st, hh, _ = pedir(base + filtro, H)
        if st in (200, 206):
            t = solo_total(hh.get('Content-Range', ''))
            if t.isdigit():
                vistos.append(int(t))
    if not vistos:
        return '?'
    return str(min(vistos))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    con_filas = '--filas' in sys.argv

    objetivos = DEFAULT if not args else []
    for a in args:
        if ':' not in a:
            raise SystemExit('formato: tabla:columna (recibi %r)' % a)
        t, c = a.split(':', 1)
        objetivos.append((t, c, ''))

    sb = permiso_de_supabase()
    url, key, jwt = sb.get('url'), sb.get('key'), sb.get('token')
    proyecto = (url or '').replace('https://', '').split('.')[0]
    print('base: %s… | rol: authenticated (el de la pantalla)'
          % proyecto[:8])
    print()

    H = {'apikey': key, 'Authorization': 'Bearer ' + jwt}
    if con_filas:
        H['Prefer'] = 'count=exact'
        H['Range'] = '0-0'

    ancho = max([len(t) + len(c) for t, c, _ in objetivos + CONTROLES]) + 3
    for tabla, col, nota in objetivos + CONTROLES:
        q = '%s/rest/v1/%s?select=%s&limit=1' % (url, tabla, col)
        st, hh, body = pedir(q, H)
        linea = '%-*s %-5s %s' % (ancho, tabla + '.' + col, st, veredicto(st, body))
        if con_filas and st in (200, 206):
            linea += '  | filas %s · con dato %s' % (
                solo_total(hh.get('Content-Range', '')), con_dato(url, tabla, col, H))
        print(linea)
        if nota:
            print('%-*s       ^ %s' % (ancho, '', nota))

    print()
    print('Los dos CONTROLES de arriba tienen que fallar (400 y 404). Si alguno')
    print('dio 200, el instrumento miente y el resto de la salida no vale.')
    print('Lo que verifiques, anotalo en estancias/database/migrations/ESTADO.md')
    print('en el momento: un registro que se actualiza despues no se actualiza nunca.')


if __name__ == '__main__':
    main()
