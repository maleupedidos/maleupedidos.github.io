/* ¿QUÉ LECTURAS LE SIGUE PIDIENDO EL ERP A APPS SCRIPT? (3/11/2026, corte a Supabase: pieza 4 del Organizador)
   node _tools/pruebas/medir_lecturas_apps.js <token> [segundos-por-tab]
   BASE_URL=http://localhost:8171/app.html para lo local (el backend es producción; los POST van cortados por sesion_prep).
   UNA ventana con la sesión real. Abre cada tab (y las sub-tabs de Stock y Ventas), espera, y anota cada GET a Apps Script
   por acción: en qué tab salió y si salió con la base contestando (= el front no usó la base, o la base no tiene esa lectura).
   Sale una tabla «acción → tabs» al final. Las que no aparecen no se pidieron en este recorrido: NO quiere decir que no existan. */
'use strict';
const cdp = require('./cdp.js');
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN, SEG] = process.argv.slice(2);
const ESPERA = (Number(SEG) || 15) * 1000;
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ESPIA = `;(function(){var f=window.fetch;window.__aApps=[];window.__tabMedida='arranque';window.fetch=function(u,x){var s=String(u&&u.url||u);
  try{if(/script\\.google(usercontent)?\\.com|\\/exec(\\?|$)/.test(s)&&!(x&&String(x.method||'').toUpperCase()==='POST')){var m=/[?&]action=([A-Za-z0-9_]+)/.exec(s);if(m&&m[1]==='lote'){var q=/acciones=([^&]*)/.exec(s);if(q)m[1]='lote['+decodeURIComponent(q[1])+']';}window.__aApps.push({a:m?m[1]:'(sin action)',tab:window.__tabMedida,ms:Math.round(performance.now()),pal:!!(window._palancaVal&&window._palancaVal('stockArma')),pila:String(new Error().stack).split(String.fromCharCode(10)).slice(2,6).map(function(x){return x.trim().replace(/^at /,'').replace(/[(].*app[.]html[^:]*:/,'(:');}).join(' < ')});}}catch(e){}
  return f.apply(this,arguments);};})();`;
const TABS = process.env.SOLO_ARRANQUE ? [] : [
  ['inicio'], ['pedidos'], ['pedidoshome'], ['caja'], ['egresos'], ['pagos'], ['ruta'], ['busqueda'], ['miportal'], ['bbdd'],
  ['estancias'], ['proveedores'], ['ajustes'], ['planificacion'], ['metricas'], ['resumen'], ['mireparto'], ['catering'],
  ['ventas', 'ventas'], ['ventas', 'cobros'], ['ventas', 'tendencia'], ['ventas', 'productos'], ['ventas', 'combos'],
  ['stock', 'productos'], ['stock', 'contar'], ['stock', 'mover'], ['stock', 'carne'], ['stock', 'carga'], ['stock', 'catalogo'],
];
/* COMO OTRO USUARIO: USUARIO=santos ROL=repartidor TABS=ruta,mireparto (el token tiene que ser el de ese usuario). */
if (process.env.TABS) { TABS.length = 0; process.env.TABS.split(',').forEach((t) => TABS.push(t.split('>'))); }
/* CON LA SESIÓN DE LA BASE: SBSES=<archivo .json> con {access_token|access, refresh_token|refresh} (un token temporal de Auth
   que arma Supa, como en la 376). Se siembra como la sesión propia (`mc_sbses`, modo «si», todos) del USUARIO: el ERP pide
   el permiso a la base y no a Apps Script. El archivo no se versiona ni se imprime. */
let SBSES = '';
if (process.env.SBSES) {
  const j = JSON.parse(require('fs').readFileSync(process.env.SBSES, 'utf8'));
  const g = { u: process.env.USUARIO || j.usuario || '', url: j.url || 'https://xhaxmyvhygxynwjqrarm.supabase.co',
    key: j.key || j.pub || j.apikey || 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG', access: j.access_token || j.access, refresh: j.refresh_token || j.refresh,
    hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true };
  SBSES = `;try{localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify(g))});}catch(e){}`
    /* SOLO LECTURA, a prueba de todo (con estos tokens una directa escribe COMO esa persona): pasan las RPC *_pantalla y
       *_datos (nunca una con «directo») y la renovación de la sesión; TODO otro POST/PATCH/PUT/DELETE se corta y se anota. */
    + `;(function(){var f=window.fetch;window.__bloqueados=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
      if(m!=='GET'&&m!=='HEAD'){var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
        var lee=(r&&(/_(pantalla|datos)$/.test(r[1])||r[1]==="permiso_base")&&!/directo/.test(r[1]))||/\\/auth\\/v1\\/token\\?grant_type=refresh_token/.test(s);
        if(!lee){window.__bloqueados.push(m+' '+(r?r[1]:s.slice(0,90)));return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba (solo lectura)'}),{status:200,headers:{'Content-Type':'application/json'}}));}}
      return f.apply(this,arguments);};})();`;
}
/* EL PERMISO GUARDADO VENCIDO (lo que tiene un celular que abre la app después de una hora): VENCIDO=<archivo con las palancas
   de palancas_front, {pal}>. Se siembra `mc_sbtok` con esas palancas y vencido hace 10 min. */
