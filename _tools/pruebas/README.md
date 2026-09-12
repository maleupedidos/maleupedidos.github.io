# Herramientas para probar el ERP en un navegador de verdad

Las pruebas del ERP se escriben en el scratchpad de cada sesión de Claude Code y
**se pierden cuando esa sesión se cierra**. Lo que está acá es la parte reusable,
rescatada el 8/9/2026: las piezas que toda prueba vuelve a necesitar.

Los tests puntuales siguen siendo desechables — se escriben para un bug y no
sobreviven. Los de acá no.

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
| `probar_armado.js` | **ARMADO: el nombre completo del producto y la cantidad con su unidad**, mas el boton de reprogramar un dia atrasado. Abre los acordeones antes de medir (los dias arrancan plegados en cada refresh). **Si hoy no hay ningun dia atrasado, el bloque de reprogramar se saltea diciendo por que** en vez de explotar con `null.click()` — que se lee como “el ERP se rompio”, lo peor que puede hacer un test (paso el 11/9/2026, cuando quedaron todos entregados). Lo correcto seria **sembrar** el pedido atrasado con un stub para que no dependa del dato del dia: pendiente. La direccion contraria va con un parche EN LA FUENTE, no con una bandera: `_cantTxt` y `PROD_UNI` viven en el IIFE y asignarlos desde `Runtime.evaluate` crea otra variable en window — asi el test daba verde con el bug adentro |
| `probar_ruta.js` | **RUTA > RUTA, la parada, botón por botón**: la barra de arriba (Parada N de M, cuál sigue), los filtros por zona, cada tipo de card (del freezer, atrasada, mixta con kilos, sin teléfono, combo, club, vendedor Red, depósito), el confirm y el POST de Entregado, Cobrar, la lista de paradas y ordenar. Con `entregas` y `pendientesGuardarStock` **stubbeados con datos inventados** (el repo es público) sobre el ERP fusionado y la sesión real. Mide lo que nadie más mira: que la barra de Cobrar/Entregado se vea **sin scrollear** (y arriba del statusbar en la compu), que al final del scroll no tape la card, y que no haya un solo `wa.me`. **Ojo:** `entregas` y `pendientesGuardarStock` viven en el IIFE — desde afuera se lee la COPIA que publica el build; se pregunta por `getPendientes()` / `getSorted()` |
| `probar_flujo_ruta.js` | **Que ninguna accion de la card de RUTA tape la pantalla.** Corre con el **POST demorado 8 s a proposito**: con un backend instantaneo las cinco acciones dan 0 ms y el test da verde con el bug adentro. El tapado se mide con un sampler que corre EN el navegador (cada 40 ms), asi no depende de cada cuanto pregunte el test. Exige que la accion quede en la **cola de localStorage** y la lee MIENTRAS el POST viaja: despues da `[]` siempre, porque al volver el ok sale de la cola. Cubre tambien que entregar la ultima parada no salte a la primera y la vuelta atras (**Ya entregadas hoy** + *No se entrego*), incluido que sobreviva a recargar la app. **Ojo**: `rutaIndex` y `rutaModoLista` viven en el IIFE (se navega con `rutaNext()` y se mira el DOM), el PREP se re-inyecta en cada navegacion (marca en `sessionStorage`) y `innerText` llega en MAYUSCULAS por `text-transform` |
| `probar_cobro_entrega.js` | **La casilla "Y ya se lo entregue" del cuadro de cobro** (12/9/2026): una parada eran 5 toques y pasan a 3. Sostiene las **dos direcciones** del mismo riesgo: tildada marca cobrado Y entregado (con el `marcarCobrado` primero en la cola, el POST de la entrega con `cobrado:true` y el pedido **sin** entrar a COBROS); destildada marca **solo** el cobro y la parada se queda. Y donde la entrega no es cierta la casilla no existe: desde COBROS y en pago parcial. Cubre el combo. **Ojo**: `entregados`, `cobrados` y `pendientesCobro` viven en el IIFE, asi que se leen de `localStorage` (`maleu_ruta`); y los 3 errores `render -> inicio/pedidos` que salen a veces son del panel con el volcado a medias, no de RUTA (intermitentes: correlo de nuevo antes de creerles) |
| `probar_conteo_armado.js` | **ARMADO cuenta ENTREGAS, no filas de la planilla.** Dos pedidos del mismo cliente el mismo dia son UNA entrega \u2014 la misma parada de RUTA y la misma bolsa de ARMADO \u2014 y hasta el 12/9/2026 el encabezado del dia y los tiles mostraban el crudo (*"4 pedidos \u00b7 1 del proveedor"*, *"2 pedidos"* donde habia 1 entrega). Cada caso va en **su propio dia** y no por prolijidad: mezclados, el chequeo del bug del orden \u2014una bolsa con dos pedidos y solo el SEGUNDO tildado figuraba **lista**\u2014 medía dos bolsas juntas y no probaba lo que decia probar. **Ojo con los esperados**: el dia 100% proveedor tiene DOS entregas (dos clientes) y una tanda de Red tambien es una bolsa; los 4 rojos de la primera corrida eran del test. Dos fases con navegacion propia \u2014 la segunda con un solo dia futuro, para el tile que nombra ese dia |
| `probar_copiar_detalle.js` | **El detalle del pedido, listo para pegarle al cliente por WhatsApp** (el boton de la ficha). Los pedidos se **inyectan en `D`**, que es global del panel y no de un IIFE: no se stubbea `action=admin` porque media pantalla del ERP vive de ese objeto y reventaria por un campo que falte. **El portapapeles se intercepta** (`navigator.clipboard`) para medir QUE se copio y no solo que no reviente \u2014 en headless no siempre esta disponible. Cubre los cuatro momentos (entregado \u00d7 cobrado), los kilos con coma, el `*hoy*` en negrita, que los precios de linea salgan solo si suman el subtotal guardado, y que el boton NO exista en Red ni en un cancelado. **El minimo tactil de la ficha son 42px** (`.ord-btn`), no 44: pedir mas inventa un rojo |
| `probar_saldos_ruta.js` | **Los carteles de “saldo a favor” salen del MAPA, sin pedir un GET por cliente.** Hasta el 11/9/2026 los tres consumidores —el badge de ARMADO, el banner de RUTA y el modal de cobro— pedian `action=saldoCliente` **uno por cliente** y sin guard de “ya lo estoy pidiendo”: **15 GET** en una corrida, tapando los 2 cupos de la cola y dejando el ↻ de COBROS en **47 s**. Va en **dos fases con navegacion propia**, y no por prolijidad: el fallback (un Apps Script que no manda el mapa) NO se puede probar desde `Runtime.evaluate` — `RUT_SALDOS` vive en el IIFE y asignarla desde afuera crea otra en `window`, asi que el test daria un verde falso. El flag del stub va **por la URL**: `addScriptToEvaluateOnNewDocument` **acumula**, y una segunda inyeccion envuelve el fetch dos veces y deja la sub-app sin arrancar. La fase 2 ademas exige que **la sub-app ARRANQUE con paradas ya guardadas**, que es el bug que dejo la tab RUTA muerta ese dia. **Ojo con los datos inventados:** el cliente es `c`, no `cli` — con los nombres equivocados el badge nace vacio y el test da NUEVE rojos que son del test, asi que el harness **revienta** si el nombre no llego al markup. Y RUTA solo muestra lo ya armado: el pedido de prueba va **100% OC** para que entre solo |
| `probar_reprog.py` | **`reprogramarEntrega` contra produccion, ida y vuelta.** El camino que ESCRIBE se prueba reprogramando un pedido **a la fecha que ya tiene**: ejercita el `setValue` de verdad y no mueve un solo dato. La celda se lee antes y despues con la service account. Incluye los 5 rechazos — entre ellos un pedido ya entregado, que es el corte que evita moverle el mes a una venta hecha |
| `probar_categorias.js` | **La categoria de un producto sale de la hoja Proveedores.** Saca `_catPorAbbr_` / `_prodCategoria` / `_prodSubcat` del `Code.js` real y las corre con la hoja simulada: los 34 productos, que los 27 que ya se clasificaban bien NO se muevan, y que una categoria nueva entre sola. `--viejo` reinyecta el mapa de prefijos (30 ok → 17 ok / 13 mal) |
| `probar_pieza_sale.js` | **La pieza de carne sigue al estado del pedido.** Saca `_piezasMoverEstado_` y sus tres envoltorios del `Code.js` real con la hoja simulada. El chequeo que importa es **la propiedad**: el freezer baja exactamente los kilos entregados. Cubre que una ref **parecida** (`Home #93` contra `Home #937`) no matchee, el lock ocupado, la hoja inexistente, y **que los CUATRO caminos esten enganchados** — el conteo de llamadas fue lo que destapo que faltaban los tres onEdit de cancelacion. Acepta un `Code.js` anterior como argumento (42 ok -> 11 ok / 26 mal) |
| `probar_cross_cat.js` | **La categoria para los segmentos cross-sell, desde la hoja Proveedores.** El hermano de `probar_categorias.js` para `_crmCategoriaDe`: que la carne exista, que las tortas sigan cayendo en Postres (el segmento no cambia de nombre) y que el `catMap` se pase al loop — **cuenta las lecturas del CacheService**: 20 llamadas con catMap leen 0 veces |
| `probar_seg_carne.js` | **El cross-sell de 🎯 Segmentos en Chrome**, con la sesion real y la respuesta de `crmClientes` parcheada al vuelo para simular el contrato nuevo. Cuatro escenarios: con carne, sin que nadie la haya probado, una categoria que el panel no conoce, y un **control sin interceptor**. Ojo: cada escenario **remueve los scripts del anterior** (se acumulan) y el piso de 38px se exige **solo a 390px** |
| `probar_contar_carne.js` | **Un producto que va por PIEZA no se cuenta por kilos.** Corre `_doPostStockContar` entera, sacada del `Code.js` real, con las tres hojas que toca simuladas (Piezas Carne, Productos, Depositos). La propiedad que importa: **con un corte por pieza, la columna del deposito no se escribe**. Cubre el contado de mas, el de menos, el que cuadra, el deposito sin piezas, un granel por kilo **sin** piezas (sigue por kilos) y un producto por unidad. Acepta un `Code.js` anterior (41 ok -> 18 ok / 23 mal, con el sintoma a la vista: `ahora:6.2`) |
| `probar_contar_pz.js` | **La pantalla de CONTAR** con `action=depositos` interceptado con datos inventados, para no depender de lo que haya hoy en el freezer. Que la fila de un corte por pieza **no ofrezca el campo de kilos**, que diga cuantas piezas hay, que el boton lleve a RECIBIR CARNE y que el contador de arriba cuente solo lo contable. Con `--viejo` simula un Apps Script sin `pz`: el campo tiene que volver |
| `probar_prioridad_sub.js` | **La cola prioriza la SUB-tab que se esta mirando.** Mismo metodo que `probar_prioridad.js` y por el mismo motivo: se mide **el orden en que la cola suelta**, no el tiempo — con un mock de 15 s la fila queda quieta y la decision es determinista. Sin `_PINTA_SUB`, entrar a CONTAR priorizaba el volcado (28 s) sobre el `depositos` (3-5 s) que esa pantalla dibuja |
| `probar_reparto.js` | **La card "Donde esta" no suma unidades con kilos.** 168 packs + 46,155 kg salian como *"Ustariz 214 u"*. Datos inventados y los dos casos: con carne y sin carne (el pie vuelve a decir "unidades"). Con el bug reinyectado: 6 ok / 5 mal |
| `diagnosticar_ruta.js` | **Mide RUTA y no toca nada**, para cuando no se la puede modificar (Tadeo entregando). Sesion real y todos los POST interceptados y ANOTADOS, asi se puede afirmar al final que no salio ninguno. Da los hitos del arranque (motor / pinto / datos), y por sub-tab los controles chicos, el texto cortado, el desborde y el alto total. El 11/9/2026: RUTA pinta a los **18 s** con `entregas` documentado en 3-9 — eran de la cola, y se arreglo desde el panel |
| `ver_decimales.js` | **Que numeros se ven con el punto decimal ingles.** Recorre las tabs y las sub-tabs y busca el patron **en el texto renderizado**, no en el codigo: en el panel hay 89 `toFixed` y varios van a atributos de SVG o a valores de CSS, donde el punto es obligatorio — un reemplazo a ciegas rompe los graficos sin dar un error. Descarta el separador de miles, las horas y las versiones. El 11/9/2026 encontro **74 sobre 10.001 textos**, 70 de ellos en el EERR y el Cierre. **Punto ciego conocido**: con 3 decimales (los kilos van al gramo) no distingue el decimal del separador de miles |
| `regularizar_piezas.py` | **Un conjunto cerrado**: las piezas que quedaron `Asignada` sobre un pedido ya entregado antes de que el backend lo hiciera solo. En seco por defecto; al escribir **muestra el cuadre** releyendo la planilla, corte por corte |

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

