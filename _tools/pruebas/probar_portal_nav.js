/* PORTAL NUEVO, PARTE 2 (5/10/2026): la barra de abajo Hoy · Pedidos · + ·
   Clientes · Plata.

     node _tools/pruebas/probar_portal_nav.js [puerto]      (default 8095)

   Mismo metodo que probar_portal_fase0.js: fetch falso ANTES del ERP, datos
   INVENTADOS (repo publico), ningun POST sale de la maquina.

   Sostiene:
   · la barra se ve fusionada en el ERP (antes el panel la escondia), con las
     cuatro pantallas y el «+», todo de 44 px o mas;
   · cada pantalla muestra lo suyo: Hoy el resumen, Pedidos la ruta, Clientes la
     lista (que salio de Inicio), Plata la Caja y los Pagos sin cambios;
   · una tab vieja guardada en el celular ('caja') abre Plata en Caja, sin romper;
   · el «+» abre la tienda en otra ventana y el vendedor sigue en el ERP;
   · sin scroll horizontal a 390, y a 1440 con el cajon abierto la barra no
     queda tapada por el cajon.

   Contra el red.html anterior tiene que dar ROJOS.
*/
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const T = ms => new Promise(r => setTimeout(r, ms));
const PUERTO = Number(process.argv[2] || 8095);
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };

