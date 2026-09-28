/* Inicio > Resumen: el TOTAL DE MALEU arriba de Ventas retail. (28/9/2026)

     node probar_resumen_total.js
     APP=app_viejo_tmp.html node probar_resumen_total.js   <- la contraria

   Tadeo: *"poner arriba de ventas retail la suma del total... tres cards, una de
   facturacion, otra de costo y otra de margen bruto total de Maleu, sumando
   retail y sumando catering"*. Y despues: *"prefiero que aparezca el mensual
   total. No la semanal. Y un boton al costado de flechita izq y derecha para
   cambiar de mes"*.

   Lo que tiene que ser cierto:
     · la card esta y esta ARRIBA de Ventas retail, no abajo ni al costado;
     · es MENSUAL y arranca en el mes en curso, aunque el selector de abajo este
       parado en una semana;
     · sus flechas mueven el mes y NO tocan el bloque de abajo, ni al reves;
     · las flechas se apagan en los bordes: no hay "mes que viene";
     · un mes vacio lo dice y SIGUE mostrando las flechas, o te quedarias sin
       forma de volver;
     · los tres numeros son retail + catering, y el margen es la resta;
     · el catering NO se cuenta dos veces: el arbol de abajo sigue siendo retail
       y la nota "no suma arriba" sigue ahi;
     · un costo que sube sale en ROJO, no en verde: al lado de una facturacion
       que sube, el mismo color diria que las dos son buenas noticias.

   Los nombres son inventados a proposito: este repo es publico. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
/* Con guarda: contra el ERP anterior `mtMover` no existe, y sin esto el test
   explotaba en el primer toque en vez de dar rojos — un test que explota no dice
   nada sobre lo que venia despues. */
const mover = (cli, n) => evaluar(cli, `try{mtMover(${n});}catch(e){}; 1`);
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};

const HOY = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
/* `n` meses atras, dia 1: entra siempre, se corra el dia que se corra. */
const mesAtras = n => iso(new Date(HOY.getFullYear(), HOY.getMonth() - n, 1));
const MES = n => { const d = new Date(HOY.getFullYear(), HOY.getMonth() - n, 1); return RT_MESES[d.getMonth()] + ' ' + d.getFullYear(); };
const RT_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/* Tres meses con datos y uno vacio EN EL MEDIO (hace 2), para poder navegar
   hasta el hueco: si el mes vacio quedara en la punta, la flecha estaria
   apagada y no habria forma de llegar. */
const D = {
  stock: [],
  pedidos: [
    { n: '1', h: 'Home', c: 'Casa De Este Mes', bar: 'Estancias del Pilar',
      dee: mesAtras(0), fex: mesAtras(0), es: 'Entregado', $: 100000, co: 60000 },
    { n: '2', h: 'Home', c: 'Casa Del Mes Pasado', bar: 'Estancias del Pilar',
      dee: mesAtras(1), fex: mesAtras(1), es: 'Entregado', $: 80000, co: 40000 },
    /* hace 2 meses: NADA, a proposito */
    { n: '3', h: 'Home', c: 'Casa Vieja', bar: 'Estancias del Pilar',
      dee: mesAtras(3), fex: mesAtras(3), es: 'Entregado', $: 10000, co: 6000 }
  ],
  /* Catering llega por `ventasExtra` (la hoja `Catering`), no como pedido.
     Los numeros son los del evento real del 25/9/2026. */
  ventasExtra: [
    { h: 'Catering', c: 'Un Evento', fx: mesAtras(0), $: 552000, co: 312344 }
  ]
};

