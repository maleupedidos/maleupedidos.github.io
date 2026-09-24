/* ¿POR QUÉ SIGUE GIRANDO "Actualizando…" SI LA LISTA YA ESTÁ? (24/9/2026)
 *
 *   node _tools/pruebas/diagnosticar_cartel_pedidos.js <token>
 *
 * Tadeo, esa noche: *"sigue medio lento todo en el ERP"*. Y sin embargo el
 * atajo de Supabase pinta la lista de Pedidos a los ~670 ms, medido.
 *
 * Existe porque `medir_refresco_supabase.js` mide **la variable equivocada**:
 * pregunta por `_frescoVuelo.pedidos`, que es sólo la PRIMERA de las dos ramas
 * de `_frescoVolando()`. El cartel que Tadeo lee en la pantalla sale de la
 * función entera, y la segunda rama —la del volcado— puede dejarlo prendido con
 * el contador ya en cero. Un proxy que mide de menos da verde sobre el bug.
 *
 * Entonces acá se mide **el texto de `#hdrRefreshTime`**, que es lo único que
 * él experimenta, y al lado los cuatro números que deciden ese texto, para que
 * la respuesta salga del comportamiento y no de leer el código:
 *
 *     _frescoVuelo.pedidos        ¿hay un pedido de pedidos en vuelo?
 *     _frescoVuelo.volcado        ¿y del volcado?
 *     _fresco.ok.pedidos          con qué hora quedó sellada la lista
 *     _frescoVueloDesde.volcado   cuándo salió el volcado
 *
 * La segunda rama es `ok.pedidos < vueloDesde.volcado`. Si la lista se sella
 * con la EDAD REAL de la foto de Supabase —que es del pasado, porque la réplica
 * corre cada 5 minutos— esa comparación puede no cumplirse nunca, y entonces el
 * cartel espera al volcado entero (~28 s) aunque los datos estén hace rato.
 *
 * Mide los DOS momentos, que no son el mismo:
 *   · EL ARRANQUE — abrir la app. Ahí el volcado sale sí o sí.
 *   · EL BOTÓN    — tocar ↻ con la app ya abierta y quieta.
 *
 * Sólo LEE. El PREP intercepta los POST, así que no escribe nada.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
if (!token) { console.error('Falta el token: node diagnosticar_cartel_pedidos.js <token>'); process.exit(1); }
const URL = process.env.URL || 'https://app.maleu.com.ar/app.html';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return { __err: String(x.message) }; } };

/* El sampler corre ADENTRO del navegador, cada 100 ms. Preguntar desde afuera
   por CDP da una muestra cada ~200-400 ms y con el ida y vuelta encima: el
   instante en que el cartel cambia se pierde entre dos preguntas. */
