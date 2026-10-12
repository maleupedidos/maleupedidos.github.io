/**
 * El diferido en la pantalla (12/10/2026): la carga, un pase y un conteo que el
 * backend confirma apenas la base guardó, con la planilla atrasada unos segundos.
 *
 *   node probar_diferido.js [390|1440] [puerto]
 *
 * Sin token y SIN tocar producción: todo pedido al backend se intercepta y lo
 * contesta un backend inventado con la forma del de verdad (las decisiones se
 * prueban en `estancias/_tools/probar_diferido.js`). Acá se prueba la PANTALLA:
 *
 *   · si el backend publicado no conoce el diferido, NO se manda `diferidos` ni
 *     `difAplicar` (una acción desconocida cae en el alta de pedidos);
 *   · al Guardar: «guardada, acomodando», y el aplicador sale por atrás, UNO;
 *   · mientras se acomoda, el cartel se ve en CUALQUIER pantalla, y STOCK,
 *     CONTAR y MOVER dicen «acomodando…» en vez del número viejo;
 *   · cuando termina, el cartel se va y la grilla se pide de nuevo;
 *   · si queda A MEDIAS: el cartel dice el producto y qué hacer, en la pantalla
 *     donde esté; «Ir a contar» lleva a CONTAR y «Ya lo revisé» lo cierra;
 *   · más de 5 minutos: lo dice;
 *   · un pase que vuelve diferido dispara el aplicador y muestra los números;
 *   · el cartel entra en la ventana y los botones llegan al piso táctil.
 *
 *   FOTO=carpeta guarda capturas.
 */
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')('prueba-sin-backend');

const ANCHO = Number(process.argv[2] || 390);
const PUERTO = Number(process.argv[3] || 8080);
const PISO = 44;
let ok = 0, mal = 0;
const chk = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (x !== undefined ? '\n         -> ' + JSON.stringify(x).slice(0, 700) : '')); } };
const espera = ms => new Promise(r => setTimeout(r, ms));

const p = (a, n, u, us, mo, dep, cli) => ({ a, n, u, ini: { ustariz: us, moresco: mo }, ped: { dep: dep || 0, cli: cli || 0, de: [] }, ap: {}, apDe: [] });
const grilla = rapido => { const g = { ok: true, ts: 1, apartado: 'si', guardar: true,
  deps: [{ id: 'ustariz', nombre: 'Depósito Ustariz', user: 'tadeo' }, { id: 'moresco', nombre: 'Depósito Moresco', user: 'lucas' }],
  proveedores: [{ nombre: 'Sevuchitas', productos: [p('PPM', 'Pack Pizzas x2 Muzzarella', 'u', 5, 3, 6, 0), p('EV', 'Empanadas Verdura x8', 'u', 4, 4)] }] };
  if (rapido !== undefined) g.rapido = rapido; return g; };
const DEPOSITOS = { deps: [{ id: 'ustariz', nombre: 'Deposito Ustariz', dueno: 'Tadeo', col: 18 }, { id: 'moresco', nombre: 'Deposito Moresco', dueno: 'Lucas', col: 19 }],
  productos: [{ a: 'PPM', n: 'Pack Pizzas x2 Muzzarella', u: 'u', f: 8, dep: 'ustariz', porDep: { ustariz: 5, moresco: 3 }, pz: 0, pzDep: { ustariz: 0, moresco: 0 } },
    { a: 'EV', n: 'Empanadas Verdura x8', u: 'u', f: 8, dep: 'ustariz', porDep: { ustariz: 4, moresco: 4 }, pz: 0, pzDep: { ustariz: 0, moresco: 0 } }] };

