/* ¿Se puede EDITAR un cliente desde CRM > Personas? (21/9/2026)

   Tadeo pidio "poder filtrar, editar, crear, borrar todo lo que querramos". Esto
   mide el editar, con datos REALES y sin escribir una sola celda: el POST se
   intercepta y se mira lo que IBA a mandar.

   Lo que de verdad hay que sostener es `crmupdateclientemeta-pisa-14-columnas`:
   el endpoint reescribe las 14 primeras columnas de un saque, asi que si el
   formulario manda un campo vacio, ese dato se BORRA en la planilla sin avisar.
   Por eso el test no pregunta "guardo?" sino "que manda?".

   TOKEN=... node probar_editar_desde_personas.js
*/
'use strict';
const T = 'C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(T + 'cdp.js');
const prep = require(T + 'sesion_prep.js');
const TOKEN = process.env.TOKEN;
const BASE = 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};

/* El PREP sin stub de POST (el CRM no carga con los POST mentidos), pero con un
   espia que GUARDA el body y no lo deja salir. Escribir de verdad en la planilla
   de produccion para "probar" seria el peor test posible. */
const ESPIA = `
window.__posts = [];
(function(){ var o = window.fetch;
  window.fetch = function(u, x){
    if (x && String(x.method||'').toUpperCase() === 'POST'){
      try { window.__posts.push(JSON.parse(x.body)); } catch(e){ window.__posts.push({crudo:String(x.body).slice(0,300)}); }
      return Promise.resolve(new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}}));
    }
    return o.apply(this, arguments);
  };
})();`;

(async () => {
  const p = prep(TOKEN).replace(/\(function\(\)\{var o=window\.fetch;[\s\S]*?\}\)\(\);/, '');
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: p + ESPIA });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, "typeof go==='function'", 60000)) { console.log('  el ERP no arranco'); process.exit(1); }
    await evaluar(cli, 'go("estancias")');
    await pausa(1500);
    await evaluar(cli, 'window.estSwitch && estSwitch("clientes")');
    if (!await esperar(cli, "document.querySelectorAll('#estCliList .est-cli-card, #estCliList .crm-card, #estCliList [onclick]').length > 5")) {
      const h = await evaluar(cli, "(document.getElementById('estCliList')||{}).innerHTML ? document.getElementById('estCliList').innerHTML.slice(0,400) : 'SIN #estCliList'");
      console.log('  la lista no dibujo. ' + h); process.exit(1);
    }
    console.log('\n== CRM > Personas: abrir ficha y editar · datos reales · sin escribir ==\n');

    // ── 1) Se abre una ficha desde la lista ──────────────────────────────
    const quien = await evaluar(cli, `(function(){
      var f = document.querySelector('#estCliList [onclick*="crmOpenCliente"]');
      if(!f) return null;
      var nm = f.querySelector('.est-cli-name, .crm-card-name, .hoy-row-name');
      var t = nm ? nm.textContent.trim() : f.textContent.trim().slice(0,40);
      f.click(); return t;
    })()`);
    chk('una tarjeta de la lista abre la ficha', !!quien, quien);
    // La clase del cajon abierto es `on`, no `open` (lo dice `crmCloseDrawer`).
    const abrio = await esperar(cli, "!!document.querySelector('#crmDrawer.on')", 40000);
    chk('el cajon de la ficha se abre', abrio === true);
    await pausa(1500);

    // ── 2) El boton de editar existe y abre el formulario ────────────────
    const hayBtn = await evaluar(cli, `(function(){
      var b = [].slice.call(document.querySelectorAll('button, .crm-act, [onclick]'))
        .filter(function(x){ return /crmEditarMeta|Editar ficha/i.test((x.getAttribute('onclick')||'') + ' ' + x.textContent); })[0];
      if(!b) return false; b.click(); return true;
    })()`);
    chk('hay boton "Editar ficha" y se puede tocar', hayBtn === true);
    const hayForm = await esperar(cli, "!!document.getElementById('metaNombre')", 20000);
    chk('el formulario de la ficha aparece', hayForm === true);

    // ── 3) LOS 14 CAMPOS: ninguno llega vacio si la planilla lo tenia ────
    const campos = await evaluar(cli, `(function(){
      var ids = ['metaNombre','metaApodo','metaCumple','metaAlias','metaTags','metaNotas',
                 'metaSubMapa','metaLoteMapa','metaBarrioMapa','metaCanalMapa','metaTel'];
      var out = {};
      ids.forEach(function(i){ var e=document.getElementById(i); out[i] = e ? (e.value===''?'(vacio)':e.value) : '(NO EXISTE)'; });
      out._sinUbic = document.getElementById('metaSinUbic') ? 'si' : '(NO EXISTE)';
      out._canalesExtra = document.querySelectorAll('.metaCanalExtra').length;
      out._nombresAlt = document.querySelectorAll('.metaAltChk').length;
      /* El campo Barrio ofrece los que YA existen: es lo que evita que nazca el
         proximo "San Fransisco". Sin opciones, el datalist no sirve de nada. */
      var dl = document.getElementById('metaBarrioOpts');
      out._barriosOfrecidos = dl ? dl.querySelectorAll('option').length : '(NO EXISTE)';
      out._barrioUsaLista = (document.getElementById('metaBarrioMapa')||{}).getAttribute
        ? document.getElementById('metaBarrioMapa').getAttribute('list') : null;
      return out;
    })()`);
    console.log('\n  ── el formulario, tal como llega ──');
    Object.keys(campos).forEach(k => console.log('    ' + k.padEnd(18) + String(campos[k]).slice(0, 60)));
    const faltan = Object.keys(campos).filter(k => campos[k] === '(NO EXISTE)');
    chk('los 12 campos editables existen en el formulario', faltan.length === 0, faltan);
    chk('el campo Barrio esta enganchado a la lista', campos._barrioUsaLista === 'metaBarrioOpts', campos._barrioUsaLista);
    chk('la lista ofrece los barrios que ya existen', typeof campos._barriosOfrecidos === 'number' && campos._barriosOfrecidos > 20, campos._barriosOfrecidos);

    // ── 4) Guardar manda LOS 14, no solo lo que toque ───────────────────
    await evaluar(cli, "document.getElementById('metaNotas').value = 'PRUEBA-NO-GUARDAR'");
    await evaluar(cli, 'window.crmGuardarMeta && crmGuardarMeta()');
    await pausa(1200);
    const post = await evaluar(cli, "(window.__posts||[]).filter(function(p){return p.action==='crmUpdateClienteMeta';})[0] || null");
    chk('tocar Guardar dispara crmUpdateClienteMeta', !!post);
    if (post) {
      const ESPERADOS = ['tel','nombreCanonico','cumple','aliasMp','tags','notas','apodo',
        'nombresOcultos','subBarrioMapa','loteMapa','sinUbicacion','barrioMapa','canalMapa','canalesExtra'];
      const ausentes = ESPERADOS.filter(k => !(k in post));
      chk('el body manda los 14 campos (si falta uno, se BORRA la columna)', ausentes.length === 0, ausentes);
      chk('la nota editada viaja', post.notas === 'PRUEBA-NO-GUARDAR', post.notas);
      console.log('\n  ── lo que IBA a la planilla (no se mando) ──');
      Object.keys(post).forEach(k => console.log('    ' + k.padEnd(18) + JSON.stringify(post[k]).slice(0, 70)));
    }

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
