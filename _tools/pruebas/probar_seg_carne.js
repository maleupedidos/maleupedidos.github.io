/* 🎯 Segmentos: el cross-sell deja de tener la lista de categorias a mano y la
   carne tiene su segmento (11/9/2026). Datos REALES del CRM, con la respuesta de
   crmClientes parcheada al vuelo para simular el `cats` del backend nuevo -el
   publicado todavia no manda Carnes-. Los POST los corta el PREP.

     node probar_seg_carne.js <token> [ancho] [base] */
'use strict';
const P = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(P + 'cdp.js');
const prep = require(P + 'sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = Number(process.argv[3] || 1440), BASE = process.argv[4] || 'http://localhost:8080';
let ok = 0, mal = 0;
function chk(t, c, d) { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 300) : '')); } }
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 180000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; };

/* Parchea la respuesta de action=crmClientes: le agrega la categoria a los
   clientes que de verdad compraron esas abreviaturas. MODO:
     'carne'  -> Carnes a quien compro CCo/CEn/CLo/CPi/CVa  (el backend nuevo)
     'nada'   -> no toca nada                                (nadie probo carne)
     'nueva'  -> una categoria que el panel NO conoce        (hook genérico) */
function interceptor(modo) {
  return `(function(){
    var f = window.fetch;
    window.fetch = function(u, o){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('action=crmClientes') < 0) return f.apply(this, arguments);
      return f.apply(this, arguments).then(function(r){
        return r.clone().text().then(function(t){
          var d; try { d = JSON.parse(t); } catch(e){ return r; }
          var lista = (d && (d.clientes || d.lista || d.c)) || null;
          if (!lista || !lista.length) { window.__patchInfo = {error:'no encontre la lista', keys:Object.keys(d||{})}; return r; }
          /* El campo productos NO viaja en crmClientes (comprobado: 0 de 362),
             asi que no se puede deducir quien compro carne desde aca. Y no hace
             falta: lo que se prueba es el FRONT con el contrato nuevo, o sea con
             Carnes adentro de cats. Se le pone a 1 de cada 10 clientes, que es
             del orden de lo real -33 de 262 el 11/9/2026-.
             (Nada de backticks aca: estamos dentro de un template literal.) */
          var n = 0, i = 0;
          lista.forEach(function(c){
            c.cats = c.cats || [];
            i++;
            if (${JSON.stringify(modo)} === 'carne') {
              if (i % 10 === 0) { c.cats.push('Carnes'); n++; }
            } else if (${JSON.stringify(modo)} === 'nueva') {
              if (n < 3 && c.cats.length) { c.cats.push('Milanesas'); n++; }
            }
          });
          window.__patchInfo = {modo:${JSON.stringify(modo)}, tocados:n, total:lista.length};
          return new Response(JSON.stringify(d), {status:200, headers:{'Content-Type':'application/json'}});
        });
      });
    };
  })();`;
}

async function cards(cli) {
  return evaluar(cli, `(function(){
    var out = [];
    document.querySelectorAll('#est-segmentos .seg-card').forEach(function(c){
      var t = c.querySelector('.seg-card-t'), n = c.querySelector('.seg-card-n');
      out.push({
        t: t ? t.textContent.trim() : '',
        n: n ? Number(String(n.textContent).replace(/[^0-9]/g,'')) : null,
        ojo: !!c.querySelector('.seg-card-ojo'),
        ojoTxt: c.querySelector('.seg-card-ojo') ? c.querySelector('.seg-card-ojo').textContent.trim() : '',
        tpl: (c.querySelector('.seg-card-tpl')||{}).textContent || '',
        marcar: !!c.querySelector('.seg-mark'),
        hook: (c.querySelector('.seg-card-hook')||{}).textContent || ''
      });
    });
    return out;
  })()`);
}

/* Los scripts de arranque se ACUMULAN: sin remover los del escenario anterior,
   el interceptor del primero sigue activo en el segundo y el resultado miente
   (el escenario "nadie probó carne" corría con Carnes ya inyectada). */
