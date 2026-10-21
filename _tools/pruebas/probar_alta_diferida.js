/* El alta que acepta la base (17/10/2026, Pedidos 4e, ALTA_FUENTE_PG).

     node probar_alta_diferida.js            (BASE=http://localhost:<puerto>)

   Con la palanca prendida, el backend contesta el alta { ok, n, ref, diferida,
   oc:'diferida' } sin haber escrito la fila: la escribe el aplicador.
   Lo que tiene que ser cierto en el AUTOPEDIDO (ruta.html):
   · se muestra como guardado y dice con qué número entró (Home #2003);
   · empuja al aplicador (POST pedidosFuenteAplicar) sin esperar al minuto;
   · con una respuesta de siempre (sin diferida) NO lo empuja.
   Y en el portal del vendedor (red.html): el alta diferida empuja al aplicador
   antes de recargar la lista.

   Backend simulado: no toca producción. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 300) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};
/* `resp` es lo que contesta el alta; todo lo demás, {ok:true}. */
const BACKEND = `(function(resp){
  window.__posts=[];
  window.fetch=function(u,o){
    u=String(u);
    if(u.indexOf('script.google')<0)return window.__fetchReal.apply(this,arguments);
    var body={}; try{body=JSON.parse((o&&o.body)||'{}')}catch(e){}
    window.__posts.push(body);
    var r=(body.clientOrderId||body.action==='redAutopedido')?resp:{ok:true,hechas:1,quedan:0};
    return Promise.resolve({json:function(){return Promise.resolve(r);}});
  };
  return 1;
})`;
const ARMAR = `(function(){
  try{
    var n=document.getElementById('npNombre'); if(!n)return 'sin npNombre';
    n.value='Cliente Diferido (prueba)';
    npZona='Home'; npPago='Efectivo';
    npCart={}; var k=Object.keys(NP_PRECIOS||{})[0];
    if(k===undefined){ npCart[1]=1; } else { npCart[k]=1; }
    npFechaSel=new Date(Date.now()+86400000).toISOString().slice(0,10);
    var b=document.getElementById('npBarrioPrivado'); if(b)b.value='Estancias del Pilar';
    var sb=document.getElementById('npSubBarrio'); if(sb)sb.value='Prueba';
    var lo=document.getElementById('npLote'); if(lo)lo.value='59';
    return 'ok';
  }catch(e){return String(e&&e.message);}
})()`;
const GUARDAR = `try{npSaving=false;npGuardar();}catch(e){window.__errNp=String(e&&e.message);} 1`;
const EXITO = `(function(){var s=document.getElementById('npSuccess');return (s&&!s.classList.contains('hidden'))?s.textContent:''})()`;
const LIMPIAR = `(function(){
  var s=document.getElementById('npSuccess'); if(s){s.classList.add('hidden'); s.innerHTML='';}
  if(typeof _npSaltoT!=='undefined'&&_npSaltoT){clearTimeout(_npSaltoT);}
  return 1;})()`;
const APLICAR = `window.__posts.filter(function(p){return p.action==='pedidosFuenteAplicar'}).length`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.navigate', { url: BASE + '/ruta.html?standalone=1&prueba=1' });
    await esperar(cli, `typeof npGuardar==='function'`, 60000);
    await pausa(400);
    await evaluar(cli, `window.__fetchReal=window.fetch; window.__confirmDevuelve=true;
      try{localStorage.removeItem('maleu_np_pendiente')}catch(e){} 1`);

    console.log('\n== Ruta: el alta diferida ==\n');
    await evaluar(cli, BACKEND + `({ok:true,n:2003,ref:'Home #2003',aceptada:true,diferida:true,oc:'diferida',pz:null})`);
    chk('se pudo armar el pedido', await evaluar(cli, ARMAR) === 'ok');
    await evaluar(cli, GUARDAR);
    await esperar(cli, EXITO, 8000);
    await esperar(cli, APLICAR + '>0', 4000);
    const ex = await evaluar(cli, EXITO);
    chk('lo muestra como guardado y dice con qué número entró', /guardado/i.test(ex) && /Home #2003/.test(ex), { ex });
    chk('   y NO dice que ya había entrado (no es un repetido)', !/ya hab/i.test(ex), { ex });
    chk('empuja al aplicador sin esperar al minuto', await evaluar(cli, APLICAR) === 1, await evaluar(cli, `window.__posts.map(function(p){return p.action||p.clientOrderId})`));
    await evaluar(cli, LIMPIAR);

    console.log('\n== Ruta: el alta de siempre ==\n');
    await evaluar(cli, BACKEND + `({ok:true,n:93,oc:'no-corresponde',pz:null})`);
    await evaluar(cli, ARMAR);
    await evaluar(cli, GUARDAR);
    await esperar(cli, EXITO, 8000);
    await pausa(1200);
    chk('sin diferida: NO empuja al aplicador', await evaluar(cli, APLICAR) === 0, await evaluar(cli, `window.__posts.map(function(p){return p.action||p.clientOrderId})`));
    await evaluar(cli, LIMPIAR);

    console.log('\n== El portal del vendedor ==\n');
    await cli.enviar('Page.navigate', { url: BASE + '/red.html?standalone=1&prueba=1' });
    await esperar(cli, `typeof sendOrderWithRetry==='function'`, 60000);
    await pausa(400);
    await evaluar(cli, `window.__fetchReal=window.fetch; 1`);
    const src = await evaluar(cli, `(function(){var s=[].slice.call(document.scripts).map(function(x){return x.textContent}).join('\\n');
      var i=s.indexOf('sendOrderWithRetry(postData, 5).then('); return i<0?'':s.slice(i, i+2600);})()`);
    chk('después de guardar empuja al aplicador si la respuesta es diferida, y recarga la lista cuando termina',
      /res && res\.diferida/.test(src) && /pedidosFuenteAplicar/.test(src) && /aplicado\.then\(function \(\) \{ loadDashboard\(\); \}\)/.test(src), src.slice(0, 200));
    await evaluar(cli, BACKEND + `({ok:true,n:2004,ref:'Red #2004',aceptada:true,diferida:true})`);
    const r = await evaluar(cli, `sendOrderWithRetry({action:'redAutopedido',clientOrderId:'np-red-x'},1).then(function(r){return JSON.stringify(r)})`, true);
    chk('sendOrderWithRetry devuelve la respuesta entera (con diferida) al que guarda', /"diferida":true/.test(String(r)), r);
  } catch (e) { console.log('  MAL  revento: ' + (e && e.message)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
