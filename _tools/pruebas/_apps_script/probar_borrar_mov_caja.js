/* Borrar un gasto o un ingreso desde la tab Caja (17/9/2026). Backend STUBBEADO
   con datos inventados (el repo es publico): no hace falta token.

   node probar_borrar_mov_caja.js [390|1440]
   APP=app_viejo_tmp.html node probar_borrar_mov_caja.js 390   ← la contraria

   Tadeo: "como hago para eliminar un gasto o ingreso de tab caja? deberia tener
   esa libertad. tengo que hacer unos ajustes que estan mal".

   Sostiene:
   · la ✕ esta en los gastos e ingresos, y NO en un cobro (eso se deshace desde
     el pedido) ni en un pago a proveedor (tiene su fila en Pagos Proveedores);
   · el confirm dice QUE se borra y cuanto, antes de tocar nada;
   · el POST manda concepto, monto y dia — es con lo que el backend reverifica
     que la fila sea la que estabas mirando— y un clientOpId para que un
     reintento no borre dos filas;
   · si el backend dice que esa fila cambio, el movimiento NO se va de la lista;
   · (y que el confirm lo responde el servidor de pruebas: `__confirmDevuelve`);
   · la ✕ se puede tocar en un celular (32px). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' },
  { id: 'mp', nombre: 'Mercado Pago Prueba', tipo: 'digital', def: true }
];
const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
const p2 = n => String(n).padStart(2, '0');
const fmt = d => p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
const F = fmt(hoy);
const MOVS = [
  { tipo: 'gasto', r: 3, f: F, ts: hoy.getTime(), cat: 'Insumos', con: 'Bolsas mal cargadas', met: 'Mercado Pago', cta: 'mp', $: 35000, not: '' },
  { tipo: 'ingreso', r: 2, f: F, ts: hoy.getTime() - 1000, cat: 'Intereses', con: 'Rendimientos', met: 'Mercado Pago', cta: 'mp', $: 4500, not: '' },
  { tipo: 'cobro', f: F, ts: hoy.getTime() - 2000, cat: 'COBRO Home', con: 'Cliente Prueba #9001', met: 'Efectivo', cta: 'efectivo', $: 50000, not: '' },
  { tipo: 'gasto', r: 4, f: F, ts: hoy.getTime() - 3000, cat: 'Proveedor', con: 'Pago a Proveedor Prueba', met: 'Efectivo', cta: 'efectivo', $: 900000, not: '', noBorrar: 'proveedor' }
];
const CAJA = {
  ts: 1,
  caja: { cobradoEf: 50000, cobradoMP: 0, gastosEf: 900000, gastosMP: 35000, ingresosEf: 0, ingresosMP: 4500,
    cobradoPorCuenta: { efectivo: 50000 }, gastosPorCuenta: { mp: 35000, efectivo: 900000 }, ingresosPorCuenta: { mp: 4500 }, cuentas: CUENTAS },
  saldoBase: { ef: 1000000, mp: 2000000, bil: 0, sob: 0, inv: 0, fecha: '10/09 16:13', porCuenta: { efectivo: 1000000, mp: 2000000 }, sinContar: [] },
  gastos: [{ r: 3, f: F, $: 35000, cat: 'Insumos', con: 'Bolsas mal cargadas', met: 'Mercado Pago' }],
  ingresos: [{ r: 2, f: F, $: 4500, cat: 'Intereses', con: 'Rendimientos', met: 'Mercado Pago' }],
  gastosHist: {}, movimientos: MOVS, sobres: [], efMano: [], cajaMode: true
};

/* El stub imita al backend de verdad: si el borrado sale ok, la lectura
   siguiente YA no trae esa fila (por eso el backend tira la foto de la cache).
   Sin esto el `_recargarCaja()` del final devolveria el movimiento borrado y el
   test daria verde con un bug que el usuario si veria. */
