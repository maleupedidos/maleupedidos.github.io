# -*- coding: utf-8 -*-
"""Mide cuanto tarda un endpoint del backend, N veces seguidas.

Para que sirve: es la unica forma de saber si el cache del servidor esta
funcionando. Si anda, del 2do toque en adelante tiene que caer a ~2-3 s; si
todas las corridas dan parecido, no hay un solo acierto de cache.

Asi se descubrio que `cajaLight` (4/9/2026) y `pedidosLight` (8/9/2026) nunca
cachearon nada: `CacheService` topa en 100 KB por valor y los dos pesan mas.
El `put` fallaba y el try/catch se comia el error, asi que parecia andar.

    python _tools/pruebas/medir_endpoint.py <token> [action] [veces]
    python _tools/pruebas/medir_endpoint.py <token> pedidosLight 5

El token sale de `leer_sesion.py`. Se manda `&t=<epoch>` para saltear la CDN de
Google, que despues de un deploy sirve la respuesta vieja un rato — pero eso NO
saltea el cache del script: para eso esta `&fresh=1`.
"""
import sys, time, urllib.request, json

API = 'https://script.google.com/macros/s/AKfycbxmrG5YVSshcYezk8lXFx_uxb7NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec'
if len(sys.argv) < 2:
    print(__doc__)
    print('  El token: python _tools/pruebas/leer_sesion.py')
    sys.exit(1)
TOKEN = sys.argv[1]
ACTION = sys.argv[2] if len(sys.argv) > 2 else 'pedidosLight'
N = int(sys.argv[3]) if len(sys.argv) > 3 else 5

print(f'=== {ACTION} — {N} toques seguidos ===')
for i in range(N):
    url = f'{API}?action={ACTION}&token={TOKEN}&t={int(time.time()*1000)}'
    t0 = time.time()
    with urllib.request.urlopen(url, timeout=180) as r:
        body = r.read()
    ms = int((time.time() - t0) * 1000)
    try:
        d = json.loads(body)
        ped = len(d.get('pedidos', []) or [])
        extra = f' · {ped} pedidos'
    except Exception as e:
        extra = f' · NO ES JSON ({e})'
    print(f'  {i+1}: {ms:>6} ms · {len(body)/1024:7.1f} KB{extra}')
