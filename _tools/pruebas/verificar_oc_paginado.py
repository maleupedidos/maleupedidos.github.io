"""El atajo de OCs de la tab Pedidos, EN VIVO y con el permiso de la pantalla (9/10/2026).

Hace las dos consultas contra la base de verdad, con el rol `authenticated`
(el de `action=sbToken`, no la llave de servicio):

  · la de ANTES: una sola llamada con `limit=5000`;
  · la de AHORA: de a 1000, ordenada por `order_no`.

y cuenta cuántas líneas con canal y pedido trae cada una. Tiene que dar menos en
la primera cuando la tabla pasa las 1000 filas: PostgREST corta ahí sin avisar.
Solo lee.

    python _tools/pruebas/verificar_oc_paginado.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from verificar_migracion import pedir, permiso_de_supabase  # noqa: E402

COLS = 'channel,source_order_number,customer_name,product_abbr,quantity,supplier,state'


def utiles(filas):
    return [f for f in filas if str(f.get('channel') or '').strip() and str(f.get('source_order_number') or '').strip()]


def main():
    sb = permiso_de_supabase()
    H = {'apikey': sb['key'], 'Authorization': 'Bearer ' + sb['token']}
    base = sb['url'] + '/rest/v1/purchase_order_line?select=' + COLS

    st, _, body = pedir(base + '&limit=5000', H)
    if st != 200:
        raise SystemExit('la consulta de antes dio HTTP %s: %s' % (st, body[:200]))
    antes = json.loads(body)

    ahora, off = [], 0
    while True:
        st, _, body = pedir(base + '&order=order_no&limit=1000&offset=%d' % off, H)
        if st != 200:
            raise SystemExit('la consulta paginada dio HTTP %s: %s' % (st, body[:200]))
        pag = json.loads(body)
        ahora += pag
        if len(pag) < 1000:
            break
        off += 1000

    print('una sola llamada (antes): %d filas, %d con canal y pedido' % (len(antes), len(utiles(antes))))
    print('de a 1000 (ahora):        %d filas, %d con canal y pedido, en %d llamadas'
          % (len(ahora), len(utiles(ahora)), off // 1000 + 1))
    falta = len(utiles(ahora)) - len(utiles(antes))
    print('la llamada unica dejaba afuera %d linea(s) de OC' % falta if falta else 'las dos traen lo mismo (la tabla no pasa las 1000 filas)')


if __name__ == '__main__':
    main()
