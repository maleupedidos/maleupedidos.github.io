/* Escaneo general del ERP, como usuario, un lunes 20hs.
   Sesion real, POST interceptados (la planilla no se toca).
   Mide por tab: errores, tiempo hasta contenido, controles chicos, desborde,
   texto cortado y pantallas que no dicen nada. */
const { abrir, evaluar } = require('./cdp.js');
const T = ms => new Promise(r => setTimeout(r, ms));
const TOKEN = process.argv[2];
const ANCHO = Number(process.argv[3] || 1440);
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

const PREP = require('./sesion_prep.js')(TOKEN);

const MEDIR = `(function(){
  var pg=document.querySelector('.pg.on'); if(!pg) return {err:'sin pagina activa'};
  /* innerText SI lee un overlay con opacity:0 — solo display:none y
     visibility:hidden lo sacan. Por eso el escaner reportaba "ruta QUEDA EN
     CARGANDO tras 45s" mientras la pantalla pintaba perfecto a los 15: estaba
     leyendo el loader ya desvanecido. Se arma el texto VISIBLE a mano. */
  function _visible(el){
    for(var n=el; n && n!==document.body; n=n.parentElement){
      var cs=getComputedStyle(n);
      if(cs.display==='none'||cs.visibility==='hidden') return false;
      if(Number(cs.opacity)<0.05) return false;
    }
    return true;
  }
  var partes=[];
  (function rec(n){
    if(n.nodeType===3){ var s=String(n.nodeValue||'').trim(); if(s) partes.push(s); return; }
    if(n.nodeType!==1) return;
    var cs=getComputedStyle(n);
    if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05) return;
    for(var i=0;i<n.childNodes.length;i++) rec(n.childNodes[i]);
  })(pg);
  var txt=partes.join(' ').replace(/\\s+/g,' ').trim();
  var chicos=[], cortados=[], vacios=0;
  /* 38px es el PISO deliberado del ERP en el celular (regla .pg button:not(...)),
     no 44. Pedir 40 hacia que casi todo el ERP saliera marcado y el escaneo era
     ilegible: 1064 "controles chicos" en la tab Pedidos, todos correctos. */
  var minTactil = ${ANCHO} < 700 ? 38 : 28;
  pg.querySelectorAll('button,select,a.btn').forEach(function(el){
    var b=el.getBoundingClientRect();
    if(b.width<=0||b.height<=0) return;
    if(!_visible(el)) return;
    if(b.height<minTactil){
      var t=(el.textContent||'').trim().slice(0,16)||String(el.className||'').slice(0,16);
      chicos.push(t+' '+Math.round(b.height));
    }
  });
  pg.querySelectorAll('*').forEach(function(el){
    if(el.children.length) return;
    var t=(el.textContent||'').trim(); if(!t) return;
    var b=el.getBoundingClientRect(); if(b.width<=0) return;
    if(!_visible(el)) return;
    var cs=getComputedStyle(el);
    /* Un <text> de SVG no tiene un scrollWidth que signifique algo: Chrome
       devuelve 48, 1279 o 1092 para rotulos que caben perfecto, y el 11/9/2026
       el eje del grafico de 6 meses salia como "25 textos cortados". Para un SVG
       el corte que existe es otro —el rotulo que se sale del lienzo— y es uno de
       los tres modos de fallo reales de un grafico (ver graficos-del-erp). */
    var svg=el.ownerSVGElement;
    if(svg){
      var S=svg.getBoundingClientRect();
      if(b.left<S.left-1||b.right>S.right+1||b.top<S.top-1||b.bottom>S.bottom+1)
        cortados.push(t.slice(0,22));
      return;
    }
    /* Lo que scrollea no esta cortado, y ellipsis es un corte DELIBERADO. */
    if(cs.overflowX==='auto'||cs.overflowX==='scroll') return;
    if(cs.textOverflow==='ellipsis') return;
    if(el.scrollWidth>Math.ceil(b.width)+2) cortados.push(t.slice(0,22));
  });
  return {
    chars: txt.length,
    txt: txt.slice(0,240),
    cargando: /cargando|trayendo|armando|calculando|esperando el volcado|todav.a no lleg/i.test(txt),
    vacio: txt.length < 60,
    chicos: chicos.slice(0,8), nChicos: chicos.length,
    cortados: cortados.slice(0,5), nCortados: cortados.length,
    desborde: document.documentElement.scrollWidth-document.documentElement.clientWidth
  };})()`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
  await T(10000);
  const lg = await evaluar(cli, '(function(){var e=document.getElementById("loginScreen");' +
    'return e && getComputedStyle(e).display !== "none";})()');
  if (lg) { console.error('  ABORTA: la pantalla de login quedo encima — la sesion no entro'); process.exit(3); }

  /* Las tabs son los `div.pg` con id `p-<clave>`; se navega con `go(clave)`.
     Se saltean las 4 de Diagonal Carnes: son otro negocio y viven detrás del
     switch de arriba, no del cajón. */
  const lista = (await evaluar(cli, '(function(){return [].slice.call(document.querySelectorAll(".pg"))' +
    '.map(function(e){return {k:String(e.id||"").replace(/^p-/,""), t:String(e.id||"")};})' +
    '.filter(function(x){return x.k && x.k.indexOf("dg")!==0;});})()'))
    /* 4to argumento opcional: las tabs a escanear, separadas por coma
       (`node escanear_general.js <token> 390 caja,egresos`). Una auditoria de
       una tab no necesita pegarle al backend real con las 18. */
    .filter(x => !process.argv[4] || process.argv[4].split(',').indexOf(x.k) >= 0);

  /* ── SOLO LAS QUE TIENEN ENTRADA EN EL MENU (1/10/2026) ──
     No todo `div.pg` es una tab. `p-resumen` es la pagina suelta del resumen
     semanal: `go('resumen')` hasta la abre, pero **nadie puede llegar** —el
     PDF vive en Inicio desde el 14/9/2026— y su endpoint `resumenSemanal`
     esta dado de baja. Medido: se abre, pinta 48 caracteres que no se ven, y
     a los 45 s el chequeo de roles la vuelve a esconder.
     El escaner la reportaba como "PANTALLA VACIA" en cada corrida. Un ⚠ que
     nadie puede cerrar entrena a ignorar los ⚠ que si importan, y este costo
     una hora de perseguir un fantasma. Se listan aparte, sin alarma. */
  const enMenu = await evaluar(cli, '(function(){var s={};' +
    '[].slice.call(document.querySelectorAll("[data-p]")).forEach(function(e){s[e.getAttribute("data-p")]=1;});' +
    'return Object.keys(s);})()');
  const sueltasDOM = lista.filter(x => enMenu.indexOf(x.k) < 0).map(x => x.k);
  const navegables = lista.filter(x => enMenu.indexOf(x.k) >= 0);
  console.log('  tabs del menu: ' + navegables.length + '  (' + ANCHO + 'px)'
    + (sueltasDOM.length ? '  ·  ' + sueltasDOM.length + ' suelta(s): ' + sueltasDOM.join(', ') : '') + '\n');

  /* ── UNA TAB: ABRIRLA Y ESPERAR A QUE DIGA ALGO ──
     `tope` es cuantos segundos se le dan. Devuelve tambien si se agoto, que es
     la diferencia entre "esta rota" y "no llegue a saber". */
  async function mirarTab(k, tope) {
    await evaluar(cli, 'go("' + k + '")');
    /* ── QUE `go` HAYA ABIERTO ESA PAGINA, Y NO OTRA (1/10/2026) ──
       La lista sale de los `div.pg` del DOM, pero no todos son tabs del menu.
       `p-resumen` es la pagina suelta del resumen semanal: existe, y desde que
       el PDF vive en Inicio **no tiene entrada en el menu**. `go('resumen')`
       no la activa, la pantalla se queda en Inicio, y el escaner venia
       reportandola como "PANTALLA VACIA tras 45 s" en cada corrida. No estaba
       rota: no existe para el usuario. Un ⚠ permanente que nadie puede cerrar
       entrena a ignorar los ⚠ que si importan. */
    const activa = await evaluar(cli,
      '(function(){var p=document.querySelector(".pg.on");return p?String(p.id||""):"";})()');
    if (activa !== 'p-' + k) return { m: null, seg: '0.0', agotado: false, noNavegable: activa || '(ninguna)' };
    const t0 = Date.now();
    let m = null;
    for (let i = 0; i < Math.ceil(tope / 1.5); i++) {
      await T(1500);
      m = await evaluar(cli, MEDIR);
      if (m && !m.cargando && !m.vacio) break;
    }
    return { m, seg: ((Date.now() - t0) / 1000).toFixed(1),
             agotado: !!(m && (m.cargando || m.vacio)) };
  }
  const linea = (k, seg, m, flag) =>
    '  ' + k.padEnd(16) + String(seg).padStart(5) + 's  ' + String(m && m.chars).padStart(6) + ' chars'
    + '  chicos:' + String(m && m.nChicos).padStart(3) + '  cortados:' + String(m && m.nCortados).padStart(3)
    + '  desb:' + String(m && m.desborde).padStart(4) + (flag || '');

  const res = [], sueltas = [];
  for (const tab of navegables) {
    const r = await mirarTab(tab.k, 45);   // el volcado tarda 21-27 s
    if (r.noNavegable) {
      sueltas.push({ tab: tab.k, quedo: r.noNavegable });
      console.log('  ' + tab.k.padEnd(16) + '    —  no esta en el menu (go dejo ' + r.noNavegable + ')');
      continue;
    }
    res.push({ tab: tab.k, nom: tab.t, seg: r.seg, m: r.m, agotado: r.agotado });
    console.log(linea(tab.k, r.seg, r.m, r.agotado ? '  ⚠' : ''));
    /* Un respiro entre tabs. Apps Script encola: nueve GET seguidos hicieron
       que el siguiente tardara 169 s (medido el 21/9/2026). Sin esto, las
       ultimas tabs del escaneo cargan la culpa de las primeras. */
    await T(2500);
  }

  /* ── LA REPESCA: EL ESCANER NO PUEDE ACUSAR SIN SEGUNDA OPINION (1/10/2026) ──
     El escaneo del 1/10 marco `resumen` y `miportal` como "PANTALLA VACIA tras
     45 s". Medidas SOLAS despues, la primera pintaba entera en 8,2 s. O sea
     que el escaner no habia encontrado un bug: habia encontrado su propia
     cola. Costo una hora de perseguir un fantasma.
     Ahora cada sospechosa se vuelve a abrir al final, en frio y con mas
     tiempo. Si en la repesca pinta, lo que estaba lento era la medicion — y
     eso se dice, en vez de dejar un ⚠ que el proximo que lea va a creer. */
  const sospechosas = res.filter(r => r.agotado);
  if (sospechosas.length) {
    console.log('\n  ── Repesca: ' + sospechosas.length + ' tab(s) de nuevo, en frio ──');
    await T(20000);
    for (const r of sospechosas) {
      const r2 = await mirarTab(r.tab, 90);
      r.repesca = { seg: r2.seg, chars: r2.m && r2.m.chars, agotado: r2.agotado };
      if (!r2.agotado) { r.m = r2.m; r.seg = r2.seg; r.agotado = false; r.eraLaCola = true; }
      console.log(linea(r.tab, r2.seg, r2.m, r2.agotado ? '  ⚠ sigue vacia' : '  ✓ era la cola'));
      await T(5000);
    }
  }

  if (sueltasDOM.length || sueltas.length) {
    console.log('\n  ── Paginas sueltas (existen en el DOM, no en el menu) ──');
    sueltasDOM.forEach(k => console.log('     ' + k + ' — nadie puede abrirla desde la app'));
    sueltas.forEach(s => console.log('     ' + s.tab + ' — go() dejo ' + s.quedo));
    console.log('     (no se escanean: no son pantallas que alguien pueda ver)');
  }

  console.log('\n  ── Detalle de lo que hay que mirar ──');
  res.forEach(r => {
    const m = r.m || {};
    const cosas = [];
    /* Despues de la repesca, "cargando/vacia" quiere decir que NO pinto ni
       sola y en frio. Antes se afirmaba sobre una sola pasada saturada. */
    if (m.cargando) cosas.push('QUEDA EN "CARGANDO" tras ' + r.seg + 's, y tampoco sola');
    if (m.vacio) cosas.push('PANTALLA CASI VACIA (' + m.chars + ' chars), y tampoco sola');
    if (r.eraLaCola) cosas.push('tardo en el escaneo pero sola pinta en ' + r.seg + 's: era la cola del backend, no la pantalla');
    if (m.nChicos > 0) cosas.push(m.nChicos + ' controles chicos: ' + m.chicos.join(' · '));
    if (m.nCortados > 0) cosas.push(m.nCortados + ' textos cortados: ' + m.cortados.join(' · '));
    if (m.desborde > 0) cosas.push('desborda ' + m.desborde + 'px');
    if (cosas.length) console.log('\n  ' + r.tab + ':\n     ' + cosas.join('\n     '));
  });

  const err = await evaluar(cli, 'window.__err||[]');
  const warn = await evaluar(cli, 'window.__warn||[]');
  console.log('\n  ── Consola ──');
  console.log('     errores: ' + ((err || []).length ? '\n       ' + [...new Set(err)].slice(0, 8).join('\n       ') : 'ninguno'));
  console.log('     avisos:  ' + ((warn || []).length ? '\n       ' + [...new Set(warn)].slice(0, 6).join('\n       ') : 'ninguno'));

  /* FUERA DEL REPO, a proposito. Esto captura el texto de cada pantalla con los
     datos REALES —nombres de clientes, montos de caja, direcciones— y este repo
     es PUBLICO por Pages. El 10/9/2026 una corrida dejo `escaneo_390.json`
     versionado con 7 nombres de clientes adentro y se pusheo; hubo que
     reescribir el commit. Escribirlo en __dirname era el defecto de raiz.
     El .gitignore lo cubre igual, como red. */
  const salida = require('path').join(require('os').tmpdir(), 'maleu-escaneo-' + ANCHO + '.json');
  require('fs').writeFileSync(salida, JSON.stringify(res, null, 1));
  console.log('\n  detalle completo: ' + salida);
  cli.matar(); process.exit(0);
})();
