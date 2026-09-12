/* El detalle del pedido, listo para pegarle al cliente (12/9/2026).

   node probar_copiar_detalle.js <token> [390|1440]

   Tadeo: "cuando me quieren cambiar, agregar o sacar un producto de un pedido
   ya recibido... lo hacemos desde la tab Pedidos. Lo que podemos hacer es que
   cuando yo edite el pedido de un cliente, tenga la opcion de copiar de vuelta
   el detalle para poder pegarselo al cliente por WhatsApp".

   Los pedidos se INYECTAN en `D` (que es global del panel, no de un IIFE) con
   datos inventados: este repo es publico. No se stubbea `action=admin` porque
   media pantalla del ERP vive de ese objeto y reventaria por un campo que falte;
   lo que se prueba es la ficha, que sale de `D.pedidos` / `D.stock` / `D.caja`.

   Mide:
   · los CUATRO momentos (entregado x cobrado): el saludo, el dia, el alias y el
     cierre;
   · los kilos con coma y el "*hoy*" / "manana" en negrita de WhatsApp;
   · que los precios de linea salgan SOLO si suman el subtotal guardado;
   · que el alias salga solo si falta cobrar, y que no se prometa uno que no se
     puede escribir;
   · que el boton NO exista en Red ni en un pedido cancelado;
   · que lo copiado quede tambien a la vista, y el minimo tactil. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};

const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const mas = n => { const d = new Date(hoyAR); d.setDate(d.getDate() + n); return d; };
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dTxt = d => DIAS[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
const HOY = mas(0), MAN = mas(1), D3 = mas(3);

/* `D.stock` con la forma real: `a` abreviatura, `n` nombre, `u` unidad, `p`
   precio de venta, `d` disponible. De ahi salen el nombre, la unidad Y el
   precio de linea (`_pesInfo` y `_precioCatalogo` leen el mismo array). */
const STOCK = [
  { a: 'PPM', n: 'Pack Muzzarella x2', u: 'u', p: 17000, d: 20, co: 9000 },
  { a: 'ECaC', n: 'Empanadas de Carne', u: 'u', p: 20000, d: 10, co: 11000 },
  { a: 'CCo', n: 'Carne Colita de Cuadril', u: 'kg', p: 25000, d: 8, co: 18800 },
];
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', alias: 'maleump', banco: 'Mercado Pago', def: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', alias: 'maleubru', banco: 'Brubank' },
];

const ped = o => Object.assign({
  h: 'Home', o: 'Deposito', oDet: '', es: 'Pendiente', ep: 'No Cobrado',
  fp: 'Transferencia', bp: 'La Pionera', lo: '72', br: 'Estancias del Pilar',
  tel: '1141440000', hr: '12:30', desc: 0, env: 0, co: 0, mg: 0,
}, o);

/* Dos packs y una carne: 2*17000 + 1,221*25000 = 64.525 */
const PROD = [{ a: 'PPM', q: 2 }, { a: 'CCo', q: 1.221 }];
const PEDIDOS = [
  // 1 · pendiente y sin cobrar, con descuento
  ped({ n: '9001', r: 9001, c: 'Prueba Vicky Fernandez', dee: iso(MAN), p: PROD, subt: 64525, desc: 6452, $: 58073 }),
  // 2 · entregado y sin cobrar
  ped({ n: '9002', r: 9002, c: 'Prueba Entregado', dee: iso(HOY), es: 'Entregado', p: PROD, subt: 64525, $: 64525 }),
  // 3 · entregado y cobrado
  ped({ n: '9003', r: 9003, c: 'Prueba Cobrado', dee: iso(HOY), es: 'Entregado', ep: 'Cobrado', p: PROD, subt: 64525, $: 64525 }),
  // 4 · pendiente y ya pagado, para HOY
  ped({ n: '9004', r: 9004, c: 'Prueba Pago Hoy', dee: iso(HOY), ep: 'Cobrado', p: PROD, subt: 64525, $: 64525 }),
  // 5 · el subtotal guardado NO cierra con la lista de precios de hoy
  ped({ n: '9005', r: 9005, c: 'Prueba Precio Viejo', dee: iso(D3), p: PROD, subt: 50000, $: 50000 }),
  // 6 · Red: el telefono es el cliente final del vendedor
  ped({ n: '9006', r: 9006, h: 'Red', c: 'Prueba Cliente Final', dee: iso(MAN), p: PROD, subt: 64525, $: 53556 }),
  // 7 · cancelado
  ped({ n: '9007', r: 9007, c: 'Prueba Cancelada', dee: iso(MAN), es: 'Cancelado', p: PROD, subt: 64525, $: 64525 }),
  // 8 · con envio, para un dia lejano
  ped({ n: '9008', r: 9008, h: 'Pilar', c: 'Prueba Envio', dee: iso(D3), p: PROD, subt: 64525, env: 5000, $: 69525 }),
];

