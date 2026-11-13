/* SALTOS AL CAMBIAR DE SUB-TAB (13/11/2026). Tadeo, en el iPhone: «al cambiar de sub-tab la pantalla salta».
   Para cada tab y cada botón de sub-tab (las mismas funciones de navegación que recorrer_subtabs.js) baja la página para
   que la barra quede a mitad de camino, mide, toca con el MOUSE REAL (Input.dispatchMouseEvent) y vuelve a medir a los
   250 ms y a los 1500 ms:
     · barra   = cuánto se movió en la pantalla la barra de sub-tabs (top del contenedor del botón)
     · botón   = cuánto se movió el botón tocado (lo que el usuario ve que se le va)
     · tira    = scrollLeft de la tira horizontal: si cambió sin que el botón estuviera cortado, es un salto
     · altura  = si la barra cambió de alto
   Un salto = > 3 px. Los POST se cortan (es solo lectura).
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/medir_saltos_subtab.js [ancho=390]
   FONDO=1: baja hasta el final antes de tocar (la barra tiene que seguir a la vista, pegada arriba).
   SOLO=caja,ventas para algunas tabs. Sale con 1 si hay saltos (o si no midió nada: 0 de 0 no es un verde). */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const SB = require(path.join(__dirname, 'sbses_guarda.js'))(process.env.SBSES, process.env.USUARIO || 'tadeo');
const W = Number(process.argv[2] || 390), H = 844;
const NAV = 'estSwitch|ajGo|setCrmProdPeriodo|switchTab|stSwitchTab|vSwitchTab|abaSwitchTab|setMainTab|stVista|setRutaFiltro|segSwitchVista|goSubInicio|setPlataSub|mrShowSub|estRecSub|estCliVista|eerrSetModo|setCobrosFiltro|showViernesTab|redVista|mpGo|toggleRutaListaModo|cobModoElegir';
(async () => {
  const c = await abrir(); const ev = (e) => evaluar(c, e);
  await c.enviar('Runtime.enable'); await c.enviar('Page.enable');
  await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SB + ';window.confirm=function(){return false};window.alert=function(){};' });
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: W < 700 });
  await c.enviar('Emulation.setTouchEmulationEnabled', { enabled: false });
  await c.enviar('Page.navigate', { url: process.env.BASE_URL || 'http://localhost:8080/app.html' });
  for (let i = 0; i < 60 && !(await ev("typeof go==='function'")); i++) await T(250);
  await T(4000);
  const tabs = (process.env.SOLO ? process.env.SOLO.split(',') : await ev('(function(){var s={};[].slice.call(document.querySelectorAll(".bn[data-p]")).forEach(function(e){s[e.getAttribute("data-p")]=1});return Object.keys(s);})()'));
  const res = []; let saltos = 0, medidos = 0;
  for (const t of tabs) {
    await ev(`try{go(${JSON.stringify(t)})}catch(e){}`); await T(Number(process.env.ESPERA || 3500));
    const navs = await ev(`(function(){var re=/^\\s*(${NAV})\\(/;var pg=document.querySelector('.pg.on');if(!pg)return [];var v={},l=[];
      [].slice.call(pg.querySelectorAll('[onclick]')).forEach(function(e){var oc=e.getAttribute('onclick')||'';if(re.test(oc)&&e.offsetParent&&!v[oc]){v[oc]=1;l.push(oc);}});return l.slice(0,12);})()`);
    for (const oc of navs) {
      /* Baja la página para que la barra quede a ~40% de la pantalla (si se puede): ahí se ve un salto arriba o abajo. */
      const a = JSON.parse(await ev(`(function(){var e=[].slice.call(document.querySelectorAll('.pg.on [onclick]')).filter(function(x){return x.getAttribute('onclick')===${JSON.stringify(oc)}&&x.offsetParent})[0];if(!e)return 'null';
        var bar=e.parentElement;if(${process.env.FONDO ? 'true' : 'false'}&&getComputedStyle(bar).position!=='sticky')return 'null';var r=bar.getBoundingClientRect();if(${process.env.FONDO ? 'true' : 'false'})window.scrollTo(0,document.documentElement.scrollHeight);else window.scrollBy(0,Math.max(0,r.top-${Math.round(H * 0.4)}));
        var er=e.getBoundingClientRect(),br=bar.getBoundingClientRect();
        window.__mss={e:e,bar:bar};
        return JSON.stringify({x:er.left+er.width/2,y:er.top+er.height/2,cort:(er.left<br.left-1||er.right>br.right+1),bt:br.top,bh:br.height,et:er.top,sl:bar.scrollLeft,sy:window.scrollY});})()`));
      if (!a) continue;
      await T(150);
      if (a.y < 0 || a.y > H) continue;
      for (const ty of ['mousePressed', 'mouseReleased']) await c.enviar('Input.dispatchMouseEvent', { type: ty, x: a.x, y: a.y, button: 'left', clickCount: 1 });
      const medir = () => ev(`(function(){var m=window.__mss;if(!m||!m.bar.isConnected)return JSON.stringify({ido:true,sy:window.scrollY});var br=m.bar.getBoundingClientRect(),er=m.e.isConnected?m.e.getBoundingClientRect():null;
        return JSON.stringify({bt:br.top,bh:br.height,et:er?er.top:null,sl:m.bar.scrollLeft,sy:window.scrollY});})()`);
      await T(250); const b1 = JSON.parse(await medir());
      await T(1250); const b2 = JSON.parse(await medir());
      medidos++;
      const mal = [];
      [['250ms', b1], ['1,5s', b2]].forEach(([k, b]) => {
        if (b.ido) { mal.push(k + ' la barra se rehízo (scrollY ' + Math.round(a.sy) + '→' + Math.round(b.sy) + ')'); return; }
        if (Math.abs(b.bt - a.bt) > 3) mal.push(k + ' barra ' + Math.round(a.bt) + '→' + Math.round(b.bt));
        if (b.et != null && Math.abs(b.et - a.et) > 3) mal.push(k + ' botón ' + Math.round(a.et) + '→' + Math.round(b.et));
        if (Math.abs(b.bh - a.bh) > 3) mal.push(k + ' alto ' + Math.round(a.bh) + '→' + Math.round(b.bh));
        if (!a.cort && Math.abs(b.sl - a.sl) > 3) mal.push(k + ' tira ' + Math.round(a.sl) + '→' + Math.round(b.sl));
      });
      const uniq = Array.from(new Set(mal));
      if (uniq.length) saltos++;
      res.push({ t, oc: oc.slice(0, 44), mal: uniq });
    }
  }
  const porTab = {};
  res.forEach((r) => { (porTab[r.t] = porTab[r.t] || []).push(r); });
  Object.keys(porTab).forEach((t) => {
    const l = porTab[t], m = l.filter((r) => r.mal.length);
    console.log(t.padEnd(13), String(l.length).padStart(3) + ' toques', m.length ? ' SALTA ' + m.length + ': ' + m.slice(0, 4).map((r) => r.oc + ' [' + r.mal.slice(0, 2).join('; ') + ']').join(' · ') : '');
  });
  console.log('\n  toques medidos: ' + medidos + ' · con salto: ' + saltos);
  try { c.matar(); } catch (e) {}
  process.exit(saltos || !medidos ? 1 : 0);
})();
