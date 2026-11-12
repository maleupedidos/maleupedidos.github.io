/* HOVER A LA VISTA (12/11/2026): recorre las tabs del menú y, en cada una, todo lo que se puede tocar y se ve (botones,
   links, [onclick], role=button/tab, summary, select). Para cada uno mira dos cosas: que tenga `cursor:pointer` y que su
   estilo cambie con :hover (fondo, color, borde, sombra, subrayado o filtro), forzando el :hover con CDP. Las
   transiciones se apagan mientras mide: si no, lee el color a mitad de camino y da un verde o un rojo falso.
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/medir_hover.js [ancho]
   Dice cuántos elementos examinó por tab (0 examinados no es un verde). Sale con 1 si alguno no avisa. Los POST se cortan. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const SB = require(path.join(__dirname, 'sbses_guarda.js'))(process.env.SBSES, process.env.USUARIO || 'tadeo');
if (!SB) { console.error('falta SBSES'); process.exit(2); }
const W = Number(process.argv[2] || 1440);
const MAX = Number(process.env.MAX || 120);
const SEL = 'button,a[href],[onclick],[role=button],[role=tab],summary,select';
const FONDO = /overlay|-bg\b|-ov\b/i;
const MARCAR = `(function(){
  document.querySelectorAll('[data-mh]').forEach(function(e){e.removeAttribute('data-mh');});
  var raiz=[document.querySelector('.pg.on')];
  if(window.__mhPrimera){raiz.push(document.querySelector('.sb'),document.querySelector('.tb'),document.querySelector('header'));window.__mhPrimera=false;}
  var n=0,out=[];
  raiz.filter(Boolean).forEach(function(r){[].slice.call(r.querySelectorAll(${JSON.stringify(SEL)})).forEach(function(e){
    if(n>=${MAX})return;
    if(e.disabled||!e.getClientRects().length)return;
    var b=e.getBoundingClientRect();if(b.width<4||b.height<4)return;
    var cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.pointerEvents==='none')return;
    if(FONDO_RX.test(String(e.className||''))||FONDO_RX.test(e.id||''))return;
    e.setAttribute('data-mh',String(n));n++;
    out.push({i:n-1,cur:cs.cursor,t:(e.innerText||e.getAttribute('aria-label')||e.tagName).trim().slice(0,30),c:String(e.className||e.tagName).split(' ')[0]});
  });});
  return JSON.stringify(out);
})()`.replace(/FONDO_RX/g, FONDO.toString());
/* (12/11/2026) Medido por CONTRASTE, no por «cambió algo»: el color final del fondo (con el velo `inset` y el
   `filter: brightness` aplicados, sobre el fondo del padre si es transparente), del borde y del texto. Visible =
   contraste de luminancia >= MIN (1,10 por defecto) en alguno de los tres, o un subrayado nuevo, o una sombra externa
   notoria. Las expresiones van sin barras invertidas a propósito: este texto viaja dentro de un template de JS. */
const ESTILO = (i) => `(function(){var e=document.querySelector('[data-mh="${i}"]');if(!e)return '';
  function rgba(c){var m=String(c||'').match(/rgba?[(]([^)]+)[)]/);if(!m)return null;var p=m[1].split(',').map(function(x){return parseFloat(x);});return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function mezcla(top,bot){var a=top.a;return {r:top.r*a+bot.r*(1-a),g:top.g*a+bot.g*(1-a),b:top.b*a+bot.b*(1-a),a:1};}
  var s=getComputedStyle(e), bg=rgba(s.backgroundColor), n=e.parentElement;
  var base={r:255,g:255,b:255,a:1};
  while(n){var c=rgba(getComputedStyle(n).backgroundColor);if(c&&c.a>0.5){base=c;break;}n=n.parentElement;}
  var f=bg&&bg.a>0?mezcla(bg,base):base;
  var sh=String(s.boxShadow||''), ext=0;
  if(sh!=='none')sh.split(/,(?=[ ]*rgba?[(])/).forEach(function(part){var c=rgba(part);if(!c)return;if(part.indexOf('inset')>=0)f=mezcla(c,f);else{var nums=(part.replace(/rgba?[(][^)]*[)]/,'').match(/[0-9.]+px/g)||[]);if(nums.length>=3&&parseFloat(nums[2])>=4)ext=Math.max(ext,c.a);}});
  var br=String(s.filter||'').match(/brightness[(]([0-9.]+)[)]/);var k=br?parseFloat(br[1]):1;
  f={r:f.r*k,g:f.g*k,b:f.b*k};
  var bd=rgba(s.borderTopColor)||{r:0,g:0,b:0,a:0}, tx=rgba(s.color)||{r:0,g:0,b:0,a:1};
  return JSON.stringify({bg:[f.r,f.g,f.b],bd:[bd.r,bd.g,bd.b,bd.a],bw:parseFloat(s.borderTopWidth)||0,tx:[tx.r,tx.g,tx.b],u:/underline/.test(s.textDecorationLine),ext:ext});})()`;
