/* EL RANKING CON BARRITA (11/11/2026): Ventas › Por producto (Top 10), Ventas › Tendencia y
   Inicio › Cierre mensual (los dos Top de clientes).
     SBSES=<sbses.json> node _tools/pruebas/probar_ranking.js <token> [ancho]
   Por cada lista: cuántas filas examinó, que el 1 tenga la barra entera, que cada barra sea
   su monto sobre el del primero (±2 puntos, por el redondeo de los montos cortos), que estén
   ordenadas de mayor a menor, y que ninguna fila se salga de su caja. «0 filas» es un rojo,
   no un verde: si la lista no llegó a pintar no se midió nada. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2);
const ANCHO = Number(ANCHO_S || 1440);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };

const MEDIR = (sel) => `(function(){var c=document.querySelector(${JSON.stringify(sel)});if(!c)return {n:0,err:'sin contenedor'};
  var rows=[].slice.call(c.querySelectorAll('.rk-row')).filter(function(r){return r.getBoundingClientRect().height>0});
  function val(t){t=String(t||'').replace(/\\s/g,'');var m=t.match(/([\\d.,]+)(M|k(?!g))?/i);if(!m)return 0;var x=Number(m[1].replace(/\\./g,'').replace(',','.'));if(/M/i.test(m[2]||''))x*=1e6;else if(/k/i.test(m[2]||''))x*=1e3;return x;}
  var out=rows.map(function(r){var v=r.querySelector('.rk-v'),vb=v?v.firstChild:null,i=r.querySelector('.rk-bar i'),b=r.querySelector('.rk-bar');
    return {pos:+r.querySelector('.rk-pos').textContent,v:val(vb&&vb.textContent),w:i&&b?Math.round(i.getBoundingClientRect().width/b.getBoundingClientRect().width*100):-1,desb:r.scrollWidth>r.clientWidth+2};});
  return {n:out.length,rows:out};})()`;

async function revisar(cli, nombre, sel) {
  const m = await evaluar(cli, MEDIR(sel));
  chk(m.n > 0, `${nombre}: ${m.n} filas examinadas`, m.err);
  if (!m.n) return;
  /* Una caja puede tener más de un ranking seguido (Tendencia: por unidades y aparte por kilo):
     cada vez que el puesto vuelve a 1 empieza otra lista, con su propio primero. */
  const listas = [];
  m.rows.forEach((r) => { if (r.pos === 1 || !listas.length) listas.push([]); listas[listas.length - 1].push(r); });
  listas.forEach((R, li) => {
    const nom = nombre + (listas.length > 1 ? ` (lista ${li + 1} de ${listas.length})` : ''), top = R[0].v;
    chk(R[0].w >= 98, `${nom}: el 1 tiene la barra entera (${R[0].w}%)`);
    const fuera = R.filter((r) => top > 0 && Math.abs(r.w - r.v / top * 100) > 2.5);
    chk(fuera.length === 0, `${nom}: cada barra es su monto sobre el del primero`, fuera.slice(0, 3));
    chk(R.every((r, i) => i === 0 || r.v <= R[i - 1].v * 1.02), `${nom}: ordenado de mayor a menor`, R.map((r) => r.v));
    chk(R.every((r, i) => r.pos === i + 1), `${nom}: puestos 1..${R.length}`);
    chk(!R.some((r) => r.desb), `${nom}: ninguna fila se sale de su caja a ${ANCHO}px`);
  });
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(14000);

  await evaluar(cli, "go('ventas')"); await T(3000);
  await evaluar(cli, "vSwitchTab('productos')"); await T(9000);
  await revisar(cli, 'Ventas › Por producto · Top 10', '#prodTop10');

  await evaluar(cli, "vSwitchTab('tendencia')"); await T(3000);
  await evaluar(cli, "(function(){var s=document.getElementById('vtMetric');s.value='prod';rTendencia();})()"); await T(6000);
  await revisar(cli, 'Ventas › Tendencia · ranking', '.vt-rank');

  await evaluar(cli, "pickInicio('cierre')"); await T(6000);
  /* Top 10 clientes vive en la sección Ventas del cierre; Top clientes con LTV, en Clientes. */
  for (const sec of ['ventas', 'clientes']) {
    await evaluar(cli, `cierreSetSec('${sec}')`); await T(4000);
    const bloques = await evaluar(cli, "[].slice.call(document.querySelectorAll('.ck-block')).filter(function(b){return b.querySelector('.rk')&&b.getBoundingClientRect().height>0}).map(function(b,i){b.setAttribute('data-rkt',i);return (b.querySelector('.ck-block-h')||{}).textContent})");
    chk(bloques.length >= 1, `Cierre › ${sec}: ${bloques.length} ranking(s) de clientes a la vista`, bloques);
    for (let i = 0; i < bloques.length; i++) await revisar(cli, 'Cierre › ' + sec + ' · ' + String(bloques[i]).slice(0, 26), `.ck-block[data-rkt="${i}"] .rk`);
  }

  const err = await evaluar(cli, 'window.__err||[]');
  chk(!err.length, 'sin errores en la consola', err);
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
