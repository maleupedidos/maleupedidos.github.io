/* Inicio > Resumen: el TOTAL DE MALEU arriba de Ventas retail. (28/9/2026)

     node probar_resumen_total.js
     APP=app_viejo_tmp.html node probar_resumen_total.js   <- la contraria

   Tadeo: *"poner arriba de ventas retail la suma del total... tres cards, una de
   facturacion, otra de costo y otra de margen bruto total de Maleu, sumando
   retail y sumando catering"*.

   Lo que tiene que ser cierto:
     · la card esta y esta ARRIBA de Ventas retail, no abajo ni al costado;
     · los tres numeros son retail + catering, y el margen es la resta;
     · el catering NO se cuenta dos veces: el arbol de abajo sigue siendo retail
       y la nota "no suma arriba" sigue ahi;
     · un costo que sube sale en ROJO, no en verde: al lado de una facturacion
       que sube, el mismo color diria que las dos son buenas noticias;
     · sin catering en el periodo dice el retail solo, y lo aclara;
     · sin nada entregado NO dibuja tres ceros;
     · y el periodo es el del selector de abajo: las dos cosas se mueven juntas.

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
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};

const HOY = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dia = n => iso(new Date(HOY.getFullYear(), HOY.getMonth(), n));
const diaAnt = n => iso(new Date(HOY.getFullYear(), HOY.getMonth() - 1, n));

/* El mes en curso se compara contra los MISMOS dias del anterior, asi que el
   caso de comparacion va al dia 1: entra siempre, se corra el dia que se corra. */
const D = {
  stock: [],
  pedidos: [
    /* Este mes: una casa entregada. */
    { n: '1', h: 'Home', c: 'Casa Del Mes', bar: 'Estancias del Pilar',
      dee: dia(1), fex: dia(1), es: 'Entregado', $: 100000, co: 60000 },
    /* El mes pasado, para que haya contra que comparar. */
    { n: '2', h: 'Home', c: 'Casa Del Mes Pasado', bar: 'Estancias del Pilar',
      dee: diaAnt(1), fex: diaAnt(1), es: 'Entregado', $: 80000, co: 40000 }
  ],
  /* Catering llega por `ventasExtra` (la hoja `Catering`), no como pedido.
     Los numeros son los del evento real del 25/9/2026. */
  ventasExtra: [
    { h: 'Catering', c: 'Un Evento', fx: dia(1), $: 552000, co: 312344 }
  ]
};