const hoyAr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = n => { const d = new Date(hoyAr); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const P = (n, c, fe, es, ep, $, row) => ({ n, c, f: '01/01', de: 'Viernes', $, com: 1000, env: 0, gan: 1000, aPg: $ - 1000, es, fp: 'Transferencia', ep,
  ef: 0, tr: 0, pEf: 0, pTr: 0, fpm: '', epm: 'Pendiente', fpmF: '', b: 'Barrio Prueba', l: String(row), t: '1155550000',
  prods: [{ a: 'PMu', q: 1 }], vi: true, row, envAnu: '', fe, cn: true, _y: 2026, _sem: 1 });
const Z = { facturado: 0, pedidos: 0, comision: 0, envio: 0, ganancia: 0 };
const DASH = {
  ok: true,
  stats: { semana: Object.assign({ n: 41, lun: '05/10', dom: '11/10' }, Z), mes: Object.assign({ nombre: 'Octubre', semanas: [] }, Z),
    mesesAnt: [], total: Object.assign({}, Z), comision: 0, ganancia: 0, viernes: { total: 0, entregados: 0, dias: [] }, pendCobrar: 0, pendLiquidar: 0 },
  pedidos: [P('401', 'Cliente Ruta', iso(4), 'Pendiente', 'No Cobrado', 80000, 20)],
  clientes: [{ n: 'Cliente Lista Uno', b: 'Barrio Prueba', t: '1155550001', count: 3, total: 150000, ult: '01/10' },
             { n: 'Cliente Lista Dos', b: 'Otro Barrio', t: '1155550002', count: 1, total: 50000, ult: '20/09' }],
  liqBySem: {}, cuentas: [], tg: { vinculado: true, link: '' }, tareas: null,
};

function prep(ses, sesRed, tabGuardada) {
  const ls = { maleu_token: 'token-de-prueba', maleu_panel_session: JSON.stringify(ses), maleu_red_session: JSON.stringify(sesRed),
    ['maleu_red_dash_' + sesRed.nombre]: JSON.stringify({ ts: Date.now() - 600000, data: DASH }) };
  if (tabGuardada) ls.maleu_red_main_tab = tabGuardada;
  return `(function(){
    try{ if(!sessionStorage.getItem('__prep')){ localStorage.clear(); var L=${JSON.stringify(ls)}; for(var k in L) localStorage.setItem(k,L[k]); sessionStorage.setItem('__prep','1'); } }catch(e){}
    window.__err=[]; window.__abrio=[];
    window.addEventListener('error',function(e){window.__err.push(String(e.message));});
    window.confirm=function(){return true;}; window.alert=function(){};
    window.open=function(u){ window.__abrio.push(String(u)); return {opener:1}; };
    var DASH=${JSON.stringify(DASH)};
    var orig=window.fetch.bind(window);
    function resp(o,ms){ return new Promise(function(r){ setTimeout(function(){ r(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||30); }); }
    window.fetch=function(u,x){
      var url=String(u&&u.url||u);
      if(url.indexOf('script.google.com/macros')<0) return orig(u,x);
      if(x&&String(x.method||'').toUpperCase()==='POST') return resp({ok:true});
      var a=(url.match(/action=([A-Za-z]+)/)||[])[1]||'';
      if(a==='vendedores') return resp({vendedores:[{nombre:'Marcos Bottcher',partido:'Pilar'}]});
      if(a==='dashboardVendedor') return resp(DASH, 300);
      if(a==='resolverVendedor') return resp({ok:true,nombre:'Marcos Bottcher',usuario:'marcos'}, 300);
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
  var b=e.getBoundingClientRect(); var x=b.left+b.width/2, y=b.top+b.height/2; var top=document.elementFromPoint(x,y);
  if(!top||!(e===top||e.contains(top))) return 'tapado por '+(top?(top.id||top.className||top.tagName):'nada');
  top.click(); return true;})()`);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

    console.log('\n== 390 px: el vendedor abre su portal ==');
    await cargar(cli, prep(SES_V, RED_V, null));
    const barra = await evaluar(cli, `(function(){var bs=[].map.call(document.querySelectorAll('#pg-miportal .main-tabs .mtab, .main-tabs .mtab'),function(b){var r=b.getBoundingClientRect();
      return {t:(b.innerText||'').replace(/\\s+/g,' ').trim(), h:Math.round(r.height), w:Math.round(r.width)};});
      return {vis:${VISIBLE('.main-tabs')}, bs:bs};})()`);
    chk('la barra de abajo se ve fusionada en el ERP', barra.vis === true, barra);
    chk('trae Hoy · Pedidos · + · Clientes · Plata', barra.bs.map(b => b.t.replace(/[^A-Za-z+]/g, '')).join('|') === 'Hoy|Pedidos|+|Clientes|Plata', barra.bs);
    chk('todos los botones miden 44 px o mas', barra.bs.length === 5 && barra.bs.every(b => b.h >= 44 && b.w >= 44), barra.bs);
    chk('abre en Hoy', (await evaluar(cli, VISIBLE('#mview-inicio'))) === true);
    chk('Mis clientes ya no esta en Hoy', (await evaluar(cli, `!!document.querySelector('#mview-inicio #clientes-list')`)) === false);

    let r = await tocar(cli, '.mtab[data-mtab="pedidos"]');
    await T(300);
    chk('Pedidos se toca (nada lo tapa) y muestra la ruta', r === true && (await evaluar(cli, VISIBLE('#mview-ruta'))) === true
      && /Cliente Ruta/.test(await evaluar(cli, `document.getElementById('ruta-content').innerText`)), r);

    r = await tocar(cli, '.mtab[data-mtab="clientes"]'); await T(300);
    const cl = await evaluar(cli, `({vis:${VISIBLE('#mview-clientes')}, txt:document.getElementById('clientes-list').innerText, n:document.getElementById('clientes-count').textContent, hoy:${VISIBLE('#mview-inicio')}})`);
    chk('Clientes muestra la lista y esconde Hoy', r === true && cl.vis === true && cl.hoy === false && /Cliente Lista Uno/.test(cl.txt) && cl.n === '2', cl);

    r = await tocar(cli, '.mtab[data-mtab="plata"]'); await T(300);
    let pl = await evaluar(cli, `({caja:${VISIBLE('#mview-caja')}, pagos:${VISIBLE('#mview-pagos')}, seg:${VISIBLE('.plata-seg')}})`);
    chk('Plata abre en Caja con el selector a la vista', r === true && pl.caja === true && pl.pagos === false && pl.seg === true, pl);
    r = await tocar(cli, '.plata-seg-b[data-plata="pagos"]'); await T(300);
    pl = await evaluar(cli, `({caja:${VISIBLE('#mview-caja')}, pagos:${VISIBLE('#mview-pagos')}, h:Math.round(document.querySelector('.plata-seg-b').getBoundingClientRect().height)})`);
    chk('el selector pasa a Pagos a Maleu', r === true && pl.caja === false && pl.pagos === true, pl);
    chk('el selector mide 44 px', pl.h >= 44, pl.h);

    r = await tocar(cli, '.mtab-mas'); await T(300);
    const mas = await evaluar(cli, `({abrio:window.__abrio, aca:location.href})`);
    chk('el «+» abre la tienda en otra ventana', r === true && mas.abrio.length === 1 && /^https:\/\/maleu\.com\.ar\/?$/.test(mas.abrio[0]), { r, mas });
    chk('  ...y el vendedor sigue en el ERP', /^http:\/\/localhost/.test(mas.aca), mas.aca);

    /* CAPTURA=<carpeta> guarda como se ve Plata a 390 (para mirarla, no prueba nada) */
    if (process.env.CAPTURA) {
      const img = await cli.enviar('Page.captureScreenshot', { format: 'png' });
      require('fs').writeFileSync(require('path').join(process.env.CAPTURA, 'portal-nav-390.png'), Buffer.from(img.data, 'base64'));
    }
    const sw = await evaluar(cli, `document.documentElement.scrollWidth`);
    chk('sin scroll horizontal a 390', sw <= 390, sw);
    const errs = await evaluar(cli, 'window.__err');
    chk('sin errores de JS', errs.length === 0, errs);

    console.log('\n== Una tab vieja guardada en el celular ==');
    await cargar(cli, prep(SES_V, RED_V, 'caja'));
    pl = await evaluar(cli, `({plata:${VISIBLE('#mview-plata')}, caja:${VISIBLE('#mview-caja')}, act:((document.querySelector('.main-tabs .mtab.active')||{}).dataset||{}).mtab||'',guardada:localStorage.getItem('maleu_red_main_tab')})`);
    chk('«caja» abre Plata en Caja y queda marcada Plata', pl.plata === true && pl.caja === true && pl.act === 'plata', pl);
    chk('  ...y se guarda con el nombre nuevo', pl.guardada === 'plata', pl.guardada);

    console.log('\n== 1440 px, el admin con el cajon abierto ==');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cargar(cli, prep(SES_V, RED_V, 'hoy'));
    const esc = await evaluar(cli, `(function(){var out=[]; [].forEach.call(document.querySelectorAll('.main-tabs .mtab'),function(b){
      var r=b.getBoundingClientRect(); var top=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
      out.push({t:(b.innerText||'').trim().slice(0,8), libre: !!top && (b===top||b.contains(top))});}); return out;})()`);
    chk('ningun boton de la barra queda tapado por el cajon', esc.length === 5 && esc.every(x => x.libre), esc);
    r = await tocar(cli, '.mtab[data-mtab="clientes"]'); await T(300);
    chk('a 1440 tambien se navega', r === true && (await evaluar(cli, VISIBLE('#mview-clientes'))) === true, r);
  } catch (e) { mal++; console.log('  MAL  excepcion: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
