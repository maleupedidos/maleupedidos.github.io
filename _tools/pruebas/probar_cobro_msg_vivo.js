/* El mensaje de cobro sigue lo que se elige en el cuadro (21/10/2026).

   node probar_cobro_msg_vivo.js [390|1440] [ruta.html]      (BASE=http://127.0.0.1:<puerto>)

   Tadeo copiaba el detalle desde el cuadro de cobro, elegia «sin descuento», «10%» o
   «x%», y el mensaje seguia diciendo el descuento GUARDADO del pedido: lo editaba a
   mano. El caso, con datos INVENTADOS (este repo es publico): Colita de Cuadril, una
   pieza de 1,068 kg, $22.161 sin descuento.

   Lo que se sostiene:
     · el mensaje copiado dice el descuento elegido, con su %, y el total nuevo;
     · si el texto esta a la vista, cambiar el descuento lo reescribe y avisa que
       hay que copiar de nuevo; copiar de nuevo copia lo nuevo;
     · el redondeo del efectivo a los $100 (COBRO_REDONDEO) entra en el total;
     · el combo dice el descuento de cada pedido y el total de los dos;
     · sin elegir nada, no aparece un 10% automatico (desde el 15/10).
   Los POST se interceptan: nada llega al backend. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'ruta.html';
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const b = o => Object.assign({ oD: {}, oc: [], hr: '10:30', f: dmy(hoyAR), de: DIAS[hoyAR.getDay()], fe: iso(hoyAR), es: 'Pendiente', d: '', ep: 'No Cobrado', o: 'Deposito', cobradoParcial: 0 }, o);
const ENTREGAS = [
  b({ id: 9801, h: 'Home', r: 9801, c: 'Clara Prueba', t: '1150000081', b: 'Estancias del Pilar', sb: 'Golf', l: '9', fp: 'Transferencia',
      sub: 22161, env: 0, desc: 0, $: 22161, p: [{ a: 'CCo', q: 1.068 }], pz: [{ a: 'CCo', id: 'P-9801', kg: 1.068 }] }),
  b({ id: 9802, h: 'Home', r: 9802, c: 'Combo Diez', t: '1150000082', b: 'Estancias del Pilar', sb: 'Golf', l: '3', fp: 'Transferencia',
      sub: 40000, env: 0, desc: 0, $: 40000, p: [{ a: 'PPM', q: 2 }] }),
  b({ id: 9803, h: 'Home', r: 9803, c: 'Combo Diez', t: '1150000082', b: 'Estancias del Pilar', sb: 'Golf', l: '3', fp: 'Transferencia',
      sub: 20000, env: 0, desc: 0, $: 20000, p: [{ a: 'PPM', q: 1 }] }),
  b({ id: 9804, h: 'Home', r: 9804, c: 'Otro Relleno', t: '1150000083', b: 'Estancias del Pilar', sb: 'Golf', l: '1', fp: 'Transferencia',
      sub: 20000, env: 0, desc: 0, $: 20000, p: [{ a: 'PPM', q: 1 }] })
];
const ARM = {}; ENTREGAS.forEach(e => { ARM[e.h + '|R' + e.r] = { u: 'Prueba', hr: '10:00' }; });
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, alias: 'maleump', banco: 'Mercado Pago', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', col: 7, alias: 'maleubru', banco: 'Brubank', def: false, inv: false }
];
const PRECIOS = { CCo: { p: 20750, c: 16600 }, PPM: { p: 20000, c: 11000 } };
const PREP = `
  window.__posts=[]; window.__errores=[]; window.__copias=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  try{localStorage.clear();}catch(e){}
  try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){window.__copias.push(t);return Promise.resolve();}},configurable:true});}catch(e){}
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST'){var bd={};try{bd=JSON.parse(o.body);}catch(e){}window.__posts.push(bd);return J({ok:true,restante:0,cerrado:true});}
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:${JSON.stringify(ENTREGAS)},cuentas:${JSON.stringify(CUENTAS)},arm:${JSON.stringify(ARM)},rep:{},hechas:[],redEf:true});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:[],billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)},redEf:true});
    if(url.indexOf('action=precios')>-1) return J(${JSON.stringify(PRECIOS)});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();`;

let prepId = null;
async function arrancar(cli) {
  if (prepId) { try { await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: prepId }); } catch (e) {} }
  const r = await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
  prepId = r && r.identifier;
  await cli.enviar('Page.navigate', { url: BASE });
  if (!await esperar(cli, "typeof abrirCobroRuta==='function' && typeof getSorted==='function' && getSorted().length>=3"))
    throw new Error('la sub-app no arranco o no llegaron las entregas');
  await pausa(800);
}
const msg = (cli) => ev(cli, `(function(){var p=document.querySelector('#cobroRutaProds .cobro-msg pre');var h=document.querySelector('#cobroRutaProds .cobro-msg-h span');return p?{t:p.textContent,h:h?h.textContent:''}:null;})()`);
const copiar = async (cli) => { await ev(cli, `(function(){var b=document.querySelector('#cobroRutaProds .cobro-prods-copy');if(b)b.click();return !!b;})()`); await pausa(300); return ev(cli, 'window.__copias[window.__copias.length-1]||null'); };
const lineaTotal = (t) => ((String(t || '').match(/Total[^:\n]*: \$[\d.]+/g) || []).pop() || '');

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });

    console.log('\n== Un pedido: Clara, 1,068 kg de Colita, $22.161 ==');
    await arrancar(cli);
    await ev(cli, `abrirCobroRuta('Home|R9801')`); await pausa(500);
    await ev(cli, `_setCobroFp('Transferencia')`); await pausa(200);
    let c = await copiar(cli);
    chk('sin elegir nada: Total $22.161 y ningún 10% automático', /Total: \$22\.161/.test(c || '') && !/descuento/.test(c || ''), c);
    await ev(cli, `_setCobroDesc('diez')`); await pausa(300);
    let m = await msg(cli);
    chk('elijo 10%: el texto a la vista cambia solo — descuento 10% −$2.216, Total $19.945', !!m && /descuento 10% −\$2\.216/.test(m.t) && /Total: \$19\.945/.test(m.t), m);
    chk('   y avisa que lo copiado es lo de antes', !!m && /Cambió/.test(m.h), m && m.h);
    c = await copiar(cli);
    chk('   copiar de nuevo copia el del 10%', /descuento 10% −\$2\.216/.test(c || '') && /Total: \$19\.945/.test(c || ''), c);
    await ev(cli, `_setCobroDesc('otro');_setCobroDescTipo('pct');document.getElementById('cobroDescInp').value='15';_onDescManualChange()`); await pausa(300);
    m = await msg(cli);
    chk('elijo 15%: descuento 15% −$3.324, Total $18.837', !!m && /descuento 15% −\$3\.324/.test(m.t) && /Total: \$18\.837/.test(m.t), m && lineaTotal(m.t));
    await ev(cli, `_setCobroDesc('sin')`); await pausa(300);
    m = await msg(cli);
    chk('vuelvo a «sin descuento»: Total $22.161 y sin renglón de descuento', !!m && /Total: \$22\.161/.test(m.t) && !/descuento/.test(m.t), m && m.t);

    console.log('\n== El redondeo del efectivo ==');
    await ev(cli, `_setCobroFp('Efectivo')`); await pausa(400);
    m = await msg(cli);
    chk('en efectivo: «$22.161 · redondeo −$61» y Total $22.100', !!m && /\$22\.161 · redondeo −\$61/.test(m.t) && /Total: \$22\.100/.test(m.t), m && m.t);
    await ev(cli, `_setCobroDesc('diez')`); await pausa(300);
    m = await msg(cli);
    chk('efectivo con 10%: $19.945 redondea a $19.900', !!m && /redondeo −\$45/.test(m.t) && /Total: \$19\.900/.test(m.t), m && m.t);

    console.log('\n== Un combo: dos pedidos del mismo cliente ==');
    await arrancar(cli);
    const k = await ev(cli, `(function(){var s=getSorted();for(var i=0;i<s.length;i++){var x=s[i];if(x._combo&&x._pedidos[0].c==='Combo Diez'){abrirCobroRuta(x._key);return x._key;}}return null;})()`);
    await pausa(500);
    await ev(cli, `_setCobroFp('Transferencia')`); await pausa(200);
    await ev(cli, `_setCobroDesc('diez')`); await pausa(300);
    c = await copiar(cli);
    chk('combo ' + k + ' con 10%: cada pedido con su descuento y el total de los dos ($54.000)',
      /descuento 10% −\$4\.000/.test(c || '') && /descuento 10% −\$2\.000/.test(c || '') && /Total de los 2: \$54\.000/.test(c || ''), c);

    const errs = await ev(cli, 'window.__errores');
    chk('sin errores en la consola', Array.isArray(errs) && errs.length === 0, errs);
    chk('ningún POST salió (copiar no cobra)', (await ev(cli, 'window.__posts.length')) === 0);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log('REVENTO', e.message); process.exit(2); });
