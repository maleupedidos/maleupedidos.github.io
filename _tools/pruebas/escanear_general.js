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
    /* Lo que scrollea no esta cortado, y ellipsis es un corte DELIBERADO. */
    if(cs.overflowX==='auto'||cs.overflowX==='scroll') return;
    if(cs.textOverflow==='ellipsis') return;
    if(el.scrollWidth>Math.ceil(b.width)+2) cortados.push(t.slice(0,22));
  });
  return {
    chars: txt.length,
    txt: txt.slice(0,240),
    cargando: /cargando|armando|calculando|esperando el volcado|todav.a no lleg/i.test(txt),
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
  const lista = await evaluar(cli, '(function(){return [].slice.call(document.querySelectorAll(".pg"))' +
    '.map(function(e){return {k:String(e.id||"").replace(/^p-/,""), t:String(e.id||"")};})' +
    '.filter(function(x){return x.k && x.k.indexOf("dg")!==0;});})()');
  console.log('  tabs visibles: ' + lista.length + '  (' + ANCHO + 'px)\n');

  const res = [];
  for (const tab of lista) {
    await evaluar(cli, 'go("' + tab.k + '")');
    const t0 = Date.now();
    let m = null;
    // Esperar a contenido util: hasta 45 s (el volcado tarda 21-27)
    for (let i = 0; i < 30; i++) {
      await T(1500);
      m = await evaluar(cli, MEDIR);
      if (m && !m.cargando && !m.vacio) break;
    }
    const seg = ((Date.now() - t0) / 1000).toFixed(1);
    res.push({ tab: tab.k, nom: tab.t, seg, m });
    const flag = (m && (m.cargando || m.vacio)) ? '  ⚠' : '';
    console.log('  ' + tab.k.padEnd(16) + seg.padStart(5) + 's  ' + String(m && m.chars).padStart(6) + ' chars'
      + '  chicos:' + String(m && m.nChicos).padStart(3) + '  cortados:' + String(m && m.nCortados).padStart(3)
      + '  desb:' + String(m && m.desborde).padStart(4) + flag);
  }

  console.log('\n  ── Detalle de lo que hay que mirar ──');
  res.forEach(r => {
    const m = r.m || {};
    const cosas = [];
    if (m.cargando) cosas.push('QUEDA EN "CARGANDO" tras ' + r.seg + 's');
    if (m.vacio) cosas.push('PANTALLA CASI VACIA (' + m.chars + ' chars)');
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

  require('fs').writeFileSync(__dirname + '/escaneo_' + ANCHO + '.json', JSON.stringify(res, null, 1));
  cli.matar(); process.exit(0);
})();