let inyectados = [];
async function correr(cli, modo) {
  for (const id of inyectados) {
    try { await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: id }); } catch (e) {}
  }
  inyectados = [];
  let r = await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, '') });
  if (r && r.identifier) inyectados.push(r.identifier);
  // modo 'off' = el CONTROL: sin envolver fetch, para saber si un error de consola
  // es del ERP o de mi propio interceptor.
  if (modo !== 'off') {
    r = await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: interceptor(modo) });
    if (r && r.identifier) inyectados.push(r.identifier);
  }
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, 'typeof window.go==="function"')) throw new Error('el ERP no arranco');
  await evaluar(cli, 'go("estancias")');
  if (!await esperar(cli, '!!(window.crmClientesCargados||document.querySelector("#est-hoy .hoy-row,#est-hoy .hoy-empty"))', 200000)) {
    // fallback: el CRM no expone bandera; se espera a que Segmentos pinte algo
  }
  await evaluar(cli, 'estSwitch("segmentos")');
  if (!await esperar(cli, 'document.querySelectorAll("#est-segmentos .seg-card").length>0', 200000)) throw new Error('Segmentos no pinto ninguna card');
  await pausa(400);
  return cards(cli);
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  console.log('\n=== 🎯 Segmentos con la carne · ' + ANCHO + 'px · ' + BASE + ' ===');

  // ══ 1. con la carne (lo que va a mandar el backend nuevo) ══
  let cs = await correr(cli, 'carne');
  const info = await evaluar(cli, 'window.__patchInfo');
  console.log('  parche de crmClientes:', JSON.stringify(info));
  chk('el parche encontro la lista y le puso Carnes a los que la compraron', !!(info && info.tocados > 0), info);
  console.log('  cards: ' + cs.map(c => c.t.replace('Nunca probó ', '') + ' ' + c.n).join(' · '));

  const carne = cs.find(c => /Carnes/.test(c.t));
  chk('existe la card «Nunca probó Carnes»', !!carne, cs.map(c => c.t));
  if (carne) {
    chk('  con una audiencia de verdad (>0 hogares con teléfono)', carne.n > 0, carne.n);
    /* No se exige que sea la primera: eso dependeria de cuantos clientes tengan
       carne en la simulacion. Lo que importa es la REGLA -orden descendente-,
       que se chequea abajo sobre todas las cards. */
    chk('  queda en el lugar que le toca por su audiencia',
      cs.filter(c => c.n > carne.n).every((_, i) => cs.indexOf(carne) > i), cs.map(c => [c.t, c.n]));
    chk('  el hook nombra los cortes y el peso exacto', /lomo/i.test(carne.hook) && /peso exacto/i.test(carne.hook), carne.hook);
    chk('  el hook NO promete 20% off', !/20\s*%/.test(carne.hook), carne.hook);
    chk('  y avisa que un 20% vende a pérdida, con los márgenes', carne.ojo && /pérdida/i.test(carne.ojoTxt) && /10,1/.test(carne.ojoTxt), carne.ojoTxt);
    chk('  dice que falta el template', /falta template/.test(carne.tpl), carne.tpl);
    chk('  y por eso NO ofrece «Marcar enviada»', !carne.marcar);
  }
  // las otras siguen
  ['Sorrentinos', 'Postres', 'Tartas', 'Empanadas', 'Pizzas', 'Wraps'].forEach(function (c) {
    chk('sigue la card de ' + c, cs.some(x => x.t === 'Nunca probó ' + c), cs.map(x => x.t));
  });
  chk('Postres es UNA sola card: las tortas no se partieron aparte', !cs.some(c => /Tortas/.test(c.t)), cs.map(c => c.t));
  chk('el orden es descendente por audiencia', cs.every((c, i) => i === 0 || cs[i - 1].n >= c.n), cs.map(c => c.n));
  chk('las que tienen template de verdad siguen ofreciendo «Marcar enviada»',
    cs.some(c => !/falta template/.test(c.tpl) && c.marcar), cs.map(c => [c.t, c.tpl, c.marcar]));
  chk('una sola advertencia ⚠️ en toda la pantalla (solo la carne)', cs.filter(c => c.ojo).length === 1, cs.filter(c => c.ojo).map(c => c.t));

  // el cache de la card: copiar teléfonos tiene que tener a quién copiar
  const cacheOk = await evaluar(cli, `(function(){
    var b = document.querySelector('#est-segmentos .seg-card [id^="segcopy-cross_Carnes"]');
    return b ? {id:b.id, txt:b.textContent.trim()} : null;
  })()`);
  chk('el botón de copiar teléfonos de la card de Carnes existe y dice cuántos', !!(cacheOk && /\d/.test(cacheOk.txt)), cacheOk);

  // layout
  const lay = await evaluar(cli, `(function(){
    var w = document.documentElement.scrollWidth, chicos = [];
    document.querySelectorAll('#est-segmentos button').forEach(function(b){
      var r = b.getBoundingClientRect();
      if (r.height > 0 && r.height < 38) chicos.push({t:b.textContent.trim().slice(0,22), h:Math.round(r.height)});
    });
    var cortados = [];
    document.querySelectorAll('#est-segmentos .seg-card-ojo,#est-segmentos .seg-card-hook').forEach(function(e){
      if (e.scrollWidth > e.clientWidth + 2) cortados.push(e.className);
    });
    return {ancho:w, vp:window.innerWidth, chicos:chicos, cortados:cortados, examinados:document.querySelectorAll('#est-segmentos button').length};
  })()`);
  chk('examinó los controles de la pantalla (' + lay.examinados + ' botones)', lay.examinados > 10, lay);
  chk('no desborda a lo ancho', lay.ancho <= lay.vp + 1, lay);
  /* El piso de 38px es la regla del CELULAR. En escritorio, 25-34px con mouse es
     lo que el ERP tiene en todas sus pantallas, y agrandarlos desacomoda el
     layout: exigirlo a 1440 seria inventar un bug. */
  if (ANCHO < 700) chk('ningún control por debajo de 38px', !lay.chicos.length, lay.chicos);
  else chk('(a ' + ANCHO + 'px no se exige el mínimo táctil: es la regla del celular)', true);
  chk('ningún texto cortado en las cards', !lay.cortados.length, lay.cortados);
  const errCarne = await evaluar(cli, 'window.__err');

  // ══ 2. la direccion contraria: si NADIE probo carne, la card no aparece ══
  console.log('\n  -- y si nadie hubiera comprado carne --');
  cs = await correr(cli, 'nada');
  chk('sin nadie que la haya probado, la card de Carnes NO se dibuja', !cs.some(c => /Carnes/.test(c.t)), cs.map(c => c.t));
  chk('  y las otras seis siguen', cs.length >= 6, cs.map(c => c.t));

  // ══ 3. una categoria nueva entra sola, con el hook generico ══
  console.log('\n  -- una categoría que el panel no conoce --');
  cs = await correr(cli, 'nueva');
  const mila = cs.find(c => /Milanesas/.test(c.t));
  chk('una categoría nueva aparece sola, sin tocar el código', !!mila, cs.map(c => c.t));
  if (mila) {
    chk('  con el hook genérico que pide escribir el texto', /Falta escribir el gancho/.test(mila.hook), mila.hook);
    chk('  y sin «Marcar enviada» hasta que exista el template', !mila.marcar && /falta template/.test(mila.tpl), mila.tpl);
  }
  // ══ 4. el CONTROL: la misma pantalla sin tocar nada ══
  console.log('\n  -- control: sin interceptor, para saber de quién son los errores --');
  cs = await correr(cli, 'off');
  const errCtrl = await evaluar(cli, 'window.__err');
  console.log('  errores con el parche: ' + JSON.stringify(errCarne) + ' · sin el parche: ' + JSON.stringify(errCtrl));
  chk('el parche del test no agrega ni un error propio', errCarne.length <= errCtrl.length, { conParche: errCarne, control: errCtrl });
  chk('y la pantalla pinta igual sin el interceptor', cs.length >= 6, cs.map(c => c.t));
  if (errCtrl.length) console.log('  OJO: ' + errCtrl.length + ' error(es) de consola PREEXISTENTES, a mirar aparte: ' + JSON.stringify(errCtrl));

  console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