const LEER = `(function(){
  var b=document.getElementById('hRetail'); if(!b) return {sin:'caja'};
  var mt=b.querySelector('.mt'), rt=b.querySelector('.rt');
  var ks=mt?mt.querySelectorAll('.mt-k'):[];
  var nav=mt?mt.querySelectorAll('.mt-nav .rt-nav-b'):[];
  var card=function(i){ var k=ks[i]; if(!k) return null;
    var d=k.querySelector('.rt-kd');
    return { l:(k.querySelector('.rt-kl')||{}).textContent||'',
             v:(k.querySelector('.mt-kv')||{}).textContent||'',
             cls:d?d.className:'', d:d?d.textContent:'' }; };
  return {
    hay:!!mt, cards:ks.length,
    /* compareDocumentPosition: 4 = el segundo va DESPUES del primero. */
    arriba: !!(mt&&rt) && !!(mt.compareDocumentPosition(rt)&4),
    flechas: nav.length,
    atras: nav[0]?!nav[0].disabled:null,
    adelante: nav[1]?!nav[1].disabled:null,
    fac:card(0), cos:card(1), mar:card(2),
    pie: mt?((mt.querySelector('.mt-pie')||{}).textContent||''):'',
    nota: mt?((mt.querySelector('.mt-nota')||{}).textContent||''):'',
    vacio: mt?((mt.querySelector('.mt-vacio')||{}).textContent||''):'',
    sub: mt?((mt.querySelector('.mt-sub')||{}).textContent||''):'',
    subRt: (b.querySelector('.rt-sub')||{}).textContent||'',
    txtRt: rt?(rt.innerText||''):''
  };
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
    console.log('\n== Inicio > Resumen · Total Maleu · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof rRetail==='function'&&typeof _rtSumar==='function'`, 60000)) {
      console.log('  el ERP no arranco'); salir(1);
    }
    await pausa(800);

    /* El selector de abajo arranca en una SEMANA a proposito: es justo el caso
       donde antes el total mostraba la semana y Tadeo queria el mes. */
    await evaluar(cli, `window.D=${JSON.stringify(D)}; window.M6=null; 1`);
    await evaluar(cli, `rtPer('semAnt'); 1`);
    await pausa(500);
    const v = await evaluar(cli, LEER);

    /* ── 1. Que este, arriba, y que sea MENSUAL ── */
    chk('la card del total esta', v.hay === true, v);
    chk('y esta ARRIBA de Ventas retail', v.arriba === true, { arriba: v.arriba });
    chk('son tres cards', v.cards === 3, { cards: v.cards });
    chk('arranca en el MES en curso (' + MES(0) + ')', (v.sub || '').indexOf(MES(0)) === 0, v.sub);
    chk('   aunque abajo el selector esté en una semana', /Semana \d/.test(v.subRt || ''), v.subRt);

    /* ── 2. Los numeros del mes: retail 100.000 + catering 552.000 ── */
    const f = (v.fac || {}), c = (v.cos || {}), m = (v.mar || {});
    chk('dice Facturación', /Facturaci/i.test(f.l || ''), f);
    chk('   y suma retail y catering: $652.000', (f.v || '').indexOf('652.000') >= 0, f);
    chk('dice Costo', /^Costo/i.test((c.l || '').trim()), c);
    chk('   y suma los dos costos: $372.344', (c.v || '').indexOf('372.344') >= 0, c);
    chk('dice Margen bruto', /Margen bruto/i.test(m.l || ''), m);
    chk('   y es la resta: $279.656', (m.v || '').indexOf('279.656') >= 0, m);
    chk('   con su porcentaje (43%)', (m.v || '').indexOf('43%') >= 0, m);

    /* ── 3. El color del costo va al reves ── */
    chk('el costo que SUBE sale en rojo, no en verde', /\bdn\b/.test(c.cls || ''), { cls: c.cls, d: c.d });
    chk('   pero la flecha sigue diciendo que subió', (c.d || '').indexOf('▲') >= 0, c);
    chk('la facturación que sube sale en verde', /\bup\b/.test(f.cls || ''), { cls: f.cls, d: f.d });

    /* ── 4. El catering no se cuenta dos veces ── */
    chk('el árbol de abajo sigue siendo retail: no suma el catering',
        v.txtRt.indexOf('no suma arriba') >= 0 || v.txtRt.indexOf('Todavía no hay entregas') >= 0, v.txtRt.slice(-260));
    const g = await evaluar(cli, `(function(){var P=_rtPeriodo('m:'+(new Date().getFullYear())+'-'+String(new Date().getMonth()+1).padStart(2,'0'),new Date());
      var g=_rtSumar(P.d,P.h);
      return {tot:g.tot.f,dom:g.dom.f,inst:g.inst.f,cat:g.cat.f};})()`);
    chk('   el retail sigue en 100.000 y el catering aparte', g.tot === 100000 && g.cat === 552000, g);
    chk('   y Domiciliario + Institucional dan el retail, no el total', g.dom + g.inst === g.tot, g);

    /* ── 5. El pie y la aclaracion ── */
    chk('el pie abre el número en retail y catering',
        v.pie.indexOf('100.000') >= 0 && v.pie.indexOf('552.000') >= 0, v.pie);
    chk('y avisa que el costo del catering lleva los sueldos', v.nota.indexOf('sueldos') >= 0, v.nota);

    /* ── 6. Las flechas ── */
    console.log('\n== Las flechas del mes ==');
    chk('tiene sus dos flechas', v.flechas === 2, { flechas: v.flechas });
    chk('en el mes en curso NO se puede ir adelante', v.adelante === false, { adelante: v.adelante });
    chk('   pero sí atrás', v.atras === true, { atras: v.atras });

    await mover(cli, -1);
    await pausa(350);
    const v2 = await evaluar(cli, LEER);
    chk('← lleva al mes pasado (' + MES(1) + ')', (v2.sub || '').indexOf(MES(1)) === 0, v2.sub);
    chk('   y muestra sus números ($80.000)', ((v2.fac || {}).v || '').indexOf('80.000') >= 0, v2.fac);
    chk('   sin catering ese mes, y lo dice', v2.pie.indexOf('sin catering') >= 0, v2.pie);
    chk('   ahora sí se puede ir adelante', v2.adelante === true, { adelante: v2.adelante });
    /* Lo que NO tiene que pasar: mover el mes de arriba no toca el bloque de
       abajo. Son dos preguntas distintas y cada una tiene su selector. */
    chk('   y el bloque de abajo NO se movió', v2.subRt === v.subRt, { antes: v.subRt, ahora: v2.subRt });

    /* ── 7. Un mes sin nada, en el medio de la historia ── */
    console.log('\n== Un mes vacío ==');
    await mover(cli, -1);
    await pausa(350);
    const v3 = await evaluar(cli, LEER);
    chk('el mes vacío lo dice en vez de mostrar tres ceros',
        v3.vacio.indexOf('Sin entregas') >= 0 && v3.cards === 0, { vacio: v3.vacio, cards: v3.cards });
    chk('   y las flechas siguen ahí para poder volver', v3.flechas === 2 && v3.adelante === true, v3);
    chk('   dice de qué mes habla (' + MES(2) + ')', (v3.sub || '').indexOf(MES(2)) === 0, v3.sub);

    await mover(cli, 1); await mover(cli, 1);
    await pausa(350);
    const v4 = await evaluar(cli, LEER);
    chk('→ vuelve al mes en curso', (v4.sub || '').indexOf(MES(0)) === 0 && v4.adelante === false, v4.sub);

    /* ── 8. El selector de abajo tampoco mueve el de arriba ── */
    await evaluar(cli, `rtPer('mesAnt'); 1`);
    await pausa(400);
    const v5 = await evaluar(cli, LEER);
    chk('cambiar el período de abajo NO mueve el total de arriba',
        (v5.sub || '').indexOf(MES(0)) === 0, { arriba: v5.sub, abajo: v5.subRt });

    /* ── 9. En el teléfono ── */
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await pausa(400);
    const tel = await evaluar(cli, `(function(){
      var b=document.getElementById('hRetail'); var mt=b?b.querySelector('.mt'):null;
      if(!mt) return {sin:1};
      var ks=mt.querySelectorAll('.mt-k'), out=[];
      for(var i=0;i<ks.length;i++){ var r=ks[i].getBoundingClientRect(); out.push(Math.round(r.width)); }
      var nb=mt.querySelectorAll('.mt-nav .rt-nav-b'), alt=[];
      for(var j=0;j<nb.length;j++){ var q=nb[j].getBoundingClientRect(); alt.push(Math.round(q.height)); }
      /* Con guarda: contra el ERP anterior no hay encabezado propio y esto
         reventaba el test entero en la ultima medicion. */
      var te=mt.querySelector('.mt-t'), ne=mt.querySelector('.mt-nav');
      var t=te?te.getBoundingClientRect():null, n=ne?ne.getBoundingClientRect():null;
      return { anchos:out, flechas:alt,
               pisado:(t&&n)?(t.right>n.left+1&&t.bottom>n.top&&n.bottom>t.top):null,
               doc:document.documentElement.scrollWidth, win:window.innerWidth };
    })()`);
    chk('en el teléfono las cards se apilan en vez de achicarse',
        !!(tel.anchos && tel.anchos.length === 3 && tel.anchos[0] > 250), tel);
    chk('   las flechas se pueden tocar (34px o más)',
        !!(tel.flechas && tel.flechas.length === 2 && tel.flechas.every(h => h >= 34)), tel.flechas);
    chk('   y no se pisan con el título', tel.pisado === false, tel);
    chk('   la pantalla no se va de ancho', tel.doc <= tel.win + 1, tel);
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
