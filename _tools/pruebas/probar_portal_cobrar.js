/* Mi Portal: «Lo que vas a cobrar» con la sesion REAL y «Ver como» (16/10/2026).

     node _tools/pruebas/probar_portal_cobrar.js <token-admin> [puerto] [ancho] [vendedor…]

   Contra produccion y sin simular: entra como admin, abre Mi Portal, hace «Ver
   como» con cada vendedor y compara la tarjeta contra `action=redLiquidacion`
   (Ventas › RED › Liquidación), que es la cuenta que tiene que repetir:
     · el numero grande = lo liquidable cuyo dia de pago ya llego o es el proximo;
     · un renglon por pedido liquidable + uno por cada sin marcar;
     · nada se desborda a 390 px y los renglones tocables miden 44 px o mas.
   Los POST salen interceptados (sesion_prep): la prueba no escribe nada.
   Saca una captura de cada tarjeta a la carpeta temporal del sistema. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2];
const PUERTO = Number(process.argv[3] || 8080);
const ANCHO = Number(process.argv[4] || 390);
const VEND = process.argv.slice(5).length ? process.argv.slice(5) : ['Marcos Bottcher', 'Rufino Ardanaz', 'Fini Mihailovitch'];
if (!TOKEN) { console.log('Falta el token (python _tools/pruebas/leer_sesion.py)'); process.exit(2); }
const T = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const hoyNum = (() => { const s = new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }); return Number(s.slice(0, 10).replace(/-/g, '')); })();
async function esperar(cli, expr, ms) {
  for (let t = 0; t < ms; t += 250) { try { if (await evaluar(cli, expr) === true) return true; } catch (e) {} await T(250); }
  return false;
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
    chk('el ERP arrancó', await esperar(cli, `typeof go==='function'&&typeof API==='string'`, 30000));
    /* La cuenta de referencia: la misma que ve Tadeo en Ventas › RED › Liquidación. */
    const L = await evaluar(cli, `fetch(API+'?action=redLiquidacion&t='+Date.now()).then(function(r){return r.json();})`);
    chk('redLiquidacion contestó con la palanca prendida', !!(L && L.ok && L.activa), L && (L.err || L));
    const porV = {}; ((L && L.vendedores) || []).forEach(v => { porV[v.nombre] = v; });
    chk('la liquidación trae el alias de cada vendedor', ((L && L.vendedores) || []).every(v => typeof v.alias === 'string'),
        ((L && L.vendedores) || []).map(v => v.nombre + '=' + v.alias));
    await evaluar(cli, `go('miportal')`);
    chk('Mi Portal ofrece «Ver como»', await esperar(cli, `typeof window.redVerComoEntrar==='function'`, 30000));
    for (const nombre of VEND) {
      console.log('\n— ' + nombre);
      await evaluar(cli, `(function(){var b=document.getElementById('cob-card'); if(b){b.innerHTML='';b.classList.add('hidden');} window.redVerComoEntrar(${JSON.stringify(nombre)}); return 1;})()`);
      const pinto = await esperar(cli, `(function(){var b=document.getElementById('cob-card'); return !!b&&!b.classList.contains('hidden')&&b.offsetHeight>0&&/Viendo como ${nombre.split(' ')[0]}/.test((document.getElementById('vercomo-txt')||{}).textContent||'');})()`, 90000);
      chk('la tarjeta se dibujó', pinto);
      if (!pinto) continue;
      const m = await evaluar(cli, `(function(){
        var b=document.getElementById('cob-card'), dc=document.getElementById('dash-content');
        var blks=[].map.call(b.querySelectorAll('.cob-blk'),function(x){return {big:(x.querySelector('.cob-big')||{}).textContent,sub:(x.querySelector('.cob-sub')||{}).textContent,
          filas:[].map.call(x.querySelectorAll('.cob-row'),function(r){return r.textContent.replace(/\\s+/g,' ').trim();})};});
        var chicos=[].filter.call(b.querySelectorAll('button.cob-row'),function(r){return r.getBoundingClientRect().height<44;}).length;
        var r=b.getBoundingClientRect();
        var primero=dc?[].filter.call(dc.children,function(e){return e.offsetHeight>0;})[0]:null;
        return {blks:blks, chicos:chicos, desborde:b.scrollWidth>b.clientWidth+1, doc:document.documentElement.scrollWidth>innerWidth+1,
                ult:(b.querySelector('.cob-ult')||{}).textContent||'', primero:primero?primero.id:'', x:r.left, y:r.top+scrollY, w:r.width, h:r.height};
      })()`);
      const V = porV[nombre] || { quincenas: [], sinMarcar: [], pagos: [] };
      const hoyT = (V.quincenas || []).filter(q => q.pagaNum <= hoyNum).reduce((s, q) => s + q.total, 0);
      const filasEsp = (V.quincenas || []).reduce((s, q) => s + q.pedidos.length, 0) + (V.sinMarcar || []).length;
      const filas = m.blks.reduce((s, b) => s + b.filas.length, 0);
      const num = t => Number(String(t || '').replace(/[^\d]/g, '')) || 0;
      console.log('     ' + m.blks.map(b => b.big + ' · ' + b.sub + '\n       ' + b.filas.join('\n       ')).join('\n     '));
      console.log('     ' + m.ult);
      chk('es lo primero de Hoy', m.primero === 'cob-card', m.primero);
      /* Si hay algo con pago vencido o de hoy, el primer bloque es ese y su total es el de la liquidación. */
      if (hoyT > 0) chk('el total del próximo pago = Liquidación (' + hoyT + ')', num(m.blks[0] && m.blks[0].big) === hoyT, m.blks[0]);
      const total = m.blks.reduce((s, b) => s + num(b.big), 0);
      const totalLiq = (V.quincenas || []).reduce((s, q) => s + q.total, 0);
      chk('la suma de los bloques = lo liquidable de la Liquidación (' + totalLiq + ')', total === totalLiq, { total, totalLiq });
      chk('un renglón por pedido (' + filasEsp + ')', filas === filasEsp, { filas, filasEsp });
      const ultPago = (V.pagos || []).filter(p => p.estado !== 'Anulada')[0];
      chk('la línea del último pago', ultPago ? m.ult.indexOf(String(ultPago.total).replace(/\B(?=(\d{3})+(?!\d))/g, '.')) >= 0 : /Todavía no hay pagos/.test(m.ult), { ult: m.ult, ultPago });
      chk('nada se desborda a ' + ANCHO + ' px', !m.desborde && !m.doc, m);
      chk('los renglones tocables miden 44 px o más', m.chicos === 0, m.chicos);
      const shot = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: Math.max(0, m.y - 70), width: ANCHO, height: m.h + 90, scale: 1 } });
      const f = path.join(os.tmpdir(), 'cobrar-' + nombre.split(' ')[0].toLowerCase() + '-' + ANCHO + '.png');
      fs.writeFileSync(f, Buffer.from(shot.data, 'base64')); console.log('     captura: ' + f);
      await evaluar(cli, `window.redVerComoSalir&&window.redVerComoSalir()`);
      await T(400);
    }
    const err = await evaluar(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
    console.log('\n' + ok + ' ok · ' + mal + ' MAL');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('ERROR ' + (e && e.stack || e)); salir(2); }
})();
