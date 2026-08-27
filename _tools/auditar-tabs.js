#!/usr/bin/env node
/*
 * auditar-tabs.js — revisa Ruta y Abastecimiento en un Chrome de verdad.
 *
 *   node _tools/servir.js          (en otra terminal: hace falta el servidor)
 *   node _tools/auditar-tabs.js
 *
 * Por que existe. humo.js contesta "arranca / no arranca". Esto contesta algo
 * distinto: "arranca, pero se ve o se comporta mal". Son los bugs que reporta
 * Tadeo y que ninguna otra herramienta agarra, porque NO TIRAN ERROR:
 *
 *   - el scroll trabado (26/8) — un contenedor que dice "yo manejo mi scroll"
 *     y no tiene nada que scrollear;
 *   - RESUMEN todo corrido (26/8) — una clase del panel, sin acotar, pisando
 *     el display de un <tr> de la tab;
 *   - "+ NUEVO" en blanco (26/8) — dos ids iguales en el documento fusionado;
 *   - el ↻ que no actualizaba nada (25/8) — el build inyectaba una version
 *     distinta de la que estaba escrita en la fuente;
 *   - tocar una tab en el primer segundo (27/8) — go() existe antes que el
 *     motor, y reventaba con "_abrirSubapp is not defined".
 *
 * ── Lo que aprendi midiendo esto ──
 *
 * La primera version buscaba la CAUSA: "que reglas del panel tocan a esta
 * tab". Daba 13 casos y 12 eran inofensivos (si la tab declara la propiedad,
 * gana por especificidad). Un instrumento con 92% de ruido no se usa.
 *
 * Ahora mide el EFECTO: abre la tab SOLA (?standalone=1), la abre FUSIONADA, y
 * compara elemento por elemento. Una diferencia real es una diferencia real,
 * sin importar que regla la causo. Bajo de 13 a 1, y ese 1 era estado de carga.
 *
 * NO reemplaza mirar la pantalla. Encuentra patrones conocidos, no fealdad.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';
const BASE = process.env.BASE || 'http://localhost:8080';
const VUELTAS_CARRERA = Number(process.env.VUELTAS || 6);

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
];

// clave del motor · como se llama · su contenedor · tab del panel · su archivo · la funcion del ↻
const TABS = [
  { clave: 'ruta', nombre: 'Ruta', cont: 'pg-ruta', tab: 'ruta', archivo: 'ruta.html', fn: 'refresh' },
  { clave: 'abast', nombre: 'Abastecimiento', cont: 'pg-abast', tab: 'busqueda', archivo: 'busqueda.html', fn: 'abaRefresh' },
  { clave: 'miportal', nombre: 'Mi Portal', cont: 'pg-miportal', tab: 'miportal', archivo: 'red.html', fn: 'refreshPortal' }
];

/* Diferencias ya miradas y aceptadas. Son CSS del panel sin acotar que le
 * llega a una tab, en propiedades que la tab no declara — el mismo patron que
 * rompio RESUMEN el 26/8, pero aca es cosmetico: cambia el grosor de la letra,
 * no el layout. Se dejan como estan a proposito: el resultado fusionado se ve
 * bien, y tocar CSS sin mirar la pantalla es como se rompen cosas.
 *
 * Si aparece una diferencia que NO este en esta lista, es nueva y hay que
 * mirarla. Ese es el punto de tener la lista. */
const ACEPTADAS = {
  'redToastBox|font-weight': '.toast del panel (500 en vez de 400)',
  'login-err|font-weight': '.login-err del panel (600 en vez de 400) - ese login no se ve adentro del ERP'
};

const PROPS = ['display', 'position', 'float', 'flex-direction', 'grid-template-columns',
  'box-sizing', 'white-space', 'text-align', 'visibility', 'overflow-x', 'overflow-y',
  'font-size', 'font-weight', 'line-height', 'z-index', 'flex-wrap', 'align-items',
  'justify-content', 'table-layout', 'vertical-align'];

const SESION = `
  try{
    localStorage.setItem('maleu_panel_session', JSON.stringify({
      usuario:'audit', nombre:'Auditoria', rol:'admin',
      tabs:['inicio','pedidos','pedidoshome','caja','pagos','ruta','busqueda','miportal','bbdd','ventas','ajustes']
    }));
    localStorage.setItem('maleu_token','audit-token');
    localStorage.setItem('maleu_red_session', JSON.stringify({vendedor:'audit', nombre:'Auditoria'}));
  }catch(e){}
  window.alert=function(){}; window.confirm=function(){return false;}; window.prompt=function(){return null;};
`;

