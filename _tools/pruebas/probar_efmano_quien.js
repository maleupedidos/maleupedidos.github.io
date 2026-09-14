/* Caja → Efectivo en mano, abierto por QUIEN tiene la plata (13/9/2026).

   node probar_efmano_quien.js [390|1440]
   APP=app_viejo_tmp.html node probar_efmano_quien.js 390    ← la direccion contraria

   Tadeo: el viernes se repartieron la ruta con Lucas, cada uno junto efectivo por
   su lado, y a la noche lo contaron todo junto. "Lo mas eficiente seria contar el
   efectivo por separado, para que de redondo."

   El backend va STUBBEADO con datos inventados (el repo es publico). No hace falta
   token. Sostiene:
   · con dos personas, un renglon por persona con lo que TIENE QUE CONTAR
     (entro − vuelto), y la suma de los renglones es el total del dia;
   · "sin asignar" existe, va ultimo y no se inventa a quien le toca;
   · tocar a una persona deja en el detalle solo sus clientes, y tocarla de nuevo
     vuelve a todos (con la etiqueta de quien en cada fila);
   · con UNA persona no hay renglones: dice "Lo juntó X";
   · un backend anterior (sin porQuien) no dibuja nada nuevo ni rompe;
   · al cambiar de dia, un filtro de una persona que ese dia no esta se suelta;
   · minimo tactil, sin desborde y sin nada pisado. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

/* Tres dias: el viernes con dos personas y un "sin asignar", el jueves con una
   sola, y el miercoles como lo manda un Apps Script anterior (sin porQuien). */
const EFMANO = [
  { f: '11/09/2026', cobrado: 405600, bil: 5000, cambioMP: 7000, cruzado: 0, entro: 417600, salio: 5000, neto: 412600,
    porQuien: [
      { q: 'Lucas Moresco', e: 214600, s: 5000, n: 2 },
      { q: 'Tadeo Ustariz', e: 163000, s: 0, n: 2 },
      { q: '', e: 40000, s: 0, n: 1 }
    ],
    det: [
      { c: 'Cliente Dos', id: '9002', h: 'Home', cobro: 125000, vto: 5000, tipo: 'Billetera', q: 'Lucas Moresco' },
      { c: 'Cliente Tres', id: '9003', h: 'Home', cobro: 90000, vto: 7000, tipo: 'CambioMP', q: 'Tadeo Ustariz' },
      { c: 'Cliente Uno', id: '9001', h: 'Home', cobro: 84600, vto: 0, tipo: '', q: 'Lucas Moresco' },
      { c: 'Cliente Cuatro', id: '9004', h: 'Home', cobro: 66000, vto: 0, tipo: '', q: 'Tadeo Ustariz' },
      { c: 'Vendedor X', id: 'Liq', h: 'Red', cobro: 40000, vto: 0, tipo: '', q: '' }
    ] },
  { f: '10/09/2026', cobrado: 51000, bil: 0, cambioMP: 0, cruzado: 0, entro: 51000, salio: 0, neto: 51000,
    porQuien: [{ q: 'Tadeo Ustariz', e: 51000, s: 0, n: 1 }],
    det: [{ c: 'Cliente Cinco', id: '8801', h: 'Home', cobro: 51000, vto: 0, tipo: '', q: 'Tadeo Ustariz' }] },
  { f: '09/09/2026', cobrado: 30000, bil: 0, cambioMP: 0, cruzado: 0, entro: 30000, salio: 0, neto: 30000,
    det: [{ c: 'Cliente Seis', id: '8701', h: 'Home', cobro: 30000, vto: 0, tipo: '' }] }
];
const CAJA = { ts: 1, caja: { ef: 0, mp: 0 }, saldoBase: {}, gastos: [], ingresos: [], gastosHist: [], movimientos: [], efMano: EFMANO };
const LIGHT = { ts: 1, pedidos: [], canales: [], light: true };

