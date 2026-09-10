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
| `medir_endpoint.py` | Cuánto tarda un endpoint, N veces seguidas. **Es como se ve si el cache del servidor anda**: si no baja del 2º toque, no hay un solo acierto |
| `cruzar_freezer_carnes.py` | **El freezer de Lucas: ¿el ERP y su planilla dicen lo mismo?** El Depósito Moresco sólo cambia cuando alguien lo cuenta —las ventas se cargan en la planilla de Lucas—, así que son dos fuentes de la misma mercadería. También verifica el **orden del array `kg[]`**, y lo hace **por costo**: picaña y vacío valen los dos $26.000, así que por precio las posiciones 3 y 5 son indistinguibles |
| `probar_resumen.js` | La sub-tab **Inicio > Resumen** entera: el bloque de la orden de compra (que ordene por lo que se vende), el gráfico de línea, el universo de la base de clientes y el hero. Incluye la **dirección contraria**: simula la demanda para ver que un producto por encargo sube a la lista cuando empieza a venderse |
| `probar_cuentas_caja.js` | **Las 3 cuentas de cobro de la tab Caja**: una tarjeta por cuenta (Efectivo, Mercado Pago Tadeo, Brubank Lucas), que las Inversiones cuelguen de la que el backend marca, el ajuste de una sola cuenta sin poner las otras en cero, y que un gasto con una cuenta extra mande `montos` y **no** `montoEf`/`montoMp`. Mide **las columnas que el navegador resolvio**, no el ancho de una tarjeta: una regla de CSS preexistente le ganaba a la nueva por orden y el unico sintoma era un ancho raro |

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
clientes, ni teléfonos, ni lotes. Los `.js` no tienen ningún dato adentro
y `leer_sesion.py` **no sirve sin la credencial** de `C:\Users\tadeu\`, que no
está versionada y no puede estarlo.

## orden_declaraciones.js — variables usadas antes de declararse

    node _tools/pruebas/orden_declaraciones.js ruta.html

Con `var` el hoisting sube la declaracion pero **no la asignacion**: hasta esa
linea la variable vale `undefined`, y `undefined.forEach(...)` **tumba la sub-app
entera sin un error a la vista** (`_abrirSubapp` se traga la excepcion).

Salio del bug del 9/9/2026, cuando la tab Ruta dejo de andar. Hoy el build ya lo
chequea solo (`chequearOrdenDeclaraciones`, paso 1) y **corta** si aparece uno;
este script queda para correrlo suelto sobre un archivo cualquiera.

Solo marca usos peligrosos (un metodo o un indexado). Leer una variable que vale
`undefined` no rompe nada.
