/* EL BUSCADOR DE ARRIBA: PEDIDOS DE TODAS LAS SEMANAS Y SUS LÍNEAS DE OC (15/10/2026).

     BASE=http://localhost:8171 node _tools/pruebas/probar_buscador_pedidos.js [390|1440]

   Sin token y sin backend: los pedidos y las OC se cargan INVENTADOS en `D`
   (el repo es público: nada de clientes reales). Mira:
   · por cliente, sin acentos ni mayúsculas: todos sus pedidos, el más reciente
     arriba, con el cancelado y el pasado a Red marcados;
   · debajo de cada pedido sus OC con N°, proveedor, producto, cantidad y estado,
     y la pasada a «Tadeo — Stock» con su nota;
   · por proveedor, por N° de OC dictado («oc 2003»), por N° de pedido (estricto:
     «1201» no trae teléfonos con 1201) y por teléfono;
   · tocar una línea (con el MOUSE) abre la ficha de su OC y ← vuelve;
   · sin scroll horizontal y sin errores. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8171';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const P = (o) => Object.assign({ n: '-', h: 'Home', c: '', f: '', mc: '2026-10', hr: '10:00', es: 'Pendiente', ep: 'No Cobrado', fp: 'Transferencia', $: 10000, tel: '', p: [], r: 2 }, o);
const PEDIDOS = [
  P({ n: '1100', c: 'Maria Perez', f: '02/09', mc: '2026-09', es: 'Entregado', ep: 'Cobrado', tel: '11 4444 0000', r: 900 }),
  P({ n: '1201', c: 'María Pérez', f: '10/10', tel: '11 5555 1234', r: 1001 }),
  P({ n: '1202', c: 'Juan Gómez', f: '11/10', tel: '11 2222 1201', r: 1002 }),
  P({ n: '-', h: 'Pilar', c: 'María Pérez', f: '12/10', hr: '13:00', es: 'Cancelado', pas: 'Pasado a Red #130 (Fede Prueba)', r: 50 }),
  P({ n: '130', h: 'Red', c: 'María Pérez (Red: Fede Prueba)', f: '12/10', hr: '15:00', era: 'Pilar #120', r: 131 })
];
const L = (o) => Object.assign({ canal: 'Home', pedido: '', cliente: '', abbr: 'SCo', prod: 'Sorrentinos Calabaza', q: 1, proveedor: 'Le Unike', estado: 'Pedido', dep: '', ap: 0, f: '10/10/2026', fpp: '', fr: '' }, o);
const OC = { lista: [
  L({ oc: 'OC-1500', pedido: '1100', cliente: 'Maria Perez', estado: 'Recibido', fr: '05/09/2026' }),
  L({ oc: 'OC-2001', pedido: '1201', cliente: 'María Pérez', fpp: '11/10/2026' }),
  L({ oc: 'OC-2004', pedido: '1202', cliente: 'Juan Gómez', abbr: 'PMa', prod: 'Pizza Margarita', proveedor: 'Bernardo Pisano', estado: 'Pendiente' }),
  L({ oc: 'OC-1990', canal: 'Pilar', pedido: '120', cliente: 'María Pérez', proveedor: 'Sevuchitas', abbr: 'ECaC', prod: 'Empanadas Carne', estado: 'Cancelado' }),
  L({ oc: 'OC-2002', canal: 'Red', pedido: '130', cliente: 'María Pérez', proveedor: 'Sevuchitas', abbr: 'ECaC', prod: 'Empanadas Carne', q: 2 })],
  stock: [{ oc: 'OC-2003', f: '12/10/2026', eraCanal: 'Red', eraPedido: '130', cliente: 'Tadeo — Stock', abbr: 'SCa', prod: 'Sorrentinos Calabaza y Queso', q: 1,
            proveedor: 'Le Unike', estado: 'Pedido', fpp: '12/10/2026', fr: '', nota: 'Era de Red #130 (María Pérez) · editado 13/10 10:00 · tadeo' }] };

async function buscar(cli, q) {
  await evaluar(cli, `(function(){ var i=document.getElementById('cmdInput'); i.value=${JSON.stringify(q)}; cmdRender(); return 1; })()`);
  await pausa(150);
  return evaluar(cli, `(function(){
    var peds=[].slice.call(document.querySelectorAll('#cmdList .cmd-ped'));
    return { peds: peds.map(function(p){ var h=p.querySelector('.cmd-ped-h'); return { h: h.textContent,
      ocs: [].slice.call(p.querySelectorAll('.cmd-oc')).map(function(o){return o.textContent;}) }; }),
      txt: document.getElementById('cmdList').textContent, ancho: document.documentElement.scrollWidth,
      cmdAncho: document.querySelector('.cmd').getBoundingClientRect().right };
  })()`);
}

(async () => {
  console.log('\n== Buscador de pedidos y OC (' + ANCHO + ' px) ==\n');
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__err=[];window.addEventListener('error',function(e){window.__err.push(String(e.message));});
    (function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||'');if(s.indexOf('script.google.com')>=0||s.indexOf('supabase')>=0)return Promise.resolve(new Response('{"ok":false}',{status:200}));return o.apply(this,arguments);};})();` });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof cmdOpen==='function'")) break; await pausa(250); }
  await pausa(1500);
  await evaluar(cli, `D=D||{}; D.pedidos=${JSON.stringify(PEDIDOS)}; D.oc=${JSON.stringify(OC)}; cmdOpen(); 1`);
  await pausa(300);

  const r1 = await buscar(cli, 'maria perez');
  const hs = r1.peds.map(p => p.h);
  chk('«maria perez» (sin acentos) trae sus 4 pedidos y no el de Juan', r1.peds.length === 4 && !/Juan/.test(r1.txt), hs);
  chk('el más reciente arriba: Red #130 (12/10 15:00), Pilar cancelado (12/10 13:00), #1201 (10/10), #1100 (02/09)',
    /Red #130/.test(hs[0]) && /Pilar/.test(hs[1]) && /#1201/.test(hs[2]) && /#1100/.test(hs[3]), hs);
  chk('el pasado a Red dice «Pasado a Red #130» y el Red dice «Era Pilar #120»', /Pasado a Red #130/.test(hs[1]) && /Era Pilar #120/.test(hs[0]), hs);
  chk('el cancelado sin número muestra sus OC (enganchadas por canal + cliente)', r1.peds[1].ocs.length === 1 && /OC-1990/.test(r1.peds[1].ocs[0]) && /Cancelado/.test(r1.peds[1].ocs[0]), r1.peds[1]);
  const red = r1.peds[0].ocs.join(' | ');
  chk('debajo del Red #130: su OC con N°, producto, cantidad, proveedor y estado', /OC-2002/.test(red) && /Empanadas Carne × 2/.test(red) && /Sevuchitas/.test(red) && /Pedido/.test(red), red);
  chk('y la línea pasada a «Tadeo — Stock» con su nota', /OC-2003/.test(red) && /Pasada a Tadeo — Stock/.test(red) && /Era de Red #130/.test(red), red);
  chk('el viejo trae su OC Recibida', /OC-1500/.test(r1.peds[3].ocs.join()) && /Recibido/.test(r1.peds[3].ocs.join()), r1.peds[3]);

  const r2 = await buscar(cli, 'LE UNIKE');
  chk('por proveedor: «LE UNIKE» trae los pedidos con líneas de Le Unike (1201, 1100 y el Red con la de stock), no el de Juan', r2.peds.length === 3 && !/Juan/.test(r2.txt), r2.peds.map(p => p.h));
  const r3 = await buscar(cli, 'oc 2003');
  chk('por N° de OC dictado: «oc 2003» trae el Red #130', r3.peds.length === 1 && /Red #130/.test(r3.peds[0].h), r3.peds.map(p => p.h));
  const r3b = await buscar(cli, 'OC-2004');
  chk('por N° de OC escrito: «OC-2004» trae el de Juan', r3b.peds.length === 1 && /Juan/.test(r3b.peds[0].h), r3b.peds.map(p => p.h));
  const r4 = await buscar(cli, '1201');
  chk('por N° de pedido, estricto: «1201» trae el #1201 y no el de Juan (que tiene 1201 en el teléfono)', r4.peds.length === 1 && /#1201/.test(r4.peds[0].h), r4.peds.map(p => p.h));
  const r5 = await buscar(cli, '11 5555-1234');
  chk('por teléfono: «11 5555-1234» trae el #1201', r5.peds.length === 1 && /#1201/.test(r5.peds[0].h), r5.peds.map(p => p.h));
  const r6 = await buscar(cli, 'pedido 130');
  chk('«pedido 130» (dictado) trae el Red #130', r6.peds.length === 1 && /Red #130/.test(r6.peds[0].h), r6.peds.map(p => p.h));
  chk('sin scroll horizontal y el buscador entra en la pantalla', r6.ancho <= ANCHO && r6.cmdAncho <= ANCHO, [r6.ancho, r6.cmdAncho]);

  /* Tocar una línea con el MOUSE abre su OC. */
  await buscar(cli, 'maria perez');
  const pos = await evaluar(cli, `(function(){ var o=[].slice.call(document.querySelectorAll('#cmdList .cmd-oc')).filter(function(x){return /OC-2001/.test(x.textContent);})[0];
    if(!o) return null; o.scrollIntoView({block:'center'}); var r=o.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, e=document.elementFromPoint(x,y);
    return {x:x,y:y,mio:o===e||o.contains(e), alto:r.height}; })()`);
  chk('la línea de OC se puede tocar (nada la tapa)' + (ANCHO < 600 ? ' y mide 44 px o más' : ''), !!pos && pos.mio === true && (ANCHO >= 600 || pos.alto >= 44), pos);
  if (pos) for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await pausa(300);
  const ficha = await evaluar(cli, "document.getElementById('cmdList').textContent");
  chk('abre la ficha de la OC-2001: proveedor, producto, para quién y cuándo se pidió', /OC-2001/.test(ficha) && /Le Unike/.test(ficha) && /Sorrentinos Calabaza × 1/.test(ficha) && /Home #1201/.test(ficha) && /11\/10\/2026/.test(ficha) && /Abastecimiento/.test(ficha), ficha.slice(0, 300));
  await evaluar(cli, 'cmdOcVolver(); 1'); await pausa(150);
  const vuelta = await evaluar(cli, "document.querySelectorAll('#cmdList .cmd-ped').length");
  chk('← vuelve a los resultados', vuelta === 4, vuelta);
  const err = await evaluar(cli, 'window.__err.slice(0,5)');
  chk('sin errores', JSON.stringify(err) === '[]', err);
  cli.matar();
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