const EXTRA = `
  (function(){
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v2'); localStorage.setItem('maleu_tab','caja'); }catch(e){}
    var o = window.fetch; window.fetch = function(u, x){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') > -1 && !(x && String(x.method||'').toUpperCase()==='POST')) {
        var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
        var cuerpo = a === 'cajaLight' ? ${JSON.stringify(CAJA)}
                   : a === 'pedidosLight' ? ${JSON.stringify(LIGHT)}
                   /* El volcado real NO trae efMano (solo cajaLight). Con efMano en el stub
                      esta prueba no veia que load() lo borraba (13/9/2026). */
                   : a === 'admin' ? Object.assign({}, ${JSON.stringify(LIGHT)}, ${JSON.stringify(CAJA)}, {oc:{lista:[]}, stock:[], efMano: undefined})
                   : a === 'ocLight' ? {ok:true, oc:{lista:[]}} : a === 'cobrosPendientes' ? {ok:true, cobros:[]}
                   : {ok:false, error:'stub'};
        var txt = JSON.stringify(cuerpo);
        return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); }, 120); });
      }
      if (x && String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      return o.apply(this, arguments); };
  })();
`;

const LEER = `(()=>{
  var box = document.getElementById('efManoCard'); if (!box) return null;
  var qs = [].slice.call(box.querySelectorAll('.efm-q')).map(function(b){ var r=b.getBoundingClientRect();
    return { n:(b.querySelector('.efm-qn')||{}).textContent||'', m:(b.querySelector('.efm-qm')||{}).textContent||'',
             d:(b.querySelector('.efm-qd')||{}).textContent||'', on:b.getAttribute('aria-pressed')==='true', h:Math.round(r.height), w:Math.round(r.width) }; });
  var filas = [].slice.call(box.querySelectorAll('.efm-f .efm-c')).map(function(c){ return c.textContent; });
  var uno = (box.querySelector('.efm-quien1')||{}).textContent||'';
  var pie = [].slice.call(box.querySelectorAll('.efm-quien .efm-sub')).map(function(s){return s.textContent;}).join(' ');
  return { dia:(box.querySelector('.efm-dia')||{}).textContent||'', qs:qs, filas:filas, uno:uno, pie:pie,
           desborda: document.documentElement.scrollWidth > window.innerWidth + 1, txt: box.textContent.length };
})()`;
const num = t => Number(String(t || '').replace(/[^\d]/g, '')) || 0;

