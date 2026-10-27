/**
 * Ruta › Cobros: la parte de Red, UNA tarjeta por representante (24/10/2026).
 *
 * Hasta ese día Red salía en tres lugares y el mismo pedido en dos, con montos
 * distintos (un pedido en efectivo figuraba arriba como «efectivo que le
 * dieron» —sin que el cliente hubiera pagado— y abajo en «Clientes de
 * representantes» con otro monto). Lo que exige:
 *   · un solo bloque de Red, una tarjeta por representante, y cada pedido UNA vez;
 *   · el pedido en efectivo va solo en «efectivo que te tiene que entregar», y
 *     dice si ya lo cobró o si lo cobra al entregar (nunca «le dieron»);
 *   · las transferencias van en «le tienen que transferir a Maleu», con el
 *     botón que copia el aviso PARA EL REPRESENTANTE con el alias;
 *   · «Maleu le paga $X en la quincena» cuando hay comisión pendiente;
 *   · sin desborde horizontal.
 *
 * Datos INVENTADOS (el repo es público). Todos los POST interceptados.
 *   node probar_cobros_red.js [ancho] [archivo]       (servidor en :8080)
 */
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));

const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'ruta.html';
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chk = (c, t, d) => { if (c) { ok++; console.log('  ok    ' + t); } else { mal++; console.log('  MAL   ' + t + (d !== undefined ? '  -> ' + d : '')); } };

const CUENTAS = [
  { id: 'mp', nombre: 'Cuenta Uno', tipo: 'digital', col: 3, alias: 'alias.prueba', banco: 'Banco Prueba', def: true },
  { id: 'bb', nombre: 'Cuenta Dos', tipo: 'digital', col: 7, alias: 'alias.dos', banco: 'Otro', def: false }
];
/* El representante A tiene un pedido en efectivo SIN cobrar (el caso que mentía). */
const COBROS = [
  { key: 'Red|vendedor:Ana Rep', h: 'Red', id: '901', c: 'Ana Rep (Vendedor Red)', $: 160000, fp: 'Efectivo',
    isVendedor: true, pedidosIds: ['901'], totalBruto: 0, comision: 0, efNuevo: 160000, nNuevo: 1, nViejo: 0,
    leDebeViejo: 0, leDebeSinMarcar: 0, yaPagado: 0, sems: [],
    efPeds: [{ n: '901', c: 'Cliente Efectivo', dia: '23/10/2026', ef: 160000, cob: false, ent: false }] },
  { h: 'Home', id: '1', r: 10, c: 'Cliente Home', t: '', $: 10000, fp: 'Transferencia' }
];
const RPA = {
  ok: true, cobroACaja: true, cuentas: CUENTAS,
  vendedores: [
    { nombre: 'Ana Rep', maleuLeDebe: 31958, pedidos: [
      { n: '901', row: 101, c: 'Cliente Efectivo', dia: '23/10/2026', es: 'Pendiente', ep: 'No Cobrado', fp: 'Efectivo', cobro: 160000, nueva: true, debe: 160000, leDebe: 24400 } ] },
    { nombre: 'Beto Rep', maleuLeDebe: 0, pedidos: [
      { n: '902', row: 102, c: 'Cliente Transfiere', dia: '01/10/2026', es: 'Entregado', ep: 'No Cobrado', fp: 'Transferencia', cobro: 65500, nueva: true, debe: 0, leDebe: 15400 },
      { n: '903', row: 103, c: 'Cliente Ya Pago', dia: '23/10/2026', es: 'Pendiente', ep: 'Cobrado', fp: 'Transferencia', cobro: 27000, nueva: true, debe: 0, leDebe: 7400, sinCta: true, trDir: 27000 },
      /* 27/10/2026: el pedido para el viernes que todavia no salio (Milagros #2100) NO es deuda. */
      { n: '904', row: 104, c: 'Cliente Del Viernes', dia: '30/10/2026', es: 'Pendiente', ep: 'No Cobrado', fp: 'Transferencia', cobro: 253200, nueva: true, debe: 0, leDebe: 0, tel: '1154649466' } ] }
  ]
};

function prep() {
  return `
    window.__posts=[]; window.__err=[]; window.__copiado=null;
    window.addEventListener('error',function(e){window.__err.push(String(e.message))});
    try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:function(t){window.__copiado=String(t);return Promise.resolve()}}})}catch(e){}
    (function(){var of=window.fetch;window.fetch=function(u,o){var url=String((u&&u.url)||u||'');
      var R=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}))};
      if(o&&String(o.method||'').toUpperCase()==='POST'){window.__posts.push(o.body);return R({ok:true});}
      if(url.indexOf('action=cobrosPendientes')>-1)return R({ts:Date.now(),cobros:${JSON.stringify(COBROS)},billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)}});
      if(url.indexOf('action=redPedidosAbiertos')>-1)return R(${JSON.stringify(RPA)});
      if(url.indexOf('action=entregas')>-1)return R({ts:Date.now(),e:[],cuentas:${JSON.stringify(CUENTAS)}});
      return of.apply(this,arguments)};
      window.confirm=function(){return true};window.alert=function(){};})();`;
}
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await evaluar(cli, expr)) return true; await dormir(200); } return false; }

