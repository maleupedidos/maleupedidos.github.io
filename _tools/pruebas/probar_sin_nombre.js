/* CRM › Identidades con casos «sin_nombre» armados a mano (781), sin backend: se ve, se toca y manda lo que tiene que mandar.
   [BASE_URL=http://localhost:8080] node _tools/pruebas/probar_sin_nombre.js <ancho> <carpeta> */
'use strict';
const fs = require('fs');
const P = __dirname + '/';
const { abrir, evaluar } = require(P + 'cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390), OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });   // la carpeta de salida puede no existir
const URL = (process.env.BASE_URL || 'http://localhost:8080') + '/app.html?prueba=1';
const CASOS = [
  { id: 901, tipo: 'sin_nombre', clase: 'apellido_primero', tipeado: 'Figueroa Delfina', real: 'Delfina Figueroa', opciones: ['Delfina Figueroa', 'Figueroa Delfina'], pedidos: [{ k: 'Home|2301', h: 'Home', n: '2301', fecha: '18/09/2026', dir: 'Los Lagos · Lote 12' }, { k: 'Home|2200', h: 'Home', n: '2200', fecha: '02/09/2026' }] },
  { id: 902, tipo: 'sin_nombre', clase: 'un_nombre', tipeado: 'Mariano', real: '', opciones: [], pedidos: [{ k: 'Home|2100', h: 'Home', n: '2100', fecha: '30/09/2026' }] },
  { id: 903, tipo: 'sin_nombre', clase: 'dos_nombres', tipeado: 'Vero Arancedo · Veronica arancedo', real: 'Vero Arancedo', opciones: ['Vero Arancedo', 'Veronica Arancedo'], pedidos: [{ k: 'Pilar|2001', h: 'Pilar', n: '2001', fecha: '01/10/2026' }] },
  { id: 904, tipo: 'nombre', clase: 'apellido', tipeado: 'Ana Chiesa', ficha: 'Tadeo Chiesa', real: 'Tadeo Chiesa', sug: '', pedidos: [{ k: 'Home|1900', h: 'Home', n: '1900', fecha: '01/08/2026' }] },
];
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  if (ANCHO < 700) await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(9000);
  const res = {};
  res.armar = await evaluar(cli, `(function(){try{ window._reentradaChequear=function(){return false}; var rv=document.getElementById('reentrada'); if(rv)rv.remove();
    window.__rpc=[]; window._baseRpc=function(n,a){ window.__rpc.push(n+' '+JSON.stringify(a)); return Promise.resolve(n==='identidad_resolver'?{ok:true,nombre:a.p.nombre,pedidos:2}:{ok:true,casos:_IDENT.casos,direccion:{}}); };
    _identT=Date.now(); _IDENT={ok:true,casos:${JSON.stringify(CASOS)},direccion:{}};
    try{go('estancias')}catch(e){} try{estSwitch('identidades')}catch(e){}
    identRepintar(); return 'ok';}catch(e){return String(e)}})()`);
  await T(1500);
  res.tarjetas = await evaluar(cli, `Array.from(document.querySelectorAll('.ident-p')).map(function(x){return x.innerText.replace(/\\s+/g,' ').slice(0,140)})`);
  res.medir = await evaluar(cli, `({desborde:document.documentElement.scrollWidth-innerWidth,
    chicos:Array.from(document.querySelectorAll('.ident-p button')).filter(function(b){var r=b.getBoundingClientRect();return r.width&&r.height<40}).map(function(b){return b.textContent}),
    inputVisible:!!(function(){var i=document.getElementById('identTel-902');return i&&i.getBoundingClientRect().height>0})(),
    valorMariano:(document.getElementById('identTel-902')||{}).value})`);
  const el = await evaluar(cli, `(function(){var e=document.getElementById('ident-901');if(!e)return null;e.scrollIntoView({block:'start'});scrollBy(0,-80);return 1})()`);
  await T(500);
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 1100 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await T(700);
  fs.writeFileSync(OUT + '/sin_nombre_' + ANCHO + '.png', Buffer.from((await cli.enviar('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  // un toque de verdad en «Es Delfina Figueroa»
  const r = await evaluar(cli, `(function(){var b=document.querySelector('#ident-901 .pd-acc button');b.scrollIntoView({block:'center'});var q=b.getBoundingClientRect();var x=q.left+q.width/2,y=q.top+q.height/2,t=document.elementFromPoint(x,y);return {x:x,y:y,txt:b.textContent,tapa:!(t===b||b.contains(t))}})()`);
  if (ANCHO < 700) { await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await T(60); await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  else { await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); }
  await T(900);
  res.toque = { boton: r.txt, tapado: r.tapa, mando: await evaluar(cli, `window.__rpc.filter(function(s){return /identidad_resolver/.test(s)})`), quedan: await evaluar(cli, `document.querySelectorAll('.ident-p').length`) };
  // Mariano sin apellido: no manda; con apellido sí
  res.mariano_solo = await evaluar(cli, `(function(){var n=window.__rpc.length; document.getElementById('identTel-902').value='Mariano'; identResolver(902,'nombre',null,-1); return window.__rpc.length-n})()`);
  await T(300);
  res.mariano_con = await evaluar(cli, `(function(){document.getElementById('identTel-902').value='Mariano Lopez'; identResolver(902,'nombre',null,-1); return window.__rpc[window.__rpc.length-1]})()`);
  await T(600);
  res.errores = await evaluar(cli, `window.__e||''`);
  console.log(JSON.stringify(res, null, 1));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