const PREPARAR = '(function(){' + SESION + '})();';

/* Para la prueba de la carrera: tocar la tab APENAS go() existe, que es el
   peor momento posible, y anotar si el motor ya estaba. */
const PREPARAR_CARRERA = (tab) => `(function(){${SESION}
  window.__r=null; var T0=Date.now();
  var iv=setInterval(function(){
    if(typeof window.go!=='function'){ if(Date.now()-T0>15000)clearInterval(iv); return; }
    clearInterval(iv);
    var r={ms:Date.now()-T0, motor:(typeof window._abrirSubapp==='function')};
    try{ go('${tab}'); r.tiro=false; }catch(e){ r.tiro=true; r.err=e.message; }
    window.__r=r;
  },5);
})();`;

/* ── sondas ───────────────────────────────────────────────────────────── */

/** Contenedores que se declaran duenos de su scroll sin tener nada que
 *  scrollear. Si ademas frenan el rebote, la rueda muere ahi. */
const sondaScroll = (cont) => `(function(){
  var raiz=document.getElementById('${cont}'); if(!raiz)return [];
  var malos=[];
  [raiz].concat([].slice.call(raiz.querySelectorAll('*'))).forEach(function(el){
    var cs=getComputedStyle(el);
    if(cs.display==='none')return;
    var oy=cs.overflowY;
    if(oy!=='auto'&&oy!=='scroll')return;
    if(el.scrollHeight>el.clientHeight+1)return;
    var ob=cs.overscrollBehaviorY||cs.overscrollBehavior||'auto';
    if(ob==='none'||ob==='contain'){
      malos.push({tag:el.tagName.toLowerCase(),
        sel:(el.id?'#'+el.id:'')+(typeof el.className==='string'&&el.className.trim()?'.'+el.className.trim().split(/\\s+/).join('.'):''),
        ob:ob});
    }
  });
  return malos;
})()`;

/** Lo que se sale de la pantalla a lo ancho sin que un padre lo recorte. */
const sondaDesborde = (cont) => `(function(){
  var raiz=document.getElementById('${cont}'); if(!raiz)return [];
  var W=document.documentElement.clientWidth, malos=[];
  [].slice.call(raiz.querySelectorAll('*')).forEach(function(el){
    var cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden')return;
    var r=el.getBoundingClientRect();
    if(r.width===0||r.height===0)return;
    if(r.right<=W+1&&r.left>=-1)return;
    var p=el.parentElement, tapado=false;
    while(p&&p!==raiz){ var pc=getComputedStyle(p);
      if(pc.overflowX==='auto'||pc.overflowX==='scroll'||pc.overflowX==='hidden'){tapado=true;break;}
      p=p.parentElement; }
    if(tapado)return;
    malos.push({tag:el.tagName.toLowerCase(), id:el.id||'',
      clase:(typeof el.className==='string'?el.className.slice(0,40):''),
      izq:Math.round(r.left), der:Math.round(r.right), ancho:W});
  });
  return malos.slice(0,10);
})()`;

/** Controles que quedarian abajo del reloj del iPhone. Se simula la muesca,
 *  porque en un navegador sin muesca env(safe-area-inset-top) siempre vale 0
 *  y el bug es invisible. */
const sondaNotch = (cont) => `(function(){
  var st=document.createElement('style');
  st.textContent=':root{--sat:47px !important;--sab:34px !important}';
  document.head.appendChild(st);
  var raiz=document.getElementById('${cont}');
  if(!raiz){st.remove();return [];}
  var malos=[];
  [].slice.call(raiz.querySelectorAll('*')).forEach(function(el){
    var cs=getComputedStyle(el);
    if(cs.position!=='fixed'&&cs.position!=='sticky')return;
    if(cs.display==='none'||cs.visibility==='hidden')return;
    var r=el.getBoundingClientRect();
    if(r.height===0||r.bottom<=0)return;
    // Un fondo que cubre toda la pantalla (un loader, un modal) arranca en 0
    // a proposito: no es un control que quede abajo del reloj.
    if(r.height>=innerHeight*0.9 && r.width>=innerWidth*0.9)return;
    if(r.top<47){
      malos.push({tag:el.tagName.toLowerCase(), id:el.id||'',
        clase:(typeof el.className==='string'?el.className.slice(0,40):''),
        top:Math.round(r.top), pos:cs.position});
    }
  });
  st.remove();
  return malos;
})()`;

/** Todas las propiedades de layout de cada elemento con id, para comparar la
 *  tab suelta contra la fusionada. */
