/* EL KIT DE COMPONENTES: cuántas variantes hay de DESPLEGABLES, TABS y CHIPS (12/11/2026, turno noche).
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/medir_kit.js [ancho] [tabs,separadas] [--json salida.json]
   Recorre las tabs del menú (POST cortados, guarda de solo lectura). Por cada elemento VISIBLE anota su firma:
     · desplegable (<select>): alto · borde · radio · letra · si se dibuja con el control del sistema (appearance)
       o con el chevron propio;
     · tab: los botones de una barra de tabs (clase con «tab», o hermanos con uno «on/active») — alto · letra ·
       cómo se marca la activa (subrayado / relleno / borde);
     · chip de estado: span/b chico con fondo de color y radio — alto · letra · radio.
   «0 variantes sobre 0» es un verde falso: la salida dice cuántos examinó. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const ANCHO = Number(args[0] || 1440), SOLO = args[1] && !args[1].startsWith('--') ? args[1].split(',') : null;
const JSONOUT = args.includes('--json') ? args[args.indexOf('--json') + 1] : '';
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const SBSES = require(path.join(__dirname, 'sbses_guarda.js'))(process.env.SBSES, process.env.USUARIO || 'tadeo');
if (!SBSES) { console.error('falta SBSES'); process.exit(2); }

const MEDIR = `(function(){
  var pg=document.querySelector('.pg.on'); if(!pg) return null;
  function vis(el){ var r=el.getBoundingClientRect(); if(r.width<=0||r.height<=0) return false; for(var n=el;n&&n!==document.body;n=n.parentElement){var cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05) return false;} return true; }
  function tr(c){ return !c||c==='transparent'||/rgba\\([^)]*,\\s*0\\)$/.test(c); }
  function cl(el){ return String(el.className||'').split(' ')[0]||'('+(el.id||el.tagName.toLowerCase())+')'; }
  var sel={},ns=0,tab={},nt=0,chip={},nch=0;
  pg.querySelectorAll('select').forEach(function(el){
    if(!vis(el)) return; ns++;
    var cs=getComputedStyle(el), r=el.getBoundingClientRect();
    var nat=(cs.appearance||cs.webkitAppearance)!=='none';
    var k=Math.round(r.height)+'px b'+cs.borderTopWidth+' '+cs.borderTopColor.replace(/\\s/g,'')+' r'+cs.borderTopLeftRadius+' '+cs.fontSize+' '+(nat?'NATIVO':(cs.backgroundImage!=='none'?'chevron':'sin-flecha'));
    sel[k]=sel[k]||{n:0,cl:{}}; sel[k].n++; sel[k].cl[cl(el)+'#'+(el.id||'')]=1;
  });
  var vistos=new Set();
  pg.querySelectorAll('button,a,[role=tab],div[onclick],span[onclick]').forEach(function(el){
    var c=String(el.className||''); if(!/tab|seg/i.test(c)&&!/tab/i.test(el.getAttribute('role')||'')) return;
    if(/table|tabla/i.test(c)) return;
    if(!vis(el)||vistos.has(el)) return; vistos.add(el); nt++;
    var cs=getComputedStyle(el), r=el.getBoundingClientRect(), on=/(^|\\s)(on|active|act|sel)(\\s|$)/.test(c)||el.getAttribute('aria-selected')==='true';
    var marca=parseFloat(cs.borderBottomWidth)>=2&&!tr(cs.borderBottomColor)?'subrayado':(!tr(cs.backgroundColor)&&cs.backgroundColor!=='rgb(255, 255, 255)'?'relleno':(parseFloat(cs.borderTopWidth)>0?'borde':'plano'));
    var k=cl(el).replace(/\\d+/g,'')+' '+Math.round(r.height)+'px '+cs.fontSize+'/'+cs.fontWeight+' '+(cs.textTransform==='uppercase'?'MAYUS ':'')+'r'+cs.borderTopLeftRadius+(on?' ACTIVA='+marca:'');
    tab[k]=(tab[k]||0)+1;
  });
  pg.querySelectorAll('span,b,em,i').forEach(function(el){
    var cs=getComputedStyle(el); if(tr(cs.backgroundColor)||cs.backgroundColor==='rgb(255, 255, 255)') return;
    if(parseFloat(cs.borderTopLeftRadius)<3) return;
    var r=el.getBoundingClientRect(); if(r.height>30||r.width>220||!vis(el)||!(el.textContent||'').trim()) return;
    nch++;
    var k=Math.round(r.height)+'px '+cs.fontSize+'/'+cs.fontWeight+' r'+cs.borderTopLeftRadius+(cs.textTransform==='uppercase'?' MAYUS':'');
    chip[k]=chip[k]||{n:0,cl:{}}; chip[k].n++; chip[k].cl[cl(el)]=1;
  });
  return {ns:ns,sel:sel,nt:nt,tab:tab,nch:nch,chip:chip};
})()`;

(async () => {
  const cli = await abrir();
  const ev = (e) => evaluar(cli, e);
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  for (let i = 0; i < 40 && !(await ev("typeof go==='function'")); i++) await T(250);
  await T(6000);
  await ev(`(function(){var of=window.fetch;window.fetch=function(u,o){var url=String((u&&u.url)||u||'');if(o&&String(o.method||'').toUpperCase()==='POST'&&!/rpc\\/(.*_pantalla|.*_base|mi_sesion|palancas.*|permiso.*|lectura.*|ventas.*|admin.*|eerr.*)/.test(url)&&!/auth\\/v1/.test(url))return Promise.reject(new TypeError('cortado'));return of.apply(this,arguments);};})()`);
  const tabs = (await ev('(function(){var s={};[].slice.call(document.querySelectorAll(".bn[data-p]")).forEach(function(e){s[e.getAttribute("data-p")]=1});return Object.keys(s);})()'))
    .filter((k) => k.indexOf('dg') !== 0 && (!SOLO || SOLO.includes(k)));
  const tot = { sel: {}, tab: {}, chip: {}, ns: 0, nt: 0, nch: 0 };
  for (const k of tabs) {
    await ev(`try{go(${JSON.stringify(k)})}catch(e){}`);
    await T(5000);
    const m = await ev(MEDIR);
    if (!m) { console.log(k.padEnd(14), 'sin página'); continue; }
    console.log(k.padEnd(14), 'desplegables', String(m.ns).padStart(3), '→', Object.keys(m.sel).length, '· tabs', String(m.nt).padStart(3), '→', Object.keys(m.tab).length, '· chips', String(m.nch).padStart(4), '→', Object.keys(m.chip).length);
    tot.ns += m.ns; tot.nt += m.nt; tot.nch += m.nch;
    for (const [s, v] of Object.entries(m.sel)) { const t = (tot.sel[s] = tot.sel[s] || { n: 0, cl: {} }); t.n += v.n; Object.assign(t.cl, v.cl); }
    for (const [s, n] of Object.entries(m.tab)) tot.tab[s] = (tot.tab[s] || 0) + n;
    for (const [s, v] of Object.entries(m.chip)) { const t = (tot.chip[s] = tot.chip[s] || { n: 0, cl: {} }); t.n += v.n; Object.assign(t.cl, v.cl); }
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1].n - a[1].n).slice(0, n).map(([s, v]) => '  ' + String(v.n).padStart(4) + '  ' + s.padEnd(52) + Object.keys(v.cl).slice(0, 4).join(' ')).join('\n');
  console.log(`\nDESPLEGABLES: ${tot.ns} examinados, ${Object.keys(tot.sel).length} variantes\n` + top(tot.sel, 30));
  console.log(`\nTABS: ${tot.nt} examinadas, ${Object.keys(tot.tab).length} variantes\n` + Object.entries(tot.tab).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([s, n]) => '  ' + String(n).padStart(4) + '  ' + s).join('\n'));
  console.log(`\nCHIPS: ${tot.nch} examinados, ${Object.keys(tot.chip).length} variantes\n` + top(tot.chip, 20));
  if (JSONOUT) require('fs').writeFileSync(JSONOUT, JSON.stringify(tot, null, 1));
  try { cli.matar(); } catch (e) {}
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
