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
| `probar_cuenta_cobro.js` | **La cuenta del COBRO**: el cuadro de Cobros pregunta a que cuenta entro la transferencia, y solo cuando hay algo digital Y mas de una cuenta donde pueda entrar. Cada caso arranca en una **pagina nueva**: confirmar un cobro deja una cadena que termina llamando a `cerrarCobroRuta()` y le pone `null` al cuadro del caso siguiente. Y va con **`&prueba=1`** — sin el, el interceptor de sesion hace `location.reload()` a mitad de la medicion y falla un caso distinto en cada corrida |
| `probar_stock.js` | **La tab Stock entera**: PRODUCTOS / CONTAR / MOVER / RECIBIR CARNE. Mide que cada sub-tab pinte, **cuanto tarda**, y que cada control llegue al piso tactil. Verifica el payload de `piezasRecibir` sin escribir nada. El boton de guardar tiene id propio (`stcarGuardar`): no hace falta adivinarlo por su texto, y el interceptor guarda el body **ya parseado** — volver a parsearlo da `{crudo:"undefined"}` |
| `probar_prioridad.js` | **La cola de GETs le da prioridad al endpoint de la tab abierta?** Con un mock **lento** (15 s), que es lo que hace observable la decision: la fila queda quieta con los 2 cupos ocupados, se entra a la tab ahi, y se mide el **orden en que la cola suelta**. Medir el tiempo total NO sirve — Apps Script dio 24, 57 y 121 s para el mismo `admin`, y el test pasaba con el bug adentro |
| `probar_filtro_prod.js` | **El filtro por categoria y producto de Ventas > PRODUCTOS.** Los montos NO van hardcodeados: le pide al backend el mismo periodo que muestra la pantalla y compara (con los montos escritos a mano el test se rompe solo al dia siguiente, y la primera corrida fallo justo por eso). Mide **todo por el DOM** — `prodState` y `prodVista` viven en el IIFE de la sub-app— y el control que decide todo es que el **KPI sea la suma del ranking** |
| `probar_armado.js` | **ARMADO: el nombre completo del producto y la cantidad con su unidad**, mas el boton de reprogramar un dia atrasado. Abre los acordeones antes de medir (los dias arrancan plegados en cada refresh). La direccion contraria va con un parche EN LA FUENTE, no con una bandera: `_cantTxt` y `PROD_UNI` viven en el IIFE y asignarlos desde `Runtime.evaluate` crea otra variable en window — asi el test daba verde con el bug adentro |
| `probar_reprog.py` | **`reprogramarEntrega` contra produccion, ida y vuelta.** El camino que ESCRIBE se prueba reprogramando un pedido **a la fecha que ya tiene**: ejercita el `setValue` de verdad y no mueve un solo dato. La celda se lee antes y despues con la service account. Incluye los 5 rechazos — entre ellos un pedido ya entregado, que es el corte que evita moverle el mes a una venta hecha |
| `probar_categorias.js` | **La categoria de un producto sale de la hoja Proveedores.** Saca `_catPorAbbr_` / `_prodCategoria` / `_prodSubcat` del `Code.js` real y las corre con la hoja simulada: los 34 productos, que los 27 que ya se clasificaban bien NO se muevan, y que una categoria nueva entre sola. `--viejo` reinyecta el mapa de prefijos (30 ok → 17 ok / 13 mal) |

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