const EXTRA = `
  window.__posts=[]; window.__errores=[]; window.__copiado=null;
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    if(x && String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    return o.apply(this,arguments);};})();
  /* El portapapeles de headless no siempre esta disponible: se intercepta para
     poder medir QUE se copio, no solo que no reviente. */
  try{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:function(t){ window.__copiado=t; return Promise.resolve(); }}});
  }catch(e){}
`;

/* Inyecta los pedidos en D. `D` es global del panel (no vive en un IIFE), asi
   que se puede sembrar desde afuera -- al contrario de las globales de una
   sub-app, que desde aca son una copia. */
const SEMBRAR = `(function(){
  if(typeof D==='undefined'||!D) window.D={};
  D.pedidos=${JSON.stringify(PEDIDOS)};
  D.stock=${JSON.stringify(STOCK)};
  D.caja=Object.assign({},D.caja||{},{cuentas:${JSON.stringify(CUENTAS)}});
  return {peds:D.pedidos.length, stock:D.stock.length, ctas:D.caja.cuentas.length};
})()`;

const copiar = async (cli, n, hoja) => {
  await evaluar(cli, `openOrdDetail(${JSON.stringify(hoja || 'Home')},${JSON.stringify(n)})`);
  await pausa(250);
  const hay = await evaluar(cli, `!!document.querySelector('.ord-actions button[onclick*="_ordCopiarDetalle"]')`);
  if (!hay) return { hay: false, txt: '' };
  await evaluar(cli, 'window.__copiado=null;document.querySelector(\'.ord-actions button[onclick*="_ordCopiarDetalle"]\').click()');
  await pausa(250);
  const r = await evaluar(cli, `({txt:window.__copiado||'', vista:(document.getElementById('ordMsg')||{}).textContent||'',
     on:!!(document.getElementById('ordMsg')||{}).classList&&document.getElementById('ordMsg').classList.contains('on'),
     alto:Math.round((document.querySelector('.ord-actions button[onclick*="_ordCopiarDetalle"]')||{getBoundingClientRect:function(){return{height:0}}}).getBoundingClientRect().height),
     doc:document.documentElement.scrollWidth, win:window.innerWidth})`);
  return Object.assign({ hay: true }, r);
};

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== El detalle del pedido para el cliente · ' + ANCHO + 'px ===');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, 'typeof window.openOrdDetail==="function"')) { console.log('el ERP no arranco'); process.exit(1); }
  const sem = await evaluar(cli, SEMBRAR);
  if (!sem || sem.peds !== PEDIDOS.length) { console.log('no pude sembrar los pedidos: ' + JSON.stringify(sem)); process.exit(1); }
  console.log('  sembrados: ' + sem.peds + ' pedidos · ' + sem.stock + ' productos · ' + sem.ctas + ' cuentas');

  // ── 1 · pendiente, sin cobrar, con descuento ──
  let r = await copiar(cli, '9001');
  if (!r.hay) { console.log('  el boton no aparecio en el caso 1: nada mas que medir'); process.exit(1); }
  chk('sin haber editado nada, PASA el detalle (no dice que lo actualizo)',
    /^¡Hola Prueba! Te paso el detalle de tu pedido/.test(r.txt), r.txt.split('\n')[0]);
  chk('  lista los productos con su nombre largo', /2× Pack Muzzarella x2/.test(r.txt), r.txt);
  chk('  la carne va en KILOS con coma y el nombre PRIMERO, no "1.221×"',
    /• Carne Colita de Cuadril — 1,221 kg/.test(r.txt), r.txt);
  chk('  los precios de linea salen (suman el subtotal guardado)',
    /Pack Muzzarella x2 — \$34\.000/.test(r.txt)
    && /Carne Colita de Cuadril — 1,221 kg · \$30\.525/.test(r.txt), r.txt);
  chk('  dice cuando se lo lleva, con el dia de la entrega', r.txt.indexOf('mañana, ' + dTxt(MAN)) > -1, r.txt);
  chk('  y la direccion', /📍 La Pionera · Lote 72/.test(r.txt), r.txt);
  chk('  el total es el del pedido, con la forma de pago', /💳 Total: \$58\.073 \(Transferencia\)/.test(r.txt), r.txt);
  chk('  y el desglose explica el descuento', /Subtotal \$64\.525/.test(r.txt) && /descuento −\$6\.452/.test(r.txt), r.txt);
  chk('  manda los DOS alias (falta cobrar y es transferencia)',
    /Para abonar: maleump \(Mercado Pago\) o maleubru \(Brubank\)/.test(r.txt), r.txt);
  chk('  cierra ofreciendo corregir', /Si algo no coincide, decime y lo corrijo\./.test(r.txt), r.txt);
  chk('lo copiado queda TAMBIEN a la vista (si el navegador no deja copiar)',
    r.on && r.vista === r.txt && r.txt.length > 50, { on: r.on, largo: r.vista.length });
  /* 38 es el piso del celular en este ERP, y `.ord-btn` declara 42 para TODA la
     botonera de la ficha: pedir 44 solo para este lo dejaria desparejo. */
  chk('el boton llega al minimo tactil (42, el de la botonera)', r.alto >= 38, r.alto);
  chk('no desborda a lo ancho', r.doc <= r.win + 1, { doc: r.doc, win: r.win });

  /* Y con el pedido recien editado: el boton tambien sirve para contestarle
     "¿que me habias anotado?", asi que "te actualizo" solo vale si cambio algo. */
  await evaluar(cli, 'window._ordEditados["Home|9001"]=Date.now()');
  r = await copiar(cli, '9001');
  chk('recién editado: ahora SÍ dice que actualiza el pedido',
    /^¡Hola Prueba! Te actualizo el pedido/.test(r.txt), r.txt.split('\n')[0]);

  // ── 2 · entregado y sin cobrar ──
  r = await copiar(cli, '9002');
  chk('entregado sin cobrar: habla de lo que SE LLEVO', /detalle de lo que te llevaste/.test(r.txt), r.txt.split('\n')[0]);
  chk('  NO dice "te lo llevo" (ya lo tiene)', !/Te lo llevo/.test(r.txt), r.txt);
  chk('  pide la transferencia y manda el alias', /Para abonar: maleump/.test(r.txt) && /Cuando puedas me transferís/.test(r.txt), r.txt);
  chk('  sin desglose: no hay descuento ni envio que explicar', !/Subtotal/.test(r.txt), r.txt);

  // ── 3 · entregado y cobrado ──
  r = await copiar(cli, '9003');
  chk('entregado y cobrado: agradece la compra', /detalle de tu compra/.test(r.txt), r.txt.split('\n')[0]);
  chk('  NO manda el alias a quien ya pago', !/maleump/.test(r.txt) && !/Para abonar/.test(r.txt), r.txt);
  chk('  y lo dice: "ya está todo pago"', /Ya está todo pago/.test(r.txt), r.txt);

  // ── 4 · pendiente, pagado, entrega HOY ──
  r = await copiar(cli, '9004');
  chk('entrega de HOY: el dia va en negrita de WhatsApp', r.txt.indexOf('*hoy*, ' + dTxt(HOY)) > -1, r.txt);
  chk('  pagado y sin entregar: no manda alias y lo dice', !/Para abonar/.test(r.txt) && /Ya está pago/.test(r.txt), r.txt);

  // ── 5 · el subtotal no cierra con los precios de hoy ──
  r = await copiar(cli, '9005');
  chk('si las lineas no suman el subtotal guardado, NO se muestran precios por linea',
    /• 2× Pack Muzzarella x2$/m.test(r.txt) && !/Pack Muzzarella x2 —/.test(r.txt)
    && /• Carne Colita de Cuadril — 1,221 kg$/m.test(r.txt), r.txt);
  chk('  pero el total sigue siendo el real del pedido', /💳 Total: \$50\.000/.test(r.txt), r.txt);

  // ── 8 · con envio ──
  r = await copiar(cli, '9008', 'Pilar');
  chk('el envio se explica en el desglose', /envío \$5\.000/.test(r.txt), r.txt);
  chk('  y un dia lejano va como "el <dia>"', r.txt.indexOf('Te lo llevo el ' + dTxt(D3)) > -1, r.txt);

  // ── 6 y 7 · donde el boton NO va ──
  let n = await copiar(cli, '9006', 'Red');
  chk('en Red NO hay boton: el telefono es el cliente final del vendedor', n.hay === false, n);
  n = await copiar(cli, '9007');
  chk('en un pedido CANCELADO tampoco', n.hay === false, n);

  // ── sin alias cargado ──
  await evaluar(cli, 'D.caja.cuentas=[{id:"efectivo",nombre:"Efectivo",tipo:"efectivo"}]');
  r = await copiar(cli, '9001');
  chk('sin alias en la hoja Cuentas, no promete un alias que no puede escribir',
    !/Para abonar/.test(r.txt) && /Si algo no coincide/.test(r.txt), r.txt);

  const err = await evaluar(cli, 'window.__errores||[]');
  chk('sin errores de consola', err.length === 0, err);
  const posts = await evaluar(cli, 'window.__posts.length');
  chk('ni un POST: copiar no escribe nada', posts === 0, posts);

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal');
  await cli.cerrar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
