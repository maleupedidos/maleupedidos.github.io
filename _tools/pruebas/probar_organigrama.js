/* EMPRESA › EQUIPO: EL ORGANIGRAMA (25/11/2026, 843). Con la sesión del dueño (lecturas reales, guarda de solo lectura) y
   `org_pantalla` / `org_cambiar` contestadas EN LA PÁGINA con una foto de la base (ORG_FIXTURE), porque la 843 se prueba
   antes de aplicarla. `org_cambiar` se simula en memoria con las mismas reglas que la función.
     ORG_FIXTURE=<org.json> SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_organigrama.js <token> [ancho] [carpeta]
   La foto se saca con `seco_mig.py` (estancias) y NO se versiona: trae teléfonos y alias.
   Mide: el menú (Plata › Liquidaciones, Empresa › Equipo y Ajustes); el árbol con todos los puestos de la base y los
   vacíos como «Puesto vacío»; los puestos por persona en orden; en el celular, gerencias plegadas y sin scroll de costado;
   la ficha de la persona en modo persona (sus puestos, En el ERP, sin plata); un representante con sus números del mes;
   cambiar quién ocupa un puesto con fecha (toques de mouse reales); Liquidaciones sin «Datos» y con el renglón a la ficha;
   consola sin errores. Con carpeta guarda arbol.png, gerencia.png, persona.png, puesto.png y liquidaciones.png. */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S, DIR] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390), CEL = ANCHO < 769;
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const FIX = fs.readFileSync(process.env.ORG_FIXTURE, 'utf8');
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const CAJON = CEL ? '' : ";try{localStorage.setItem('maleu_sb_fijo_tadeo','1')}catch(e){}";
/* org_pantalla y org_cambiar, en la página. Va ÚLTIMO: envuelve a las guardas y contesta antes que ellas. */
const MOCK = `;(function(){var D=${FIX};window.__orgD=D;window.__orgLlamadas=[];
  function hoy(){return D.hoy;} function iso(f){var m=String(f||'').match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);return m?m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2):(f||hoy());}
  function P(id){return D.puestos.filter(function(x){return x.id===id;})[0];}
  function cambiar(p){
    var x=P(p.puesto), f=iso(p.fecha);
    if(f>hoy())return {ok:false,err:'Esa fecha no llegó.'};
    if(p.accion==='ocupar'){ if(x.ocupan.some(function(o){return o.persona===p.persona;}))return {ok:false,err:p.persona+' ya ocupa este puesto.'};
      if(p.reemplaza){ x.ocupan.forEach(function(o){D.historial.unshift({fecha:f,accion:'sale',puesto:x.id,nombrePuesto:x.nombre,persona:o.persona});}); x.ocupan=[]; }
      x.ocupan.push({persona:p.persona,desde:f}); D.historial.unshift({fecha:f,accion:'entra',puesto:x.id,nombrePuesto:x.nombre,persona:p.persona}); return {ok:true}; }
    if(p.accion==='quitar'){ x.ocupan=x.ocupan.filter(function(o){return o.persona!==p.persona;}); D.historial.unshift({fecha:f,accion:'sale',puesto:x.id,nombrePuesto:x.nombre,persona:p.persona}); return {ok:true}; }
    if(p.accion==='puesto_nuevo'){ var id='prueba-'+Date.now(); D.puestos.push({id:id,padre:p.padre,nombre:p.nombre,resp:p.resp,tipo:p.zona?'zona':'area',zona:p.zona||null,rel:null,relCon:null,orden:999,ocupan:[]}); return {ok:true,puesto:id}; }
    if(p.accion==='puesto_editar'){ x.nombre=p.nombre; x.resp=p.resp; return {ok:true}; }
    if(p.accion==='puesto_borrar'){ D.puestos=D.puestos.filter(function(y){return y.id!==x.id;}); return {ok:true}; }
    return {ok:false,err:'Esa acción no existe.'};
  }
  var f0=window.fetch; window.fetch=function(u,o){ var s=String((u&&u.url)||u||''), m=/\\/rest\\/v1\\/rpc\\/(org_pantalla|org_cambiar)\\b/.exec(s);
    if(!m)return f0.apply(this,arguments);
    var body={}; try{body=JSON.parse(o&&o.body||'{}').p||{};}catch(e){}
    window.__orgLlamadas.push(m[1]+':'+(body.accion||''));
    var r=m[1]==='org_pantalla'?JSON.parse(JSON.stringify(D)):cambiar(body);
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); },120); });
  };})();`;
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
async function foto(cli, nombre) {
  if (!DIR) return;
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(DIR, ANCHO + '-' + nombre), Buffer.from(r.data, 'base64'));
}
/* Un toque de verdad: scrollea al elemento y aprieta el mouse en su centro (respeta lo que esté encima). */
async function clic(cli, sel) {
  const r = JSON.parse(await evaluar(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'null';e.scrollIntoView({block:'center'});var b=e.getBoundingClientRect();
    var x=b.left+b.width/2,y=b.top+Math.min(b.height/2,20),top=document.elementFromPoint(x,y);return JSON.stringify({x:x,y:y,encima:!!top&&top!==e&&!e.contains(top)?(top.className||top.tagName):''});})()`));
  if (!r) { console.log('     (no está: ' + sel + ')'); return false; }
  if (r.encima) console.log('     (encima de ' + sel + ': ' + r.encima + ')');
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
  return true;
}
const sinScroll = `document.documentElement.scrollWidth<=document.documentElement.clientWidth+1`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  const errores = [];
  cli.escuchar((m, e) => m === 'Runtime.exceptionThrown' && errores.push(String(e.exceptionDetails && (e.exceptionDetails.exception && e.exceptionDetails.exception.description || e.exceptionDetails.text)).slice(0, 200)));
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" + CAJON + MOCK });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: CEL ? 2 : 1, mobile: CEL });
  await cli.enviar('Page.navigate', { url: URL });
  await T(8000);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(typeof SESSION!=='undefined'&&SESSION&&SESSION.dueno)`)) break; await T(500); }

  /* 1 · El menú */
  const M = JSON.parse(await evaluar(cli, `(function(){var out=[],sec='';[].forEach.call(document.querySelectorAll('.snav>*'),function(e){
      if(e.classList.contains('snav-section'))sec=e.textContent.trim();
      else if(e.dataset&&e.dataset.p&&!e.classList.contains('role-hidden'))out.push(sec+'>'+e.dataset.p+'='+((e.querySelector('.bn-lbl')||{}).textContent||''));});return JSON.stringify(out);})()`));
  chk(M.indexOf('Plata>equipo=Liquidaciones') >= 0, 'Plata › Liquidaciones (id equipo)');
  chk(M.indexOf('Empresa>empresa=Equipo') >= 0, 'Empresa › Equipo');
  chk(M.indexOf('Empresa>ajustes=Ajustes') >= 0, 'Empresa › Ajustes');
  chk(!M.some((x) => /^Plata>.*=Equipo$/.test(x)), 'Plata ya no dice «Equipo»');

  /* 2 · El árbol */
  await evaluar(cli, `try{orgVista('org');go('empresa')}catch(e){window.__err.push('go '+e.message)}`);
  for (let i = 0; i < 30; i++) { if (await evaluar(cli, `!!(ORG.d&&!ORG.vuelo&&document.querySelector('#orgBody .org-c'))`)) break; await T(400); }
  await T(400);
  const enc = await evaluar(cli, `(document.querySelector('#hdrTitle,.hdr-t,.mod-t')||{}).textContent||''`);
  const A = JSON.parse(await evaluar(cli, `(function(){var cs=[].slice.call(document.querySelectorAll('#orgBody .org-c'));
    return JSON.stringify({cards:cs.length,ids:cs.map(function(c){return c.dataset.id}),vac:cs.filter(function(c){return c.classList.contains('vacio')}).map(function(c){return c.dataset.id+':'+c.querySelector('.org-vac').textContent}),
      base:ORG.d.puestos.length,baseVac:ORG.d.puestos.filter(function(x){return !x.ocupan.length}).map(function(x){return x.id}),
      carga:[].map.call(document.querySelectorAll('.org-cg'),function(b){return b.dataset.p+'='+b.querySelector('b').textContent+(b.classList.contains('alta')?'!':'')}),
      ger:[].map.call(document.querySelectorAll('.org-g'),function(d){return d.dataset.id+(d.open?'+':'-')}),
      matriz:(document.querySelector('.org-matriz')||{}).textContent||'',punt:[].map.call(document.querySelectorAll('.org-tag.punt'),function(t){return t.textContent}),
      sinScroll:${sinScroll},chico:[].filter.call(document.querySelectorAll('#orgBody button,#orgBody summary,#orgBody .org-c'),function(b){var r=b.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<${CEL ? 40 : 28}}).map(function(b){return (b.className||b.tagName)+':'+Math.round(b.getBoundingClientRect().height)}).slice(0,6),
      cortados:[].filter.call(document.querySelectorAll('#orgBody .org-c-n,#orgBody .org-cg-n,#orgBody .org-g-t b'),function(e){return e.offsetParent&&e.scrollWidth>e.clientWidth+1}).length})})()`));
  console.log('     encabezado:', enc.trim(), '· tarjetas', A.cards, 'de', A.base, '· gerencias', A.ger.join(' '));
  console.log('     puestos por persona:', A.carga.join('  '));
  if (CEL) chk(A.ger.length === 4 && A.ger.every((g) => g.endsWith('-')), 'celular: 4 gerencias plegadas');
  else chk(A.cards === A.base, 'compu: las ' + A.base + ' tarjetas de la base, todas a la vista');
  chk(JSON.stringify(A.vac.map((v) => v.split(':')[0]).filter((id) => A.ids.indexOf(id) >= 0).sort()) === JSON.stringify(A.baseVac.filter((id) => A.ids.indexOf(id) >= 0).sort()) && A.vac.every((v) => /Puesto vacío$/.test(v)), 'los vacíos de la base dicen «Puesto vacío»: ' + A.vac.length);
  chk(/^Lucas Moresco=11!$/.test(A.carga[0]) && /^Tadeo Ustariz=6!$/.test(A.carga[1]), 'puestos por persona: Lucas 11 y Tadeo 6 primero, marcados');
  chk(/Tecnología.*matricial/.test(A.matriz), 'Tecnología matricial: ' + A.matriz.trim());
  chk(A.punt.some((t) => /Línea punteada con Tesorería/.test(t)) && (CEL || A.punt.some((t) => /Le da servicio: Cobranzas/.test(t))), 'Cobranzas punteada con Tesorería');
  chk(A.sinScroll, 'sin scroll de costado');
  chk(!A.chico.length, 'nada tocable más chico de lo debido ' + A.chico.join(' '));
  chk(!A.cortados, 'ningún nombre cortado (' + A.cortados + ')');
  await evaluar(cli, 'window.scrollTo(0,0)'); await T(200);
  await foto(cli, 'arbol.png');
  if (CEL) {
    await clic(cli, '.org-g[data-id="operaciones"]>summary'); await T(350);
    const G = JSON.parse(await evaluar(cli, `JSON.stringify({open:document.querySelector('.org-g[data-id="operaciones"]').open,n:document.querySelectorAll('.org-g[data-id="operaciones"] .org-c').length,sinScroll:${sinScroll}})`));
    chk(G.open && G.n >= 10, 'Operaciones se despliega con un toque: ' + G.n + ' puestos');
    chk(G.sinScroll, 'abierta, sin scroll de costado');
    await foto(cli, 'gerencia.png');
  }

  /* 3 · La ficha de la persona */
  await clic(cli, '.org-cg[data-p="Lucas Moresco"]'); await T(900);
  const F = JSON.parse(await evaluar(cli, `(function(){var f=document.getElementById('eqFicha');return JSON.stringify({on:!!f&&f.classList.contains('on'),modo:EQ.modo,
    hs:[].map.call(f.querySelectorAll('.eqf-h'),function(h){return h.textContent.trim()}),ps:f.querySelectorAll('.orgf-p').length,
    erp:[].map.call(f.querySelectorAll('.eqf-cond'),function(c){return c.innerText.replace(/\\s+/g,' ')}),plata:!!f.querySelector('.eqf-kpis,.eqf-pagar'),
    lapiz:!!f.querySelector('.eqf-nom-ed'),sinScroll:f.querySelector('.eqf-cuerpo').scrollWidth<=f.querySelector('.eqf-cuerpo').clientWidth+1})})()`));
  console.log('     ficha:', F.hs.join(' | '), '·', F.erp.join(' · '));
  chk(F.on && F.modo === 'persona', 'la ficha abre en modo persona');
  chk(F.ps === 11 && /^Puestos\s*11$/.test(F.hs[0]), 'sus 11 puestos');
  chk(F.erp.some((e) => /Usuario luqui · Administrador/.test(e)), 'En el ERP: luqui · Administrador');
  chk(!F.plata, 'sin plata en la ficha de la persona');
  chk(F.lapiz, 'el dueño puede editar el nombre');
  chk(F.sinScroll, 'la ficha sin scroll de costado');
  await foto(cli, 'persona.png');
  await evaluar(cli, `eqCerrar()`); await T(300);
  await evaluar(cli, `orgPersona("Lourdes Thomas")`); await T(900);
  const R = await evaluar(cli, `[].map.call(document.querySelectorAll('#eqFicha .eqf-cond'),function(c){return c.innerText.replace(/\\s+/g,' ')}).join(' · ')`);
  console.log('     Lourdes:', R);
  chk(/Noviembre 10 entregas · \$799\.227 · 9 clientes/.test(R) && /Usuario lou · Mi Portal/.test(R), 'un representante con su usuario y sus números del mes');
  await evaluar(cli, `eqCerrar()`); await T(300);

  /* 4 · Cambiar quién ocupa un puesto, con fecha */
  if (CEL) { await evaluar(cli, `(function(){var d=document.querySelector('.org-g[data-id="operaciones"]');if(d&&!d.open){d.open=true;}})()`); await T(200); }
  await clic(cli, '.org-c[data-id="bodega"]'); await T(500);
  chk(await evaluar(cli, `!!(document.getElementById('orgHoja')&&document.getElementById('orgHoja').classList.contains('on'))`), 'el puesto abre su hoja');
  await evaluar(cli, `(function(){var s=document.getElementById('orghPer');s.value='Santos Bullrich';s.dispatchEvent(new Event('change'));})()`); await T(200);
  await evaluar(cli, `(function(){var f=document.getElementById('orghFecha');f.value='24/11/2026';f.dispatchEvent(new Event('input'));})()`);
  await foto(cli, 'puesto.png');
  const btn = await evaluar(cli, `[].map.call(document.querySelectorAll('#orgHoja .orgh-b'),function(b){return b.textContent}).join(' | ')`);
  console.log('     botones:', btn);
  await clic(cli, '#orgHoja .orgh-b.pri'); await T(1500);
  const C = JSON.parse(await evaluar(cli, `JSON.stringify({q:[].map.call(document.querySelectorAll('.org-c[data-id="bodega"] .org-per>span:last-child'),function(s){return s.textContent}),
    hist:[].map.call(document.querySelectorAll('#orgHoja .org-hl'),function(h){return h.innerText.replace(/\\s+/g,' ')}).slice(0,2),llam:window.__orgLlamadas.join(',')})`));
  console.log('     después:', C.q.join(', '), '·', C.hist.join(' / '));
  chk(C.q.length === 1 && C.q[0] === 'Santos Bullrich', 'Bodega quedó con Santos (y Lucas salió)');
  chk(C.hist.length === 2 && /24\/11\/2026 Santos Bullrich entra a Responsable de Bodega/.test(C.hist[0]) && /24\/11\/2026 Lucas Moresco deja Responsable de Bodega/.test(C.hist[1]), 'el cambio queda con su fecha');
  chk(/org_cambiar:ocupar/.test(C.llam), 'mandó org_cambiar');
  await evaluar(cli, `orgHojaCerrar()`); await T(300);

  /* 5 · Liquidaciones: la plata, sin los datos de la persona */
  await evaluar(cli, `go('equipo')`);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(EQ.d&&document.querySelector('#eqBody .eq-row'))`)) break; await T(500); }
  const enc2 = await evaluar(cli, `(document.querySelector('#hdrTitle,.hdr-t,.mod-t')||{}).textContent||''`);
  await clic(cli, '#eqBody .eq-row[data-p^="Santos"]'); await T(1200);
  const L = JSON.parse(await evaluar(cli, `(function(){var f=document.getElementById('eqFicha');return JSON.stringify({modo:EQ.modo,hs:[].map.call(f.querySelectorAll('.eqf-h'),function(h){return h.textContent.trim()}),
    lnk:!!f.querySelector('.eqf-lnk-per'),lapiz:!!f.querySelector('.eqf-nom-ed'),cam:!!f.querySelector('.eqf-cam'),plata:!!f.querySelector('.eqf-kpis')})})()`));
  console.log('     encabezado:', enc2.trim(), '· secciones:', L.hs.join(' | '));
  chk(L.modo === 'pago' && L.plata, 'Liquidaciones abre la ficha de pago');
  chk(L.hs.indexOf('Datos') < 0 && L.lnk, 'sin «Datos», con el renglón a la ficha de la persona');
  chk(!L.lapiz && !L.cam, 'en la de pago no se edita nombre ni foto');
  await foto(cli, 'liquidaciones.png');
  await clic(cli, '#eqFicha .eqf-lnk-per'); await T(1500);
  const V = JSON.parse(await evaluar(cli, `JSON.stringify({cur:cur,modo:EQ.modo,ab:EQ.abierto,on:document.getElementById('eqFicha').classList.contains('on')})`));
  chk(V.cur === 'empresa' && V.modo === 'persona' && /^Santos/.test(V.ab) && V.on, 'el renglón lleva a Empresa › Equipo con su ficha abierta');
  await evaluar(cli, `eqCerrar()`);

  /* 6 · Personas */
  await evaluar(cli, `orgVista('personas')`); await T(400);
  const P = JSON.parse(await evaluar(cli, `JSON.stringify({n:document.querySelectorAll('#orgBody .eq-row').length,base:ORG.d.personas.length,p1:(document.querySelector('#orgBody .eq-row')||{dataset:{}}).dataset.p,sinScroll:${sinScroll}})`));
  chk(P.n === P.base && P.p1 === 'Lucas Moresco', 'Personas: las ' + P.base + ', el más cargado primero');
  chk(P.sinScroll, 'Personas sin scroll de costado');
  await evaluar(cli, `orgVista('org')`);

  const errs = JSON.parse(await evaluar(cli, `JSON.stringify(window.__err||[])`)).concat(errores).filter((e) => !/favicon|ResizeObserver/.test(e));
  chk(!errs.length, 'consola sin errores ' + errs.slice(0, 3).join(' | '));
  console.log(`\n${ok} ok · ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