const MIN = Number(process.env.MIN || 1.10);
function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function visible(A, H) {
  if (!A || !H) return { ok: true, r: 0 };
  const a = JSON.parse(A), h = JSON.parse(H);
  const rb = ratio(a.bg, h.bg), rt = ratio(a.tx, h.tx), rd = (h.bw > 0 && h.bd[3] > 0) ? ratio(a.bd.slice(0, 3), h.bd.slice(0, 3)) : 1;
  const r = Math.max(rb, rt, rd);
  return { ok: r >= MIN || (h.u && !a.u) || (h.ext >= 0.12 && h.ext > a.ext + 0.05), r };
}
(async () => {
  const c = await abrir(); const ev = (e) => evaluar(c, e);
  await c.enviar('Runtime.enable'); await c.enviar('Page.enable'); await c.enviar('DOM.enable'); await c.enviar('CSS.enable');
  await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SB });
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 700 });
  await c.enviar('Page.navigate', { url: process.env.BASE_URL || 'http://localhost:8080/app.html' });
  for (let i = 0; i < 40 && !(await ev("typeof go==='function'")); i++) await T(250);
  await T(3000);
  await ev("(function(){var s=document.createElement('style');s.textContent='*{transition:none!important}';document.head.appendChild(s);window.__mhPrimera=true;})()");
  const hover = await ev("matchMedia('(hover:hover)').matches");
  console.log('(hover:hover) =', hover);
  const tabs = (process.env.TABS ? process.env.TABS.split(',') : await ev('(function(){var s={};[].slice.call(document.querySelectorAll(".bn[data-p]")).forEach(function(e){s[e.getAttribute("data-p")]=1});return Object.keys(s);})()'));
  let malos = 0, vistos = 0;
  for (const t of tabs) {
    await ev(`try{go(${JSON.stringify(t)})}catch(e){}`); await T(Number(process.env.ESPERA || 4500));
    const els = JSON.parse(await ev(MARCAR) || '[]');
    const doc = await c.enviar('DOM.getDocument', { depth: 0 });
    const r = await c.enviar('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: '[data-mh]' });
    const ids = {};
    for (const nid of r.nodeIds) { try { const a = await c.enviar('DOM.getAttributes', { nodeId: nid }); const k = a.attributes.indexOf('data-mh'); ids[a.attributes[k + 1]] = nid; } catch (x) {} }
    if (process.env.DEBUG) console.log('DBG nodos', r.nodeIds.length, 'ids', Object.keys(ids).length, 'els', els.length);
    const sinPuntero = [], sinCambio = [];
    for (const e of els) {
      if (e.cur !== 'pointer') sinPuntero.push(e.c + ' «' + e.t + '»');
      const nid = ids[String(e.i)]; if (!nid) continue;
      /* La pantalla se repinta sola (las copias que llegan): un nodo que ya no está se saltea. */
      let antes, desp;
      try {
        antes = await ev(ESTILO(e.i));
        await c.enviar('CSS.forcePseudoState', { nodeId: nid, forcedPseudoClasses: ['hover'] });
        desp = await ev(ESTILO(e.i));
        await c.enviar('CSS.forcePseudoState', { nodeId: nid, forcedPseudoClasses: [] });
      } catch (x) { if (process.env.DEBUG && (global.__dbe = (global.__dbe || 0) + 1) <= 2) console.log('DBG error', String(x && x.message).slice(0, 300)); continue; }
      if (process.env.DEBUG && (!process.env.DEBUG_C || e.c === process.env.DEBUG_C)) console.log('DBG', e.c, e.t.replace(/\s+/g, ' '), antes, '||', desp);
      const v = visible(antes, desp); if (!v.ok) sinCambio.push(e.c + ' «' + e.t + '» ' + v.r.toFixed(2));
    }
    vistos += els.length; malos += sinPuntero.length + sinCambio.length;
    console.log(t.padEnd(13), String(els.length).padStart(3) + ' vistos', sinPuntero.length ? ' sin puntero ' + sinPuntero.length + ': ' + sinPuntero.slice(0, 6).join(', ') : '', sinCambio.length ? ' hover flojo ' + sinCambio.length + ': ' + sinCambio.slice(0, 6).join(', ') : '');
  }
  console.log('\n  examinados: ' + vistos + ' · sin aviso: ' + malos);
  try { c.matar(); } catch (e) {}
  process.exit(malos || !vistos ? 1 : 0);
})();
