/* Inicio > Resumen: las cards se leen como una cuenta (21/9/2026).

       FACTURADO  =  ENTREGAS  ×  TICKET

   Tadeo comparo la semana 37 con la 38: 56 y 54 entregas —casi igual— y la
   facturacion cayo 35%. El problema era el ticket, pero la pantalla no lo
   mostraba. Se agrego "Ticket promedio" en lugar de "Costo", que repetia en
   porcentaje lo mismo que ya decia el Margen.

   El caso que MAS importa probar no es que la card este: es que no mienta.
   El ticket total mezcla negocios distintos —una casa ronda $50k, una bolsa de
   Red a un vendedor puede pasar $200k—, asi que una semana con una bolsa grande
   contra otra sin ella hace caer el ticket total sin que las casas hayan
   cambiado nada. Por eso la card trae el de las casas aparte, y este test arma
   exactamente ese escenario.

   Sin backend, con ?prueba=1. Los pedidos se ponen a mano con nombres
   inventados: este repo es publico.

   node probar_resumen_cards.js
*/
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 320) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(c, e)) return true; } catch (x) {} await pausa(300); } return false; };

/* Semana 37 (7-13/9/2026): dos casas de $50k + UNA bolsa de Red de $300k.
   Semana 38 (14-20/9/2026): dos casas de $48k + un club de $20k.
   Las casas bajaron apenas un 4%. El ticket total se desploma por la bolsa. */
const ARMAR = `(function(){
  function casa(nombre, tel, iso, monto){
    var dm = iso.split('-'); var f = (+dm[2])+'/'+(+dm[1])+'/'+dm[0];
    return { h:'Home', es:'Entregado', c:nombre, tel:tel, $:monto, co:Math.round(monto*0.6),
             bar:'Estancias del Pilar', fex:iso, fe:f, f:f };
  }
  D = D || {};
  D.pedidos = [
    casa('Casa Uno',  '1100000001', '2026-09-08', 50000),
    casa('Casa Dos',  '1100000002', '2026-09-10', 50000),
    { h:'Red', es:'Entregado', ev:'Entregado', c:'Cliente Red (Red: Vendedor Prueba)', br:'Vendedor Prueba',
      tel:'1100000009', $:300000, co:210000, dee:'2026-09-11', fe:'11/9/2026', f:'11/9/2026' },
    casa('Casa Uno',  '1100000001', '2026-09-15', 48000),
    casa('Casa Dos',  '1100000002', '2026-09-17', 48000),
    { h:'Clubes', es:'Entregado', c:'Club Prueba', br:'Club Prueba', tel:'1100000008',
      $:20000, co:12000, dee:'2026-09-18', fe:'18/9/2026', f:'18/9/2026' }
  ];
  _rtRangoN = -1; _rtAbierto = false;
  try { localStorage.removeItem('maleu_rt_per'); } catch(e){}
  go('inicio');
  _rtPer = 'w:2026-38'; rRetail();
  var cards = [].map.call(document.querySelectorAll('#hRetail .rt-kpis .rt-k'), function(k){
    return { t: (k.querySelector('.rt-kl')||{}).textContent || '',
             v: (k.querySelector('.rt-kv')||{}).textContent || '',
             d: (k.querySelector('.rt-kd')||{}).textContent || '',
             s: [].map.call(k.querySelectorAll('.rt-ks'), function(x){ return x.textContent; }) };
  });
  return cards;
})()`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, "typeof rRetail==='function' && typeof go==='function'")) { console.log('  el ERP no arranco'); process.exit(1); }
    console.log('\n== Resumen: las cards se leen como una cuenta ==\n');

    const cards = await evaluar(cli, ARMAR);
    const por = t => (cards || []).filter(c => c.t.toLowerCase() === t.toLowerCase())[0] || null;
    const num = s => Number(String(s || '').replace(/[^\d]/g, '')) || 0;

    // ── 1) El orden cuenta la historia ───────────────────────────────────
    chk('son cinco cards', Array.isArray(cards) && cards.length === 5, cards && cards.map(c => c.t));
    chk('en orden Facturado · Entregas · Ticket · Margen · Pendiente',
      cards && cards.map(c => c.t).join(' | ') === 'Facturado | Entregas Retail | Ticket promedio | Margen | Pendiente',
      cards && cards.map(c => c.t).join(' | '));
    chk('la card de Costo ya no esta (repetia lo que dice el Margen)', !por('Costo'), cards && cards.map(c => c.t));

    // ── 2) La cuenta cierra ──────────────────────────────────────────────
    const F = por('Facturado'), E = por('Entregas Retail'), T = por('Ticket promedio'), M = por('Margen');
    /* 2 casas de 48k + 1 club de 20k = $116.000 en 3 entregas → ticket $38.667 */
    chk('facturado de la semana 38: $116.000', F && num(F.v) === 116000, F);
    chk('entregas: 3 (dos casas y un club)', E && num(E.v) === 3, E);
    chk('el ticket es facturado ÷ entregas: $38.667', T && num(T.v) === 38667, T);

    // ── 3) El ticket compara contra la semana anterior ───────────────────
    /* Semana 37: 100k + 300k en 3 entregas = $133.333 → cae un 71%. */
    chk('el ticket trae su variacion contra la semana anterior', T && /▼/.test(T.d) && /71%/.test(T.d), T && T.d);

    // ── 4) Y NO miente: las casas aparte ─────────────────────────────────
    /* El total cae 71% por la bolsa de Red de la semana anterior. Las casas
       pasaron de $50k a $48k: un 4%. Si la card mostrara solo el total, la
       conclusion seria "la gente compra la mitad" — y seria falsa. */
    const casas = T && T.s && T.s[0] || '';
    chk('la card del ticket muestra el de las casas aparte', /casas \$48\.000/.test(casas), casas);
    chk('y su variacion real, que es chica: −4%', /▼ −4%/.test(casas), casas);

    // ── 5) El costo no se perdio: baja al margen ─────────────────────────
    /* 60% de cada venta: 116.000 × 0,6 = 69.600 */
    const costo = M && M.s && M.s[0] || '';
    chk('el costo en pesos aparece debajo del margen', /costo \$69\.600/.test(costo), costo);

    // ── 6) Sin institucional, no se repite el mismo numero dos veces ─────
    const soloCasas = await evaluar(cli, `(function(){
      D.pedidos = D.pedidos.filter(function(p){ return p.h === 'Home'; });
      _rtRangoN = -1; _rtPer = 'w:2026-38'; rRetail();
      var tk = [].filter.call(document.querySelectorAll('#hRetail .rt-kpis .rt-k'), function(k){
        return /ticket/i.test((k.querySelector('.rt-kl')||{}).textContent||'');
      })[0];
      return tk ? tk.querySelectorAll('.rt-ks').length : -1;
    })()`);
    chk('si solo hubo casas, no repite el mismo ticket en una segunda linea', soloCasas === 0, soloCasas);

    // ── 7) Una semana sin entregas no divide por cero ────────────────────
    const vacio = await evaluar(cli, `(function(){
      _rtRangoN = -1; _rtPer = 'w:2026-30'; rRetail();
      var box = document.getElementById('hRetail');
      return { txt: box ? box.textContent : '', nan: /NaN|Infinity|undefined/.test(box ? box.innerHTML : '') };
    })()`);
    chk('una semana sin entregas no muestra NaN ni Infinity', vacio && vacio.nan === false, vacio);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