const EXTRA = `
  (function(){
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v3'); localStorage.setItem('maleu_tab','caja'); }catch(e){}
    window.__posts=[]; window.__modo='ok';       /* 'ok' | 'cambio' | 'colgado' */
    var CAJA=${JSON.stringify(CAJA)};
    /* OJO: el confirm y el alert los reemplaza el servidor de pruebas
       (_tools/servir.js, solo con ?prueba=1): anota en __confirms / __avisos y
       DEVUELVE FALSE salvo que se le diga que si. Pisarlos desde aca no sirve
       —el servidor inyecta despues— y el test daba verde creyendo que el
       usuario habia cancelado. Y no alcanza con ponerlo aca: el servidor lo
       inicializa en false al servir el HTML, o sea DESPUES de este script, asi
       que se prende desde el test cuando la pagina ya cargo. */
    var o = window.fetch; window.fetch = function(u, x){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
      var resp = function(obj, ms){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||60); }); };
      if (x && String(x.method||'').toUpperCase()==='POST') {
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        if (b.action==='borrarMovimientoCaja'){
          if (window.__modo==='cambio') return resp({ok:false, cambio:true, error:'Esa fila cambio desde que la viste.'});
          /* El caso del 17/9: el servidor borro y Google nunca entrego la
             respuesta. En produccion eso lo corta el corte de POST de Caja y
             llega ACA como un rechazo; se simula asi porque con ?prueba=1 el
             ERP no instala su interceptor (__maleuAuth) y el corte no corre
             en localhost. Que el borrado ESTE en _POST_IDEMPOTENTE —lo que le
             da el reloj, se chequea aparte sobre el app.html generado. */
          if (window.__modo==='colgado') return new Promise(function(res,rej){
            setTimeout(function(){ rej(new Error('No pude confirmar el movimiento a tiempo')); }, 300);
          });
          CAJA.movimientos = CAJA.movimientos.filter(function(m){ return !(m.tipo===b.tipo && Number(m.r)===Number(b.row)); });
          CAJA.gastos = CAJA.gastos.filter(function(g){ return Number(g.r)!==Number(b.row); });
          CAJA.ingresos = CAJA.ingresos.filter(function(g){ return Number(g.r)!==Number(b.row); });
          return resp({ok:true, borrado:{tipo:b.tipo, $:b.monto, con:b.con}});
        }
        return resp({ok:true});
      }
      var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
      if (a==='cajaLight') return resp(CAJA, 120);
      if (a==='admin') return resp(Object.assign({}, CAJA, {pedidos:[],canales:[],stock:[],oc:{lista:[]},proveedores:[],vendedores:[]}), 400);
      if (a==='pedidosLight') return resp({ts:1, pedidos:[], canales:[], light:true}, 100);
      return resp({ok:true, cobros:[], oc:{lista:[]}}, 100);
    };
  })();
`;

const FILAS = `(()=>[].slice.call(document.querySelectorAll('#gList .gl')).map(function(el){
  return { t: el.textContent.replace(/\\s+/g,' ').trim(),
           x: !!el.querySelector('.gl-x:not(.gl-x-no)'),
           lock: !!el.querySelector('.gl-x-no') };
}))()`;

