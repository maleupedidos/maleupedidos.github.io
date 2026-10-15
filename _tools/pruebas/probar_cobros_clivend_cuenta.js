/* RUTA › COBROS › «CLIENTES DE VENDEDORES»: el pedido que YA TRANSFIRIÓ y le
   falta la cuenta (15/10/2026).

     BASE=http://localhost:8171 node _tools/pruebas/probar_cobros_clivend_cuenta.js [390|1440]

   El caso real: Red #116 de María Trinidad Schisano (vendedor Federico D'Andrea),
   cobrado por transferencia sin cuenta. La tarjeta mostraba Mercado Pago Tadeo /
   Brubank Lucas / Cancelar y «los botones no responden». Sin token y con Apps
   Script SIMULADO (no toca producción); el POST tarda como el de verdad.
   Clica con el MOUSE (CDP Input), no con `.click()`, que ignora lo que tape.
   Mira:
   · al tocar la cuenta, la tarjeta dice que está guardando (no queda muda);
   · manda updatePedidoRed con cuentaCobro y la fila;
   · cuando el servidor contesta, la tarjeta desaparece y sale el aviso;
   · si una sincronización repinta a mitad del guardado, los botones no vuelven
     a quedar vivos (no se puede mandar dos veces);
   · «Cancelar» no se ve como la acción principal. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8171';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const COBROS = { ok: true, ts: 1, billetera: 0, cobros: [
  { h: 'Home', id: '9001', c: 'Cliente Casa', $: 30000, fp: 'Transferencia', es: 'Entregado', fe: '14/10/2026', ck: 'casa1' }] };
const PED = { n: '116', row: 117, c: 'Maria Trinidad Schisano', dia: '16/10/2026', es: 'Pendiente', ep: 'Cobrado', fp: 'Transferencia', cobro: 315707, nueva: true, sinCta: true, trDir: 315707 };
const ABIERTOS = { ok: true, cobroACaja: true,
  cuentas: [{ id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital' }, { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital' }],
  vendedores: [{ nombre: "Federico D'Andrea", pedidos: [PED] }] };
const DESPUES = JSON.parse(JSON.stringify(ABIERTOS));
delete DESPUES.vendedores[0].pedidos[0].sinCta; DESPUES.vendedores[0].pedidos[0].cta = 'mp';

const STUB = `(function(){
  window.__log=[]; window.__posts=[]; window.__guardado=false;
  function resp(o,ms){ return new Promise(function(r){ setTimeout(function(){ r(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||0); }); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){
      var m=url.match(/action=([A-Za-z]+)/), a=m?m[1]:'?'; window.__log.push('GET '+a);
      if(a==='cobrosPendientes') return resp(${JSON.stringify(COBROS)});
      if(a==='redPedidosAbiertos') return resp(window.__guardado?${JSON.stringify(DESPUES)}:${JSON.stringify(ABIERTOS)});
      return resp({ok:false});
    }
    var b={}; try{ b=JSON.parse(x.body); }catch(e){}
    window.__posts.push(b);
    /* Como el de verdad: el POST tarda (alta 16-18 s; acá 4 s para no esperar). */
    return resp({ok:true,applied:['cuentaCobro=mp']},4000).then(function(r){ window.__guardado=true; return r; });
  };
})();`;

async function clicMouse(cli, sel, texto) {
  const pos = await evaluar(cli, `(function(){
    var b=[].slice.call(document.querySelectorAll(${JSON.stringify(sel)})).filter(function(x){return x.textContent.trim()===${JSON.stringify(texto)};})[0];
    if(!b) return null; b.scrollIntoView({block:'center'});
    var r=b.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, e=document.elementFromPoint(x,y);
    return {x:x,y:y,tapa:(e===b||b.contains(e))?'':(e&&(e.id||e.className||e.tagName))};
  })()`);
  if (!pos) return null;
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  return pos;
}

(async () => {
  console.log('\n== Ruta › Cobros: ya transfirió, falta la cuenta (' + ANCHO + ' px) ==\n');
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  /* Sin sesión la tab con roles queda en display:none y el mouse no la toca:
     se la prende a mano (solo la clase, como hace go() con rol). */
  await evaluar(cli, 'go("ruta"); document.querySelectorAll(".pg.on").forEach(function(p){p.classList.remove("on");}); document.getElementById("p-ruta").classList.add("on"); 1');
  for (let i = 0; i < 80; i++) { if (await evaluar(cli, "typeof window.switchTab==='function'")) break; await pausa(250); }
  await pausa(1500);
  await evaluar(cli, "try{ document.getElementById('p-ruta').classList.add('on'); window.switchTab('cobros'); }catch(e){ window.__log.push('EXPLOTO '+e.message); } 1");
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, "!!document.querySelector('[data-cv]')")) break; await pausa(250); }
  await pausa(600);

  const c1 = await clicMouse(cli, '[data-cv] button', '¿A qué cuenta?');
  chk('el botón «¿A qué cuenta?» se puede tocar (nada lo tapa)', !!c1 && c1.tapa === '', c1);
  await pausa(500);
  const est = await evaluar(cli, `(function(){
    var bs=[].slice.call(document.querySelectorAll('[data-cv] button'));
    var can=bs.filter(function(b){return b.textContent.trim()==='Cancelar';})[0], mp=bs.filter(function(b){return b.textContent.trim()==='Mercado Pago Tadeo';})[0];
    function peso(b){ if(!b) return null; var s=getComputedStyle(b); return {bg:s.backgroundColor,alto:b.getBoundingClientRect().height,ancho:b.getBoundingClientRect().width}; }
    return {btns:bs.map(function(b){return b.textContent.trim();}), can:peso(can), mp:peso(mp)};
  })()`);
  chk('pregunta la cuenta: Mercado Pago Tadeo, Brubank Lucas y Cancelar', est.btns.indexOf('Mercado Pago Tadeo') >= 0 && est.btns.indexOf('Brubank Lucas') >= 0 && est.btns.indexOf('Cancelar') >= 0, est.btns);
  chk('«Cancelar» no tiene el mismo fondo que la cuenta (no parece la acción principal)', !!est.can && !!est.mp && /rgba\(0, 0, 0, 0\)|transparent/.test(est.can.bg) && est.can.alto < 40 && est.can.alto < est.mp.alto, est);

  const c2 = await clicMouse(cli, '[data-cv] button', 'Mercado Pago Tadeo');
  chk('la cuenta se puede tocar (nada la tapa)', !!c2 && c2.tapa === '', c2);
  await pausa(600);
  const mientras = await evaluar(cli, `(function(){ var c=document.querySelector('[data-cv]'); return c?{txt:c.textContent, vivos:[].slice.call(c.querySelectorAll('button')).filter(function(b){return !b.disabled;}).length}:null; })()`);
  chk('mientras guarda, la tarjeta lo dice (no queda muda)', !!mientras && /Guardando/i.test(mientras.txt), mientras);
  /* La sincronización de Ruta repinta Cobros cada 15 s: si cae a mitad del guardado... */
  await evaluar(cli, "var el=document.getElementById('cobrosContent'); el.__sig=null; renderCobrosFromServer(); 1");
  await pausa(200);
  const repin = await evaluar(cli, `(function(){ var c=document.querySelector('[data-cv]'); return c?{txt:c.textContent, vivos:[].slice.call(c.querySelectorAll('button')).filter(function(b){return !b.disabled && /Mercado|Brubank/.test(b.textContent);}).length}:null; })()`);
  chk('un repintado a mitad del guardado no revive los botones de cuenta', !!repin && repin.vivos === 0 && /Guardando/i.test(repin.txt), repin);

  for (let i = 0; i < 40; i++) { if (await evaluar(cli, "!document.querySelector('[data-cv]')")) break; await pausa(250); }
  const fin = await evaluar(cli, `({ posts: window.__posts.slice(), quedan: document.querySelectorAll('[data-cv]').length, err: (window.__err||[]).slice(0,5), log: window.__log.slice(), ancho: document.documentElement.scrollWidth })`);
  const up = fin.posts.filter(b => b.action === 'updatePedidoRed');
  chk('mandó UN updatePedidoRed con cuentaCobro=mp y la fila 117', up.length === 1 && up[0].pedidoId === '116' && up[0].row === 117 && up[0].updates.cuentaCobro === 'mp', fin.posts);
  chk('cuando el servidor contesta, la tarjeta se va', fin.quedan === 0, fin.quedan);
  chk('sin scroll horizontal', fin.ancho <= ANCHO, fin.ancho);
  chk('sin errores', JSON.stringify(fin.err) === '[]' && !fin.log.some(x => /EXPLOTO/.test(x)), [fin.err, fin.log]);
  cli.matar();
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