/* El backend inventado. `__modo`: cuelga (no aplica) · ok (aplica) · medias (queda a medias). */
const backend = rapido => `
  window.__posts = []; window.__gets = []; window.__DIF = []; window.__modo = 'cuelga';
  window.__GRILLA = ${JSON.stringify(grilla(rapido))}; window.__DEPS = ${JSON.stringify(DEPOSITOS)};
  function __resp(o){ return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
  function __post(b){
    if (b.action === 'cargaGuardar') {
      if (b.previa) return { ok: true, previa: true, prendido: true, avisos: [], preguntas: [], deMas: [],
        lineas: (b.filas || []).map(function (f) { return { product_sku: f.a, received_quantity: f.recibido }; }),
        recibir: [{ a: 'PPM', llego: 6, pedido: 6, ocs: ['OC-1'] }], movimientos: [{ product_sku: 'PPM', kind: 'recepcion', quantity: 6, to_warehouse: 'ustariz' }] };
      if (${rapido === true}) { window.__DIF.push({ id: 'CM-1', tipo: 'carga', titulo: 'la carga de Sevuchitas', skus: ['PPM'], desde: Date.now(), estado: 'acomodando' });
        return { ok: true, carga: 'CM-1', diferida: true, avisos: [] }; }
      return { ok: true, carga: 'CM-1', avisos: [], movimientos: [] };
    }
    if (b.action === 'difAplicar') {
      if (window.__modo === 'ok') window.__DIF = window.__DIF.filter(function (x) { return x.estado !== 'acomodando'; });
      if (window.__modo === 'medias') window.__DIF.forEach(function (x) { if (x.estado === 'acomodando') { x.estado = 'a_medias';
        x.errores = ['Pack Pizzas x2 Muzzarella: el stock no quedo como se esperaba despues de recibir (ajuste de -1, y habias visto 0). No se toco: contalo.']; } });
      return { ok: true, hechas: 1, quedan: 0 };
    }
    if (b.action === 'difCerrar') { window.__DIF = window.__DIF.filter(function (x) { return x.id !== b.id; }); return { ok: true }; }
    if (b.action === 'stockTraspaso') { window.__DIF.push({ id: 'MV-1', tipo: 'carga', titulo: 'el pase de Empanadas Verdura x8', skus: ['EV'], desde: Date.now(), estado: 'acomodando' });
      return { ok: true, abbr: 'EV', desde: b.desde, hacia: b.hacia, cant: b.cantidad, antesDesde: 4, ahoraDesde: 4 - b.cantidad, antesHacia: 4, ahoraHacia: 4 + b.cantidad, total: 8, diferida: true, carga: 'MV-1' }; }
    return { ok: false, error: 'prueba' };
  }
  (function () { var o = window.fetch; window.fetch = function (u, x) {
    var url = String(u || '');
    if (!/script\\.google(usercontent)?\\.com/.test(url)) {
      if (/^https?:/.test(url) && url.indexOf(location.origin) !== 0) return __resp({ ok: false });
      return o.apply(this, arguments);
    }
    if (x && String(x.method || '').toUpperCase() === 'POST') {
      var b = null; try { b = JSON.parse(x.body); } catch (e) { b = { crudo: String(x.body) }; }
      window.__posts.push(b); return __resp(__post(b));
    }
    var a = (url.match(/action=([A-Za-z]+)/) || [])[1] || '?';
    window.__gets.push(a);
    if (a === 'cargaGrilla') return __resp(window.__GRILLA);
    if (a === 'depositos') return __resp(window.__DEPS);
    if (a === 'diferidos') return __resp({ ok: true, ahora: Date.now(), avisoMs: 300000, items: JSON.parse(JSON.stringify(window.__DIF)) });
    return __resp({ ok: false, error: 'prueba' });
  }; })();
`;
const tipear = (sel, txt) => `(function(){ var e=document.querySelector(${JSON.stringify(sel)}); if(!e)return 'no esta'; e.focus(); e.value=${JSON.stringify(txt)}; e.dispatchEvent(new Event('input',{bubbles:true})); e.blur(); return 'ok'; })()`;
const campo = (a, i) => `#stgR_${a} label:nth-of-type(${i}) input`;
const hasta = (cond, ms) => `(async () => { var t0=Date.now(); while (Date.now()-t0<${ms || 6000}) { try { if (${cond}) return true; } catch(e){} await new Promise(r=>setTimeout(r,100)); } return false; })()`;
const barra = `(function(){ var c=document.getElementById('difBar'); if(!c||getComputedStyle(c).display==='none')return JSON.stringify({ver:false,txt:''});
  var b=c.getBoundingClientRect(); var chicos=[]; [].forEach.call(c.querySelectorAll('button'), function(e){ var r=e.getBoundingClientRect(); if(r.height<${PISO}-0.5||r.width<${PISO}-0.5)chicos.push(e.textContent+' '+Math.round(r.width)+'x'+Math.round(r.height)); });
  var tapa=document.elementFromPoint(Math.round(b.left+b.width/2), Math.round(b.top+b.height/2));
  return JSON.stringify({ver:b.width>0&&b.height>0, txt:c.innerText, izq:Math.round(b.left), der:Math.round(b.right), arriba:Math.round(b.top), abajo:Math.round(b.bottom), ancho:window.innerWidth, alto:window.innerHeight,
    encima: !!(tapa&&c.contains(tapa)), chicos:chicos, botones:[].map.call(c.querySelectorAll('button'),function(e){return e.textContent;}), scrollX: document.documentElement.scrollWidth-window.innerWidth }); })()`;