const cosecha = (raizExpr) => `(function(){
  var raiz=${raizExpr}; if(!raiz)return null;
  var P=${JSON.stringify(PROPS)}, out={};
  [].slice.call(raiz.querySelectorAll('[id]')).forEach(function(el){
    var cs=getComputedStyle(el);
    var o={_tag:el.tagName.toLowerCase(), _visible:el.getClientRects().length>0};
    P.forEach(function(p){ o[p]=cs.getPropertyValue(p); });
    out[el.id]=o;
  });
  return out;
})()`;

/** El ↻ de punta a punta: espia la funcion de la tab y mira que pasa. */
const sondaRefresh = (fn) => `(function(){
  var b=document.getElementById('hdrRefresh');
  if(!b)return {err:'no existe el boton'};
  b.classList.remove('spinning','err');
  var _ld=function(){ var l=document.getElementById('loaderOverlay');
    return !!(l && getComputedStyle(l).display!=='none' && l.offsetHeight>0 &&
              getComputedStyle(l).opacity!=='0'); };
  var antes=_ld();
  window.__espia={n:0,args:null,resolver:null};
  window['${fn}']=function(){
    window.__espia.n++; window.__espia.args=[].slice.call(arguments);
    return new Promise(function(res){ window.__espia.resolver=res; });
  };
  try{ refreshContextual(); }catch(e){ return {err:'refreshContextual: '+e.message}; }
  return { n:window.__espia.n, args:JSON.stringify(window.__espia.args),
           girando:b.classList.contains('spinning'),
           tapa:_ld()&&!antes };
})()`;

const sondaRefreshFin = () => `(function(){
  window.__espia.resolver && window.__espia.resolver(true);
  return new Promise(function(res){ setTimeout(function(){
    var b=document.getElementById('hdrRefresh');
    res({girando:b.classList.contains('spinning'), err:b.classList.contains('err')});
  },400); });
})()`;

const sondaRefreshFalla = (fn) => `(function(){
  var b=document.getElementById('hdrRefresh'); b.classList.remove('spinning','err');
  window['${fn}']=function(){ return Promise.reject(new Error('probando')); };
  try{ refreshContextual(); }catch(e){ return {err:e.message}; }
  return new Promise(function(res){ setTimeout(function(){
    res({girando:b.classList.contains('spinning'), err:b.classList.contains('err')});
  },500); });
})()`;

/* ── plomeria CDP ─────────────────────────────────────────────────────── */

function buscarChrome() {
  for (const c of CHROMES) if (fs.existsSync(c)) return c;
  console.error(RED + 'X No encontre Chrome ni Edge' + RST);
  process.exit(1);
}

async function esperarPagina(puerto) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + puerto + '/json/list');
      const l = await r.json();
      const p = l.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (p) return p.webSocketDebuggerUrl;
    } catch (err) { /* todavia no levanto */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrio el puerto de depuracion');
}

function conectar(url) {
  const ws = new WebSocket(url);
  let id = 0; const pend = new Map(); const oyentes = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) {
      const { ok, mal } = pend.get(m.id); pend.delete(m.id);
      m.error ? mal(new Error(m.error.message)) : ok(m.result);
    } else if (m.method) oyentes.forEach((f) => f(m.method, m.params));
  });
  const listo = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('no pude conectar a Chrome')));
  });
  return {
    listo,
    enviar(me, pa) {
      return new Promise((ok, mal) => {
        const i = ++id; pend.set(i, { ok, mal });
        ws.send(JSON.stringify({ id: i, method: me, params: pa || {} }));
      });
    },
    escuchar(f) { oyentes.push(f); },
    cerrar() { try { ws.close(); } catch (e) { /* ya cerrado */ } }
  };
}

// Ruido esperable al abrir el ERP sin backend. Nada de esto es un bug.
const RUIDO = [
  /Failed to fetch/i, /net::ERR_/i, /NetworkError/i, /Access to fetch/i, /CORS/i,
  /service ?worker/i, /Failed to load resource/i, /manifest/i, /favicon/i,
  // el panel pinta sus tabs con la sesion falsa pero sin datos: `D` no llega
  /render -> \w+ TypeError/,
  // y las tabs tampoco pueden traer los suyos
  /^\[\w+\] refresh error:/
];

/* ── el trabajo ───────────────────────────────────────────────────────── */

