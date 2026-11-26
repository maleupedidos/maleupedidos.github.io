/* CAJA: «¿POR QUÉ FALTA?» EN EL CARTEL DE UN COBRO QUE NO CIERRA (18/10/2026)
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_no_se_cobro_cartel.js [390|1440]
 *
 * El caso real: tomas chester dio $225.000 por Pilar #78 y #100 ($263.680); la
 * Banderita del #100 no se cobró. Con el backend stubbeado:
 *   · el cartel trae «¿Por qué falta?» (y no lo trae si SOBRA plata);
 *   · elegir el #100 pide sus productos (noSeCobro sin abbr, previa);
 *   · elegir la Banderita precarga su monto; «Ver cómo queda» manda previa con
 *     el motivo y muestra Descuento, Total, Facturado, Margen y lo cobrado;
 *   · Confirmar manda noSeCobro SIN previa, con clientOpId, y recarga la caja;
 *   · cambiar el monto después del preview obliga a verlo de nuevo;
 *   · el cuadro entra en la pantalla.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(120); } return false; };
const EXTRA = `
(function(){
  window.__posts=[];
  try{ localStorage.clear(); localStorage.setItem('maleu_token','x');
    localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
    localStorage.setItem('maleu_tab','inicio'); }catch(e){}
  var LIN=[{a:'CEn',nombre:'Carne Entraña',q:0.453,monto:15402},{a:'CAC',nombre:'Carne Asado Costilla Especial',q:1.403,monto:39144},{a:'CAB',nombre:'Carne Asado Banderita',q:1.897,monto:52926}];
  var AN={desc:0,total:107472,fact:107472,margen:21494.4,ef:107472,tr:0};
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var r={ok:true,ts:Date.now(),pedidos:[],lista:[],datos:[],items:[],v:[],cobros:[],caja:{cuentas:[]},movimientos:[],oc:{lista:[]}};
    if(x&&String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      if(b.action==='noSeCobro'){
        var m=Number(b.monto)||52926;
        r={ok:true,hoja:'Pilar',id:'100',row:99,cliente:'Tomas chester',lineas:LIN,antes:AN,cobrado:true};
        if(b.abbr){r.despues={desc:m,total:107472-m,fact:107472-m,margen:21494.4-m,ef:107472-m,tr:0};r.monto=m;r.producto='Carne Asado Banderita';r.motivo=String(b.motivo||'').trim();
          if(b.previa)r.previa=true;else r.quedo=r.despues;}
      }
    }
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); },80); });
  };
})();
`;
(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const posts = () => evaluar(cli, `window.__posts.filter(function(p){return p.action==='noSeCobro'})`);
  const caja = () => evaluar(cli, `(function(){var o=document.getElementById('nscModal');if(!o||o.hidden)return null;var b=o.querySelector('.nsc-box').getBoundingClientRect();return {txt:o.textContent,dentro:b.left>=0&&b.right<=innerWidth+0.5&&b.top>=0};})()`);
  const tocar = txt => evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('#nscModal button')).filter(function(x){return x.textContent.trim()===${JSON.stringify(txt)}})[0];if(b&&!b.disabled)b.click();return !!b;})()`);
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Caja: ¿por qué falta? · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, `typeof _efAvisosHtml==='function'&&typeof nscAbrir==='function'`, 60000)) { chk('el ERP arrancó con el cartel nuevo', false); salir(1); }
    await pausa(1200);
    const html = await evaluar(cli, `(function(){
      var det=[{h:'Pilar',id:'78',c:'Tomas chester',rec:225000,vto:0,cobro:156208,t:'5491169990884',q:'Lucas Moresco'},
               {h:'Pilar',id:'100',c:'Tomas chester',rec:0,vto:0,cobro:107472,t:'5491169990884',q:'Lucas Moresco'},
               {h:'Home',id:'9',c:'Sobra',rec:50000,vto:0,cobro:40000,t:'1',q:'Lucas Moresco'}];
      var h=_efAvisosHtml({det:det},true); var d=document.createElement('div'); d.id='__cartel'; d.innerHTML=h; document.body.appendChild(d); return h; })()`);
    chk('el cartel dice «faltan $38.680» con el botón', /faltan <b>\$38\.680/.test(html) && /¿Por qué falta\?/.test(html), html.slice(0, 300));
    chk('y cuando SOBRA plata no trae el botón', (html.match(/efm-porque/g) || []).length === 1, (html.match(/efm-porque/g) || []).length);
    await evaluar(cli, `document.querySelector('#__cartel .efm-porque').click(); 1`);
    let c = await caja();
    chk('abre «¿Por qué faltan $38.680?» con «No se cobró un producto»', !!c && /faltan \$38\.680/.test(c.txt) && /No se cobró un producto/.test(c.txt), c);
    chk('el cuadro entra en la pantalla', !!c && c.dentro === true, c);
    await tocar('Pilar #100');
    await esperar(cli, `!!document.querySelector('#nscModal input[name=nscAb]')`);
    let p = await posts();
    chk('elegir el #100 pide sus productos (previa, sin producto)', p.length === 1 && p[0].id === '100' && p[0].previa === true && !p[0].abbr, p);
    await evaluar(cli, `[].slice.call(document.querySelectorAll('#nscModal input[name=nscAb]'))[2].click(); 1`);
    await pausa(200);
    const monto = await evaluar(cli, `(document.getElementById('nscMonto')||{}).value`);
    chk('elegir la Banderita precarga su monto de lista', monto === '52926', monto);
    await evaluar(cli, `var m=document.getElementById('nscMot');m.value='Banderita en mal estado, no se cobró';var n=document.getElementById('nscMonto');n.value='38680';1`);
    await tocar('Ver cómo queda');
    await esperar(cli, `!!document.querySelector('#nscModal .nsc-tab')`);
    p = await posts();
    chk('«Ver cómo queda» manda previa con producto, motivo y monto', p.length === 2 && p[1].previa === true && p[1].abbr === 'CAB' && p[1].monto === 38680 && /mal estado/.test(p[1].motivo), p[1]);
    c = await caja();
    chk('muestra Descuento, Total, Facturado, Margen y lo cobrado en efectivo', /Descuento\$0\$38\.680/.test(c.txt) && /Total a cobrar\$107\.472\$68\.792/.test(c.txt) && /Facturado/.test(c.txt) && /Margen/.test(c.txt) && /Cobrado en efectivo\$107\.472\$68\.792/.test(c.txt), c.txt);
    await evaluar(cli, `document.getElementById('nscMonto').value='40000';1`);
    await tocar('Confirmar');
    await pausa(300);
    p = await posts();
    chk('cambiar el monto después del preview obliga a verlo de nuevo (no guarda)', p.length === 2 && /tocá «Ver cómo queda»/.test((await caja()).txt), p.length);
    await evaluar(cli, `document.getElementById('nscMonto').value='38680';window.__rec=0;window._recargarCaja=function(){window.__rec++;};1`);
    await tocar('Ver cómo queda');
    await esperar(cli, `!!document.querySelector('#nscModal .nsc-tab')`);
    await tocar('Confirmar');
    await esperar(cli, `(function(){var o=document.getElementById('nscModal');return o&&o.hidden;})()`);
    p = await posts();
    const ult = p[p.length - 1];
    chk('Confirmar manda noSeCobro sin previa, con fila y clientOpId', !ult.previa && ult.abbr === 'CAB' && ult.monto === 38680 && ult.row === 99 && /^nsc\|Pilar\|100\|CAB\|/.test(ult.clientOpId || ''), ult);
    chk('cierra el cuadro y recarga la caja', (await caja()) === null && (await evaluar(cli, 'window.__rec')) >= 1);
    chk('sin errores de JS', !errores.length, errores.slice(0, 3));
  } catch (e) { console.log('  la prueba se cortó: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