(async () => {
  const cli = await abrir();
  const errores = [];
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Borrar un movimiento de Caja · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('caja'); 1`);
    if (!await esperar(cli, `document.querySelectorAll('#gList .gl').length>=4`, 30000)) {
      console.log('  la lista de movimientos no se dibujo (sin esto, lo de abajo no mide nada)'); salir(1);
    }

    /* ── Quien tiene ✕ y quien no ── */
    let filas = await evaluar(cli, FILAS);
    const deGasto = filas.filter(f => /Bolsas mal cargadas/.test(f.t))[0] || {};
    const deIngreso = filas.filter(f => /Rendimientos/.test(f.t))[0] || {};
    const deCobro = filas.filter(f => /Cliente Prueba/.test(f.t))[0] || {};
    const deProv = filas.filter(f => /Pago a Proveedor/.test(f.t))[0] || {};
    chk('el gasto tiene ✕', deGasto.x === true, deGasto);
    chk('el ingreso tiene ✕', deIngreso.x === true, deIngreso);
    chk('un COBRO no tiene ✕ (se deshace desde el pedido)', deCobro.x === false && deCobro.lock === false, deCobro);
    chk('un pago a proveedor no tiene ✕ y muestra el candado', deProv.x === false && deProv.lock === true, deProv);

    /* ── El minimo tactil ── */
    const lado = await evaluar(cli, `(()=>{var b=document.querySelector('#gList .gl-x:not(.gl-x-no)');if(!b)return 0;var r=b.getBoundingClientRect();return Math.round(Math.min(r.width,r.height));})()`);
    chk('la ✕ se puede tocar en el celular (≥32px)', lado >= 32, { lado });

    /* ── Borrar de verdad ── */
    await evaluar(cli, `window.__confirmDevuelve=true; window.__confirms=[]; window.__avisos=[]; 1`);
    await evaluar(cli, `document.querySelector('#gList .gl-x:not(.gl-x-no)').click(); 1`);
    await esperar(cli, `(window.__posts||[]).some(function(p){return p.action==='borrarMovimientoCaja';})`, 15000);
    const conf = await evaluar(cli, `(window.__confirms||[])[0]||''`);
    chk('el confirm dice que se borra y cuanto', /Bolsas mal cargadas/.test(conf) && /35\.000/.test(conf), conf);
    chk('el confirm avisa que vuelve a la caja', /vuelve a la caja/i.test(conf), conf);
    const post = await evaluar(cli, `(window.__posts||[]).filter(function(p){return p.action==='borrarMovimientoCaja';})[0]||{}`);
    chk('el POST manda tipo y fila', post.tipo === 'gasto' && Number(post.row) === 3, post);
    chk('manda concepto, monto y dia (con eso el backend reverifica la fila)',
      post.con === 'Bolsas mal cargadas' && Number(post.monto) === 35000 && /^\d{2}\/\d{2}\/\d{4}/.test(String(post.f || '')), post);
    chk('manda clientOpId (un reintento no borra dos filas)', !!post.clientOpId, post);

    await pausa(1500);
    filas = await evaluar(cli, FILAS);
    chk('el gasto borrado ya no esta en la lista', !filas.some(f => /Bolsas mal cargadas/.test(f.t)), filas.map(f => f.t.slice(0, 40)));
    chk('los otros movimientos siguen', filas.length === 3, filas.length);

    /* ── Si el backend dice que la fila cambio, NO se va de la lista ── */
    await evaluar(cli, `window.__modo='cambio'; 1`);
    await evaluar(cli, `document.querySelector('#gList .gl-x:not(.gl-x-no)').click(); 1`);
    await pausa(1800);
    filas = await evaluar(cli, FILAS);
    const avisos = await evaluar(cli, `window.__avisos||[]`);
    chk('avisa al usuario que no borro nada', avisos.some(a => /cambio/i.test(a)), avisos);
    chk('el movimiento SIGUE en la lista', filas.some(f => /Rendimientos/.test(f.t)), filas.map(f => f.t.slice(0, 40)));

    /* ── Si la respuesta no vuelve, la pantalla TERMINA y no miente ── */
    await evaluar(cli, `window.__modo='colgado'; window.__avisos=[]; window.__confirmDevuelve=true; 1`);
    await evaluar(cli, `document.querySelector('#gList .gl-x:not(.gl-x-no)').click(); 1`);
    const termino = await esperar(cli, `(window.__avisos||[]).length>0`, 30000);
    chk('no queda "Borrando..." para siempre: avisa y termina', termino === true);
    const aviso = await evaluar(cli, `(window.__avisos||[])[0]||''`);
    chk('NO dice que no se borro (puede haberse borrado): dice que no pudo confirmar',
      /no pude confirmar/i.test(aviso) && !/no se borr/i.test(aviso), aviso);
    /* El overlay se prende y se apaga con la clase `visible` (no con `hidden`
       ni con display): buscar la clase equivocada daba TAPADO siempre. */
    const tapa = await evaluar(cli, `(function(){var l=document.getElementById('loaderOverlay');if(!l)return 'sin overlay';var e=getComputedStyle(l);return (l.classList.contains('visible')&&e.visibility!=='hidden'&&Number(e.opacity)>0)?'TAPADO':'destapado';})()`);
    chk('el cartel de "Borrando..." se fue de la pantalla', tapa !== 'TAPADO', tapa);
    await esperar(cli, `(window.__gets2||0)>=0`, 500);

    /* ── El reloj de verdad: que el borrado este en la lista de POST que se
       pueden repetir. Es lo que le da corte y reintento en produccion, y es lo
       que faltaba el 17/9. No se puede medir con ?prueba=1, asi que se mide
       sobre el archivo generado. ── */
    const fuente = require('fs').readFileSync(require('path').join(__dirname, '..', '..', APP), 'utf8');
    const linea = (fuente.match(/var _POST_IDEMPOTENTE = {[^}]*}/) || [''])[0];
    chk('borrarMovimientoCaja esta en _POST_IDEMPOTENTE (sin eso el POST no tiene reloj)',
      /borrarMovimientoCaja\s*:\s*1/.test(linea), linea);

    const err = errores.filter(e => !/stub|Failed to fetch/i.test(String(e)));
    chk('sin errores de JS', err.length === 0, err.slice(0, 3));

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.log('  EXPLOTO: ' + (e && e.message));
    salir(1);
  }
})();
