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
| `probar_cobro_combo.js` | **El cuadro de cobro: el combo como UN cobro y el vuelto por transferencia con su cuenta** (12/9/2026). `node probar_cobro_combo.js [390|1440] [ruta.html]`, sin token (datos inventados). Sostiene que un combo con formas de pago distintas NO elija (pregunta y el boton lo dice), que el envio vaya una sola vez y se pueda regalar, que la plata de los POST sume lo que dice la pantalla pedido por pedido, que el vuelto por transferencia pregunte de que cuenta salio (ninguna elegida) y que con nada tipeado no aparezca un faltante ni "Aceptar descuento". Contra el `ruta.html` anterior da 28 rojos. **Ojo**: `ev()` devuelve `{__err}` cuando la evaluacion revienta, y eso es truthy: los chequeos de "existe/mide" van con `=== true` o dan verde sobre la version vieja |
| `probar_por_canal.js` | **Inicio > Por canal por sub-barrio, las tarjetas del dia y la tabla del Pulso** (12/9/2026). `p.br` NO es el sub-barrio: desde el 22/8 trae la zona y el lote juntos, y Por canal armaba un renglon por lote (31 para 9 sub-barrios). Sostiene que ningun renglon diga "Lote", que la **plata cierre en cada nivel** (sub-barrios = barrio = hoja = total), que se cuenten **entregas** (calculadas aparte desde `D.pedidos` con `_contarVentas`, no escritas a mano: el test no envejece), que no haya un monto con centavos, y que el Total de cada semana del Pulso sea la suma de sus dias. Acepta una URL: contra la version vieja publicada da 8 rojos. **Ojo**: el chequeo de "Lote" exige filas examinadas — con 0 daba ok sobre la version vieja, que no tiene `.cnl-sub`; y `textContent` de la tarjeta del dia pega "07/09" con "0 entregas" y lee 90 |
| `probar_cuentas_caja.js` | **Las 3 cuentas de cobro de la tab Caja**: una tarjeta por cuenta (Efectivo, Mercado Pago Tadeo, Brubank Lucas), que las Inversiones cuelguen de la que el backend marca, el ajuste de una sola cuenta sin poner las otras en cero, y que un gasto con una cuenta extra mande `montos` y **no** `montoEf`/`montoMp`. Mide **las columnas que el navegador resolvio**, no el ancho de una tarjeta: una regla de CSS preexistente le ganaba a la nueva por orden y el unico sintoma era un ancho raro |
| `probar_cuenta_cobro.js` | **La cuenta del COBRO**: el cuadro de Cobros pregunta a que cuenta entro la transferencia, y solo cuando hay algo digital Y mas de una cuenta donde pueda entrar. Cada caso arranca en una **pagina nueva**: confirmar un cobro deja una cadena que termina llamando a `cerrarCobroRuta()` y le pone `null` al cuadro del caso siguiente. Y va con **`&prueba=1`** — sin el, el interceptor de sesion hace `location.reload()` a mitad de la medicion y falla un caso distinto en cada corrida |
| `probar_stock.js` | **La tab Stock entera**: PRODUCTOS / CONTAR / MOVER / RECIBIR CARNE. Mide que cada sub-tab pinte, **cuanto tarda**, y que cada control llegue al piso tactil. Verifica el payload de `piezasRecibir` sin escribir nada. El boton de guardar tiene id propio (`stcarGuardar`): no hace falta adivinarlo por su texto, y el interceptor guarda el body **ya parseado** — volver a parsearlo da `{crudo:"undefined"}` |
| `probar_prioridad.js` | **La cola de GETs le da prioridad al endpoint de la tab abierta?** Con un mock **lento** (15 s), que es lo que hace observable la decision: la fila queda quieta con los 2 cupos ocupados, se entra a la tab ahi, y se mide el **orden en que la cola suelta**. Medir el tiempo total NO sirve — Apps Script dio 24, 57 y 121 s para el mismo `admin`, y el test pasaba con el bug adentro |
| `probar_filtro_prod.js` | **El filtro por categoria y producto de Ventas > PRODUCTOS.** Los montos NO van hardcodeados: le pide al backend el mismo periodo que muestra la pantalla y compara (con los montos escritos a mano el test se rompe solo al dia siguiente, y la primera corrida fallo justo por eso). Mide **todo por el DOM** — `prodState` y `prodVista` viven en el IIFE de la sub-app— y el control que decide todo es que el **KPI sea la suma del ranking** |
| `probar_armado.js` | **ARMADO: el nombre completo del producto y la cantidad con su unidad**, mas el boton de reprogramar un dia atrasado. Abre los acordeones antes de medir (los dias arrancan plegados en cada refresh). **Si hoy no hay ningun dia atrasado, el bloque de reprogramar se saltea diciendo por que** en vez de explotar con `null.click()` — que se lee como “el ERP se rompio”, lo peor que puede hacer un test (paso el 11/9/2026, cuando quedaron todos entregados). Lo correcto seria **sembrar** el pedido atrasado con un stub para que no dependa del dato del dia: pendiente. La direccion contraria va con un parche EN LA FUENTE, no con una bandera: `_cantTxt` y `PROD_UNI` viven en el IIFE y asignarlos desde `Runtime.evaluate` crea otra variable en window — asi el test daba verde con el bug adentro |
| `probar_ruta.js` | **RUTA > RUTA, la parada, botón por botón**: la barra de arriba (Parada N de M, cuál sigue), los filtros por zona, cada tipo de card (del freezer, atrasada, mixta con kilos, sin teléfono, combo, club, vendedor Red, depósito), el confirm y el POST de Entregado, Cobrar, la lista de paradas y ordenar. Con `entregas` y `pendientesGuardarStock` **stubbeados con datos inventados** (el repo es público) sobre el ERP fusionado y la sesión real. Mide lo que nadie más mira: que la barra de Cobrar/Entregado se vea **sin scrollear** (y arriba del statusbar en la compu), que al final del scroll no tape la card, y que no haya un solo `wa.me`. **Ojo:** `entregas` y `pendientesGuardarStock` viven en el IIFE — desde afuera se lee la COPIA que publica el build; se pregunta por `getPendientes()` / `getSorted()` |
| `probar_flujo_ruta.js` | **Que ninguna accion de la card de RUTA tape la pantalla.** Corre con el **POST demorado 8 s a proposito**: con un backend instantaneo las cinco acciones dan 0 ms y el test da verde con el bug adentro. El tapado se mide con un sampler que corre EN el navegador (cada 40 ms), asi no depende de cada cuanto pregunte el test. Exige que la accion quede en la **cola de localStorage** y la lee MIENTRAS el POST viaja: despues da `[]` siempre, porque al volver el ok sale de la cola. Cubre tambien que entregar la ultima parada no salte a la primera y la vuelta atras (**Ya entregadas hoy** + *No se entrego*), incluido que sobreviva a recargar la app. **Ojo**: `rutaIndex` y `rutaModoLista` viven en el IIFE (se navega con `rutaNext()` y se mira el DOM), el PREP se re-inyecta en cada navegacion (marca en `sessionStorage`) y `innerText` llega en MAYUSCULAS por `text-transform` |
| `probar_cobro_entrega.js` | **La casilla "Y ya se lo entregue" del cuadro de cobro** (12/9/2026): una parada eran 5 toques y pasan a 3. Sostiene las **dos direcciones** del mismo riesgo: tildada marca cobrado Y entregado (con el `marcarCobrado` primero en la cola, el POST de la entrega con `cobrado:true` y el pedido **sin** entrar a COBROS); destildada marca **solo** el cobro y la parada se queda. Y donde la entrega no es cierta la casilla no existe: desde COBROS y en pago parcial. Cubre el combo. **Ojo**: `entregados`, `cobrados` y `pendientesCobro` viven en el IIFE, asi que se leen de `localStorage` (`maleu_ruta`); y los 3 errores `render -> inicio/pedidos` que salen a veces son del panel con el volcado a medias, no de RUTA (intermitentes: correlo de nuevo antes de creerles) |
| `probar_armado_compartido.js` | **RUTA con DOS celulares a la vez** (12/9/2026): el armado compartido y la sincronizacion automatica cada 15 s. Abre **dos Chrome** contra **un backend simulado que vive en el proceso del test**: los GET de `entregas` y todos los POST se interceptan con CDP `Fetch`, asi que lo que escribe un celular lo lee el otro y ningun POST llega a produccion. Sostiene: lo que tilda A lo ve B solo y dice quien; lo que destilda B desaparece en A (el caso que agarro el bug de la firma); con un cuadro abierto B no se repinta; el tilde no parpadea mientras su POST viaja; sin cambios, **0 mutaciones** en la pantalla; RUTA se queda en la misma parada aunque el otro entregue una de antes; y un backend sin `arm` no borra nada. Tarda ~4 min. **Ojo**: usa su propio PREP porque el compartido responde los POST adentro de la pagina y aca tienen que salir a la red; y no lo corras en paralelo con otro test de RUTA |
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
| `probar_pedidos_lista.js` | **La tab Pedidos, rapida** (12/9/2026). `node probar_pedidos_lista.js [390|1440]`, sin token: el backend entero va stubbeado con **1.200 pedidos inventados**. Sostiene que la lista se pinte en **tandas** (<=40 arriba, despues todas, sin repetir ni intercalar dos pintadas), que el **cuerpo de la tarjeta se arme al abrirla** (con sus controles, sin duplicarse), que `_ordGo` abra una del fondo, `content-visibility:auto`, **ningun bloque de mas de 400 ms con CPU x4**, que "Actualizar pedidos" no pinte Pedidos Home, que el ↻ en Pedidos pida **solo** pedidos+OCs y no lo repita al terminar, que el pintado en segundo plano **espere a que no se toque la pantalla**, que `tendencia` no se pida desde Pedidos, y que un volcado que contesta `{ok:false}` **no borre los datos**. **Fase 2**: arranque en frio con `pedidosLight` caido y la caja bien — ninguna seccion revienta por la lista que falta y, cuando los pedidos llegan, la lista se pinta (contra v318: 1 rojo). Direccion contraria: `APP=app_viejo_tmp.html ADMIN_OK=1` (con `git show HEAD:app.html > app_viejo_tmp.html`, borralo despues): 11 ok / 10 mal. **Ojo**: el chequeo de "no vuelve a pedir" espera 95 s a proposito — el doble pedido viejo solo aparece pasado el freno de 90 s, y antes daria verde con el bug adentro |
| `probar_ruta_refresh.js` | **El ↻ de RUTA sin recalcular de mas** (12/9/2026). `node probar_ruta_refresh.js [390|1440]`, sin token, `entregas` stubbeado **con demora** para que "hay uno en vuelo" sea observable. Sostiene que el ↻ del panel, el de la sub-app y la sincronizacion pidan **sin `fresh=1`** (el cache se keyea por version: forzarlo solo recalculaba, 8-11 s contra 2), que **con la sincronizacion en vuelo el ↻ no mande otro pedido** y aun asi repinte con lo que llego, y que despues no quede pegado. Contra la version vieja: 5 ok / 3 mal |
| `probar_pedido_entregado_piezas.js` | **Un pedido que se CARGA ya Entregado pasa sus piezas a Entregada** (13/9/2026). Corre `_doPostPedido` del `Code.js` real con `_doPostHome` stubbeado y la hoja Piezas Carne simulada (datos inventados). Lucas carga desde el AUTOPEDIDO pedidos que ya entrego: nunca pasan por `marcarEntregado` y sus piezas quedaban `Asignada` — contando como freezer, y la proxima tanda de RECIBIR CARNE se las devolvia al stock (Pilar #65 y #66, 8 piezas, 10,692 kg). Cubre que un Pendiente y un Reservado sigan dejandola Asignada. Acepta un `Code.js` anterior: 4 ok / 2 mal |
| `probar_prod_evol.js` | **El grafico de lineas de Ventas > PRODUCTOS y las Unidades de TENDENCIA** (13/9/2026). `node probar_prod_evol.js <token> [390|1440]`, sesion real, lee lo que devuelve `productosAnalytics`. Sostiene que las 8 semanas tengan fecha, que las series salgan por categoria (y por producto con un filtro), que la leyenda sume lo mismo que el backend, que no ofrezca Kilos cuando se mezclan unidades y kilos, y que la Carne cambie entre Plata y Kilos. Y el cruce: las Unidades vendidas de TENDENCIA (del volcado) dan semana por semana lo mismo que PRODUCTOS (del backend) — solo lo entregado, por dia de entrega. Con todos los productos cruza solo las UNIDADES y con Carnes los KILOS, y vacia `D.stock` a proposito para que la unidad no dependa de que llegue el volcado. Productos tarda 20-40 s (espera 240): correlo solo. 33 ok a 390 y 32 a 1440 contra produccion; con la unidad sacada de `D.stock`: 25 ok / 5 mal |
| `probar_refresco_hdr.js` | **El ↻ de arriba dice de cuándo es lo que estás mirando** (13/9/2026). `node probar_refresco_hdr.js [390|1440]`, sin token: todo el backend stubbeado. Tres fases con navegacion propia (`?fase=a|b|c`) y UNA sola inyeccion. Sostiene que al abrir no muestra una hora (dice "Actualizando…"), que dice "recién" apenas llegan pedidos y caja aunque el volcado siga en vuelo, que una copia de hace 35 min dice "hace 35 min" en ambar, que Caja, Inicio y Stock dicen cada una lo suyo, que se repinta sola (espera 33 s), "No se pudo" y el tilde, que en Ventas gira hasta que llegan las ventas y un error no vacia la tab, que una falla de Ruta es una falla, que Ajustes no inventa una hora, "Sin conexión", y el layout (44px y sin pisar el logo en el celular; ancho fijo y el buscador en un renglon en la compu). 30 ok en los dos anchos, local y contra produccion; contra la v322: 7 ok / 23 mal |
| `probar_pdf_semanal.js` | **El PDF de la semana** (14/9/2026). `node probar_pdf_semanal.js [390|1440]`, sin token: backend stubbeado con datos inventados y el reloj en el lunes 14/9. Sostiene que diga lo mismo que Ventas retail; el **economico** (margen − bolsas imputadas − campañas, WATI incluido − delivery = contribucion, menos la parte de los fijos del mes por dias) y el **financiero** (cobrado y pagos, sin vueltos) calculados a mano; lo que quedo por cobrar AL CIERRE y Red sin rendir; el objetivo retail del Plan de Ventas; quienes son los nuevos y los que volvieron, cruzados por referencia (y si faltan los nombres, que los pida a `saludClientes`); carne y algo mas con el estado de cada cliente; y el PDF: cada bloque a escala 3, ninguna imagen fuera de la hoja y ningun corte en la mitad de un renglon. Contra v338: 39 rojos. **Ojo**: html2canvas captura en un iframe del mismo origen y `addScriptToEvaluateOnNewDocument` corre tambien ahi: lo que borre localStorage va con `window.top===window` |
| `probar_planificacion.js` | **La tab Planificacion** (14/9/2026). `node probar_planificacion.js [390|1440]`, sin token: backend stubbeado con datos inventados y el reloj en el lunes 14/9. Sostiene que desde septiembre 2026 la meta "Venta Directa | Estancias del Pilar" es la de **todo el retail** (Home + Pilar) en el hero y en la tarjeta, con los barrios como detalle, y que en julio sigue siendo la del barrio; que la semana cuenta lo entregado **el dia que se entrego**; que un tramo con meta 0 no corre a los demas; el editor **Metas del mes** (plata, pedidos y casas por semana, lo vendido en las cerradas, la suma contra la meta, casas que no bajan) y que el POST de Clubes no manda curvas; que el cruce ya no promete una casilla dada de baja, y que con la tab abierta `planMes` sale de la cola antes que la caja. Contra v340: 17 rojos |
| `ver_pdf_semanal_real.js` | **El PDF de una semana con los datos reales, para mirarlo** (14/9/2026). `node ver_pdf_semanal_real.js <token> [lunes] [carpeta]`: imprime por cobrar, Red sin rendir, carne y nuevos, y con carpeta guarda capturas del documento a 800px (el ancho del PDF). No es un test; usa la sesion real, de a una prueba por vez |
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
