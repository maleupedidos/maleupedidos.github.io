/* El flujo de fondos proyectado, ADENTRO del Financiero (21/10/2026).

   node probar_flujo_financiero.js <token> [390|1440]      (BASE=http://127.0.0.1:<puerto>, APP=<otro.html>)

   Con la sesion REAL (solo GET: los POST se interceptan con sesion_prep). Sostiene:
     · no hay boton «Proyectado»: el flujo esta en Financiero, debajo de lo libre;
     · los proveedores tienen fecha: la deuda de la semana S el JUEVES de la S+1, y
       las OC sin recibir igual; nada de proveedores en «sin fecha»;
     · el sueldo de un mes va el DIA_GIRO_1 (del 1 al 5) del siguiente, y no hay
       ninguna «mitad» a mitad de mes;
     · no entra la ocupacion imputada ni la amortizacion (no son plata);
     · el saldo dia por dia arranca en la caja y cierra con lo que dice el titulo;
     · si algun dia queda abajo de CAJA_MINIMA, el aviso nombra el PRIMERO.
   Guarda una captura en la carpeta temporal. */
'use strict';
const path = require('path');
const fs = require('fs');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const prep = require(path.join(__dirname, 'sesion_prep.js'));
const TOKEN = process.argv[2], ANCHO = Number(process.argv[3]) || 390;
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + (process.env.APP || 'app.html');
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 700) : '')); } };
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 1000, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, 'try{localStorage.setItem("maleu_eerr_modo","proyectado");}catch(e){}') });
    await cli.enviar('Page.navigate', { url: BASE });
    let listo = false;
    for (let i = 0; i < 360 && !listo; i++) { await espera(500); listo = await evaluar(cli, '!!(window.D&&D.pedidos&&D.pedidos.length>500&&D.gastos&&D.gastos.length>100&&D.provisiones&&D.provisiones.length)').catch(() => false); }
    await evaluar(cli, 'go("ventas");true');
    for (let i = 0; i < 240; i++) { await espera(500); if (await evaluar(cli, '!!(window.VD&&VD.length>500)').catch(() => false)) break; }
    /* Abrir Inicio › EERR y esperar la deuda y la Red (los pide el propio flujo). */
    await evaluar(cli, `go('inicio'); goSubInicio('eerr'); var n=new Date(); eerrMes=new Date(n.getFullYear(),n.getMonth(),1); rEERR(); true`);
    for (let i = 0; i < 120; i++) { await espera(500); if (await evaluar(cli, '_eerrDeudaProv!==null&&!!_proyRed').catch(() => false)) break; }
    await evaluar(cli, 'rEERR();true'); await espera(500);
    const r = await evaluar(cli, `(function(){
      var tool=document.getElementById('eerrTool'),body=document.getElementById('eerrBody');
      var botones=[].map.call(tool.querySelectorAll('.eerr-toggle button'),function(b){return b.textContent;});
      var P=_proyArmar();
      var fmt=function(r){return {f:r.f?_proyDm(r.f):null,dia:r.f?r.f.getDay():null,lbl:r.lbl,m:Math.round(r.$),tipo:r.tipo,atr:!!r.atr,org:r.org};};
      var proy=document.getElementById('eerrProy');
      var filas=proy?[].map.call(proy.querySelectorAll('#proyTbl tr.g'),function(t){return t.innerText.replace(/\\s+/g,' ').trim();}):[];
      return {modo:eerrModo,botones:botones,enFin:!!proy&&!!body.querySelector('#eerrLibre')&&!!body.querySelector('#eerrProy #proyHero'),
        con:P.con.map(fmt),sin:P.sin.map(fmt),caja:Math.round(P.caja),
        fin:(document.getElementById('proyFin')||{}).textContent||'',bajo:(document.getElementById('proyBajo')||{}).textContent||'',
        filas:filas,piso:Number(eerrConfig('CAJA_MINIMA',new Date().getFullYear()+'-'+('0'+(new Date().getMonth()+1)).slice(-2)))||0,
        d1:Number(eerrConfig('DIA_GIRO_1','2026-10'))||5,errs:(window.__err||[]).slice(0,5)};
    })()`);
    console.log('  caja $' + r.caja + ' · piso $' + r.piso + ' · con fecha ' + r.con.length + ' · sin fecha ' + r.sin.length);
    r.con.forEach((x) => console.log('     ' + x.f + ' ' + (x.tipo === 'in' ? '+' : '-') + x.m + ' ' + x.lbl + (x.atr ? ' (atrasado)' : '')));
    chk('no hay botón «Proyectado» y un modo viejo guardado entra al Financiero', !r.botones.some((b) => /Proyectado/.test(b)) && r.modo === 'financiero', [r.botones, r.modo]);
    chk('el flujo está adentro del Financiero, debajo de «Cuánto está libre»', r.enFin);
    const prov = r.con.filter((x) => /^Proveedor/.test(x.lbl));
    chk('los proveedores tienen fecha, y es un jueves (o hoy si se atrasó)', prov.length > 0 && prov.every((x) => x.dia === 4 || x.atr), prov.map((x) => [x.f, x.lbl, x.dia]));
    chk('   y ninguno quedó en «sin fecha»', !r.sin.some((x) => /^Proveedor/.test(x.lbl)), r.sin.filter((x) => /^Proveedor/.test(x.lbl)));
    const sue = r.con.filter((x) => /^Sueldo/.test(x.lbl));
    chk('el sueldo va el día ' + r.d1 + ' (o hoy si se atrasó), sin «mitad» a mitad de mes', sue.every((x) => (x.f && Number(x.f.slice(0, 2)) === r.d1) || x.atr) && !sue.some((x) => /mitad/.test(x.lbl)), sue.map((x) => [x.f, x.lbl]));
    chk('no entra la ocupación imputada ni la amortización', !r.con.concat(r.sin).some((x) => /imputad|amortiz/i.test(x.lbl)));
    const neto = r.con.reduce((a, x) => a + (x.tipo === 'in' ? x.m : -x.m), 0);
    const finTxt = Number(String(r.fin).replace(/[^\d-]/g, ''));
    chk('caja + lo que entra − lo que sale = lo que dice el título (±$' + r.con.length + ' de redondeo)', Math.abs(r.caja + neto - finTxt) <= r.con.length + 1, { caja: r.caja, neto, finTxt });
    let saldo = r.caja, primero = null;
    const porDia = {};
    r.con.forEach((x) => { porDia[x.f] = (porDia[x.f] || 0) + (x.tipo === 'in' ? x.m : -x.m); });
    Object.keys(porDia).forEach((k) => { saldo += porDia[k]; if (!primero && r.piso > 0 && saldo < r.piso) primero = k; });
    if (r.piso > 0 && r.caja < r.piso) primero = 'hoy';
    chk('el aviso del piso nombra el PRIMER día abajo de CAJA_MINIMA' + (primero ? ' (' + primero + ')' : ' (ninguno: no hay aviso)'),
      primero ? (primero === 'hoy' ? /^⚠️ Hoy/.test(r.bajo) : r.bajo.includes(primero)) : r.bajo === '', [primero, r.bajo]);
    /* El aviso con un piso que SI se cruza: CAJA_MINIMA = caja − $100.000, en memoria. */
    const piso2 = r.caja - 100000;
    let s2 = r.caja, prim2 = null;
    Object.keys(porDia).forEach((k) => { s2 += porDia[k]; if (!prim2 && s2 < piso2) prim2 = k; });
    const b2 = await evaluar(cli, `(function(){D.config=(D.config||[]).filter(function(c){return c.param!=='CAJA_MINIMA';}).concat([{param:'CAJA_MINIMA',valor:${piso2},desde:'2000-01'}]);rEERR();
      return {t:(document.getElementById('proyBajo')||{}).textContent||'',neg:document.querySelectorAll('#proyTbl tr.g.neg').length};})()`);
    chk('con un piso que se cruza, el aviso nombra el primer día (' + prim2 + ') y los días abajo van en rojo', !!prim2 && b2.t.includes(prim2) && b2.neg > 0, [prim2, b2]);
    chk('sin errores en la consola', r.errs.length === 0, r.errs);
    chk('sin scroll horizontal a ' + ANCHO + 'px', await evaluar(cli, 'document.documentElement.scrollWidth<=window.innerWidth'));
    await evaluar(cli, `var e=document.getElementById('eerrProy');if(e)e.scrollIntoView();true`); await espera(300);
    const shot = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(require('os').tmpdir() + '/flujo_' + ANCHO + '.png', Buffer.from(shot.data, 'base64'));
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('REVENTO', e.message); process.exit(2); });