const SAMPLER = `
window.__cartel = { t0: Date.now(), muestras: [], arranque: true };
(function(){
  function leer(){
    var st = document.getElementById('hdrRefreshTime');
    var btn = document.getElementById('hdrRefresh');
    var m = {
      t: Date.now() - window.__cartel.t0,
      txt: st ? String(st.textContent || '') : '(sin nodo)',
      estado: btn ? String(btn.dataset.estado || '') : '',
      vPed: (window._frescoVuelo && window._frescoVuelo.pedidos) || 0,
      vVol: (window._frescoVuelo && window._frescoVuelo.volcado) || 0,
      okPed: (window._fresco && window._fresco.ok && window._fresco.ok.pedidos) || 0,
      llegoPed: (window._frescoLlego && window._frescoLlego.pedidos) || 0,
      desdeVol: (window._frescoVueloDesde && window._frescoVueloDesde.volcado) || 0,
      nPed: (window.D && window.D.pedidos && window.D.pedidos.length) || 0,
      deSb: (window.D && window.D._pedidosDeSupabase) || 0,
      tab: (typeof window._tabActual === 'function') ? window._tabActual() : ''
    };
    /* LA CAUSA SE LE PREGUNTA AL ERP, no se reimplementa.

       Aca habia una copia de la condicion de _frescoVolando, y al arreglar el
       ERP la copia quedo vieja: el cartel ya estaba apagado y el veredicto
       seguia acusando a la rama del volcado. Un instrumento que reimplementa lo
       que mide da verde -o rojo- sobre su propia version de los hechos.

       _frescoVolando(f) es la funcion que de verdad decide, asi que se la
       llama. Los numeros crudos se siguen guardando, pero para EXPLICAR la
       respuesta, nunca para calcularla.

       (Sin backticks a proposito: este comentario vive ADENTRO del template
       literal SAMPLER, y un backtick aca lo cierra. Ya paso.) */
    var volando = null;
    try { volando = (typeof window._frescoVolando === 'function')
                    ? !!window._frescoVolando('pedidos') : null; } catch(e) {}
    m.volando = volando;
    m.rama = (volando === null) ? 'no-pude-preguntar'
           : (!volando ? 'ninguna'
           : (m.vPed > 0 ? 'vuelo-pedidos'
           : (m.vVol > 0 ? 'volcado' : 'otra')));
    var u = window.__cartel.muestras[window.__cartel.muestras.length - 1];
    /* Sólo se guarda cuando algo cambia: una corrida de 40 s son 400 muestras
       casi todas iguales, y leerlas tapa el cambio que importa. */
    if (!u || u.txt !== m.txt || u.rama !== m.rama || u.vPed !== m.vPed ||
        u.vVol !== m.vVol || u.deSb !== m.deSb || u.okPed !== m.okPed ||
        u.volando !== m.volando) {
      window.__cartel.muestras.push(m);
    }
    window.__cartel.ultima = m;
  }
  leer();
  window.__cartel.timer = setInterval(leer, 100);
})();
`;

function tabla(ms, t0Label) {
  console.log(`\n  ${'ms'.padStart(7)} │ ${'cartel'.padEnd(16)} │ ${'por qué sigue'.padEnd(22)} │ vPed vVol │ pedidos`);
  console.log('  ' + '─'.repeat(7) + '─┼─' + '─'.repeat(16) + '─┼─' + '─'.repeat(22) + '─┼───────────┼────────');
  ms.forEach(m => {
    const marca = m.deSb ? ' (sb)' : '';
    console.log(`  ${String(m.t).padStart(7)} │ ${String(m.txt || '—').padEnd(16)} │ ${String(m.rama).padEnd(22)} │ ${String(m.vPed).padStart(4)} ${String(m.vVol).padStart(4)} │ ${String(m.nPed).padStart(5)}${marca}`);
  });
}

/* El primer instante en que el cartel deja de decir "Actualizando…" y no
   vuelve. "No vuelve" importa: al llegar el volcado el ERP puede prenderlo otra
   vez, y quedarse con el primer apagón contaría una historia más linda que la
   que Tadeo ve. */