async function main() {
  const puerto = 9500 + Math.floor(Math.random() * 400);
  const perfil = path.join(os.tmpdir(), 'auditar-' + Date.now());
  const chrome = buscarChrome();

  try {
    const r = await fetch(BASE + '/app.html');
    if (!r.ok) throw new Error('el servidor contesto ' + r.status);
  } catch (e) {
    console.error(RED + '\nX No hay servidor en ' + BASE + RST);
    console.error('  Levantalo en otra terminal:  node _tools/servir.js\n');
    process.exit(1);
  }

  console.log('\n== AUDITAR las tabs del ERP ==');
  console.log(DIM + '  ' + path.basename(chrome) + '  ' + BASE + '  ventana de iPhone (390x844)' + RST);

  const proc = spawn(chrome, [
    '--headless=new', '--remote-debugging-port=' + puerto,
    '--user-data-dir=' + perfil, '--no-first-run', '--disable-gpu',
    '--window-size=390,844', 'about:blank'
  ], { stdio: 'ignore' });

  let problemas = 0;
  const mal = (n) => { problemas += n; };

  try {
    const cli = conectar(await esperarPagina(puerto));
    await cli.listo;
    await cli.enviar('Runtime.enable');
    await cli.enviar('Page.enable');

    const consola = [];
    cli.escuchar((m, p) => {
      if (m === 'Runtime.exceptionThrown') {
        const d = p.exceptionDetails;
        consola.push((d.exception && d.exception.description) || d.text);
      } else if (m === 'Runtime.consoleAPICalled' && p.type === 'error') {
        consola.push(p.args.map((a) => a.value || a.description || '').join(' '));
      }
    });

    const ev = async (expr) => {
      const r = await cli.enviar('Runtime.evaluate',
        { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
      return r.result.value;
    };
    const irYEsperar = async (url, cond, vueltas = 120) => {
      await cli.enviar('Page.navigate', { url });
      for (let i = 0; i < vueltas; i++) {
        try { if (await ev(cond)) return true; } catch (e) { /* cargando */ }
        await new Promise((r) => setTimeout(r, 200));
      }
      return false;
    };
    const ok = (c, t) => console.log('    ' + (c ? GRN + 'OK  ' : RED + 'MAL ') + RST + t);

    /* ── 1) cada tab, sola contra fusionada ── */
    for (const t of TABS) {
      console.log('\n' + YEL + '── ' + t.nombre + RST);

      await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREPARAR });
      if (!await irYEsperar(BASE + '/' + t.archivo + '?standalone=1', 'document.readyState==="complete"')) {
        console.log('    ' + RED + 'no carga suelta' + RST); mal(1); continue;
      }
      await new Promise((r) => setTimeout(r, 1500));
      const sola = await ev(cosecha('document.body'));

      if (!await irYEsperar(BASE + '/app.html?prueba=1',
        `typeof _abrirSubapp==='function' && !!document.getElementById('${t.cont}')`)) {
        console.log('    ' + RED + 'el ERP no carga' + RST); mal(1); continue;
      }
      await ev(`try{ go('${t.tab}'); }catch(e){}`);
      await new Promise((r) => setTimeout(r, 2000));

      if (!await ev(`!!(window._subappsVivas&&window._subappsVivas['${t.clave}'])`)) {
        console.log('    ' + RED + 'no arranco' + RST); mal(1); continue;
      }

      const junta = await ev(cosecha(`document.getElementById('${t.cont}')`));
      if (sola && junta) {
        const ids = Object.keys(sola).filter((k) => junta[k]);
        const dif = [], sabidas = [];
        // Solo lo que se RENDERIZA en las dos: si esta oculto de un lado, su
        // display computado no dice nada (un span hijo de un flex se
        // blockifica al renderizarse; sin renderizar, no).
        const comparables = ids.filter((k) => sola[k]._visible && junta[k]._visible);
        comparables.forEach((id) => PROPS.forEach((p) => {
          if (sola[id][p] === junta[id][p]) return;
          const d = { id, tag: sola[id]._tag, p, a: sola[id][p], b: junta[id][p] };
          (ACEPTADAS[id + '|' + p] ? sabidas : dif).push(d);
        }));
        if (dif.length) {
          mal(dif.length);
          console.log('    ' + RED + 'se ve distinto que la tab sola (' + dif.length + ')' + RST);
          dif.slice(0, 8).forEach((d) => console.log('      #' + d.id + ' <' + d.tag + '> ' + d.p +
            ':  sola=' + String(d.a).slice(0, 26) + '  junta=' + String(d.b).slice(0, 26)));
        } else {
          ok(true, 'se ve igual que la tab sola (' + comparables.length + ' elementos a la vista)');
          sabidas.forEach((d) => console.log('      ' + DIM + 'sabido: #' + d.id + ' ' + d.p +
            ' ' + d.a + '->' + d.b + '  ' + ACEPTADAS[d.id + '|' + d.p] + RST));
        }
      }

      const scroll = await ev(sondaScroll(t.cont));
      if (scroll.length) {
        mal(scroll.length);
        ok(false, 'trampa de scroll (' + scroll.length + ')');
        scroll.forEach((s) => console.log('      ' + s.tag + ' ' + s.sel + '  overscroll:' + s.ob));
      } else ok(true, 'el scroll no se traba');

      const des = await ev(sondaDesborde(t.cont));
      if (des.length) {
        mal(des.length);
        ok(false, 'se sale de la pantalla (' + des.length + ')');
        des.forEach((d) => console.log('      <' + d.tag + (d.id ? ' id=' + d.id : '') +
          (d.clase ? ' .' + d.clase : '') + '>  ' + d.izq + '..' + d.der + ' de ' + d.ancho));
      } else ok(true, 'nada se sale a lo ancho');

      const notch = await ev(sondaNotch(t.cont));
      if (notch.length) {
        mal(notch.length);
        ok(false, 'quedaria abajo del reloj del iPhone (' + notch.length + ')');
        notch.forEach((n) => console.log('      <' + n.tag + (n.id ? ' id=' + n.id : '') +
          (n.clase ? ' .' + n.clase : '') + '>  top:' + n.top));
      } else ok(true, 'nada abajo del reloj del iPhone');

      /* el ↻ */
      const r1 = await ev(sondaRefresh(t.fn));
      if (r1.err) { mal(1); ok(false, 'el ↻: ' + r1.err); }
      else {
        if (r1.n !== 1) mal(1);
        ok(r1.n === 1, 'el ↻ llama a ' + t.fn + '() una vez' + (r1.args !== '[]' ? DIM + '  ' + r1.args + RST : ''));
        if (!r1.girando) mal(1);
        ok(r1.girando, 'el ↻ queda girando');
        if (r1.tapa) mal(1);
        ok(!r1.tapa, 'el ↻ no tapa la pantalla');
        const f1 = await ev(sondaRefreshFin());
        if (f1.girando || f1.err) mal(1);
        ok(!f1.girando && !f1.err, 'al terminar deja de girar');
        const f2 = await ev(sondaRefreshFalla(t.fn));
        if (!(f2.err === true && f2.girando === false)) mal(1);
        ok(f2.err === true && f2.girando === false, 'si la tab falla, el ↻ lo dice');
      }
    }

    /* ── 2) tocar una tab en el primer segundo ── */
    console.log('\n' + YEL + '── Tocar una tab apenas la app responde' + RST);
    console.log(DIM + '    (el motor de tabs llega ~1 s despues que el panel: ahi reventaba)' + RST);
    for (const t of TABS) {
      let hueco = 0, reventaron = 0;
      await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREPARAR_CARRERA(t.tab) });
      for (let i = 0; i < VUELTAS_CARRERA; i++) {
        await irYEsperar(BASE + '/app.html?prueba=1', "!!window.__r && typeof _abrirSubapp==='function'");
        await new Promise((r) => setTimeout(r, 900));
        const d = await ev('window.__r||{}');
        if (!d.motor) hueco++;
        if (d.tiro) reventaron++;
      }
      if (reventaron) mal(reventaron);
      ok(!reventaron, t.nombre.padEnd(15) + ' ' + hueco + '/' + VUELTAS_CARRERA +
        ' toques adentro del hueco' + (reventaron ? RED + ' — ' + reventaron + ' revientan' + RST : ', ninguno revienta'));
    }

    const errores = [...new Set(consola.filter((t) => !RUIDO.some((re) => re.test(t))))];
    console.log('');
    if (errores.length) {
      mal(errores.length);
      console.log(RED + '  errores en consola (' + errores.length + '):' + RST);
      errores.slice(0, 8).forEach((e) => console.log('    ' + String(e).split('\n')[0].slice(0, 150)));
    } else console.log(GRN + '  consola limpia' + RST);

    cli.cerrar();
  } finally {
    proc.kill();
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* ya no esta */ }
  }

  console.log('');
  if (problemas) { console.log(RED + '  ' + problemas + ' cosa(s) para mirar.' + RST + '\n'); process.exit(1); }
  console.log(GRN + '  Las tres tabs limpias.' + RST + '\n');
}

main().catch((e) => { console.error(RED + '\nX ' + e.message + RST); process.exit(1); });