async function pagina(url, rapido) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + backend(rapido) });
  await cli.enviar('Page.navigate', { url });
  await espera(2500);
  const listo = await evaluar(cli, hasta(`typeof window.go==='function' && typeof window.stSwitchTab==='function' && typeof window.difPedir==='function'`, 40000));
  if (listo !== true) { console.log('  MAL  el ERP no arrancó (o no tiene el diferido)'); process.exit(1); }
  return cli;
}
async function foto(cli, nombre) {
  if (!process.env.FOTO) return;
  const f = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  const d = (f && f.data) || (f && f.result && f.result.data);
  if (d) fs.writeFileSync(path.join(process.env.FOTO, nombre + '-' + ANCHO + '.png'), Buffer.from(d, 'base64'));
}
const cargar = async cli => {
  await evaluar(cli, `(async () => { go('stock'); stSwitchTab('carga'); })()`);
  await evaluar(cli, hasta(`document.querySelector('#stCarga .stg-row')`, 8000));
  await evaluar(cli, tipear(campo('PPM', 1), '6')); await evaluar(cli, tipear(campo('PPM', 2), '8')); await evaluar(cli, tipear(campo('PPM', 3), '6'));
  await evaluar(cli, `stgRevisar()`);
  await evaluar(cli, hasta(`document.querySelector('#stgRev .stg-btn')`, 5000));
  await evaluar(cli, `stgGuardar()`);
  await evaluar(cli, hasta(`/Carga guardada/.test(document.getElementById('stgRev').textContent)`, 5000));
};
const posts = a => `JSON.stringify(window.__posts.filter(function(b){return b&&b.action==='${a}';}))`;

