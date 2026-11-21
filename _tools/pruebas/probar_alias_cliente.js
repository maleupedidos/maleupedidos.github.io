/* EL ALIAS QUE LE LLEGA AL CLIENTE, TEXTO POR TEXTO (21/11/2026). Sesión real, SOLO LECTURA.
   SBSES=<sbses.json> BASE=http://localhost:8155 [APP=app.html] ESC=real|viejo|viejo_sin_base node probar_alias_cliente.js
   Genera el TEXTO REAL de cada mensaje al cliente que lleva alias y saca su línea del alias:
     Ruta › alta (Copiar detalle) en sus 4 estados · comprobante · Cobranza (un cliente y varios pedidos) · cobro de Red al
     cliente · aviso al representante · ficha › Copiar el detalle · la cuenta de la juntada · Mi Portal.
   ESC=viejo siembra lo que tenía el celular de la clienta: `maleu_ruta_ctas`, `maleu_ruta_clivend` y D.caja.cuentas de la
   época de Apps Script (MP con `def`, sin `cli`) y borra la copia buena. ESC=viejo_sin_base además corta `tienda_cuentas`.
   En todos: ninguna línea puede decir maleump/maleubru, y todas tienen que decir maleu26. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html', ESC = process.env.ESC || 'real';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const VIEJAS = JSON.stringify([{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' }, { id: 'mp', nombre: 'Mercado Pago', tipo: 'digital', alias: 'maleump', banco: 'Mercado Pago', def: true }, { id: 'brubank', nombre: 'Brubank', tipo: 'digital', alias: 'maleubru', banco: 'Brubank' }]);
const SEMBRAR = ESC === 'real' ? '' : `try{localStorage.setItem('maleu_ruta_ctas',${JSON.stringify(VIEJAS)});localStorage.setItem('maleu_ruta_clivend',JSON.stringify({ts:Date.now(),d:{cuentas:${VIEJAS}}}));localStorage.removeItem('maleu_alias_cli');}catch(e){}`;
/* tienda_cuentas es una LECTURA (POST): la guarda de solo lectura la corta; se deja pasar con el fetch nativo. */
const NATIVO = `window.__nf=window.fetch;`;
const ABRIR_LECTURA = `(function(){var o=window.fetch;window.fetch=function(u,x){if(/rpc\\/tienda_cuentas/.test(String((u&&u.url)||u||'')))return window.__nf(u,x);return o.apply(this,arguments);};})();`;
const CORTAR = ESC === 'viejo_sin_base' ? `(function(){var o=window.fetch;window.fetch=function(u,x){if(/rpc\\/tienda_cuentas/.test(String((u&&u.url)||u||'')))return Promise.reject(new Error('cortado'));return o.apply(this,arguments);};})();` : '';
const CAPTURA = `window.__copiado=[];try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){window.__copiado.push(String(t));return Promise.resolve();}},configurable:true});}catch(e){}
  (function(){var ex=document.execCommand.bind(document);document.execCommand=function(c){if(c==='copy'){var a=document.activeElement;if(a&&'value' in a)window.__copiado.push(String(a.value));return true;}return ex.apply(null,arguments);};})();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: NATIVO + SEMBRAR + prep('x', sbses(process.env.SBSES, 'tadeo') + ABRIR_LECTURA + CORTAR + CAPTURA) });
  console.log('\n=== Alias al cliente · escenario «' + ESC + '» · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await esperar(cli, `(D&&D.pedidos||[]).length>1000`, 150000);
  if (ESC !== 'real') await evaluar(cli, `D.caja=Object.assign({},D.caja||{},{cuentas:${VIEJAS}})`);
  await pausa(ESC === 'real' ? 4000 : 1500);
  console.log('  copia buena (maleu_alias_cli): ' + await evaluar(cli, `localStorage.getItem('maleu_alias_cli')||'(ninguna)'`));
  const L = []; const lineaAlias = t => String(t || '').split('\n').filter(l => /alias|maleu26|maleump|maleubru|Para abonar|transfer/i.test(l)).join(' ⏎ ');
  const anotar = (nombre, txt) => { const l = lineaAlias(txt); L.push([nombre, l]); };
  // ── Ruta › alta: los 4 estados ──
  await evaluar(cli, `go('ruta')`); await esperar(cli, `typeof npResumenTextoWA==='function'&&typeof npQty==='function'`, 30000);
  /* Como lo usa el que cobra: pasa por Cobranza (la lectura que trae las cuentas del motor) antes de copiar. */
  await evaluar(cli, `try{switchTab('cobros')}catch(e){}`); await pausa(7000);
  await evaluar(cli, `try{npRenderCatalogo()}catch(e){}`);
  await esperar(cli, `!!document.querySelector('[onclick*="npQty("]')`, 30000);
  const id = await evaluar(cli, `(function(){var b=document.querySelector('[onclick*="npQty("]');var m=b&&/npQty\\(\\s*['"]?([^'",)]+)/.exec(b.getAttribute('onclick'));return m?m[1]:'';})()`);
  if (id) await evaluar(cli, `npQty(${JSON.stringify(id)},1)`); else console.log('  (no encontré un producto para el alta)');
  await evaluar(cli, `npSetPago('Transferencia')`);
  for (const [ent, pag] of [[false, false], [false, true], [true, false], [true, true]]) {
    await evaluar(cli, `(function(){var s=document.getElementById('npEstadoEntrega');if(s){s.value=${ent ? "'Entregado'" : "'Pendiente'"};}var y=document.getElementById('npYaCobrado');if(y)y.checked=${pag};})()`);
    anotar('Ruta › alta · ' + (ent ? 'entregado' : 'por entregar') + ' · ' + (pag ? 'pagado' : 'sin pagar'), await evaluar(cli, `npResumenTextoWA()`));
  }
  anotar('Ruta › comprobante', await evaluar(cli, `_msgComprobante()`));
  // ── Cobranza: un pedido real sin cobrar, y dos del mismo cliente ──
  const peds = await evaluar(cli, `JSON.stringify((D.pedidos||[]).filter(function(p){return (p.h==='Home'||p.h==='Pilar')&&p.ep!=='Cobrado'&&p.es!=='Cancelado'&&Number(p.$)>0;}).slice(0,2))`);
  anotar('Cobranza › copiar (un pedido)', await evaluar(cli, `_cobroMsgCliente([${peds}][0].slice(0,1))`));
  anotar('Cobranza › copiar (dos pedidos)', await evaluar(cli, `_cobroMsgCliente([${peds}][0])`));
  // ── Cobros de Red (la pantalla de cobro con representante) y avisos ──
  for (const fn of ['cobroAvisarCliCV', 'cobroAvisarRepCV']) {
    const k = await evaluar(cli, `(function(){try{var l=typeof _rutCVLista==='function'?_rutCVLista():[];return l[0]?l[0].k:'';}catch(e){return '';}})()`);
    if (k) { await evaluar(cli, `window.__copiado=[];${fn}(${JSON.stringify(k)})`); await pausa(300); anotar('Red › ' + fn, await evaluar(cli, `__copiado.join('\\n')`)); }
    else L.push(['Red › ' + fn, '(sin cobros de Red pendientes hoy para armarlo)']);
  }
  // ── Ficha › Copiar el detalle (un pedido real sin cobrar) ──
  await evaluar(cli, `go('pedidos')`); await pausa(800);
  const p0 = JSON.parse(peds)[0];
  if (p0) {
    await evaluar(cli, `window.__copiado=[];openOrdDetail(${JSON.stringify(p0.h)},${JSON.stringify(String(p0.n))},${Number(p0.r) || 0})`);
    await esperar(cli, `[].slice.call(document.querySelectorAll('#ordBody button, .ord-actions button')).some(function(b){return /Copiar el detalle/.test(b.textContent);})`, 15000);
    await evaluar(cli, `[].slice.call(document.querySelectorAll('#ordBody button, .ord-actions button')).filter(function(b){return /Copiar el detalle/.test(b.textContent);})[0].click()`);
    await pausa(600); anotar('Ficha › Copiar el detalle', await evaluar(cli, `__copiado.join('\\n')`));
    await evaluar(cli, `closeOrdDetail()`);
  }
  // ── La cuenta de la juntada y Mi Portal ──
  anotar('Juntada › la cuenta', 'Para Maleu: alias *' + await evaluar(cli, `_jntAlias()`) + '*');
  await evaluar(cli, `try{go('miportal')}catch(e){}`); await pausa(1500);
  anotar('Mi Portal › alias al cliente', await evaluar(cli, `(function(){try{var c=_redCtaCliente();return 'alias '+(c&&c.alias)+' ('+(c&&c.banco)+')';}catch(e){return 'ERROR '+e.message;}})()`));
  console.log('');
  L.forEach(([n, l]) => console.log('  · ' + n + ': ' + (l || '(sin alias: correcto si ya está pago)')));
  console.log('');
  const conAlias = L.filter(([n, l]) => /alias|maleu|Para abonar/i.test(l) && !/^\(sin/.test(l));
  chk('ninguna línea dice maleump ni maleubru', L.every(([, l]) => !/maleump|maleubru/i.test(l)), L.filter(([, l]) => /maleump|maleubru/i.test(l)));
  chk('las ' + conAlias.length + ' líneas con alias dicen maleu26', conAlias.length > 0 && conAlias.every(([, l]) => /maleu26/.test(l) || !/alias \*|alias:|alias [a-z]/i.test(l)), conAlias);
  chk('los textos «pagado» no llevan alias', L.filter(([n]) => / pagado$/.test(n)).every(([, l]) => !/maleu26|alias/i.test(l)), L.filter(([n]) => / pagado$/.test(n)));
  const err = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__err||[]).filter(function(e){return !/cortado|Failed to load|net::/.test(e);}).slice(0,5))'));
  chk('sin errores de JS', err.length === 0, err);
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