(async () => {
  const cli = await abrir();
  const errores = [];
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    /* Es `escuchar`, no `on`: con `cli.on && ...` el chequeo de errores daba
       verde sin haber escuchado nada. */
    cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Caja · efectivo en mano por persona · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('caja'); 1`);
    if (!await esperar(cli, `window.D && Array.isArray(D.efMano) && D.efMano.length===3 && document.querySelector('#efManoCard .efm')`, 30000)) {
      console.log('  la tarjeta de efectivo en mano no se dibujo (sin esto, lo de abajo no mide nada)'); salir(1);
    }
    await evaluar(cli, `typeof _efManoIdx!=='undefined' && (_efManoIdx=0); typeof _efManoQuien!=='undefined' && (_efManoQuien=null); rEfMano(); 1`);
    await evaluar(cli, `document.getElementById('efManoCard').scrollIntoView({block:'start'}); 1`);
    await pausa(300);

    /* ── El viernes: dos personas y un "sin asignar" ── */
    const v = await evaluar(cli, LEER);
    chk('el viernes tiene un renglon por persona (3)', v.qs.length === 3, v.qs.map(q => q.n));
    chk('Lucas cuenta $209.600 (entro $214.600 − vuelto $5.000)', !!v.qs[0] && /Lucas Moresco/.test(v.qs[0].n) && num(v.qs[0].m) === 209600, v.qs[0]);
    chk('su renglon explica el vuelto', !!v.qs[0] && /214\.600/.test(v.qs[0].d) && /5\.000/.test(v.qs[0].d) && /2 clientes/.test(v.qs[0].d), v.qs[0] && v.qs[0].d);
    chk('Tadeo cuenta $163.000', !!v.qs[1] && /Tadeo Ustariz/.test(v.qs[1].n) && num(v.qs[1].m) === 163000, v.qs[1]);
    chk('"Sin asignar" va ultimo y no inventa a quien le toca', !!v.qs[2] && /Sin asignar/.test(v.qs[2].n) && num(v.qs[2].m) === 40000, v.qs[2]);
    const suma = v.qs.reduce((a, q) => a + num(q.m), 0);
    chk('los renglones suman el total del dia ($412.600)', suma === 412600, suma);
    chk('el pie dice cuanto tienen que dar juntos', /412\.600/.test(v.pie), v.pie);
    chk('en el detalle, cada fila dice de quien es', v.filas.length === 5 && /Lucas/.test(v.filas[0]) && /Tadeo/.test(v.filas[1]) && /sin asignar/.test(v.filas[4]), v.filas);
    chk('ningun renglon esta elegido al arrancar', v.qs.every(q => !q.on));

    /* ── Tocar a Lucas ── */
    await evaluar(cli, `document.querySelectorAll('#efManoCard .efm-q')[0].click(); 1`);
    await pausa(150);
    const l = await evaluar(cli, LEER);
    chk('tocar a Lucas lo marca elegido', !!l.qs[0] && l.qs[0].on && !l.qs[1].on, l.qs.map(q => q.on));
    chk('y el detalle queda con sus 2 clientes, sin etiqueta', l.filas.length === 2 && l.filas.every(f => /Cliente (Uno|Dos)/.test(f) && !/Lucas/.test(f)), l.filas);
    await evaluar(cli, `document.querySelectorAll('#efManoCard .efm-q')[2].click(); 1`);
    await pausa(150);
    const s = await evaluar(cli, LEER);
    chk('tocar "Sin asignar" deja solo lo que no tiene persona', s.filas.length === 1 && /Vendedor X/.test(s.filas[0]), s.filas);
    await evaluar(cli, `document.querySelectorAll('#efManoCard .efm-q')[2].click(); 1`);
    await pausa(150);
    const t = await evaluar(cli, LEER);
    chk('tocarlo de nuevo vuelve a todos', t.filas.length === 5 && t.qs.every(q => !q.on), t.filas.length);

    /* ── Tamaños ── */
    chk('cada renglon mide 44px o mas', v.qs.every(q => q.h >= 44), v.qs.map(q => q.h));
    chk('la pagina no se desborda a lo ancho', !v.desborda);
    const pisa = await evaluar(cli, `(()=>{ var els=[].slice.call(document.querySelectorAll('#efManoCard .efm-q span, #efManoCard .efm-quien-t'));
      var rs=els.map(function(e){return e.getBoundingClientRect();}).filter(function(r){return r.width>0&&r.height>0;}); var n=0, pares=0;
      for(var i=0;i<rs.length;i++)for(var j=i+1;j<rs.length;j++){pares++; var a=rs[i],b=rs[j];
        if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)n++;}
      return {n:n, pares:pares}; })()`);
    chk('nada se pisa en los renglones (' + pisa.pares + ' pares)', pisa.n === 0 && pisa.pares > 10, pisa);

    /* ── Elegir a Lucas y pasar al jueves, donde no esta ── */
    await evaluar(cli, `document.querySelectorAll('#efManoCard .efm-q')[0].click(); 1`);
    await evaluar(cli, `efManoIr(1); 1`);
    await pausa(150);
    const j = await evaluar(cli, LEER);
    chk('el jueves (una sola persona) no dibuja renglones', j.qs.length === 0, j.qs);
    chk('dice "Lo juntó Tadeo Ustariz"', /Lo juntó\s*Tadeo Ustariz/.test(j.uno), j.uno);
    chk('y el filtro de Lucas se solto: se ve su cliente', j.filas.length === 1 && /Cliente Cinco/.test(j.filas[0]), j.filas);

    /* ── El miercoles, como lo manda un backend anterior ── */
    await evaluar(cli, `efManoIr(1); 1`);
    await pausa(150);
    const m = await evaluar(cli, LEER);
    chk('sin porQuien no dibuja nada nuevo', m.qs.length === 0 && !m.uno && !m.pie, m);
    chk('y la tarjeta sigue entera', m.filas.length === 1 && /Cliente Seis/.test(m.filas[0]), m.filas);

    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
  } catch (e) {
    console.log('  REVENTO: ' + (e && e.message || e)); mal++;
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  salir(mal ? 1 : 0);
})();