const LEER = `(function(){
  var b=document.getElementById('hRetail'); if(!b) return {sin:'caja'};
  var mt=b.querySelector('.mt'), rt=b.querySelector('.rt');
  var ks=mt?mt.querySelectorAll('.mt-k'):[];
  var card=function(i){ var k=ks[i]; if(!k) return null;
    var d=k.querySelector('.rt-kd');
    return { l:(k.querySelector('.rt-kl')||{}).textContent||'',
             v:(k.querySelector('.mt-kv')||{}).textContent||'',
             cls:d?d.className:'', d:d?d.textContent:'' }; };
  return {
    hay:!!mt, cards:ks.length,
    /* compareDocumentPosition: 4 = el segundo va DESPUES del primero. */
    arriba: !!(mt&&rt) && !!(mt.compareDocumentPosition(rt)&4),
    fac:card(0), cos:card(1), mar:card(2),
    pie: mt?((mt.querySelector('.mt-pie')||{}).textContent||''):'',
    nota: mt?((mt.querySelector('.mt-nota')||{}).textContent||''):'',
    sub: mt?((mt.querySelector('.mt-sub')||{}).textContent||''):'',
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

    await evaluar(cli, `window.D=${JSON.stringify(D)}; window.M6=null; 1`);
    await evaluar(cli, `rtPer('mes'); 1`);
    await pausa(500);
    const v = await evaluar(cli, LEER);

    /* ── 1. Que este, y que este arriba ── */
    chk('la card del total esta', v.hay === true, v);
    chk('y esta ARRIBA de Ventas retail', v.arriba === true, { arriba: v.arriba });
    chk('son tres cards', v.cards === 3, { cards: v.cards });

    /* ── 2. Los numeros: retail 100.000 + catering 552.000 ── */
    const f = (v.fac || {}), c = (v.cos || {}), m = (v.mar || {});
    chk('dice Facturación', /Facturaci/i.test(f.l || ''), f);
    chk('   y suma retail y catering: $652.000', (f.v || '').indexOf('652.000') >= 0, f);
    chk('dice Costo', /^Costo/i.test((c.l || '').trim()), c);
    chk('   y suma los dos costos: $372.344', (c.v || '').indexOf('372.344') >= 0, c);
    chk('dice Margen bruto', /Margen bruto/i.test(m.l || ''), m);
    chk('   y es la resta: $279.656', (m.v || '').indexOf('279.656') >= 0, m);
    chk('   con su porcentaje (43%)', (m.v || '').indexOf('43%') >= 0, m);

    /* ── 3. El color del costo va al reves ──
       Contra el mes pasado el costo pasa de 40.000 a 372.344: sube, y subir un
       costo no es una buena noticia. La flecha sigue marcando la direccion. */
    chk('el costo que SUBE sale en rojo, no en verde', /\bdn\b/.test(c.cls || ''), { cls: c.cls, d: c.d });
    chk('   pero la flecha sigue diciendo que subio', (c.d || '').indexOf('▲') >= 0, c);
    chk('la facturación que sube sale en verde', /\bup\b/.test(f.cls || ''), { cls: f.cls, d: f.d });

    /* ── 4. El catering no se cuenta dos veces ── */
    chk('el árbol de abajo sigue siendo retail: no suma el catering',
        v.txtRt.indexOf('no suma arriba') >= 0, v.txtRt.slice(-260));
    const g = await evaluar(cli, `(function(){var P=_rtPeriodo('mes',new Date());var g=_rtSumar(P.d,P.h);
      return {tot:g.tot.f,dom:g.dom.f,inst:g.inst.f,cat:g.cat.f};})()`);
    chk('   el retail sigue en 100.000 y el catering aparte', g.tot === 100000 && g.cat === 552000, g);
    chk('   y Domiciliario + Institucional dan el retail, no el total',
        g.dom + g.inst === g.tot, g);

    /* ── 5. El pie y la aclaracion ── */
    chk('el pie abre el número en retail y catering',
        v.pie.indexOf('100.000') >= 0 && v.pie.indexOf('552.000') >= 0, v.pie);
    chk('y avisa que el costo del catering lleva los sueldos',
        v.nota.indexOf('sueldos') >= 0, v.nota);
    chk('la card dice de qué período habla', (v.sub || '').length > 3 && /retail y catering/.test(v.sub), v.sub);

    /* ── 6. Un mes sin catering ── */
    console.log('\n== Un período sin catering ==');
    await evaluar(cli, `D.ventasExtra=[]; rRetail(); 1`);
    await pausa(300);
    const v2 = await evaluar(cli, LEER);
    chk('la card sigue: es el total, no "el total con catering"', v2.hay === true, v2);
    chk('   y muestra el retail solo ($100.000)', ((v2.fac || {}).v || '').indexOf('100.000') >= 0, v2.fac);
    chk('   y lo dice en vez de dejarlo en duda', v2.pie.indexOf('sin catering') >= 0, v2.pie);
    chk('   sin la nota de los sueldos, que ya no viene al caso', v2.nota === '', { nota: v2.nota });

    /* ── 7. Un período sin nada entregado ── */
    console.log('\n== Un período sin nada ==');
    await evaluar(cli, `D.pedidos=[]; D.ventasExtra=[]; rRetail(); 1`);
    await pausa(300);
    const v3 = await evaluar(cli, LEER);
    chk('sin entregas NO dibuja tres ceros', v3.hay === false, v3);
    chk('   y la pantalla sigue en pie', v3.txtRt.indexOf('Ventas retail') >= 0, v3.txtRt.slice(0, 120));

    /* ── 8. El período es el mismo de abajo ── */
    console.log('\n== El selector mueve las dos cosas ==');
    await evaluar(cli, `window.D=${JSON.stringify(D)}; rtPer('mesAnt'); 1`);
    await pausa(400);
    const v4 = await evaluar(cli, LEER);
    chk('al cambiar el período, el total cambia con él ($80.000)',
        v4.hay === true && ((v4.fac || {}).v || '').indexOf('80.000') >= 0, v4.fac);
    chk('   y el subtítulo dice el mismo período que el de abajo',
        !!v4.sub && v4.txtRt.indexOf(String(v4.sub).split(' · retail')[0]) >= 0, { sub: v4.sub });

    /* ── 9. En el teléfono ── */
    await evaluar(cli, `rtPer('mes'); 1`);
    await pausa(300);
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await pausa(400);
    const tel = await evaluar(cli, `(function(){
      var b=document.getElementById('hRetail'); var mt=b?b.querySelector('.mt'):null;
      if(!mt) return {sin:1};
      var ks=mt.querySelectorAll('.mt-k'), out=[];
      for(var i=0;i<ks.length;i++){ var r=ks[i].getBoundingClientRect(); out.push(Math.round(r.width)); }
      return { anchos:out, doc:document.documentElement.scrollWidth, win:window.innerWidth,
               vv:(mt.querySelector('.mt-kv')||{}).getBoundingClientRect?Math.round(mt.querySelector('.mt-kv').getBoundingClientRect().width):0 };
    })()`);
    chk('en el teléfono las cards se apilan en vez de achicarse',
        !!(tel.anchos && tel.anchos.length === 3 && tel.anchos[0] > 250), tel);
    chk('   y la pantalla no se va de ancho', tel.doc <= tel.win + 1, tel);
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
