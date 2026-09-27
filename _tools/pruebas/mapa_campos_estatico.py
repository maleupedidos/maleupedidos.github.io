# -*- coding: utf-8 -*-
"""QUE CAMPOS DEL VOLCADO PUEDE LEER CADA TAB. (27/9/2026)

    python mapa_campos_estatico.py [tab]

Es la otra mitad de `medir_campos_por_tab.js`, y existe porque ese tiene un
punto ciego que casi me hace romper la tab Proveedores:

    el medidor  ->  1 campo  (`config`)          "ya se puede despegar"
    la realidad ->  4 campos, y `proveedores` SOLO esta en el volcado

El Proxy anota lo que **se ejecuta**. Proveedores tiene sub-tabs y pide su
propio endpoint (`analisisProveedor`): con el stub vacio, la mitad de su render
no entra nunca y esos campos no se tocan. Un `0 campos` ahi no significa "no usa
el volcado", significa "esa rama no corrio".

Esto hace lo contrario: no ejecuta nada y busca lo que **podria** leerse.

## Como encuentra las funciones de una tab

Buscar por prefijo de nombre (`plan*`, `prov*`) no alcanza: `rInicio` llama a
`_rtSumar`, que no se llama `inicio` nada. Asi que se arma un **grafo de
llamadas**:

  1. SEMILLAS: el render de la tab (`_SECCION[tab]`), las funciones cuyo nombre
     matchea su prefijo, y todo `onclick="algo("` que aparezca adentro del
     markup de `#p-<tab>`.
  2. CIERRE: por cada funcion alcanzada, se buscan los nombres de OTRAS
     funciones del archivo que aparezcan en su cuerpo, y se siguen. Hasta que no
     entre ninguna nueva.
  3. Se juntan todos los `D.algo` del conjunto.

Sobreestima a proposito —una funcion compartida arrastra los campos de todos
sus usos— y eso es lo que se quiere: **para decidir si despegar una tab, el
error seguro es de mas.**

Solo lee el archivo. No toca nada.
"""
import collections
import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(RAIZ, "_src", "panel.src.html")

# Las que al 27/9/2026 todavia pueden pedir el volcado, mas las ya despegadas
# (para poder confirmar que siguen sin necesitarlo).
TABS = ["inicio", "pedidos", "pedidoshome", "caja", "egresos", "stock",
        "proveedores", "planificacion", "estancias", "mireparto"]

# Lo que trae cada endpoint chico. Tiene que coincidir con
# `medir_campos_por_tab.js` — si se agrega un campo alla, va aca tambien.
LIVIANOS = {
    "pedidosLight": ["ts", "pedidos", "canales", "saludSem", "saludMes",
                     "ventasExtra", "totales", "vendedores"],
    "cajaLight": ["ts", "caja", "saldoBase", "movimientos", "gastos",
                  "gastosHist", "ingresos", "efMano", "efHuerfanos", "sobres",
                  "cuentas", "provisiones", "config", "cajaMode", "vueltos"],
    "ocLight": ["oc"],
    "stockTab": ["stock", "stockDeps", "stockCierre", "stockTs"],
}

# Verificado el 27/9/2026 contra el volcado real: tiene 23 claves y ninguna es
# esta. Leerlas da `undefined` siempre, asi que no obligan a nadie a pedir el
# volcado — el volcado tampoco las tiene.
INEXISTENTES = {"saldo", "saldoEf", "saldoMP", "productos",
                "_pedidosDeSupabase", "cobrosPendientes"}

s = io.open(P, encoding="utf-8", newline="").read()
lineas = s.split("\n")

# ── Todas las funciones del archivo, con su cuerpo ───────────────────────
arranques = []
for i, l in enumerate(lineas):
    m = re.match(r"^\s*function ([A-Za-z_$][\w$]*)\s*\(", l)
    if m:
        arranques.append((i, m.group(1)))
    else:
        # `window.foo=function(` y `var foo=function(`
        m2 = re.match(r"^\s*(?:window\.|var |let |const )([A-Za-z_$][\w$]*)\s*=\s*function\s*\(", l)
        if m2:
            arranques.append((i, m2.group(1)))