(async () => {
  console.log('\n== El diferido en la pantalla · ' + ANCHO + 'px ==\n');
  const base = 'http://localhost:' + PUERTO + '/app.html?carga=1';

  /* 1. Un backend que NO conoce el diferido: no se le manda nada nuevo. */
  let cli = await pagina(base, undefined);
  await cargar(cli); await espera(800);
  let r = JSON.parse(await evaluar(cli, `JSON.stringify({ gets: window.__gets, dif: JSON.parse(${posts('difAplicar')}).length, rev: document.getElementById('stgRev').textContent, barra: JSON.parse(${barra}) })`));
  chk(r.gets.indexOf('diferidos') < 0 && r.dif === 0, 'backend sin diferido: ni `diferidos` ni `difAplicar`', r);
  chk(/Carga guardada/.test(r.rev) && !/acomodando/i.test(r.rev) && !r.barra.ver, 'y la carga se muestra como siempre', r.rev);
  try { cli.cerrar && cli.cerrar(); } catch (e) {}

  /* 2. Rápido, y el aplicador no termina: lo que se ve mientras tanto. */
  cli = await pagina(base, true);
  await cargar(cli); await espera(600);
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ rev: document.getElementById('stgRev').textContent, dif: JSON.parse(${posts('difAplicar')}), barra: JSON.parse(${barra}),
    grillas: window.__gets.filter(function(a){return a==='cargaGrilla';}).length })`));
  chk(/Carga guardada/.test(r.rev) && /se est. acomodando/.test(r.rev) && /seguir con otro proveedor/.test(r.rev), 'al Guardar: «guardada» y «el stock se está acomodando»', r.rev);
  chk(r.dif.length === 1 && r.dif[0].todo === true, 'el aplicador salió por atrás, una vez, pidiendo todo', r.dif);
  chk(!r.barra.ver, 'en CARGA el recuadro ya lo dice: el cartelito no se le pone encima', r.barra);
  const grillas0 = r.grillas;
  await foto(cli, 'acomodando-carga');

  r = JSON.parse(await evaluar(cli, `(async () => { go('pedidos'); await new Promise(r=>setTimeout(r,500)); return ${barra}; })()`));
  chk(r.ver && /Acomodando la carga de Sevuchitas/.test(r.txt), 'en otra pantalla (Pedidos) el cartel «Acomodando la carga de Sevuchitas…» está a la vista', r);
  chk(r.izq >= 0 && r.der <= r.ancho && r.abajo <= r.alto && r.scrollX <= 1, 'y entra en la ventana', r);

  /* STOCK: la fila no muestra callado el número viejo. */
  r = JSON.parse(await evaluar(cli, `(async () => { go('stock'); stSwitchTab('productos');
    D.stock=[{a:'PPM',n:'Pack Pizzas x2 Muzzarella',u:'u',i:8,c:0,v:0,f:8,r:0,d:8,pd:{ustariz:5,moresco:3}},{a:'EV',n:'Empanadas Verdura x8',u:'u',i:8,c:0,v:0,f:8,r:0,d:8,pd:{ustariz:4,moresco:4}}];
    rStock(); await new Promise(r=>setTimeout(r,300));
    var filas=[].map.call(document.querySelectorAll('#p-stock .si'), function(e){ return e.innerText.replace(/\\s+/g,' ')+' #'+e.querySelectorAll('.st-difv').length; });
    var nota=document.querySelector('#p-stock .st-dif');
    return JSON.stringify({ filas: filas, nota: nota?nota.innerText:'', notas: document.querySelectorAll('#p-stock .st-dif').length }); })()`));
  const fPPM = r.filas.filter(x => /Muzzarella/.test(x))[0] || '', fEV = r.filas.filter(x => /Verdura/.test(x))[0] || '';
  chk(r.filas.length === 2, 'STOCK pintó las dos filas', r.filas);
  chk(Number(fPPM.split('#')[1]) >= 2 && !/ 5 /.test(' ' + fPPM + ' ') && !/ 3 /.test(' ' + fPPM + ' '), 'PPM tapa el físico, los freezers y el disponible (' + fPPM.split('#')[1] + ' celdas)', fPPM);
  chk(r.notas === 1 && /Acomodando la carga de Sevuchitas/.test(r.nota), 'y dice «Acomodando la carga de Sevuchitas»', r.nota);
  chk(Number(fEV.split('#')[1]) === 0 && / 8 /.test(' ' + fEV + ' '), 'EV, que no está en esa carga, muestra sus números', fEV);
  await foto(cli, 'acomodando-stock');

  /* CONTAR y MOVER: la fila está tomada. */
  r = JSON.parse(await evaluar(cli, `(async () => { stSwitchTab('contar'); var t0=Date.now(); while(Date.now()-t0<6000&&!document.getElementById('stcR_PPM'))await new Promise(r=>setTimeout(r,100));
    var f=document.getElementById('stcR_PPM'), e=document.getElementById('stcR_EV');
    var o={ ppm: f?f.innerText.replace(/\\s+/g,' '):'', ppmIn: f?f.querySelector('input').disabled:null, ppmBt: f?f.querySelector('button').disabled:null, evIn: e?e.querySelector('input').disabled:null };
    stSwitchTab('mover'); t0=Date.now(); while(Date.now()-t0<6000&&!document.getElementById('stmR_PPM'))await new Promise(r=>setTimeout(r,100));
    var m=document.getElementById('stmR_PPM'), me=document.getElementById('stmR_EV');
    o.mov=m?m.innerText.replace(/\\s+/g,' '):''; o.movBt=m?m.querySelector('button').disabled:null; o.movEvBt=me?me.querySelector('button').disabled:null;
    return JSON.stringify(o); })()`));
  chk(/acomodando la carga de Sevuchitas/i.test(r.ppm) && r.ppmIn === true && r.ppmBt === true, 'CONTAR: PPM dice «acomodando» y no se puede tocar', r);
  chk(r.evIn === false, 'CONTAR: EV sí', r);
  chk(/acomodando la carga de Sevuchitas/i.test(r.mov) && r.movBt === true && r.movEvBt === false, 'MOVER: PPM tomado, EV libre', r);

  /* 3. Termina bien: el cartel se va y la grilla se pide de nuevo. */
  r = JSON.parse(await evaluar(cli, `(async () => { window.__modo='ok'; window.__DIF=[]; stSwitchTab('carga'); await difPedir(); await new Promise(r=>setTimeout(r,900));
    return JSON.stringify({ barra: JSON.parse(${barra}), rev: document.getElementById('stgRev').textContent, grillas: window.__gets.filter(function(a){return a==='cargaGrilla';}).length, tomado: !!difSku('PPM') }); })()`));
  chk(!r.barra.ver && r.tomado === false, 'cuando termina, el cartel se va y PPM queda libre', r.barra);
  chk(r.grillas > grillas0, 'la grilla se pide de nuevo (los números nuevos)', [grillas0, r.grillas]);
  chk(/ya qued. acomodado/.test(r.rev), 'y la carga dice «el stock ya quedó acomodado»', r.rev);
  try { cli.cerrar && cli.cerrar(); } catch (e) {}

  /* 4. Queda a medias: avisa donde esté la persona. */
  cli = await pagina(base, true);
  await evaluar(cli, `window.__modo='medias'`);
  await cargar(cli);
  await evaluar(cli, hasta(`/Qued. a medias/.test((document.getElementById('difBar')||{}).innerText||'')`, 8000));
  r = JSON.parse(await evaluar(cli, `(async () => { go('pedidos'); await new Promise(r=>setTimeout(r,500)); return ${barra}; })()`));
  chk(r.ver && /Qued. a medias: la carga de Sevuchitas/.test(r.txt), 'en Pedidos aparece «Quedó a medias: la carga de Sevuchitas»', r);
  chk(/Pack Pizzas x2 Muzzarella/.test(r.txt) && /contalo/.test(r.txt) && /CONTAR/.test(r.txt) && /No cargues de nuevo/.test(r.txt), 'dice qué producto y qué hacer', r.txt);
  chk(r.botones.join('|') === 'Ir a contar|Ya lo revisé' && r.chicos.length === 0, 'dos botones, de ' + PISO + ' px o más', [r.botones, r.chicos]);
  chk(r.izq >= 0 && r.der <= r.ancho && r.arriba >= 0 && r.abajo <= r.alto && r.scrollX <= 1 && r.encima, 'el cartel entra en la ventana y nada lo tapa', r);
  await foto(cli, 'a-medias');
  r = JSON.parse(await evaluar(cli, `(async () => { document.querySelector('#difBar .dif-btn').click(); await new Promise(r=>setTimeout(r,600));
    return JSON.stringify({ tab: ST_TAB, pag: cur==='stock', libre: !difSku('PPM') }); })()`));
  chk(r.tab === 'contar' && r.pag === true, '«Ir a contar» lleva a Productos › CONTAR', r);
  chk(r.libre === true, 'y el producto a medias se puede contar (no está tomado)', r);
  r = JSON.parse(await evaluar(cli, `(async () => { document.querySelector('#difBar .dif-btn2').click(); await new Promise(r=>setTimeout(r,700));
    return JSON.stringify({ cerrar: JSON.parse(${posts('difCerrar')}), barra: JSON.parse(${barra}) }); })()`));
  chk(r.cerrar.length === 1 && r.cerrar[0].id === 'CM-1' && !r.barra.ver, '«Ya lo revisé» lo cierra en el backend y el cartel se va', r);

  /* 5. Más de 5 minutos sin acomodarse. */
  r = JSON.parse(await evaluar(cli, `(async () => { window.__modo='cuelga'; window.__DIF=[{id:'CM-9',tipo:'carga',titulo:'la carga de Le Unike',skus:['SL'],desde:Date.now()-6*60000,estado:'acomodando',tarde:true}];
    await difPedir(); await new Promise(r=>setTimeout(r,400)); return ${barra}; })()`));
  chk(r.ver && /La carga de Le Unike lleva m.s de 5 minutos sin acomodarse/.test(r.txt) && /no se pueden cargar, contar ni mover/.test(r.txt), 'pasados 5 minutos lo dice, con qué implica', r.txt);
  await foto(cli, 'tarde');
  try { cli.cerrar && cli.cerrar(); } catch (e) {}

  /* 6. Un pase que vuelve diferido. */
  cli = await pagina(base, true);
  r = JSON.parse(await evaluar(cli, `(async () => { go('stock'); stSwitchTab('mover'); var t0=Date.now(); while(Date.now()-t0<6000&&!document.getElementById('stmIn_EV'))await new Promise(r=>setTimeout(r,100));
    var i=document.getElementById('stmIn_EV'); i.value='3'; stMoverEnviar('EV'); await new Promise(r=>setTimeout(r,900));
    var f=document.getElementById('stmR_EV');
    return JSON.stringify({ tras: JSON.parse(${posts('stockTraspaso')}), dif: JSON.parse(${posts('difAplicar')}), fila: f?f.innerText.replace(/\\s+/g,' '):'', barra: JSON.parse(${barra}), errs: window.__err }); })()`));
  chk(r.tras.length === 1 && r.tras[0].cantidad === 3, 'el pase viaja una vez', r.tras);
  chk(r.dif.length === 1 && r.dif[0].todo === true, 'y dispara el aplicador', r.dif);
  chk(/acomodando el pase de Empanadas Verdura/i.test(r.fila) && /Acomodando el pase de Empanadas Verdura/.test(r.barra.txt), 'la fila y el cartel dicen «acomodando el pase»', [r.fila, r.barra.txt]);
  r = JSON.parse(await evaluar(cli, `(async () => { window.__modo='ok'; window.__DIF=[]; window.__DEPS.productos[1].porDep={ustariz:1,moresco:7};
    await difPedir(); var t0=Date.now(); while(Date.now()-t0<5000&&!/1 en/.test((document.getElementById('stmR_EV')||{}).innerText||''))await new Promise(r=>setTimeout(r,100));
    return JSON.stringify({ fila: document.getElementById('stmR_EV').innerText.replace(/\\s+/g,' '), barra: JSON.parse(${barra}), errs: window.__err }); })()`));
  chk(/1 en/.test(r.fila) && /7 en/.test(r.fila) && !r.barra.ver, 'cuando termina, la fila muestra 1 y 7 y el cartel se va', r);
  /* «prueba» = un endpoint que este backend inventado no contesta: no es de la pantalla. */
  const errs = (r.errs || []).filter(e => !/Error: prueba/.test(e));
  chk(errs.length === 0, 'sin errores de página', errs);
  try { cli.cerrar && cli.cerrar(); } catch (e) {}

  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log('  MAL  la prueba reventó: ' + (e && e.stack || e)); process.exit(1); });