(async () => {
  const cli = await abrir();
  try {
    /* Sin Page.enable el script del PREP no se inyecta y el test mide la pagina sin datos. */
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'try{localStorage.clear()}catch(e){}\n' + prep() });
    await cli.enviar('Page.navigate', { url: BASE });
    await dormir(3000);
    if (!await esperar(cli, 'typeof window.switchTab==="function"')) throw new Error('la sub-app no arrancó');
    await evaluar(cli, 'switchTab("cobros")');
    /* Que haya contenido de verdad antes de medir: «0 fallas sobre 0» es un verde falso. */
    const llego = await esperar(cli, '!!document.querySelector("#cobrosContent .cobro-card")&&/Beto/.test(document.getElementById("cobrosContent").textContent)', 20000);
    chk(llego, 'Cobros pintó los pedidos de prueba (Home y los dos representantes)');
    if (!llego) throw new Error('sin contenido: no se mide nada · ' + await evaluar(cli, 'JSON.stringify({err:window.__err,n:(function(){try{return pendientesCobro.length}catch(e){return "?"}})(),html:(document.getElementById("cobrosContent")||{}).textContent})'));
    const T = await evaluar(cli, 'document.getElementById("cobrosContent").textContent');
    const cuenta = (re) => (T.match(re) || []).length;

    chk(await evaluar(cli, 'document.querySelectorAll("#rutCliVend").length') === 1, 'un solo bloque de Red');
    chk(cuenta(/Clientes de representantes/g) === 0, 'ya no está la sección suelta «Clientes de representantes»');
    chk(await evaluar(cli, 'document.querySelectorAll(".cobro-red-card").length') === 2, 'una tarjeta por representante (2)');
    chk(cuenta(/#901/g) === 1, 'el pedido en efectivo aparece UNA vez', cuenta(/#901/g));
    chk(!/le dieron/.test(T), 'no dice «le dieron» de un pedido que el cliente no pagó');
    chk(/Lo cobra Ana cuando lo entregue/.test(T), 'dice que Ana lo cobra cuando lo entregue');
    chk(/Sus clientes nos deben/.test(T), 'lo que deben los clientes tiene su apartado');
    chk(/Hace \d+ días y no pagó: escribile a Cliente/.test(T) && !/avisale a Beto/.test(T), 'la deuda vieja dice que le escribamos al CLIENTE, no al representante');
    chk(!/#904/.test(T) && !/253\.200/.test(T), 'lo que no se entregó (el viernes) no aparece ni suma', (T.match(/#904[^#]*/) || [''])[0]);
    chk(/El cobro es de Maleu/.test(T), 'la regla: el cobro es de Maleu');
    chk(/Ya transfirió: falta decir a qué cuenta/.test(T), 'la que ya transfirió pide la cuenta');
    chk(/Maleu le paga \$\s?31\.958 en la quincena/.test(T), 'dice lo que Maleu le paga en la quincena', (T.match(/Maleu le paga[^)]*/) || [''])[0]);
    chk(/clientes? de Red tienen? que transferirte/.test(T), 'el aviso de arriba nombra lo que falta transferir');

    /* El botón copia el mensaje PARA EL CLIENTE, de Maleu, con el alias (27/10/2026). */
    chk(!/Mensaje para Beto/.test(T) && !/Un mensaje para Beto/.test(T), 'ningún mensaje para el representante');
    await evaluar(cli, '(function(){var b=[].filter.call(document.querySelectorAll("#cobrosContent button"),function(x){return /Mensaje para Cliente/.test(x.textContent)})[0];if(b)b.click()})()');
    await dormir(400);
    const cop = await evaluar(cli, 'window.__copiado');
    chk(!!cop && /Hola Cliente/.test(cop) && /de Maleu/.test(cop) && /alias\.prueba/.test(cop) && /#902/.test(cop) && !/Beto/.test(cop), 'copia el mensaje para el cliente, de Maleu, con el alias', cop);
    chk(!/wa\.me/.test(await evaluar(cli, 'document.getElementById("cobrosContent").innerHTML')), 'ningún link wa.me');

    if (process.env.FOTO) {
      await evaluar(cli, 'document.getElementById("rutCliVend").scrollIntoView()');
      await dormir(300);
      const f = await cli.enviar('Page.captureScreenshot', { format: 'png' });
      require('fs').writeFileSync(process.env.FOTO, Buffer.from(f.data, 'base64'));
    }
    const desb = await evaluar(cli, 'document.documentElement.scrollWidth-document.documentElement.clientWidth');
    chk(desb <= 1, 'sin desborde horizontal a ' + ANCHO + 'px', desb);
    const errs = await evaluar(cli, 'JSON.stringify(window.__err)');
    chk(errs === '[]', 'sin errores de JS', errs);
    chk(await evaluar(cli, 'window.__posts.length') === 0, 'no salió ningún POST');
  } catch (e) { mal++; console.log('  MAL   ' + e.message); }
  finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  process.exit(mal ? 1 : 0);
})();