function cuandoSeApaga(ms) {
  for (let i = 0; i < ms.length; i++) {
    if (/Actualizando/.test(ms[i].txt)) continue;
    if (ms.slice(i).every(x => !/Actualizando/.test(x.txt))) return ms[i];
  }
  return null;
}

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SAMPLER });
    await cli.enviar('Page.navigate', { url: URL });

    /* ── 1. EL ARRANQUE ───────────────────────────────────────────────────── */
    const limite = Date.now() + 45000;
    while (Date.now() < limite) {
      const listo = await ev(cli, `(function(){return !!(window.D && D.pedidos && D.pedidos.length);})()`);
      if (listo === true) break;
      await dormir(400);
    }
    /* A Pedidos, que es la tab de la que se queja. El cartel es contextual: en
       Inicio mira tres fuentes y en Pedidos una, así que medirlo en la tab
       equivocada mediría otra cosa. */
    await ev(cli, `(function(){ try{ go('pedidos'); }catch(e){} return 1; })()`);
    await dormir(35000);

    const arranque = await ev(cli, `(function(){ return {
      muestras: window.__cartel.muestras.slice(0, 40),
      total: window.__cartel.muestras.length,
      ultima: window.__cartel.ultima,
      errores: (window.__err || []).slice(0, 6)
    };})()`);

    console.log('\n════ 1. EL ARRANQUE (abrir la app y entrar a Pedidos) ════');
    tabla(arranque.muestras);
    const a = cuandoSeApaga(arranque.muestras);
    console.log(`\n  El cartel dejó de decir "Actualizando…" a los: ${a ? a.t + ' ms' : 'NO se apagó en la ventana medida'}`);
    if (arranque.errores.length) console.log('  errores en consola:', JSON.stringify(arranque.errores));

    /* ── 2. EL BOTÓN, con la app quieta ───────────────────────────────────── */
    const quieto = Date.now() + 45000;
    while (Date.now() < quieto) {
      const v = await ev(cli, `(function(){return ((window._frescoVuelo&&window._frescoVuelo.pedidos)||0)+((window._frescoVuelo&&window._frescoVuelo.volcado)||0);})()`);
      if (v === 0) break;
      await dormir(500);
    }
    await dormir(2000);

    await ev(cli, `(function(){ window.__cartel.muestras=[]; window.__cartel.t0=Date.now(); window.__cartel.arranque=false;
      try{ loadRapido({soloPedidos:true}); }catch(e){ window.__cartel.crash=String(e); }
      return 1; })()`);
    await dormir(25000);

    const boton = await ev(cli, `(function(){ return {
      muestras: window.__cartel.muestras.slice(0, 40),
      crash: window.__cartel.crash || '',
      errores: (window.__err || []).slice(0, 6)
    };})()`);

    console.log('\n════ 2. EL BOTÓN ↻ (la app ya abierta y quieta) ════');
    tabla(boton.muestras);
    const b = cuandoSeApaga(boton.muestras);
    console.log(`\n  El cartel dejó de decir "Actualizando…" a los: ${b ? b.t + ' ms' : 'NO se apagó en 25 s'}`);
    if (boton.crash) console.log('  CRASH:', boton.crash);

    /* ── El veredicto ─────────────────────────────────────────────────────── */
    const todas = arranque.muestras.concat(boton.muestras);
    const porVolcado = todas.filter(m => m.rama === 'volcado');
    const mudo = todas.filter(m => m.rama === 'no-pude-preguntar');
    console.log('\n════ VEREDICTO ════');
    /* Tres estados, no dos: "no pude preguntar" tiene que verse, o se lee como
       "no pasa nada". Ver [[un-control-no-puede-decir-coincide-sobre-lo-que-no-miro]]. */
    if (mudo.length === todas.length) {
      console.log('  NO PUDE MEDIR: `_frescoVolando` no está en window.');
      console.log('  El veredicto de abajo no significa nada — arreglá el acceso primero.');
    } else if (porVolcado.length) {
      const p = porVolcado[porVolcado.length - 1];
      const atraso = p.llegoPed && p.desdeVol ? Math.round((p.desdeVol - p.llegoPed) / 1000) : '?';
      console.log(`  El cartel siguió prendido por la rama del VOLCADO en ${porVolcado.length} muestras.`);
      console.log(`  Los pedidos figuran llegados ${atraso} s ANTES de que saliera el volcado,`);
      console.log('  así que `_frescoLlego.pedidos < _frescoVueloDesde.volcado` y el cartel');
      console.log('  espera al volcado entero.');
    } else {
      console.log('  La rama del volcado NO mantuvo el cartel prendido en esta corrida.');
      console.log('  Mirá la columna "por qué sigue" de las tablas de arriba.');
    }
    if (mudo.length && mudo.length !== todas.length) {
      console.log(`  (en ${mudo.length} muestras no se pudo preguntar; no cuentan)`);
    }
  } finally {
    try { cli.matar(); } catch (e) {}
    process.exit(0);
  }
})();