> [!danger] Los scripts de `addScriptToEvaluateOnNewDocument` se ACUMULAN
> Si una prueba corre varios escenarios con un stub distinto en cada uno, el
> del escenario 1 **sigue activo** en el 2: hay que guardar el `identifier` que
> devuelve el add y borrarlo con `Page.removeScriptToEvaluateOnNewDocument`
> antes de inyectar el siguiente. Pasó el 11/9/2026 — el escenario *"y si nadie
> hubiera comprado carne"* corría con la carne ya inyectada, o sea que medía lo
> contrario de lo que decía.

> [!tip] Un test que da verde con el bug adentro no prueba nada
> Probá en las dos direcciones: reproducí el bug y comprobá que el test lo
> agarra. Y si un test falla sobre código que no tocaste, sospechá del test.

> [!tip] Cuando un escenario simula un contrato nuevo, hacé el CONTROL
> Un escenario sin el stub, midiendo lo mismo, es lo único que dice si un error
> de consola es del ERP o de tu propio interceptor. Sin el control, un
> `"Script error."` te hace perseguir un bug que no existe.

## Las piezas de carne y los segmentos (11/9/2026)

    node probar_pieza_sale.js                  # el ciclo de la pieza, con la hoja simulada
    node probar_cross_cat.js                   # la categoria de un producto, desde la hoja Proveedores
    node probar_seg_carne.js <token> [390|1440] # el cross-sell en Chrome, 4 escenarios
    python regularizar_piezas.py [--escribir]  # pone al dia las piezas de pedidos ya entregados