cuerpo = {}
for j, (i, nom) in enumerate(arranques):
    fin = arranques[j + 1][0] if j + 1 < len(arranques) else len(lineas)
    cuerpo.setdefault(nom, "")
    cuerpo[nom] += "\n".join(lineas[i:fin]) + "\n"

TODAS = set(cuerpo)
CAMPO = re.compile(r"\bD\.([A-Za-z_$][\w$]*)")

# ── El markup de cada tab, para sacar los onclick ────────────────────────
def markup_de(tab):
    m = re.search(r'<div class="pg" id="p-' + re.escape(tab) + r'"', s)
    if not m:
        return ""
    # Hasta el proximo `<div class="pg" id="p-`; alcanza y sobra.
    sig = s.find('<div class="pg" id="p-', m.end())
    return s[m.start(): sig if sig > 0 else len(s)]


PREFIJO = {"inicio": ["rinicio", "rhsnap", "rretail", "rseismeses"],
           "pedidos": ["rpedidos"], "pedidoshome": ["rpedidoshome", "rpedidos"],
           "caja": ["rcaja", "caja", "_caja"], "egresos": ["regresos"],
           "stock": ["rstock", "st", "_st"], "proveedores": ["prov", "rprov"],
           "planificacion": ["plan"], "estancias": ["restancias", "est"],
           "mireparto": ["mireparto", "loadmireparto", "rmireparto", "mr"]}


def semillas_de(tab):
    out = set()
    for n in TODAS:
        bajo = n.lower()
        for p in PREFIJO.get(tab, [tab]):
            if bajo.startswith(p):
                out.add(n)
    mk = markup_de(tab)
    for m in re.finditer(r'on\w+="\s*([A-Za-z_$][\w$]*)\s*\(', mk):
        if m.group(1) in TODAS:
            out.add(m.group(1))
    return out


def cierre(semillas):
    visto = set()
    cola = list(semillas)
    while cola:
        n = cola.pop()
        if n in visto or n not in cuerpo:
            continue
        visto.add(n)
        for m in re.finditer(r"\b([A-Za-z_$][\w$]*)\s*\(", cuerpo[n]):
            o = m.group(1)
            if o in TODAS and o not in visto:
                cola.append(o)
    return visto


enLiviano = {}
for ep, cs in LIVIANOS.items():
    for c in cs:
        enLiviano.setdefault(c, []).append(ep)

pedidas = sys.argv[1:] or TABS
print("\nQUE CAMPOS PUEDE LEER CADA TAB  (barrido estatico, sobreestima a proposito)")
print("=" * 74)
falta_global = collections.defaultdict(list)
for tab in pedidas:
    sem = semillas_de(tab)
    alc = cierre(sem)
    campos = set()
    for n in alc:
        campos.update(CAMPO.findall(cuerpo[n]))
    reales = sorted(c for c in campos if c not in INEXISTENTES)
    faltan = [c for c in reales if c not in enLiviano]
    muertos = sorted(c for c in campos if c in INEXISTENTES)
    for c in faltan:
        falta_global[c].append(tab)
    print("\n%-14s %d funciones alcanzadas · %d campos" % (tab, len(alc), len(reales)))
    print("   SOLO en el volcado: %s" % (", ".join(faltan) if faltan
                                         else "— (se puede despegar)"))
    if muertos:
        print("   inexistentes      : %s" % ", ".join(muertos))

print("\n" + "=" * 74)
print("LO QUE FALTA, Y A QUIEN")
if not falta_global:
    print("  nada")
for c, ts in sorted(falta_global.items(), key=lambda x: -len(x[1])):
    print("  %-18s %s" % (c, ", ".join(ts)))
