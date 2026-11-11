/* EL MARGEN DE INICIO CONTRA EL DE VENTAS (11/11/2026).
     SBSES=<sbses.json> node _tools/pruebas/probar_margen_inicio.js <token> [AAAA-MM]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado
   Hasta la v1055 Inicio decía Costo $0 y margen 100%: la lista de pedidos que lee `_rtSumar`
   (`_sbAPedido`, desde `sales_order`) no traía `cost_amount`. Esto sostiene:
     · los pedidos entregados del mes tienen costo (no 0 de 0);
     · el facturado y el costo de Inicio (`_rtSumar`, sin catering) coinciden AL PESO con los de
       Ventas (`VD`) sumados sobre los MISMOS canales y el mismo mes, por la fecha de venta;
     · las tarjetas de Total Maleu ya no dicen «Costo $0» ni margen 100%. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, MES_A] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } };

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  await evaluar(cli, "go('inicio')"); await T(12000);
  await evaluar(cli, "go('ventas')"); await T(4000);
  let e = 0; while (e++ < 30 && !(await evaluar(cli, '!!(window.VD&&VD.length)'))) await T(1000);
  await evaluar(cli, "go('inicio')"); await T(3000);
  const r = await evaluar(cli, `(function(){
    var h=_vHoyAR(),mes=${JSON.stringify(MES_A || '')}||(h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0'));
    var ult=new Date(+mes.slice(0,4),+mes.slice(5,7),0).getDate();
    var d=mes+'-01',hh=mes+'-'+String(ult).padStart(2,'0');var hoyI=_vIso(h);if(hoyI<hh&&hoyI>=d)hh=hoyI;
    var g=_rtSumar(d,hh);
    var nEnt=0,nCo=0;(D.pedidos||[]).forEach(function(p){if(p.es==='Entregado'&&String(_tendFechaVentaISO(p)||'').slice(0,7)===mes){nEnt++;if(Number(p.co)>0)nCo++;}});
    /* Ventas: los mismos canales que suma Inicio en tot (Home, Pilar, Clubes, Red). */
    var vf=0,vc=0,nv=0;VD.forEach(function(v){var o=_vDer(v);if(!o.iso||o.iso.slice(0,7)!==mes)return;var c=_vCanal(v);
      if(!/^(Venta Directa|Clubes|Red)$/.test(v.canal||''))return;if(o.iso>hh)return;vf+=Number(v.$)||0;vc+=Number(v.costo)||0;nv++;});
    var t=[].slice.call(document.querySelectorAll('#p-inicio .mt-k')).map(function(k){return k.textContent.replace(/\\s+/g,' ').trim();});
    return {mes:mes,nEnt:nEnt,nCo:nCo,ini:{f:Math.round(g.tot.f),c:Math.round(g.tot.c)},ven:{f:Math.round(vf),c:Math.round(vc),n:nv},tarjetas:t};})()`);
  console.log('  ', JSON.stringify(r));
  chk(r.nEnt > 0 && r.nCo === r.nEnt, `${r.mes}: los ${r.nEnt} pedidos entregados traen costo (${r.nCo} con costo)`);
  chk(r.ini.f === r.ven.f, `facturado: Inicio $${r.ini.f} = Ventas $${r.ven.f}`, r);
  chk(Math.abs(r.ini.c - r.ven.c) <= 1, `costo: Inicio $${r.ini.c} = Ventas $${r.ven.c}`, r);
  const mI = r.ini.f ? ((r.ini.f - r.ini.c) / r.ini.f * 100).toFixed(1) : '-', mV = r.ven.f ? ((r.ven.f - r.ven.c) / r.ven.f * 100).toFixed(1) : '-';
  chk(mI === mV, `margen bruto: Inicio ${mI}% = Ventas ${mV}%`);
  chk(!r.tarjetas.some((t) => /^COSTO \$0\b/i.test(t)) && !r.tarjetas.some((t) => /100%/.test(t) && /MARGEN/i.test(t)), 'Total Maleu ya no dice «Costo $0» ni margen 100%', r.tarjetas);
  /* Egresos del mes y Disponibilidades: con la app recién abierta en Inicio (sin pasar por Caja)
     decían $0. Ahora Inicio pide la caja solo; el número tiene que ser el mismo que da _saldoLiquido. */
  await cli.enviar('Page.reload'); await T(12000);
  await evaluar(cli, "go('inicio')"); await T(15000);
  const snap = await evaluar(cli, `(function(){var o={};[].slice.call(document.querySelectorAll('#hSnap .snap-c')).forEach(function(c){
      o[(c.querySelector('.snap-l')||{}).textContent]=(c.querySelector('.snap-v')||{}).textContent;});
    return {o:o,mov:Array.isArray(D&&D.movimientos),saldo:(typeof _saldoLiquido==='function'&&D&&D.movimientos)?Math.round(_saldoLiquido().total):null};})()`);
  const disp = snap.o['Disponibilidades'];
  chk(snap.mov === true, 'Inicio trajo la caja solo (sin abrir Caja)', snap);
  chk(!!disp && disp !== '$0' && disp !== '—' && Number(disp.replace(/[^\d]/g, '')) === Math.abs(snap.saldo), `Disponibilidades ${disp} = saldo de la caja ${snap.saldo}`, snap);
  chk(!!snap.o['Egresos del mes'] && snap.o['Egresos del mes'] !== '$0' && snap.o['Egresos del mes'] !== '—', `Egresos del mes ya no dice $0 (${snap.o['Egresos del mes']})`, snap);
  const err = (await evaluar(cli, 'window.__err||[]')).filter((x) => !/ResizeObserver loop/.test(x));
  chk(!err.length, 'sin errores en la consola', err);
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
