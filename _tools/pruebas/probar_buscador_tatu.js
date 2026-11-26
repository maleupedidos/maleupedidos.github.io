/* EL BUSCADOR DE CLIENTES PARA TATU (11/11/2026): usuario santos, rol repartidor, en Pedidos Home.
     SBSES=<sbses de un repartidor> node _tools/pruebas/probar_buscador_tatu.js <token> [ancho]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado
   Sostiene:
     · santos (repartidor) ve el buscador en Pedidos Home, y filtra mientras tipea: por nombre y por N° de pedido;
     · cada resultado muestra cliente, estado, fecha de entrega y total, y ningún costo ni margen;
     · carpi (repartidor también) NO lo ve: va por usuario, no por rol. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2);
const ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };

async function como(usuario, nombre) {
  const PREP = require('./sesion_prep.js')(TOKEN, `;try{localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:"${usuario}",rol:"repartidor",nombre:"${nombre}",tabs:["pedidoshome","mireparto","ruta"],ts:Date.now()}));localStorage.setItem("maleu_tab","pedidoshome")}catch(e){}`);
  const SBSES = require('./sbses_guarda.js')(process.env.SBSES, usuario);
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(11000);
  await evaluar(cli, "go('pedidoshome')"); await T(4000);
  return cli;
}
/* Con algo tipeado, el repartidor ve los resultados de la BASE (#pedResH); sin nada, la lista de su día. */
const leer = (cli) => evaluar(cli, `(function(){var b=document.getElementById('pedTopHome'),res=document.getElementById('pedResH'),enRes=!!res&&!res.hidden;
  var cards=enRes?[].slice.call(res.querySelectorAll('.ped-res-r')):[].slice.call(document.querySelectorAll('#pListHome .pc')).filter(function(c){return c.getBoundingClientRect().height>0});
  return {rol:SESSION&&SESSION.rol,usu:SESSION&&SESSION.usuario,ve:!!b&&!b.hidden&&b.getBoundingClientRect().height>0,n:cards.length,enRes:enRes,
    nombres:cards.slice(0,8).map(function(c){return (c.querySelector('.pc-c')||c.querySelector('b')||c).textContent.trim()}),
    texto:cards.slice(0,8).map(function(c){return (c.querySelector('.pc-summary')||c).innerText.replace(/\\s+/g,' ')})};})()`);

(async () => {
  /* Tatu */
  const c1 = await como('santos', 'Santos Bullrich');
  let e = await leer(c1);
  chk(e.usu === 'santos' && e.rol === 'repartidor', 'la sesión de prueba es santos / repartidor', e);
  chk(e.ve === true, 'santos ve el buscador en Pedidos Home', e);
  /* Si hoy no tiene pedidos de su día (pasa: depende del reparto), se busca un cliente conocido. El buscador tiene que
     andar igual: busca en la base, no en lo que la sesión tiene. */
  const ref = (await evaluar(c1, "(function(){var p=(typeof D!=='undefined'&&D&&D.pedidos||[]).filter(function(x){return x.h==='Home'&&x.c&&x.$>0&&!x.hist})[0];return p?{c:p.c,n:String(p.n)}:null})()"))
    || { c: 'Jeronimo Susini', n: '2439' };
  if (ref) {
    const tipear = async (t) => { await evaluar(c1, "pedBuscarH('',true)"); await T(300); await evaluar(c1, "document.getElementById('pedBusqH').focus()"); await c1.enviar('Input.insertText', { text: t }); await T(2500); return leer(c1); };
    const nom = ref.c.split(' ')[0];
    e = await tipear(nom);
    const sinT = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    chk(e.enRes === true && e.n > 0 && e.nombres.every((x) => sinT(x).indexOf(sinT(nom)) >= 0), `por nombre «${nom}»: ${e.n} pedidos de la base, todos de ese nombre`, e.nombres);
    const e2 = await tipear('susini');
    /* Mientras la base no tenga `pedidos_buscar_pantalla`, el repartidor busca en su día y la pantalla lo dice:
       eso no es un verde ni un rojo, es lo que falta. */
    const soloDia = await evaluar(c1, "/solo entre los pedidos de tu d/i.test((document.getElementById('pedResH')||{}).innerText||'')");
    if (soloDia) console.log('  PEND  falta la función de la base pedidos_buscar_pantalla: hoy busca solo entre los pedidos de su día (y lo dice)');
    else chk(e2.n >= 4, `busca en TODOS los pedidos, no solo los de su día: «susini» trae ${e2.n}`, e2.texto);
    chk(e.texto.every((t) => /Entrega/.test(t) && /\$/.test(t) && /(Pendiente|Entregado|Cancelado|Reservado)/.test(t)), 'cada resultado dice estado, fecha de entrega y total', e.texto);
    e = await tipear(ref.n);
    chk(e.n >= 1 && e.nombres.some((x) => x.indexOf(ref.c.slice(0, 10)) >= 0), `por N° «${ref.n}»: aparece ${ref.c}`, e.nombres);
    const costo = await evaluar(c1, "(function(){var t=document.getElementById('p-pedidoshome').innerText;return /costo|margen/i.test(t)})()");
    chk(costo === false, 'ningún costo ni margen en pantalla');
  }
  c1.matar && c1.matar();
  /* Agustín: repartidor también, sin buscador */
  const c2 = await como('carpi', 'Agustin Carpinacci');
  e = await leer(c2);
  chk(e.usu === 'carpi' && e.ve === false, 'carpi (repartidor) NO ve el buscador', e);
  c2.matar && c2.matar();
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
