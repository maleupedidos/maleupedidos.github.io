/* Los textos cortados, con su clase, su ancho real y el de su caja. Filtra el
   ruido: lo que puede scrollear no esta cortado, y un elemento con
   text-overflow:ellipsis esta cortado A PROPOSITO. */
const { abrir, evaluar } = require('./cdp.js');
const T = ms => new Promise(r => setTimeout(r, ms));
const TOKEN = process.argv[2];
const ANCHO = Number(process.argv[3] || 390);
const PREP = require('./sesion_prep.js')(TOKEN);

const MEDIR = `(function(){
  var pg=document.querySelector('.pg.on'); if(!pg) return [];
  var out=[];
  pg.querySelectorAll('*').forEach(function(el){
    if(el.children.length) return;                    /* solo hojas */
    var t=(el.textContent||'').trim(); if(!t) return;
    var b=el.getBoundingClientRect(); if(b.width<=0||b.height<=0) return;
    var cs=getComputedStyle(el);
    if(cs.overflowX==='auto'||cs.overflowX==='scroll') return;   /* scrollea: no esta cortado */
    var sobra=el.scrollWidth-Math.ceil(b.width);
    if(sobra<=2) return;
    /* ellipsis es un corte DELIBERADO con puntos suspensivos; se reporta aparte */
    var eli=cs.textOverflow==='ellipsis';
    var pa=el.parentElement;
    out.push({
      txt:t.slice(0,42), cls:String(el.className||'').slice(0,34)||('<'+el.tagName.toLowerCase()+'>'),
      padre:pa?(String(pa.className||'').slice(0,30)||pa.tagName.toLowerCase()):'',
      w:Math.round(b.width), sw:el.scrollWidth, sobra:sobra, eli:eli,
      fs:cs.fontSize, ws:cs.whiteSpace
    });
  });
  return out;})()`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
  await T(10000);
  if (await evaluar(cli, '(function(){var e=document.getElementById("loginScreen");return e&&getComputedStyle(e).display!=="none";})()')) {
    console.error('ABORTA: login encima'); process.exit(3);
  }
  const tabs = (process.argv[4] || 'inicio,egresos,planificacion,ajustes,ventas,caja').split(',');
  for (const tab of tabs) {
    await evaluar(cli, 'go("' + tab + '")');
    let r = [];
    for (let i = 0; i < 22; i++) {
      await T(2000);
      const txt = await evaluar(cli, '(function(){var p=document.querySelector(".pg.on");return p?(p.innerText||"").length:0;})()');
      if (txt > 300) { r = await evaluar(cli, MEDIR); if (r && r.length !== undefined) break; }
    }
    const reales = (r || []).filter(x => !x.eli);
    const deliberados = (r || []).filter(x => x.eli);
    console.log('\n  ══ ' + tab.toUpperCase() + ' ══  cortados de verdad: ' + reales.length + '  ·  con ellipsis (a proposito): ' + deliberados.length);
    reales.slice(0, 12).forEach(x => {
      console.log('     "' + x.txt + '"');
      console.log('        .' + x.cls + '  dentro de .' + x.padre);
      console.log('        caja ' + x.w + 'px · texto ' + x.sw + 'px · SOBRA ' + x.sobra + 'px · ' + x.fs + ' · ws:' + x.ws);
    });
  }
  cli.matar(); process.exit(0);
})();
