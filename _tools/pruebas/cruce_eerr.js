#!/usr/bin/env node
/* EL ESTADO DE RESULTADOS DE LA BASE = EL DE LA TAB RESULTADOS (24/11/2026, migración 833).

   La base calcula el EERR (`eerr_mes_base(mes)`, la regla de `_eerrCalc` portada a SQL) y lo escribe en
   `eerr_month_line` para el tablero de Grupo Matriz. Esta prueba abre el ERP con datos reales, corre `_eerrCalc` del
   panel para el mes en curso y los dos anteriores, arma los mismos 46 renglones que la base y los compara uno por uno,
   al peso (tolerancia $1). Solo lee.

   Suelta:   SESION=<archivo de sesion_prueba.py> [BASE=http://localhost:8080/app.html] node cruce_eerr.js
             CONTRA=<json {mes:{clave:monto}}>  compara contra eso en vez de llamar a la base (para probar antes de aplicar)
             VOLCAR=<json>                      guarda los renglones del ERP
   Robot:    const { EXPR } = require('../pruebas/cruce_eerr.js'); await ev(EXPR) */
'use strict';
const fs = require('fs');

/* Los renglones de `_eerr_lineas` (833), en JS, desde la R de `_eerrCalc`. Si cambia uno, cambia el otro. */
const LINEAS = `function(R){
  var o=[],cf={},cc={};(R.canales||[]).forEach(function(c){cf[c.k]=c.f;cc[c.k]=c.c;});
  function r(k,m){o.push([k,Number(m)||0]);}
  var CAN=[['home','Home'],['pilar','Pilar'],['clubes','Clubes'],['red','Red'],['b2b','B2B'],['catering','Catering']],sum=0;
  r('ventas',R.totFact);
  CAN.forEach(function(c){sum+=cf[c[1]]||0;r('ventas.'+c[0],cf[c[1]]||0);});
  r('ventas.propinas',R.propinas||0); r('ventas.a_favor',R.aFavor||0); r('ventas.otros',R.totFact-sum);
  CAN.forEach(function(c){r('ventas.'+c[0]+'.costo',cc[c[1]]||0);});
  r('costo',-R.totCMV); r('costo.productos',-(R.totCMV-(R.cmvCat||0)-(R.cmvRed||0)));
  r('costo.catering',-(R.cmvCat||0)); r('costo.redondeos',-(R.cmvRed||0));
  r('margen_bruto',R.totMB); r('gastos_venta',-R.totVar);
  r('gastos_venta.delivery',-R.delivery); r('gastos_venta.bolsas',-R.bolsas); r('gastos_venta.campanas',-R.camp);
  r('margen_contribucion',R.totMC); r('fijos',-(R.totEstr+R.amort));
  ['sueldo','planes','vehiculo','software','honorarios','servicios','ocupacion'].forEach(function(k){r('fijos.'+k,-(R.fijos[k]||0));});
  r('fijos.amortizacion',-R.amort); r('fijos.otros',-(R.fijos.otros||0));
  r('extraordinarios',-R.totExt); r('extraordinarios.regalo',-(R.ext.regalo||0));
  r('extraordinarios.perdida',-(R.ext.perdida||0)); r('extraordinarios.extra',-(R.ext.extra||0));
  r('intereses',R.rFinanc); r('impuestos',-R.totImp);
  r('impuestos.mono',-(R.imp.mono||0)); r('impuestos.iibb',-(R.imp.iibb||0)); r('impuestos.impuesto',-(R.imp.impuesto||0));
  r('resultado',R.resNeto);
  var m={};o.forEach(function(x){m[x[0]]=x[1];});return m;
}`;

/* Lo que corre ADENTRO de la página: espera los datos que usa Resultados, calcula los 3 meses y (si `base`) le pregunta a
   la base. Devuelve {ok, meses:{ym:{erp, base}}, difs}. */
const expr = (conBase) => `(async function(){
  var pausa=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  try{ if(typeof go==='function')go('resultados'); }catch(e){}
  try{ if(typeof _mermasCargar==='function')_mermasCargar(); }catch(e){}
  var listo=function(){ return typeof VD!=='undefined'&&VD&&VD.length&&window.D&&Array.isArray(D.gastos)&&D.gastos.length
    &&Array.isArray(D.provisiones)&&D.provisiones.length&&Array.isArray(D.mermas)&&Array.isArray(VREG); };
  for(var i=0;i<240&&!listo();i++){ if(i%20===10)try{_mermasCargar();}catch(e){} await pausa(500); }
  if(!listo())return {ok:false,difs:['no llegaron los datos de Resultados: VD '+(typeof VD!=='undefined'&&VD?VD.length:'-')+' · gastos '+((window.D&&D.gastos)?D.gastos.length:'-')
    +' · provisiones '+((window.D&&D.provisiones)?D.provisiones.length:'-')+' · mermas '+((window.D&&D.mermas)?D.mermas.length:'-')+' · regalados '+(Array.isArray(VREG)?VREG.length:'-')]};
  var lin=(${LINEAS});
  var h=new Date(), out={ok:true,meses:{},difs:[],hoy:h.toISOString()};
  for(var k=2;k>=0;k--){
    var d=new Date(h.getFullYear(),h.getMonth()-k,1), mn=d.getMonth()+1, an=d.getFullYear(), ym=an+'-'+String(mn).padStart(2,'0');
    var R=_eerrCalc(mn,an); out.meses[ym]={erp:lin(R)};
    ${conBase ? `try{ var b=await _baseRpc('eerr_mes_base',{p_mes:ym}); var bm={};
      ((b&&b.lineas)||[]).forEach(function(x){bm[x.k]=Number(x.m)||0;}); out.meses[ym].base=bm;
      if(!(b&&b.ok))out.difs.push(ym+': la base no contestó ('+JSON.stringify(b).slice(0,120)+')'); }
    catch(e){ out.meses[ym].base=null; out.difs.push(ym+': la base: '+String(e&&e.message||e).slice(0,160)); }` : ''}
  }
  return out;
})()`;
const EXPR = expr(true);

