/**
 * La campanita del ERP (14/10/2026). Chrome de verdad, `avisosErp` simulado.
 *   · con avisos: el punto se prende, y en el celular la campana aparece;
 *   · al tocarla se abre la lista con los tres tipos;
 *   · tocar un aviso de la liquidacion va a Ventas › RED (irLiquidacion);
 *   · sin avisos: punto apagado y, en el celular, la campana no se ve.
 *
 *   BASE=http://localhost:8161 node probar_campanita.js [ancho]
 */
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const ANCHO = Number(process.argv[2]) || 390;
const BASE = (process.env.BASE || 'http://localhost:8080') + '/app.html?prueba=1';
let ok = 0, mal = 0;
const chequear = (c, t, d) => { if (c) { ok++; console.log('  ok    ' + t); } else { mal++; console.log('  MAL   ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const AVISOS = [
  { id: 'liq-h-1', tipo: 'hoy', ir: 'liquidacion', titulo: 'Hoy pagás la quincena de la Red', lineas: ['Hoy pagás la quincena del 1 al 15 de octubre: Federico $120.000, Marcos $54.100, Rufino $3.700.', 'Total $177.800.'] },
  { id: 'liq-v-2', tipo: 'vispera', ir: 'liquidacion', titulo: 'Mañana pagás la quincena del 16 al 31 de octubre', lineas: ['Por ahora va:', '· Fini $10.250'] },
  { id: 'liq-x-3', tipo: 'vencida', ir: 'liquidacion', titulo: 'A Marcos le quedó sin pagar $54.100', lineas: ['Quincena del 1 al 15 de octubre (se pagaba el 16/10/2026): $54.100'] }
];
(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.navigate', { url: BASE });
    for (let i = 0; i < 60; i++) { await espera(500); if (await evaluar(cli, 'typeof avzPedir==="function"&&!!document.getElementById("hdrBell")')) break; }
    const vis = `(function(){var b=document.getElementById('hdrBell');var r=b.getBoundingClientRect();return getComputedStyle(b).display!=='none'&&r.width>0;})()`;
    const r1 = await evaluar(cli, `(function(){
      var fo=window.fetch; window.__avzLlamadas=0;
      window.fetch=function(u,o){ if(String(u).indexOf('action=avisosErp')>=0){ window.__avzLlamadas++; return Promise.resolve({json:function(){return ${JSON.stringify({ ok: true, avisos: AVISOS })};}}); } return fo.apply(this,arguments); };
      AVZ_PIDIENDO=false; avzPedir();
      return new Promise(function(res){ setTimeout(function(){ res({dot:getComputedStyle(document.getElementById('hdrNotifDot')).display, n:AVZ_LISTA.length}); },200); });
    })()`);
    chequear(r1.n === 3 && r1.dot !== 'none', 'con 3 avisos el punto de la campanita se prende', r1);
    chequear(await evaluar(cli, vis), 'la campanita se ve (' + ANCHO + 'px)');
    const r2 = await evaluar(cli, `(function(){
      document.getElementById('hdrBell').click();
      var box=document.getElementById('avzBox'); var its=box?box.querySelectorAll('.avz-it'):[];
      var r=box?box.getBoundingClientRect():{};
      return {abierta:!!box&&!box.hidden, n:its.length, tipos:[].map.call(its,function(x){return x.className;}), dentro:r.left>=0&&r.right<=innerWidth, txt:box?box.innerText.slice(0,3000):''};
    })()`);
    chequear(r2.abierta && r2.n === 3, 'al tocarla se abre la lista con los 3 avisos', r2);
    chequear(r2.dentro, 'la lista entra en la pantalla (sin scroll de costado)', r2);
    chequear(/Hoy pagás/.test(r2.txt) && /Mañana pagás/.test(r2.txt) && /sin pagar/.test(r2.txt), 'dice hoy, mañana y lo que quedó sin pagar', r2.txt);
    const r3 = await evaluar(cli, `(function(){
      var llam=[]; var g0=window.go, v0=window.vSwitchTab;
      window.go=function(t){llam.push('go:'+t);}; window.vSwitchTab=function(t){llam.push('vt:'+t);};
      document.querySelector('#avzBox .avz-it').click();
      return new Promise(function(res){ setTimeout(function(){ window.go=g0; window.vSwitchTab=v0; res({llam:llam, cerrada:document.getElementById('avzBox').hidden}); },600); });
    })()`);
    chequear(r3.llam.join(',') === 'go:ventas,vt:red' && r3.cerrada, 'tocar un aviso va a Ventas › RED y cierra la lista', r3);
    const r4 = await evaluar(cli, `(function(){ AVZ_LISTA=[]; avzPintar(); return getComputedStyle(document.getElementById('hdrNotifDot')).display; })()`);
    chequear(r4 === 'none', 'sin avisos el punto se apaga', r4);
    const visSin = await evaluar(cli, vis);
    chequear(ANCHO < 600 ? !visSin : visSin, ANCHO < 600 ? 'y en el celular la campanita no se ve' : 'y en escritorio la campanita sigue (sin punto)', visSin);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal  (ancho ' + ANCHO + ')');
  process.exit(mal ? 1 : 0);
})();
