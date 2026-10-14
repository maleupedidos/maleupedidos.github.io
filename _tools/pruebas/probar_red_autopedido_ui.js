/* EL AUTOPEDIDO DEL VENDEDOR, la pantalla (14/10/2026).

     node _tools/pruebas/probar_red_autopedido_ui.js [puerto]      (default 8095)

   Mismo metodo que probar_portal_nav.js: fetch falso ANTES del ERP, datos
   INVENTADOS (repo publico), ningun POST sale de la maquina.

   Sostiene:
   · el «+» ofrece «Lo cargo yo» y «Abrir la tienda»; la tienda sigue abriendo
     en otra ventana;
   · «Lo cargo yo» abre el AUTOPEDIDO con los productos y el proximo viernes
     como dia (se puede cambiar);
   · el pedido sale con action=redAutopedido, un id np-red- y la fecha y el dia
     que se eligieron;
   · si el servidor lo rechaza (el WhatsApp es de un vendedor) se ve el motivo y
     NO se reintenta; el siguiente intento manda el MISMO id (no duplica);
   · a 390 y 1440 nada tapa los botones y no hay scroll horizontal.
*/
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const T = ms => new Promise(r => setTimeout(r, ms));
const PUERTO = Number(process.argv[2] || 8095);
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };

const Z = { facturado: 0, pedidos: 0, comision: 0, envio: 0, ganancia: 0 };
const DASH = {
  ok: true,
  stats: { semana: Object.assign({ n: 42, lun: '12/10', dom: '18/10' }, Z), mes: Object.assign({ nombre: 'Octubre', semanas: [] }, Z),
    mesesAnt: [], total: Object.assign({}, Z), comision: 0, ganancia: 0, viernes: { total: 0, entregados: 0, dias: [] }, pendCobrar: 0, pendLiquidar: 0 },
  pedidos: [], clientes: [], liqBySem: {}, cuentas: [], tg: { vinculado: true, link: '' }, tareas: null,
};
function prep(ses, sesRed) {
  const ls = { maleu_token: 'token-de-prueba', maleu_panel_session: JSON.stringify(ses), maleu_red_session: JSON.stringify(sesRed),
    ['maleu_red_dash_' + sesRed.nombre]: JSON.stringify({ ts: Date.now() - 600000, data: DASH }), maleu_red_main_tab: 'hoy' };
  return `(function(){
    try{ if(!sessionStorage.getItem('__prep')){ localStorage.clear(); var L=${JSON.stringify(ls)}; for(var k in L) localStorage.setItem(k,L[k]); sessionStorage.setItem('__prep','1'); } }catch(e){}
    window.__err=[]; window.__abrio=[]; window.__posts=[]; window.__resp=[];
    window.addEventListener('error',function(e){window.__err.push(String(e.message));});
    window.confirm=function(){return true;}; window.alert=function(){};
    window.open=function(u){ window.__abrio.push(String(u)); return {opener:1}; };
    var DASH=${JSON.stringify(DASH)};
    var orig=window.fetch.bind(window);
    function resp(o,ms){ return new Promise(function(r){ setTimeout(function(){ r(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||30); }); }
    window.fetch=function(u,x){
      var url=String(u&&u.url||u);
      if(url.indexOf('script.google.com/macros')<0) return orig(u,x);
      if(x&&String(x.method||'').toUpperCase()==='POST'){ var b={}; try{b=JSON.parse(x.body)}catch(e){} window.__posts.push(b);
        if(b.action==='redAutopedido') return resp(window.__resp.length?window.__resp.shift():{ok:true,n:115}); return resp({ok:true}); }
      var a=(url.match(/action=([A-Za-z]+)/)||[])[1]||'';
      if(a==='vendedores') return resp({vendedores:[{nombre:'Marcos Bottcher',partido:'Pilar'}]});
      if(a==='dashboardVendedor') return resp(DASH, 200);
      if(a==='resolverVendedor') return resp({ok:true,nombre:'Marcos Bottcher',usuario:'marcos'}, 200);
      if(a==='miSesion') return resp({ok:true,usuario:${JSON.stringify(ses.usuario)},rol:${JSON.stringify(ses.rol)},tabs:${JSON.stringify(ses.tabs)}});
      return resp({ok:true});
    };
  })();`;
}
const VISIBLE = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; for(var n=e;n&&n!==document.body;n=n.parentElement){var cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden') return false;} return e.getBoundingClientRect().height>0;})()`;
let _prepId = null;
async function cargar(cli, src) {
  if (_prepId) await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: _prepId });
  _prepId = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  await cli.enviar('Runtime.evaluate', { expression: 'try{sessionStorage.clear()}catch(e){}' }).catch(() => {});
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
  for (let i = 0; i < 80; i++) { await T(150); try { if (await evaluar(cli, VISIBLE('#dash-content'))) break; } catch (e) {} }
  await T(800);
}
const SES_V = { usuario: 'marcos', rol: 'vendedor', nombre: 'Marcos Bottcher', ts: Date.now(), tabs: ['miportal'] };
const RED_V = { ok: true, nombre: 'Marcos Bottcher', usuario: 'marcos', wa: '' };
const tocar = (cli, sel) => evaluar(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false;
  e.scrollIntoView({block:'center'});
  var b=e.getBoundingClientRect(); var x=b.left+b.width/2, y=b.top+b.height/2; var top=document.elementFromPoint(x,y);
  if(!top||!(e===top||e.contains(top))) return 'tapado por '+(top?(top.id||top.className||top.tagName):'nada');
  top.click(); return true;})()`);
const proxViernes = () => { const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  let d = (5 - h.getDay() + 7) % 7; if (!d) d = 7; const f = new Date(h.getFullYear(), h.getMonth(), h.getDate() + d);
  return f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0'); };

async function ronda(cli, ancho) {
  console.log('\n== ' + ancho + ' px ==');
  await cargar(cli, prep(SES_V, RED_V));
  let r = await tocar(cli, '.mtab-mas'); await T(300);
  const sh = await evaluar(cli, `(function(){var o=document.getElementById('redMasSheet'); if(!o||getComputedStyle(o).display==='none') return null;
    return [].map.call(o.querySelectorAll('button'),function(b){var q=b.getBoundingClientRect();return {t:b.innerText.split('\\n')[0].trim(),h:Math.round(q.height)}});})()`);
  chk('el «+» ofrece «Lo cargo yo» y «Abrir la tienda»', r === true && !!sh && sh.length === 2 && /Lo cargo yo/.test(sh[0].t) && /Abrir la tienda/.test(sh[1].t) && sh.every(b => b.h >= 44), { r, sh });
  chk('  ...y todavía no abrió nada', (await evaluar(cli, 'window.__abrio.length')) === 0);
  r = await tocar(cli, '#redMasSheet button:nth-of-type(2)'); await T(200);
  chk('«Abrir la tienda» abre maleu.com.ar en otra ventana', r === true && /^https:\/\/maleu\.com\.ar\/?$/.test((await evaluar(cli, 'window.__abrio'))[0] || ''), r);

  await tocar(cli, '.mtab-mas'); await T(200);
  r = await tocar(cli, '#redMasSheet button:nth-of-type(1)'); await T(400);
  const np = await evaluar(cli, `({vis:${VISIBLE('#screen-nuevo')}, h1:(document.querySelector('#screen-nuevo h1')||{}).innerText, prods:document.querySelectorAll('#prod-grid .prod-row').length,
    dia:document.getElementById('f-dia').value, tipo:document.getElementById('f-dia').type, sheet:getComputedStyle(document.getElementById('redMasSheet')).display})`);
  chk('«Lo cargo yo» abre el AUTOPEDIDO con los productos', r === true && np.vis === true && /AUTOPEDIDO/i.test(np.h1) && np.prods >= 29 && np.sheet === 'none', np);
  chk('el día arranca en el próximo viernes y es un calendario', np.tipo === 'date' && np.dia === proxViernes(), np);

  await tocar(cli, '#prod-grid .prod-row:nth-of-type(2) .qty-btn:last-child'); await T(150);
  await evaluar(cli, `(function(){var s=function(id,v){var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));};
    s('f-cliente','Clienta de Prueba'); s('f-telefono','11 4000 1234'); s('f-lote','45'); s('f-barrio','El Lucero'); s('f-dia','2026-10-17'); return true;})()`);
  r = await tocar(cli, '.pago-opt[data-val="Efectivo"]');
  await evaluar(cli, `window.__resp=[{ok:false,err:'Ese es el WhatsApp de Fini Mihailovitch. Cargá el del cliente.'}]`);
  r = await tocar(cli, '#btn-enviar'); await T(3500);
  const inv = await evaluar(cli, `[].map.call(document.querySelectorAll('#screen-nuevo .field.invalid'),function(e){return e.id})`); if (inv.length) console.log('     inválidos: ' + inv.join(', '));
  const p1 = await evaluar(cli, `({posts:window.__posts.filter(function(p){return p.action==='redAutopedido'}), btn:document.getElementById('btn-enviar').innerText, toast:(document.body.innerText.match(/Ese es el WhatsApp[^\\n]*/)||[''])[0]})`);
  const b = p1.posts[0] || {};
  chk('sale con action=redAutopedido y un id np-red-', r === true && b.action === 'redAutopedido' && /^np-red-/.test(b.clientOrderId || ''), b);
  chk('  ...con la fecha y el día elegidos (sábado 17/10)', b.fechaEntrega === '2026-10-17' && b.dia === 'Sábado', [b.fechaEntrega, b.dia]);
  chk('  ...con un producto y el teléfono del cliente', (b.items || []).length === 1 && b.telefono === '11 4000 1234', [b.items, b.telefono]);
  chk('el rechazo del servidor se ve y NO se reintenta', p1.posts.length === 1 && /Fini/.test(p1.toast) && /Reintentar/.test(p1.btn), p1);

  r = await tocar(cli, '#btn-enviar'); await T(1800);
  const p2 = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='redAutopedido'})`);
  chk('el segundo intento manda el MISMO id (no duplica)', r === true && p2.length === 2 && p2[1].clientOrderId === b.clientOrderId, p2.map(x => x.clientOrderId));
  await T(1200);
  chk('guardado, vuelve al portal', (await evaluar(cli, VISIBLE('#dash-content'))) === true);
  await tocar(cli, '.mtab-mas'); await T(200); await tocar(cli, '#redMasSheet button:nth-of-type(1)'); await T(300);
  chk('un pedido nuevo arranca con otro id y el día en el viernes', (await evaluar(cli, `redApCoid`)) === '' && (await evaluar(cli, `document.getElementById('f-dia').value`)) === proxViernes());
  const sw = await evaluar(cli, 'document.documentElement.scrollWidth');
  chk('sin scroll horizontal', sw <= ancho, sw);
  const errs = await evaluar(cli, 'window.__err');
  chk('sin errores de JS', errs.length === 0, errs);
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await ronda(cli, 390);
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await ronda(cli, 1440);
  } catch (e) { mal++; console.log('  MAL  excepcion: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