/* Compara {erp, base} de cada mes al peso. Devuelve {ok, difs, resumen}. */
function comparar(r) {
  const difs = (r.difs || []).slice(), resumen = [];
  Object.keys(r.meses || {}).forEach((ym) => {
    const e = r.meses[ym].erp || {}, b = r.meses[ym].base;
    if (!b) return;
    let n = 0;
    Object.keys(Object.assign({}, e, b)).forEach((k) => {
      n++;
      if (!(k in b)) { difs.push(ym + ' · ' + k + ': falta en la base (ERP ' + Math.round(e[k]) + ')'); return; }
      if (!(k in e)) { difs.push(ym + ' · ' + k + ': falta en el ERP (base ' + Math.round(b[k]) + ')'); return; }
      if (Math.abs(e[k] - b[k]) > 1) difs.push(ym + ' · ' + k + ': ERP ' + Math.round(e[k]) + ' / base ' + Math.round(b[k]));
    });
    resumen.push({ mes: ym, renglones: n, resultadoErp: Math.round(e.resultado), resultadoBase: Math.round(b.resultado),
      ventasErp: Math.round(e.ventas), ventasBase: Math.round(b.ventas) });
  });
  return { ok: !difs.length, difs, resumen };
}
module.exports = { EXPR, expr, comparar, LINEAS };

if (require.main === module) (async () => {
  const cdp = require('./cdp.js');
  const S = process.env.SESION, BASE = process.env.BASE || 'http://localhost:8080/app.html';
  if (!S || !fs.existsSync(S)) { console.log('falta SESION=<archivo de sesion_prueba.py>'); process.exit(1); }
  const ses = JSON.parse(fs.readFileSync(S, 'utf8'));
  const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
  const usuario = ses.usuario || 'tadeo';
  /* Solo lecturas (*_pantalla, *_datos, *_base): todo otro POST a la base o a Apps Script se corta. Nada se imprime. */
  const PREP = `try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:${JSON.stringify(usuario)},rol:'admin',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: usuario, url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
      var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m==='POST'&&(/script\\.google\\.com/.test(s)||(r&&(!/_(pantalla|datos|base)$|^permiso_base$/.test(r[1])||/directo/.test(r[1])))))return Promise.resolve(new Response('{"ok":false,"err":"cortado"}',{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`;
  const contra = process.env.CONTRA ? JSON.parse(fs.readFileSync(process.env.CONTRA, 'utf8')) : null;
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Emulation.setTimezoneOverride', { timezoneId: 'America/Argentina/Buenos_Aires' }).catch(() => {});
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE });
    for (let i = 0; i < 120; i++) { try { if (await cdp.evaluar(cli, "typeof go==='function'&&!!window.D")) break; } catch (e) {} await new Promise((r) => setTimeout(r, 500)); }
    let r = await cdp.evaluar(cli, expr(!contra));
    if (typeof r === 'string') r = JSON.parse(r);
    if (contra) Object.keys(r.meses || {}).forEach((ym) => { r.meses[ym].base = contra[ym] || null; if (!contra[ym]) r.difs.push(ym + ': no está en CONTRA'); });
    if (process.env.VOLCAR) fs.writeFileSync(process.env.VOLCAR, JSON.stringify(r, null, 1));
    const c = comparar(r);
    c.resumen.forEach((x) => console.log(x.mes + ' · ' + x.renglones + ' renglones · ventas ERP $' + x.ventasErp + ' / base $' + x.ventasBase
      + ' · resultado ERP $' + x.resultadoErp + ' / base $' + x.resultadoBase));
    c.difs.forEach((d) => console.log('  DIFIERE ' + d));
    console.log('\n' + (c.ok ? '0 diferencias' : c.difs.length + ' diferencias'));
    process.exitCode = c.ok ? 0 : 1;
  } finally { try { cli.matar(); } catch (e) {} }
})();
