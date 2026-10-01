/* EL PORTAL DEL VENDEDOR: SU ESCALON Y SU REPARTO. (1/10/2026)

     node _tools/pruebas/probar_portal_escalon.js [390|1440]

   Sin token: se llaman las dos funciones de render con datos inventados.

   DOS COSAS CAMBIARON HOY, Y LAS DOS TIENEN UN CASO REAL DETRAS.

   1. EL ESCALON SE VE. Desde octubre la comision de Red no es un 17% parejo:
      es un monto por producto que depende del nivel, y el nivel depende de lo
      que el vendedor entrego en el mes. Hasta hoy eso vivia entero del lado
      de Maleu — el vendedor iba a cobrar distinto sin saber por que.

      Medido el 1/10 sobre todo 2026: **nadie llego nunca al nivel top**
      ($2,5M) y dos de los tres nunca pasaron la mitad del corte intermedio
      ($1M). Por eso la barra **no se maquilla**: pintarla casi llena cuando
      faltan $1,2M es una mentira que la liquidacion desmiente a fin de mes.

      Y si la escala no se puede leer, la tarjeta NO se dibuja. Un nivel
      inventado es peor que ningun nivel: el vendedor planifica con el.

   2. EL REPARTO NO ES "EL VIERNES". Los tres de Pilar reparten los viernes;
      **Fede, de Tigre, reparte viernes Y sabados** (arranca el 2/10/2026). El
      portal contaba `diaEntrega === 'Viernes'`, asi que un sabado a la mañana
      con el auto cargado le iba a decir que no tenia nada que entregar.

   Contra el red.html anterior tiene que dar ROJOS, no reventar.
*/
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 260) : '')); } };

/* Las tres bandas reales, leidas de Supabase el 1/10/2026. */
const BANDAS = [{ nivel: 'inicial', desde: 0 },
                { nivel: 'intermedio', desde: 1000000 },
                { nivel: 'top', desde: 2500000 }];

