/* RUTA › VIERNES SE VA CUANDO TERMINA (27/11/2026). Tadeo: la sub-tab desaparece cuando ya se recibió toda la mercadería
 * del día (OC que llegan ese viernes, recibidas) y se dieron las bolsas; vuelve el viernes siguiente.
 *   BASE=http://localhost:8155 node _tools/pruebas/probar_viernes_se_va.js
 * ruta.html suelto a 390, sin red (todo fetch cortado). Se le da a la pantalla un recorrido armado (`_mv.d`) y se cambia
 * el «hoy» con `_mvHoyIso` para probar un sábado. Probado al revés: con `_mvTabVer` devolviendo siempre true, los casos
 * «se va» dan MAL. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8155';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d).slice(0, 400)); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };
const INIT = `(function(){ window.fetch=function(){ return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({ok:true});},text:function(){return Promise.resolve('{}');}}); };
  window.confirm=function(){return true;}; window.alert=function(){}; window.numAR=function(x){ return Number(String(x==null?'':x).split('.').join('').replace(',','.'))||0; };
  try{ localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'luqui',rol:'admin',nombre:'Lucas Moresco',ts:Date.now()})); localStorage.removeItem('mv_siempre'); localStorage.removeItem('mv_solo_prueba'); }catch(e){} })();`;
/* Un viernes: una bolsa (dada o no) y una OC de proveedor (recibida o no). */
const armar = (hoy, dada, rec) => `(function(){ var hoy=${JSON.stringify(hoy)};
  _mv.d={ok:true,dia:hoy,hoy:hoy,depositos:{ustariz:{nom:'Deposito Ustariz',de:'Tadeo Ustariz',usuario:'tadeo'}},capacidad:{},
    pedidos:[{k:'Red|990001',h:'Red',n:'990001',r:-990001,c:'PRUEBA Cliente',quien:'PRUEBA Rep A',red:true,dada:${dada},ent:false,lote:'',barrio:'',reparte:'',
      items:[{a:'TJyQ',nom:'Tarta Jamón y Queso',q:1,pieza:false,deps:{},provs:[{prov:'PRUEBA Proveedor',oc:'OC-PR1',q:1,cli:false}],falta:0}],pz:[]}],
    provs:[{prov:'PRUEBA Proveedor',total:1000,lineas:[{a:'TJyQ',nom:'Tarta Jamón y Queso',q:1,rec:${rec},oc:'OC-PR1',para:[{k:'Red|990001',q:1}]}]}]};
  _mv.t=Date.now(); _mv.err=''; return 1; })()`;
const VE = `(function(){ var t=document.querySelector('.tab[data-tab="viernes"]'); return !!t && getComputedStyle(t).display!=='none' && t.getBoundingClientRect().width>0; })()`;

(async () => {
  const cli = await abrir(); const errores = [];
  cli.escuchar((m, p) => { if (m === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'exc'); });
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
    await cli.enviar('Page.navigate', { url: BASE + '/ruta.html?standalone=1' });
    if (!await esperar(cli, `typeof _mvTabPintar==='function'&&!!document.querySelector('.tab[data-tab="viernes"]')`)) throw new Error('ruta.html no arrancó');
    const VIE = '2026-11-27', SAB = '2026-11-28';
    await evaluar(cli, `_mvHoyIso=function(){return ${JSON.stringify(VIE)};}; switchTab('nuevo'); 1`); await pausa(300);

    await evaluar(cli, armar(VIE, false, false) + `; _mvTabPintar(); 1`);
    chk('viernes, bolsa sin dar y OC sin recibir: se ve', await evaluar(cli, VE));
    await evaluar(cli, armar(VIE, true, false) + `; _mvTabPintar(); 1`);
    chk('viernes, bolsa dada pero OC sin recibir: se ve', await evaluar(cli, VE));
    await evaluar(cli, armar(VIE, false, true) + `; _mvTabPintar(); 1`);
    chk('viernes, OC recibida pero bolsa sin dar: se ve', await evaluar(cli, VE));
    await evaluar(cli, armar(VIE, true, true) + `; _mvTabPintar(); 1`);
    chk('viernes, todo recibido y bolsas dadas: SE VA', !(await evaluar(cli, VE)));

    await evaluar(cli, `_mv.d=null; _mv.pidiendo=true; _mvTabPintar(); 1`);
    chk('viernes sin el dato todavía: se ve (no saber no es terminado)', await evaluar(cli, VE));
    await evaluar(cli, `_mv.pidiendo=false; 1`);

    await evaluar(cli, armar(VIE, true, true) + `; switchTab('viernes'); 1`); await pausa(400);
    chk('terminado pero estás adentro: no te saca', await evaluar(cli, VE));
    await evaluar(cli, `switchTab('nuevo'); 1`); await pausa(300);
    chk('al salir, se va de la barra', !(await evaluar(cli, VE)));

    await evaluar(cli, `_mvHoyIso=function(){return ${JSON.stringify(SAB)};}; ` + armar('2026-12-04', false, false) + `; _mvTabPintar(); 1`);
    chk('sábado (el recorrido ya es del viernes siguiente): no se ve', !(await evaluar(cli, VE)));
    await evaluar(cli, `localStorage.setItem('mv_siempre','1'); _mvTabPintar(); 1`);
    chk('con mv_siempre (las pruebas) se ve siempre', await evaluar(cli, VE));
    await evaluar(cli, `localStorage.removeItem('mv_siempre'); _mvHoyIso=function(){return '2026-12-04';}; _mvTabPintar(); 1`);
    chk('el viernes siguiente, con lo nuevo sin hacer, vuelve', await evaluar(cli, VE));

    chk('cero errores de JavaScript', errores.length === 0, errores);
  } catch (e) { mal++; console.log('  MAL  la prueba reventó: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
