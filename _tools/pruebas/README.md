# Herramientas para probar el ERP en un navegador de verdad

Las pruebas del ERP se escriben en el scratchpad de cada sesión de Claude Code y
**se pierden cuando esa sesión se cierra**. Lo que está acá es la parte reusable,
rescatada el 8/9/2026: las piezas que toda prueba vuelve a necesitar.

Los tests puntuales siguen siendo desechables — se escriben para un bug y no
sobreviven. Estos cuatro no.

| Archivo | Qué hace |
|---|---|
| `cdp.js` | Abre un Chrome headless y habla con él por DevTools. `abrir()` y `evaluar()` |
| `sesion_prep.js` | El PREP de sesión: token, `maleu_panel_session`, captura de errores y **los POST interceptados** |
| `leer_sesion.py` | Saca un token válido de la hoja `Sesiones` con la service account |
| `escanear_general.js` | Recorre las 18 tabs midiendo controles chicos, texto cortado y desborde |
| `ver_cortados.js` | Los textos cortados de una tab, con su clase y cuánto sobra |

## Cómo se usan

```bash
# 1. El ERP local (no hace falta publicar para probar)
npm run dev                       # → localhost:8080/app.html

# 2. Un token real
python _tools/pruebas/leer_sesion.py

# 3. Escanear, o correr tu propia prueba
node _tools/pruebas/escanear_general.js <token> 390
node _tools/pruebas/escanear_general.js <token> 1440
```

Una prueba propia arranca así:

```js
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')(process.argv[2]);
// …addScriptToEvaluateOnNewDocument con PREP, navegar, medir
```

## Lo que hay que saber para que una prueba no mienta

> [!danger] La clave de sesión es `maleu_panel_session`
> Con la clave equivocada el ERP **carga los datos igual** —el token viaja
> aparte, en `maleu_token`— pero deja la pantalla de login encima con
> `z-index:9999`. Y no se nota, porque `.click()` es programático e **ignora el
> hit-testing**. Toda prueba debería abortar si `#loginScreen` quedó visible.

> [!warning] `innerText` miente de dos formas
> Lee el texto de overlays con **`opacity:0`** (sólo `display:none` y
> `visibility:hidden` lo sacan) y devuelve el texto **ya transformado por CSS**
> (`text-transform:uppercase`). Por lo primero, `escanear_general.js` arma el
> texto visible recorriendo los nodos en vez de leer `innerText`.

> [!warning] El piso táctil del ERP en el celular es 38px, no 44
> Lo fija la regla `.pg button:not(...)`. Pedir 40 marca casi todo el ERP: una
> corrida devolvió 1064 "controles chicos" en la tab Pedidos, todos correctos.

> [!important] Medir una tab que no llegó a pintar da "0 problemas"
> Las tabs se pintan en los ratos libres del navegador. Hay que esperar a que
> haya contenido y decir cuántos elementos se examinaron: **"0 fallas sobre 0
> elementos" es un verde falso**.

> [!danger] Los POST van interceptados, sin excepciones
> `sesion_prep.js` los responde `{ok:true}` sin salir a la red. Sin eso, una
> prueba escribe en la planilla de producción: el 3/9/2026 un test llamó a
> `npGuardar()` y creó un pedido real.

> [!tip] Un test que da verde con el bug adentro no prueba nada
> Probá en las dos direcciones: reproducí el bug y comprobá que el test lo
> agarra. Y si un test falla sobre código que no tocaste, sospechá del test.

## Lo que no entra acá

Este repo es **público** por GitHub Pages: no entran tokens, ni el detalle de
clientes, ni teléfonos, ni lotes. Los cuatro `.js` no tienen ningún dato adentro
y `leer_sesion.py` **no sirve sin la credencial** de `C:\Users\tadeu\`, que no
está versionada y no puede estarlo.
