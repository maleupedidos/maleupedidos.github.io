/* RUTA › COBROS: «CLIENTES DE VENDEDORES» (14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_cobros_clivend.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página (no toca producción).
   Desde el 5/10 el cliente de Red le paga a Maleu: la sección lista esos pedidos
   abajo de todo, con un aviso arriba que lleva hasta ella, y cobra por el MISMO
   `updatePedidoRed` que Ventas › RED (el que sella la cuenta y mete la plata en
   la Caja). Mira:
   · salen los de la regla nueva sin cobrar y el cobrado sin cuenta; no el viejo;
   · el aviso está arriba, en la primera pantalla, y la sección abajo de todo;
   · «Cobrar» pregunta la cuenta y manda cobroCliente + cuentaCobro + montoVisto;
   · sin scroll horizontal y sin errores.
   Contra el ERP publicado antes del cambio (BASE=https://app.maleu.com.ar) da rojo. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const COBROS = { ok: true, ts: 1, billetera: 0, cobros: [
  { h: 'Home', id: '9001', c: 'Cliente Casa', $: 30000, fp: 'Transferencia', es: 'Entregado', fe: '14/10/2026', ck: 'casa1' },
  { h: 'Home', id: '9002', c: 'Otra Casa', $: 41000, fp: 'Efectivo', es: 'Pendiente', fe: '15/10/2026', ck: 'casa2' },
  { h: 'Pilar', id: '77', c: 'Cliente Pilar', $: 52000, fp: 'Transferencia', es: 'Pendiente', fe: '16/10/2026', ck: 'casa3' }] };
const ABIERTOS = { ok: true, cobroACaja: true,
  cuentas: [{ id: 'mp_tadeo', nombre: 'MP Tadeo', tipo: 'digital' }, { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital' }],
  vendedores: [
    { nombre: 'Rufino Ardanaz', pedidos: [
      { n: 119, c: 'Caro Rojo', dia: '16/10/2026', es: 'Pendiente', ep: 'No Cobrado', cobro: 218970, nueva: true, row: 120 },
      { n: 107, c: 'Viejo', dia: '01/10/2026', es: 'Entregado', ep: 'Cobrado', cobro: 36600, nueva: false, debe: 36600, row: 108 }] },
    { nombre: "Federico D'Andrea", pedidos: [
      { n: 118, c: 'Ana Prueba', dia: '13/10/2026', es: 'Entregado', ep: 'Cobrado', cobro: 50000, nueva: true, sinCta: true, trDir: 50000, row: 119 }] }] };

const STUB = `(function(){
  window.__log=[]; window.__posts=[];
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){
      var m=url.match(/action=([A-Za-z]+)/), a=m?m[1]:'?'; window.__log.push('GET '+a);
      if(a==='cobrosPendientes') return resp(${JSON.stringify(COBROS)});
      if(a==='redPedidosAbiertos') return resp(${JSON.stringify(ABIERTOS)});
      return resp({ok:false});
    }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){ var b={}; try{ b=JSON.parse(t); }catch(e){} window.__posts.push(b); return resp({ok:true}); });
  };
})();`;

(async () => {
  console.log('\n== Ruta › Cobros: clientes de vendedores (' + ANCHO + ' px) ==\n');
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  await evaluar(cli, 'go("ruta"); 1');
  for (let i = 0; i < 80; i++) { if (await evaluar(cli, "typeof window.switchTab==='function'")) break; await pausa(250); }
  await pausa(1500);
  await evaluar(cli, "window.confirm=function(){return true;}; try{ window.switchTab('cobros'); }catch(e){ window.__log.push('EXPLOTO '+e.message); } 1");
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, "!!document.getElementById('rutCliVend')")) break; await pausa(250); }
  await pausa(800);
  const v = await evaluar(cli, `(function(){
    var cont=document.getElementById('cobrosContent'), sec=document.getElementById('rutCliVend');
    var cards=[].slice.call(cont.querySelectorAll('[data-cv]'));
    var aviso=[].slice.call(cont.querySelectorAll('button')).filter(function(b){return /clientes? de vendedor/.test(b.textContent);})[0];
    var todas=[].slice.call(cont.querySelectorAll('.cobro-card'));
    var ultimaNoCv=todas.filter(function(c){return !c.hasAttribute('data-cv');}).pop();
    return { hay: !!sec, n: cards.length, txt: cards.map(function(c){return c.textContent;}),
      aviso: aviso?{ top: aviso.getBoundingClientRect().top, txt: aviso.textContent }:null,
      secAbajo: !!(sec&&ultimaNoCv&&(ultimaNoCv.compareDocumentPosition(sec)&Node.DOCUMENT_POSITION_FOLLOWING)),
      ancho: document.documentElement.scrollWidth };
  })()`);
  chk('la sección existe', v.hay === true, v);
  chk('salen 2: el #119 sin cobrar y el #118 cobrado sin cuenta (no el viejo #107)', v.n === 2 && /Red #119/.test(v.txt.join('|')) && /Red #118/.test(v.txt.join('|')) && !/#107/.test(v.txt.join('|')), v.txt);
  chk('el aviso está arriba, en la primera pantalla', !!v.aviso && v.aviso.top >= 0 && v.aviso.top < 844, v.aviso);
  chk('la sección va abajo de todo (después de los cobros de siempre)', v.secAbajo === true);
  chk('sin scroll horizontal', v.ancho <= ANCHO, v.ancho);
  await evaluar(cli, "window.__posts=[]; var b=[].slice.call(document.querySelectorAll('[data-cv] button')).filter(function(x){return x.textContent==='Cobrar';})[0]; b&&b.click(); 1");
  await pausa(400);
  const ch = await evaluar(cli, "[].slice.call(document.querySelectorAll('[data-cv] button')).map(function(b){return b.textContent;})");
  chk('«Cobrar» pregunta la cuenta (MP Tadeo, Brubank Lucas, efectivo al vendedor)', ch.indexOf('MP Tadeo') >= 0 && ch.indexOf('Brubank Lucas') >= 0 && ch.some(x => /Efectivo a Rufino/.test(x)), ch);
  await evaluar(cli, "var b=[].slice.call(document.querySelectorAll('[data-cv] button')).filter(function(x){return x.textContent==='MP Tadeo';})[0]; b&&b.click(); 1");
  await pausa(1500);
  const p = await evaluar(cli, '({ posts: window.__posts.slice(), err: (window.__err||[]).slice(0,5), log: window.__log.slice() })');
  const up = p.posts.filter(b => b.action === 'updatePedidoRed')[0];
  chk('cobra por updatePedidoRed con la cuenta, el monto visto y la fila', !!up && up.pedidoId === '119' && up.row === 120 && up.vendedor === 'Rufino Ardanaz'
    && up.updates.cobroCliente === true && up.updates.formaPagoCliente === 'Transferencia' && up.updates.cuentaCobro === 'mp_tadeo' && up.updates.montoVisto === 218970, p.posts);
  chk('no usa marcarCobrado (no sella la cuenta de Red)', !p.posts.some(b => b.action === 'marcarCobrado'), p.posts);
  chk('sin errores', JSON.stringify(p.err) === '[]' && !p.log.some(x => /EXPLOTO/.test(x)), [p.err, p.log]);
  cli.matar();
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
