/* EL MENÚ DEL 26/11/2026: Pagos como tab propia en Plata, la línea arriba de cada grupo y la foto en el avatar (861).

   node _tools/pruebas/probar_menu_pagos_foto.js <base> <ancho> [sesiones]
     base     http://localhost:8096 (el servidor propio, no el 8080)
     ancho    390 o 1440
     sesiones carpeta con ses_tadeo.json y ses_lou.json (estancias/scripts/migraciones/sesion_prueba.py crear …):
              sin ella se prueba solo el armazón (?prueba=1).

   Armazón (?prueba=1, admin): Plata = Caja · Cobranza · Pagos · Liquidaciones · Gastos; cada título de grupo con su
   línea arriba y visible (cajón abierto); Pagos abre #p-busqueda sin sub-tabs, en Pagar; Compras sin PAGAR y en Pedir;
   «Pagar» no queda guardada; los caminos viejos (pickEgresos('compras'), _gProvIrAbast, Ctrl K «Pagar») caen en Pagos.
   Foto (sesión real de solo lectura): el avatar de arriba y el de Sesión llevan la foto y la imagen carga de verdad. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8096';
const W = Number(process.argv[3] || 1440), SES = process.argv[4] || '';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(c, e)) return true; } catch (x) {} await pausa(300); } return false; };

async function nueva(pre) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: W > 800 ? 900 : 844, deviceScaleFactor: 1, mobile: W <= 800 });
  if (pre) await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: pre });
  return cli;
}

async function armazon() {
  console.log('\n== Armazón a ' + W + ' ==');
  const cli = await nueva('try{localStorage.setItem("maleu_busqueda_tab","pagos");localStorage.setItem("maleu_tab","inicio");}catch(e){}');
  const ev = e => evaluar(cli, e);
  try {
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, "typeof go==='function'&&!!document.querySelector('.snav')")) { chk('el ERP arrancó', false); return; }
    /* El cajón abierto, como lo usa Tadeo (y en el celular, abierto con la hamburguesa). */
    await ev("(function(){document.body.classList.add('sb-open');var n=document.querySelector('.snav');if(n)n.classList.add('open');document.body.classList.add('nav-open');})()");
    const plata = await ev(`(function(){var out=[],en=false;document.querySelectorAll('.snav > *').forEach(function(e){
      if(e.classList.contains('snav-section')){en=(e.textContent.trim()==='Plata');return;}
      if(en&&e.classList.contains('bn')&&e.dataset.p)out.push(e.dataset.p);});return out.join(',');})()`);
    chk('Plata: Caja · Cobranza · Pagos · Liquidaciones · Gastos', plata === 'caja,cobranza,pagos,equipo,egresos', plata);
    const lineas = await ev(`(function(){return [].map.call(document.querySelectorAll('.snav .snav-section'),function(s){var c=getComputedStyle(s);
      return {t:s.textContent.trim(),b:c.borderTopWidth+' '+c.borderTopStyle,vis:c.display!=='none'&&s.offsetHeight>0};});})()`);
    const grupos = ['Retail', 'Catering', 'Mercadería', 'Plata', 'Números', 'Empresa'];
    grupos.forEach(g => { const x = (lineas || []).find(l => l.t === g); chk('línea arriba de ' + g, !!x && x.b === '1px solid' && x.vis === true, x); });

    /* Que termine de restaurar la tab del arranque (si no, pisa el go de la prueba). */
    await pausa(4000);
    await ev("go('pagos')");
    await esperar(cli, "typeof window.abaModoPagos==='function'&&(document.querySelector('#pg-abast .tab.active')||{}).dataset&&document.querySelector('#pg-abast .tab.active').dataset.tab==='pagos'", 20000);
    const p = await ev(`(function(){var t=document.querySelector('#pg-abast .tabs'),a=document.querySelector('#pg-abast .tab.active');
      return {pg:(document.querySelector('.pg.on')||{}).id,modo:document.documentElement.classList.contains('modo-pag'),tabs:t?getComputedStyle(t).display:'?',
        act:a&&a.dataset.tab,tit:(document.getElementById('hdrTitle')||{}).textContent,bn:!!document.querySelector('.bn.on[data-p="pagos"]'),
        guardada:localStorage.getItem('maleu_busqueda_tab')};})()`);
    chk('Pagos abre la página de Compras', p.pg === 'p-busqueda' && p.modo === true, p);
    chk('Pagos sin sub-tabs', p.tabs === 'none', p.tabs);
    chk('Pagos está en Pagar', p.act === 'pagos', p.act);
    chk('el encabezado dice Pagos y el menú la marca', p.tit === 'Pagos' && p.bn === true, p);

    await ev("go('busqueda')");
    await esperar(cli, "(document.querySelector('#pg-abast .tab.active')||{dataset:{}}).dataset.tab==='proveedores'", 10000);
    const c = await ev(`(function(){var t=document.querySelector('#pg-abast .tabs'),pg=document.querySelector('#pg-abast .tab[data-tab="pagos"]'),a=document.querySelector('#pg-abast .tab.active');
      return {modo:document.documentElement.classList.contains('modo-pag'),tabs:t?getComputedStyle(t).display:'?',pagar:pg?getComputedStyle(pg).display:'?',act:a&&a.dataset.tab,
        tit:(document.getElementById('hdrTitle')||{}).textContent,guardada:localStorage.getItem('maleu_busqueda_tab')};})()`);
    chk('Compras con sub-tabs', c.modo === false && c.tabs !== 'none', c);
    chk('Compras sin PAGAR', c.pagar === 'none', c.pagar);
    chk('Compras vuelve a Pedir (venía guardada «pagos»)', c.act === 'proveedores', c.act);
    chk('«pagos» no queda guardada', c.guardada !== 'pagos', c.guardada);

    for (const [n, js] of [['pickEgresos(compras)', "pickEgresos('compras')"], ['_gProvIrAbast', '_gProvIrAbast()'], ['Ctrl K «Pagar»', "_cmdLlamar('pagos','abaModoPagos',true)"]]) {
      await ev("go('inicio')"); await pausa(300);
      await ev(js);
      const llego = await esperar(cli, "cur==='pagos'&&(document.querySelector('#pg-abast .tab.active')||{dataset:{}}).dataset.tab==='pagos'", 10000);
      chk(n + ' lleva a Pagos', llego, await ev("cur"));
    }
  } finally { try { await cli.cerrar(); } catch (e) {} }
}

