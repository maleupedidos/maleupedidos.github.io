/* LA TARJETA KPI CON COMPARACIÓN (11/11/2026): Inicio y Ventas.
     SBSES=<sbses.json> node _tools/pruebas/probar_kpi_cmp.js <token> [ancho]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado (la versión vieja da rojos)
   Sostiene:
     · Inicio, Total Maleu y Ventas retail: cada KPI trae la pastilla («↗ 7%») Y el valor anterior
       escrito con su período («vs $5.040.000 octubre al 11»);
     · Ventas en «Este mes» (en curso): el anterior es el mes pasado HASTA EL MISMO DÍA, y su
       facturado es la suma de las ventas de esos días — calculada acá, aparte, sobre VD, sin filtros;
     · el % de la pastilla es el que sale de los dos números;
     · en «Todo» no hay pastilla (no hay período anterior);
     · ningún renglón de la pastilla lleva dos $. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2);
const ANCHO = Number(ANCHO_S || 1440);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra) : ''); } };
const num = (t) => Number(String(t || '').replace(/[^\d]/g, '')) || 0;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(14000);

  /* 1. Inicio */
  await evaluar(cli, "go('inicio')"); await T(5000);
  const ini = await evaluar(cli, `(function(){
    function k(sel){return [].slice.call(document.querySelectorAll(sel)).map(function(e){
      var c=e.querySelector('.kpi-cmp');return {l:(e.querySelector('.rt-kl')||{}).textContent,pill:c&&(c.querySelector('.kpi-pill')||{}).textContent,vs:c&&(c.querySelector('.kpi-vs')||{}).textContent,cmp:c?c.textContent:''};});}
    return {mt:k('#p-inicio .mt-k'),rt:k('#p-inicio .rt-k')};})()`);
  chk(ini.mt.length >= 3, `Total Maleu: ${ini.mt.length} tarjetas examinadas`);
  chk(ini.mt.length > 0 && ini.mt.every((x) => x.pill && /^vs \$[\d.]+ [a-z]+ al \d+$|^vs \$[\d.]+ [a-z]+$/.test(x.vs) || /sin datos/.test(x.cmp)), 'Total Maleu: pastilla + «vs $X <mes> al <día>»', ini.mt);
  const rtCon = ini.rt.filter((x) => x.l && !/cargado/i.test(x.l));
  chk(rtCon.length >= 4 && rtCon.every((x) => (x.pill && /^vs [\d.$]+ /.test(x.vs)) || /sin datos/.test(x.cmp)), `Ventas retail: ${rtCon.length} KPI con pastilla y valor anterior`, rtCon);
  chk(ini.mt.concat(ini.rt).every((x) => (String(x.cmp).match(/\$/g) || []).length <= 1), 'ningún renglón de pastilla con dos $');

  /* 2. Ventas, «Este mes», sin filtros ni búsqueda */
  await evaluar(cli, "go('ventas')"); await T(4000);
  await evaluar(cli, `(function(){try{Object.keys(vFilt).forEach(function(k){vFilt[k]=[];});}catch(e){}
    var b=document.getElementById('vBusq')||document.querySelector('#p-ventas input[type=search],#p-ventas .v-busq input');if(b)b.value='';
    vRango=_vRangoDe('mes');rVentas();})()`);
  let espera = 0; while (espera++ < 30 && !(await evaluar(cli, "!!(window.VD&&VD.length)"))) await T(1000);
  await evaluar(cli, 'rVentas()'); await T(800);
  const v = await evaluar(cli, `(function(){
    var ks=[].slice.call(document.querySelectorAll('#vSum .vs-top .v-kpi')).map(function(e){var c=e.querySelector('.kpi-cmp');
      return {l:(e.querySelector('.v-kpi-l')||{}).textContent,v:(e.querySelector('.v-kpi-v')||{}).textContent,pill:c&&(c.querySelector('.kpi-pill')||{}).textContent,vs:c&&(c.querySelector('.kpi-vs')||{}).textContent};});
    /* La suma APARTE: el mes pasado del 1 al mismo día de hoy, sobre VD, por la fecha que usa la tab. */
    var h=_vHoyAR(),y=h.getFullYear(),m=h.getMonth(),ult=new Date(y,m,0).getDate();
    var d0=_vIso(new Date(y,m-1,1)),d1=_vIso(new Date(y,m-1,Math.min(h.getDate(),ult)));
    var f=0,c0=_vIso(new Date(y,m,1)),c1=_vIso(h),fc=0;
    VD.forEach(function(x){var o=_vDer(x);if(!o.iso)return;if(o.iso>=d0&&o.iso<=d1)f+=Number(x.$)||0;if(o.iso>=c0&&o.iso<=c1)fc+=Number(x.$)||0;});
    return {ks:ks,ant:Math.round(f),act:Math.round(fc),d1:d1};})()`);
  const fac = v.ks.find((x) => x.l === 'Facturado');
  chk(!!fac && !!fac.pill, 'Ventas › Facturado trae pastilla', v.ks);
  if (fac) {
    chk(num((String(fac.vs).match(/\$([\d.]+)/)||[])[1]) === v.ant, `el anterior es el mes pasado hasta el ${v.d1.slice(8)}: $${v.ant} (pantalla ${fac.vs})`, fac);
    const pc = v.ant > 0 ? Math.round(Math.abs(num(fac.v) - v.ant) / v.ant * 100) : null;
    chk(pc !== null && (String(fac.pill||"").indexOf(pc + '%') >= 0 || (pc === 0 && /igual/.test(String(fac.pill||"")))), `el % (${pc}%) sale de los dos números`, fac.pill);
    chk(/al \d+$/.test(fac.vs), 'el período en curso dice hasta qué día («octubre al 11»)', fac.vs);
  }
  chk(v.ks.filter((x) => x.pill).length >= 5, `Ventas: ${v.ks.filter((x) => x.pill).length} de ${v.ks.length} KPI con pastilla`);

  /* 3. «Todo»: sin anterior, sin pastilla */
  await evaluar(cli, 'vRango=null;rVentas()'); await T(500);
  const todo = await evaluar(cli, "document.querySelectorAll('#vSum .vs-top .kpi-cmp').length");
  chk(todo === 0, 'en «Todo» no hay pastilla', todo);

  const err = await evaluar(cli, 'window.__err||[]');
  chk(!err.length, 'sin errores en la consola', err);
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