if (process.env.VENCIDO && SBSES) {
  const pal = JSON.parse(require('fs').readFileSync(process.env.VENCIDO, 'utf8')).pal;
  const t = { u: process.env.USUARIO || '', sb: { token: 'vencido', url: 'https://xhaxmyvhygxynwjqrarm.supabase.co', key: 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG', pal: pal }, hasta: Date.now() - 10 * 60e3 };
  SBSES += `;try{localStorage.setItem('mc_sbtok',${JSON.stringify(JSON.stringify(t))});}catch(e){}`;
}
const COMO = process.env.USUARIO ? `;try{localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:${JSON.stringify(process.env.USUARIO)},rol:${JSON.stringify(process.env.ROL || '')},nombre:${JSON.stringify(process.env.NOMBRE || process.env.USUARIO)},ts:Date.now()}));}catch(e){}` : '';
(async () => {
  const cli = await cdp.abrir();
  /* SIN_APPS=1: el ensayo en este navegador (localStorage maleu_sin_apps = '1'). Por tab: qué se cortó, errores nuevos y
     cuánto texto tiene la pantalla (una tab que quedó vacía sin Apps Script se ve acá). */
  const SIN = !!process.env.SIN_APPS;
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + COMO + SBSES + ESPIA + (SIN ? `;try{localStorage.setItem('maleu_sin_apps','1');}catch(e){}` : '') });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m, p) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  if (SBSES) {   /* la guarda tiene que cortar una directa y un POST a Apps Script ANTES de recorrer: si no, no se sigue */
    let g = null; for (let i = 0; i < 30 && !g; i++) { await pausa(1000); try { g = await evaluar(cli, `(async function(){
      var a=await (await fetch('https://xhaxmyvhygxynwjqrarm.supabase.co/rest/v1/rpc/pedido_alta_directo',{method:'POST',body:'{}'})).text();
      var b=await (await fetch('https://xhaxmyvhygxynwjqrarm.supabase.co/rest/v1/rpc/ficha_base',{method:'POST',body:'{}'})).text();
      return {directa:/cortado por la prueba/.test(a), base:/cortado por la prueba/.test(b), sesion:!!localStorage.getItem('mc_sbses')}; })()`); } catch (e) {} }
    console.log('  guarda: ' + JSON.stringify(g));
    if (!g || !g.directa || !g.base || !g.sesion) { console.log('LA GUARDA NO CORTA: no se recorre'); cli.matar(); process.exit(3); }
  }
  await pausa(ESPERA + 10000);
  for (const [tab, sub] of TABS) {
    const nombre = tab + (sub ? '›' + sub : '');
    try {
      await evaluar(cli, `window.__tabMedida=${JSON.stringify(nombre)}; go(${JSON.stringify(tab)}); 1`);
      if (sub) {
        await pausa(1500);
        await evaluar(cli, tab === 'stock'
          ? `try{ stSwitchTab(${JSON.stringify(sub)}); }catch(e){} 1`
          : `try{ var b=document.querySelector('[data-vt="${sub}"]'); if(b)b.click(); }catch(e){} 1`);
      }
    } catch (e) { console.log('  (' + nombre + ': ' + e.message + ')'); }
    await pausa(ESPERA);
    if (SIN) {
      const r = await evaluar(cli, `(function(){ var c=window.__sinApps||{}, ant=window.__sinAnt||{}, nuevo={}; Object.keys(c).forEach(function(k){ if(c[k]>(ant[k]||0))nuevo[k]=c[k]-(ant[k]||0); });
        window.__sinAnt=JSON.parse(JSON.stringify(c)); var e=(window.__err||[]).slice(window.__errAnt||0); window.__errAnt=(window.__err||[]).length;
        var p=document.querySelector('#p-${tab}'), tx=p?p.innerText:''; var aviso=(tx.match(/(No se pudo[^\\n]{0,80}|no se pudo[^\\n]{0,80}|Sin conexi[^\\n]{0,60})/)||[])[0]||'';
        return {cortadas:nuevo, err:e.filter(function(x){return !/SIN_APPS_LECTURAS/.test(x);}).slice(0,3), largo:tx.length, aviso:aviso}; })()`);
      console.log('\n  ' + nombre.padEnd(22) + ' texto ' + String(r.largo).padStart(6) + ' · cortadas ' + JSON.stringify(r.cortadas)
        + (r.aviso ? ' · «' + r.aviso + '»' : '') + (r.err.length ? '\n      ERR ' + r.err.join(' | ').slice(0, 300) : ''));
    } else process.stdout.write('.');
  }
  const l = await evaluar(cli, `window.__aApps`);
  const por = {};
  l.forEach((x) => { (por[x.a] = por[x.a] || {}); por[x.a][x.tab] = (por[x.a][x.tab] || 0) + 1; });
  console.log('\n\n' + Object.keys(por).length + ' acciones GET a Apps Script en el recorrido (' + l.length + ' pedidos):');
  Object.keys(por).sort().forEach((a) => console.log('  ' + a.padEnd(26) + Object.entries(por[a]).map(([t, n]) => t + (n > 1 ? '×' + n : '')).join(', ')));
  if (process.env.EVAL) { try { console.log('\n  EVAL: ' + JSON.stringify(await cdp.evaluar(cli, process.env.EVAL)).slice(0, 1500)); } catch (e) { console.log('\n  EVAL revento: ' + e.message); } }
  if (SBSES) { const bl = await evaluar(cli, `window.__bloqueados||[]`); const c = {}; bl.forEach((x) => { c[x] = (c[x] || 0) + 1; }); console.log('\n  escrituras cortadas por la guarda: ' + JSON.stringify(c)); }
  if (process.env.PILAS) l.filter((x) => x.tab === 'arranque' || x.a === process.env.PILAS).forEach((x) => console.log('\n  ' + x.a + ' @' + x.ms + 'ms palancas:' + x.pal + '\n     ' + x.pila));
  cli.matar(); process.exit(0);
})().catch((e) => { console.error('REVENTO', e); process.exit(2); });