const LEER = `(function(){
  var c=document.getElementById('escala-card');
  if(!c) return {existe:false};
  var oculta=c.classList.contains('hidden');
  var bar=c.querySelector('.ec-bar i');
  return {existe:true, oculta:oculta, txt:(c.innerText||'').replace(/\\s+/g,' ').trim(),
          nivel:(c.querySelector('.ec-nivel')||{}).textContent||'',
          ancho:bar?bar.style.width:''};
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html?prueba=1' });
    for (let i = 0; i < 90; i++) { try { if (await evaluar(cli, `typeof go==='function'`)) break; } catch (e) {} await pausa(250); }
    /* Mi Portal se compila adentro de app.html y arranca su JS la primera vez
       que se abre la tab. Sin esto, `renderEscala` todavia no existe. */
    await evaluar(cli, `go('miportal'); 1`);
    for (let i = 0; i < 60; i++) { try { if (await evaluar(cli, `typeof renderEscala==='function'`)) break; } catch (e) {} await pausa(250); }
    await pausa(400);

    const hay = await evaluar(cli, `typeof renderEscala==='function' && typeof redTituloReparto==='function'`);
    chk('las dos funciones existen en el portal', hay === true, { hay });
    if (hay !== true) { console.log('\n  (red.html anterior al 1/10/2026)\n' + ok + ' ok, ' + mal + ' mal'); salir(1); }

    /* ── 1. EL CASO DE HOY: Marcos, lejos del corte ── */
    console.log('\n== Un vendedor en el nivel inicial ==');
    await evaluar(cli, `renderEscala(${JSON.stringify({
      nivel: 'inicial', facturado: 689400, bandas: BANDAS,
      siguiente: { nivel: 'intermedio', desde: 1000000, falta: 310600 } })}, 'Octubre'); 1`);
    await pausa(200);
    const v1 = await evaluar(cli, LEER);
    chk('la tarjeta aparece', v1.existe === true && v1.oculta === false, v1);
    chk('dice el nivel', /inicial/i.test(v1.nivel), v1.nivel);
    chk('dice de que mes es', /octubre/i.test(v1.txt), v1.txt.slice(0, 80));
    chk('muestra lo entregado, con separador de miles', /689\.400/.test(v1.txt), v1.txt.slice(0, 120));
    chk('dice cuanto falta y para que nivel',
        /310\.600/.test(v1.txt) && /intermedio/i.test(v1.txt), v1.txt.slice(0, 200));
    /* La palabra importa: el escalon se calcula con el mes de ENTREGA, no con
       el dia que se cargo el pedido. En Red hay hasta 27 dias de diferencia. */
    chk('dice ENTREGADO, no vendido',
        /entregad/i.test(v1.txt) && !/vendiste|vendido/i.test(v1.txt), v1.txt.slice(0, 200));
    /* 689.400 sobre un tramo de 0 a 1.000.000 es el 69%. Si la barra dijera
       mas, estaria maquillando. */
    chk('la barra mide el tramo real (69%)', v1.ancho === '69%', v1.ancho);

    /* ── 2. LA BARRA MIDE EL TRAMO, NO DESDE CERO ── */
    console.log('\n== Ya paso un corte: la barra arranca de ahi ==');
    await evaluar(cli, `renderEscala(${JSON.stringify({
      nivel: 'intermedio', facturado: 1750000, bandas: BANDAS,
      siguiente: { nivel: 'top', desde: 2500000, falta: 750000 } })}, 'Octubre'); 1`);
    await pausa(200);
    const v2 = await evaluar(cli, LEER);
    /* De 1.000.000 a 2.500.000 hay 1.500.000; lleva 750.000 => 50%.
       Medido desde cero daria 70%, que es el error que se quiere evitar. */
    chk('mide 50%, no 70%', v2.ancho === '50%', v2.ancho);
    chk('el chip dice intermedio', /intermedio/i.test(v2.nivel), v2.nivel);

    /* ── 3. EL TOP NO PROMETE UN NIVEL QUE NO EXISTE ── */
    console.log('\n== En el nivel mas alto ==');
    await evaluar(cli, `renderEscala(${JSON.stringify({
      nivel: 'top', facturado: 3100000, bandas: BANDAS, siguiente: null })}, 'Octubre'); 1`);
    await pausa(200);
    const v3 = await evaluar(cli, LEER);
    chk('no dice "te faltan"', !/te faltan/i.test(v3.txt), v3.txt.slice(0, 160));
    chk('dice que es el mas alto', /m\u00e1s alto/i.test(v3.txt), v3.txt.slice(0, 160));
    chk('la barra esta llena', v3.ancho === '100%', v3.ancho);

    /* ── 4. SIN ESCALA NO SE INVENTA UN NIVEL ── */
    console.log('\n== Si la escala no se pudo leer ==');
    for (const caso of ['null', '{}', 'undefined']) {
      await evaluar(cli, `renderEscala(${caso}, 'Octubre'); 1`);
      await pausa(150);
      const v = await evaluar(cli, LEER);
      chk('con ' + caso + ' la tarjeta no se dibuja', v.oculta === true && v.txt === '', v);
    }

    /* ── 5. EL REPARTO DE CADA UNO ── */
    console.log('\n== Como se llama el reparto de cada vendedor ==');
    const t = async (dias) => evaluar(cli, `redTituloReparto(${JSON.stringify({ dias })})`);
    chk('Fede, que reparte viernes y sabados',
        (await t(['Viernes', 'Sábado'])) === 'Viernes y sábado', await t(['Viernes', 'Sábado']));
    chk('los tres de Pilar, solo viernes',
        (await t(['Viernes'])) === 'Este viernes', await t(['Viernes']));
    chk('un sabado suelto', (await t(['Sábado'])) === 'Este sábado', await t(['Sábado']));
    chk('tres dias o mas: "Esta semana"',
        (await t(['Jueves', 'Viernes', 'Sábado'])) === 'Esta semana', await t(['Jueves', 'Viernes', 'Sábado']));
    chk('sin dias no inventa uno', (await t([])) === 'Esta semana', await t([]));
    chk('sin el campo tampoco (backend anterior)',
        (await evaluar(cli, `redTituloReparto({total:3})`)) === 'Esta semana');

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