Los dos primeros sacan las funciones del **`Code.js` real** y simulan la hoja, asi
que corren sin red y aceptan un `Code.js` anterior como argumento para probar la
direccion contraria.

`regularizar_piezas.py` es de **un conjunto cerrado**: las piezas que quedaron
`Asignada` sobre un pedido ya entregado antes de que el backend lo hiciera solo.
Corre en seco por defecto y al escribir **muestra el cuadre** releyendo la
planilla (suma de piezas contra la col R/S, corte por corte).

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

> [!warning] No distingue el SCOPE: un uso adentro de una funcion es un falso positivo
> Lo que importa es si ese codigo corre **mientras el script se evalua**. Un uso
> adentro de una funcion que se llama despues -al tocar una tab, por ejemplo- es
> inofensivo: cuando corre, la variable ya esta asignada.
>
> Ejemplo real: sobre `_src/panel.src.html` marca **`_SECCION` usada en la L5780 y
> declarada en la L9447**, y es correcto que este asi — el uso vive dentro de
> `go(p)`, que se llama al cambiar de tab. Si fuera un bug, el ERP estaria roto
> desde el 21/8/2026.
>
> El chequeo del build (`chequearOrdenDeclaraciones`) recorre **solo las tres
> sub-apps**, no el panel, y por eso no lo marca. Antes de arreglar lo que este
> script reporte, mira **quien llama** a esa funcion.
