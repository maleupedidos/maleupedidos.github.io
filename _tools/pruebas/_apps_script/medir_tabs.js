/* CUANTO TARDA CADA TAB DEL ERP, con la sesion real (22/9/2026).
 *
 *   node medir_tabs.js <token> [ancho]
 *
 * Abre la app UNA vez y recorre las tabs de a una, esperando entre medio: seis
 * pedidos a la vez al mismo Apps Script tardan mas de 3 minutos y le frenan el
 * ERP a Tadeo y a Lucas mientras trabajan. Solo LEE: ningun POST.
 *
 * De cada tab dice:
 *   · cuanto tarda en tener CONTENIDO en pantalla (no en "abrir": abrir es
 *     instantaneo porque la tab ya esta en el DOM);
 *   · que le pide al backend, cuanto tarda cada pedido y cuanto pesa;
 *   · si lo que pinto salio de una COPIA guardada o del servidor.
 *
 * La segunda vuelta mide lo mismo con todo ya cacheado: la diferencia entre las
 * dos vueltas es lo que gana la copia guardada. Una tab que tarda lo mismo las
 * dos veces es una tab que NO cachea.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.log('falta el token: node medir_tabs.js <token>'); process.exit(1); }

const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return '__ERR ' + x.message; } };
const esperar = async (c, e, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(c, e) === true) return true; await pausa(120); } return false; };

/* Las tabs en el orden en que las usa Tadeo, con como se sabe que YA pinto. */
const lleno = p => `(function(){var e=document.getElementById('p-${p}');return !!e && e.textContent.replace(/\s+/g,' ').trim().length > 300;})()`;
const TABS = [
  { p: 'inicio',        listo: lleno('inicio') },
  { p: 'planificacion', listo: lleno('planificacion') },
  { p: 'pedidos',       listo: lleno('pedidos') },
  { p: 'ventas',        listo: lleno('ventas') },
  { p: 'caja',          listo: lleno('caja') },
  { p: 'egresos',       listo: lleno('egresos') },
  { p: 'stock',         listo: lleno('stock') },
  { p: 'proveedores',   listo: lleno('proveedores') },
  { p: 'estancias',     listo: lleno('estancias') },
  { p: 'catering',      listo: lleno('catering') },
  { p: 'pedidoshome',   listo: lleno('pedidoshome') },
  { p: 'ajustes',       listo: lleno('ajustes') }
];

/* SOLO=pedidos,caja  mide nada mas esas: sirve para volver sobre una sin
   pagar el recorrido entero contra produccion. */
const SOLO = (process.env.SOLO||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
const LISTA = SOLO.length ? TABS.filter(function(t){return SOLO.indexOf(t.p)>=0;}) : TABS;

const RELOJ = `
  window.__t = [];
  (function(){ var o = window.fetch; window.fetch = function(u, x){
    var url = String((u && u.url) || u || '');
    if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
    var m = url.match(/action=([a-zA-Z_]+)/), a = m ? m[1] : '?', t0 = performance.now();
    return o.apply(this, arguments).then(function(r){
      var c = r.clone();
      c.text().then(function(t){ window.__t.push({a:a, ms:Math.round(performance.now()-t0), kb:Math.round(t.length/1024)}); })
       .catch(function(){ window.__t.push({a:a, ms:Math.round(performance.now()-t0), kb:-1}); });
      return r;
    });
  };})();`;

(async () => {
  const cli = await abrir();
  const filas = [];
  const medir = async (t, vuelta) => {
    await ev(cli, `window.__t=[]`);
    const t0 = Date.now();
    await ev(cli, `go(${JSON.stringify(t.p)})`);
    const ok = await esperar(cli, t.listo, 120000);
    const pintado = Date.now() - t0;
    await pausa(2500);                       // que terminen los pedidos de atras
    const pedidos = JSON.parse(await ev(cli, `JSON.stringify(window.__t||[])`));
    filas.push({ tab: t.p, vuelta, pintado, ok, pedidos });
    const det = pedidos.length ? pedidos.map(x => x.a + ' ' + x.ms + 'ms/' + x.kb + 'KB').join(' · ') : '(sin pedidos)';
    console.log('  ' + String(pintado).padStart(6) + ' ms  ' + (ok ? '  ' : 'XX') + '  ' + t.p.padEnd(14) + det);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 1000, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + RELOJ });
    const tApp = Date.now();
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?tab=inicio&t=' + Date.now() });
    if (!await esperar(cli, `typeof go==='function'`, 90000)) throw new Error('el ERP no arrancó');
    console.log('\nERP usable a los ' + (Date.now() - tApp) + ' ms\n');

    console.log('== 1ª VUELTA (navegador vacío: lo que paga alguien que entra por primera vez) ==');
    for (const t of LISTA) { await medir(t, 1); await pausa(1800); }

    console.log('\n== 2ª VUELTA (todo cacheado: lo que paga Tadeo todos los días) ==');
    for (const t of LISTA) { await medir(t, 2); await pausa(1200); }

    /* El resumen: donde se va el tiempo y quien NO cachea. */
    console.log('\n== RESUMEN ==');
    console.log('  tab             1ª vuelta   2ª vuelta   gana la copia');
    LISTA.forEach(t => {
      const a = filas.find(f => f.tab === t.p && f.vuelta === 1) || {};
      const b = filas.find(f => f.tab === t.p && f.vuelta === 2) || {};
      const gana = (a.pintado && b.pintado) ? (a.pintado - b.pintado) : 0;
      const alerta = (b.pintado > 2500) ? '  <-- LENTA' : ((a.pintado > 2500 && gana < a.pintado * 0.5) ? '  <-- no cachea' : '');
      console.log('  ' + t.p.padEnd(15) + String(a.pintado || '-').padStart(7) + ' ms' + String(b.pintado || '-').padStart(10) + ' ms' + String(gana).padStart(10) + ' ms' + alerta);
    });
    const total = {};
    filas.filter(f => f.vuelta === 1).forEach(f => f.pedidos.forEach(x => { total[x.a] = total[x.a] || { ms: 0, kb: 0, n: 0 }; total[x.a].ms += x.ms; total[x.a].kb += x.kb; total[x.a].n++; }));
    console.log('\n  endpoint                  veces    ms      KB');
    Object.keys(total).sort((a, b) => total[b].ms - total[a].ms).forEach(k => {
      console.log('  ' + k.padEnd(26) + String(total[k].n).padStart(3) + String(total[k].ms).padStart(9) + String(total[k].kb).padStart(8));
    });
    console.log('\n  copias guardadas: ' + await ev(cli, `Object.keys(localStorage).filter(function(k){return k.indexOf('mc_')===0||/copia|ma3/.test(k);}).map(function(k){return k+'('+Math.round((localStorage.getItem(k)||'').length/1024)+'KB)';}).join(' · ')`));
    console.log('  errores: ' + await ev(cli, `JSON.stringify((window.__err||[]).slice(0,8))`));
  } catch (e) { console.log('EXPLOTÓ: ' + (e && e.message || e)); }
  try { cli.matar(); } catch (e) {}
  process.exit(0);
})();