async function foto(usu, nombre, rol, tabs) {
  console.log('\n== Foto como ' + usu + ' a ' + W + ' ==');
  process.env.PREP_SESION = JSON.stringify({ usuario: usu, rol: rol, nombre: nombre, ts: Date.now(), tabs: tabs });
  const cli = await nueva(prep('prueba') + sbses(SES + '/ses_' + usu + '.json', usu) + ';try{localStorage.removeItem("mc_yofoto_' + usu + '");}catch(e){}');
  const ev = e => evaluar(cli, e);
  try {
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    const llego = await esperar(cli, "!!document.querySelector('#hdrUserAv.yo-con-foto')&&!!document.querySelector('#snavYoAv.yo-con-foto')", 45000);
    const r = await ev(`(async function(){var a=document.getElementById('hdrUserAv'),b=document.getElementById('snavYoAv');
      var u=(a.style.backgroundImage.match(/url\\("?(.*?)"?\\)$/)||[])[1]||'';
      var w=await new Promise(function(res){var i=new Image();i.onload=function(){res(i.naturalWidth);};i.onerror=function(){res(-1);};i.src=u;setTimeout(function(){res(-2);},15000);});
      return {a:a.className,b:b.className,mismo:a.style.backgroundImage===b.style.backgroundImage,firmada:/\\/object\\/sign\\/equipo\\//.test(u),arch:(u.match(/equipo\\/([^?]+)/)||[])[1],ancho:w,
        letra:a.textContent,color:getComputedStyle(a).color,bloq:window.__bloqueados};})()`);
    chk(usu + ': las dos fotos puestas', llego, r);
    chk(usu + ': la misma URL firmada en las dos, y de su archivo', r.mismo && r.firmada && String(r.arch || '').indexOf(usu) === 0, r);
    chk(usu + ': la imagen carga (' + r.ancho + ' px)', r.ancho > 0, r.ancho);
    chk(usu + ': la inicial queda adentro, transparente', r.letra.length === 1 && /rgba\(0, 0, 0, 0\)|transparent/.test(r.color), { l: r.letra, c: r.color });
    if (rol === 'admin') {
      /* Con la sesión real (la lista de tabs de Permisos, que no tiene «pagos»): el armazón con ?prueba=1 no la tiene y
         ahí Pagos salía igual. El 26/11 se publicaba escondida. */
      await esperar(cli, "Array.isArray(SESSION.tabs)&&SESSION.tabs.length>0", 30000);
      const plata = await ev(`(function(){var out=[],en=false;document.querySelectorAll('.snav > *').forEach(function(e){
        if(e.classList.contains('snav-section')){en=(e.textContent.trim()==='Plata');return;}
        if(en&&e.classList.contains('bn')&&e.dataset.p&&!e.classList.contains('role-hidden')&&getComputedStyle(e).display!=='none')out.push(e.dataset.p);});return out.join(',');})()`);
      chk(usu + ' (sesión real): Plata = Caja · Cobranza · Pagos · Liquidaciones · Gastos', plata === 'caja,cobranza,pagos,equipo,egresos', plata);
      await ev("go('pagos')");
      await pausa(5000);
      chk(usu + ' (sesión real): Pagos se queda abierta', await ev("cur==='pagos'&&(document.querySelector('.pg.on')||{}).id==='p-busqueda'"), await ev("cur"));
    }
  } finally { try { await cli.cerrar(); } catch (e) {} }
}

(async () => {
  await armazon();
  if (SES) {
    await foto('tadeo', 'Tadeo Ustariz', 'admin', null);
    await foto('lou', 'Lourdes Thomas', 'vendedor', ['miportal']);
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
