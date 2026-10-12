/* La tab EVOLUCIÓN: que cada serie dé el MISMO número que la pantalla de referencia.

     python leer_sesion.py                        ← un token admin
     node probar_evolucion.js <token> [390|1440]
     SHOT=carpeta node probar_evolucion.js <token> 1440   ← además guarda capturas

   Evolución no define nada: dibuja lo que ya cuentan Inicio, Objetivo y el EERR.
   La regla del encargo (11/10/2026): si el último punto de una serie no coincide
   con esas pantallas, el que está mal es el gráfico. Este test lo sostiene con la
   SESIÓN REAL (los datos son los de verdad; los POST van interceptados y no se
   escribe nada). Cada referencia se LEE DE SU PANTALLA antes de entrar a la tab:

   · el acumulado del mes está ESCRITO en Inicio › Total Maleu;
   · «adelante/atrás del ritmo» y «cierra en $X» están ESCRITOS en Objetivo;
   · «A cobrar» está ESCRITO en Inicio;
   · la semana, las entregas y el ticket salen de `_rtSumar` cortado en hoy;
   · los canales suman el total; el mes del EERR (ventas) da lo mismo que el
     acumulado (pedidos): dos fuentes, un número;
   · las casas son las de Objetivo, y las casas nuevas contadas por la cohorte
     (otra cuenta) dan lo mismo mes por mes;
   · EL PERÍODO EN CURSO NO BAJA: la línea llena termina en el último período
     cerrado, lo de hoy es un punto hueco suelto y VISIBLE, y la punteada va al
     cierre proyectado; el relleno queda solo en el acumulado;
   · nada desborda, ningún texto se sale y las etiquetas no se pisan.

   Dice cuántas cosas miró: «0 fallas sobre 0 elementos» es un verde falso.
   La contraria (11/10/2026): con el facturado mal definido a propósito da rojo. */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = Number(process.argv[3]) || 390;
const BASE = process.env.BASE || 'http://localhost:8095';
const SHOT = process.env.SHOT || '';
if (!TOKEN) { console.error('falta el token: python leer_sesion.py'); process.exit(2); }

let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 500) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(300); }
  return false;
};
const P12 = ['ventas', 'acum', 'entregas', 'ticket'];
const TODOS = ['ventas', 'acum', 'entregas', 'ticket', 'canales', 'margen', 'resultado', 'casas', 'nuevas', 'segunda', 'plata'];

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const captura = async (nombre) => {
    if (!SHOT) return;
    const alto = await evaluar(cli, `Math.ceil(document.getElementById('p-evolucion').getBoundingClientRect().bottom+window.scrollY+16)`);
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: Math.max(700, Math.min(alto, 9000)), deviceScaleFactor: ANCHO < 700 ? 2 : 1.5, mobile: ANCHO < 700 });
    await pausa(800);
    const sh = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(SHOT, { recursive: true });
    fs.writeFileSync(path.join(SHOT, nombre + '-' + ANCHO + '.png'), Buffer.from(sh.data, 'base64'));
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await pausa(600);
  };
  /* Si el ERP cambió de tab por su cuenta (un refresco que termina tarde vuelve a
     llamar a go() con la tab donde empezó), se vuelve: medir una tab oculta da 0. */
  const enLaTab = async () => {
    const donde = await evaluar(cli, `cur`);
    if (donde !== 'evolucion') { console.log('  --   el ERP estaba en «' + donde + '»: se vuelve a Evolución'); await evaluar(cli, `go('evolucion')`); await pausa(500); }
  };
  const medir = `(function(){
    var out={graf:0,textos:0,fuera:[],sinAncho:[],areas:[],pisadas:[],invisibles:[],por:{},frases:{},
             scrollX:document.scrollingElement.scrollWidth-window.innerWidth,ejePisado:[]};
    document.querySelectorAll('#p-evolucion .evu-card').forEach(function(card){
      var id=card.getAttribute('data-card'),svg=card.querySelector('svg'),box=card.querySelector('.evu-graf');
      if(id)out.frases[id]=card.querySelector('.evu-frase').textContent;
      if(!svg||!box)return;
      out.graf++;
      var w=Number(svg.getAttribute('width')),bw=box.clientWidth;
      if(Math.abs(w-bw)>2)out.sinAncho.push(id+': svg '+w+' caja '+bw);
      var r=svg.getBoundingClientRect();
      svg.querySelectorAll('text').forEach(function(t){
        out.textos++; var b=t.getBoundingClientRect();
        if(b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1)out.fuera.push(id+': '+t.textContent);
      });
      if(svg.querySelector('.evu-area'))out.areas.push(id);
      var llenas=[].slice.call(svg.querySelectorAll('path.evu-l')).filter(function(p){return !p.classList.contains('ref')&&!p.classList.contains('curso');});
      out.por[id]={curso:svg.querySelectorAll('.evu-l.curso').length,huecos:svg.querySelectorAll('.evu-p.hueco').length,
        proy:svg.querySelectorAll('.evu-p.proy').length,fines:svg.querySelectorAll('.evu-fv').length,
        llena:llenas.map(function(p){return (p.getAttribute('d').match(/[ML]/g)||[]).length;}),
        colores:llenas.map(function(p){return p.getAttribute('stroke');})};
      svg.querySelectorAll('.evu-p.hueco,.evu-p.proy').forEach(function(c){
        var st=getComputedStyle(c).stroke;
        if(/255, 255, 255/.test(st)||st==='none')out.invisibles.push(id+': '+st);
      });
      var et=[].slice.call(svg.querySelectorAll('.evu-fv,.evu-fn,.evu-hl-t')).map(function(t){return {t:t.textContent,b:t.getBoundingClientRect()};});
      for(var i=0;i<et.length;i++)for(var j=i+1;j<et.length;j++){
        var a=et[i].b,b2=et[j].b;
        if(a.left<b2.right-0.5&&b2.left<a.right-0.5&&a.top<b2.bottom-0.5&&b2.top<a.bottom-0.5)out.pisadas.push(id+': «'+et[i].t+'» con «'+et[j].t+'»');
      }
      var ls=[].slice.call(svg.querySelectorAll('.evu-xlbl')).map(function(t){return t.getBoundingClientRect();}).sort(function(a,b){return a.left-b.left;});
      for(var k=1;k<ls.length;k++)if(ls[k].left<ls[k-1].right-0.5)out.ejePisado.push(id);
    });
    return out;
  })()`;
  const dibujoOk = (M, que) => {
    chk(que + ': cada SVG al ancho real de su caja', M.sinAncho.length === 0, M.sinAncho);
    chk(que + ': ningún texto se sale de su gráfico (' + M.textos + ' medidos)', M.textos > 60 && M.fuera.length === 0, M.fuera);
    chk(que + ': sin scroll horizontal', M.scrollX <= 0, M.scrollX);
    chk(que + ': las etiquetas del final no se pisan', M.pisadas.length === 0, M.pisadas);
    chk(que + ': las fechas del eje no se pisan', M.ejePisado.length === 0, M.ejePisado);
    chk(que + ': el relleno queda solo en el acumulado', M.areas.join() === 'acum', M.areas);
    chk(que + ': los puntos huecos se ven (borde con color)', M.invisibles.length === 0, M.invisibles);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    /* En escritorio, con el cajón lateral DESPLEGADO: así lo usa Tadeo. */
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, 'try{localStorage.setItem("maleu_sb_open","' + (ANCHO >= 900 ? '1' : '0') + '");localStorage.removeItem("maleu_evu");}catch(e){}') });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    console.log('\n== Evolución · ' + ANCHO + 'px · ' + BASE + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, `typeof rEvolucion==='function'&&typeof D!=='undefined'&&D&&Array.isArray(D.pedidos)&&D.pedidos.length>50`)) {
      chk('el ERP cargó los pedidos', false, await evaluar(cli, `JSON.stringify((window.__err||[]).slice(0,5))`)); salir(1);
    }
    /* ── Las referencias se leen ANTES, cada una en su pantalla ── */
    await esperar(cli, `!!document.querySelector('.card.mt')&&/A cobrar/.test((document.getElementById('hSnap')||{innerText:''}).innerText)`, 40000);
    const inicioTxt = await evaluar(cli, `(document.querySelector('.card.mt')||{innerText:''}).innerText`);
    const snapTxt = await evaluar(cli, `(document.getElementById('hSnap')||{innerText:''}).innerText`);
    await evaluar(cli, `go('planificacion')`);
    await esperar(cli, `(function(){var b=document.getElementById('planTotal');return !!b&&/objetivo/.test(b.innerText)&&!/Buscando el objetivo/.test(b.innerText);})()`, 40000);
    const objTxt = await evaluar(cli, `(document.getElementById('planTotal')||{innerText:''}).innerText`);

    /* La lista de tabs de la hoja Permisos llega tarde (`miSesion`, ~20 s) y vuelve
       a aplicar los roles: la tab tiene que seguir a la vista DESPUÉS de eso. */
    const conPermisos = await esperar(cli, `!!(SESSION&&Array.isArray(SESSION.tabs)&&SESSION.tabs.length)`, 45000);
    await pausa(400);
    await evaluar(cli, `go('evolucion')`);
    const visible = await evaluar(cli, `(function(){var b=document.querySelector('.bn[data-p="evolucion"]'),p=document.getElementById('p-evolucion');
      return {tabs:(SESSION&&SESSION.tabs)||null,rol:SESSION&&SESSION.rol,boton:!!b&&!b.classList.contains('role-hidden'),pagina:getComputedStyle(p).display!=='none'&&p.clientWidth>200};})()`);
    chk('con la lista de la hoja Permisos ya cargada, la tab sigue a la vista para el admin', conPermisos && visible.boton && visible.pagina, visible);
    if (!await esperar(cli, `document.querySelectorAll('#p-evolucion .evu-graf svg').length>=8`, 20000)) {
      chk('la tab dibuja sus gráficos', false, await evaluar(cli, `document.getElementById('evuBody').innerText.slice(0,200)+' | '+JSON.stringify((window.__err||[]).slice(0,5))`)); salir(1);
    }
    /* La meta (planMes), las ventas y la caja llegan aparte. */
    await esperar(cli, `!!(window._evuUltimo&&window._evuUltimo.meta)`, 30000);
    const llegoEerr = await esperar(cli, `!!window._evuUltimoEerr&&!!window._evuUltimoPlata&&document.querySelectorAll('#p-evolucion .evu-graf svg').length===11`, 90000);
    chk('llegan el EERR y la caja, y la tab queda con sus 11 gráficos', llegoEerr, await evaluar(cli, `document.querySelectorAll('#p-evolucion .evu-graf svg').length`));
    await pausa(500);
    await enLaTab();

    /* ── 1 y 2. Ventas y el motor ── */
    const R = await evaluar(cli, `(function(){
      var U=window._evuUltimo,S=U.S,A=U.A,u=S.b[S.b.length-1],hoy=new Date();
      var t=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate());
      var lun=_rtDia(t,-((t.getDay()+6)%7));
      var gs=_rtSumar(_rtIso(lun),_rtIso(t));
      var gm=_rtSumar(_rtIso(new Date(t.getFullYear(),t.getMonth(),1)),_rtIso(t));
      var P=_rtPeriodo('sem',hoy), gp=_rtSumar(P.d,P.h);
      var PM=_rtPeriodo('mes',hoy), gc=_rtSumar(PM.cd,PM.ch);
      var sc=0;Object.keys(u.can).forEach(function(k){sc+=u.can[k];});
      return {gr:S.gr,n:S.b.length,uF:u.f,uEnt:u.ent,uTk:u.tk,uCurso:u.curso,uProy:u.proy?u.proy.f:null,uVacio:!!u.vacio,uArranca:!!u.arranca,pF:S.b.length>1?S.b[S.b.length-2].f:null,
        semF:gs.tot.f+gs.cat.f,semEnt:gs.tot.ent,semFr:gs.tot.f,sumaCanales:sc,
        semPartida:(P.d!==_rtIso(lun)),resumenSemF:gp.tot.f+gp.cat.f,
        mesF:gm.tot.f+gm.cat.f,acumHoy:A.hoyF,acumAnt:A.antMismoDia,mesAntMismoDia:gc.tot.f+gc.cat.f,
        mesTxt:'$'+f$(Math.round(gm.tot.f+gm.cat.f)),
        meta:U.meta?U.meta.v:null,cat:gm.cat.f,proy:A.proy,dif:A.dif,cerr:A.cerr,
        proyTxt:A.proy?'$'+f$(A.proy):'',difTxt:'$'+f$(Math.abs(A.dif))+(A.dif>=0?' adelante':' atrás'),
        ym:t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')};
    })()`);
    console.log('  · ' + R.n + ' semanas · esta semana $' + Math.round(R.uF) + ' · ' + R.uEnt + ' entregas · mes $' + Math.round(R.acumHoy) + ' · meta ' + R.meta + ' · proyección ' + R.proy);
    chk('arranca en 8 semanas por semana', R.gr === 'sem' && R.n >= 2 && R.n <= 8, R);
    chk('el último punto de Facturado = _rtSumar(lunes, hoy) con catering', Math.abs(R.uF - R.semF) < 0.5, [R.uF, R.semF]);
    if (!R.semPartida) chk('…y es la semana que muestra Inicio › Resumen', Math.abs(R.uF - R.resumenSemF) < 0.5, [R.uF, R.resumenSemF]);
    else console.log('  --   la semana está partida por el fin de mes: Inicio muestra el tramo del mes; la serie, la semana entera (a propósito)');
    chk('el último punto de Entregas = las entregas del mismo tramo', R.uEnt === R.semEnt, [R.uEnt, R.semEnt]);
    chk('ticket × entregas = lo facturado sin catering', R.uEnt === 0 || Math.abs(R.uTk * R.uEnt - R.semFr) < 1, [R.uTk, R.uEnt, R.semFr]);
    chk('el acumulado de hoy = _rtSumar(1 del mes, hoy) con catering', Math.abs(R.acumHoy - R.mesF) < 0.5, [R.acumHoy, R.mesF]);
    chk('ese número está ESCRITO en Inicio › Total Maleu (' + R.mesTxt + ')', inicioTxt.indexOf(R.mesTxt) >= 0, inicioTxt.slice(0, 200));
    chk('el mes pasado al mismo día = la comparación de Inicio', Math.abs(R.acumAnt - R.mesAntMismoDia) < 0.5, [R.acumAnt, R.mesAntMismoDia]);
    if (R.meta > 0 && R.cerr > 0) {
      chk('adelante/atrás del ritmo = lo ESCRITO en Objetivo (' + R.difTxt + ')', objTxt.indexOf(R.difTxt) >= 0, objTxt.slice(0, 500));
      if (R.proy) chk('la proyección de cierre = el «cierra en» ESCRITO en Objetivo (' + R.proyTxt + ')', objTxt.indexOf(R.proyTxt) >= 0, objTxt.slice(0, 500));
    } else console.log('  --   sin objetivo o sin días cerrados: no hay ritmo que comparar con Objetivo');
    chk('los canales (con B2B) suman el total de la semana', Math.abs(R.sumaCanales - R.uF) < 1, [R.sumaCanales, R.uF]);

    let M = await evaluar(cli, medir);
    console.log('  · ' + M.graf + ' gráficos · ' + M.textos + ' textos medidos');
    chk('se midieron los 11 gráficos', M.graf === 11 && TODOS.every(id => M.por[id]), Object.keys(M.por));
    dibujoOk(M, 'por semana');
    chk('por semana: la línea llena llega hasta el último período cerrado', M.por.ventas.llena[0] === R.n - (R.uCurso ? 1 : 0), [M.por.ventas.llena, R.n]);
    const hS = P12.reduce((a, id) => a + M.por[id].huecos, 0), pS = P12.reduce((a, id) => a + M.por[id].proy, 0);
    chk('por semana: punto hueco solo si la semana no cerró; proyección donde hay ritmo',
      hS === ((R.uCurso && !R.uVacio) ? (R.uEnt > 0 ? 3 : 2) : 0) && pS === (R.proy ? 1 : 0) + (R.uCurso && R.uProy !== null ? 2 : 0), [hS, pS, R.uCurso]);
    /* UN PERÍODO RECIÉN ARRANCADO NO ES UN CERO (lunes 12/10/2026 00:06: «Esta
       semana va $0» y un punto hueco contra el piso). Con la semana vacía o
       arrancando hoy, el titular habla de la semana CERRADA, la nueva va como
       nota y no hay punto en cero. */
    if (R.uVacio || R.uArranca) {
      const N = await evaluar(cli, `(function(){var o={};['ventas','entregas','ticket','canales'].forEach(function(id){
        var c=document.querySelector('#p-evolucion [data-card="'+id+'"]'),n=c.querySelector('.evu-nota');
        o[id]={frase:c.querySelector('.evu-frase').textContent,nota:n?n.textContent:'',huecos:c.querySelectorAll('svg .evu-p.hueco').length,
               ult:_evuCfg[id].series.filter(function(s){return s.tipo==='main';}).map(function(s){return s.v[s.v.length-1];})};});return o;})()`);
      console.log('  · la semana ' + (R.uVacio ? 'está vacía' : 'arranca hoy') + ': se mira el titular');
      chk('semana recién arrancada: los cuatro titulares hablan de la semana pasada, con su número',
        ['ventas', 'entregas', 'ticket', 'canales'].every(id => /semana pasada/i.test(N[id].frase) && /\d/.test(N[id].frase) && !/\$0/.test(N[id].frase)), N);
      chk('…y dice lo que cerró la semana pasada', N.ventas.frase.indexOf(await evaluar(cli, `_evuCorto(${R.pF})`)) >= 0, [N.ventas.frase, R.pF]);
      chk('…la semana nueva va como nota chica', ['ventas', 'entregas', 'ticket', 'canales'].every(id => /Esta semana (arranca hoy|todavía no tiene entregas)/.test(N[id].nota)), N);
      if (R.uVacio) chk('…y sin punto en cero: la semana vacía no se dibuja', ['ventas', 'entregas', 'ticket', 'canales'].every(id => N[id].huecos === 0 && N[id].ult.every(v => v === null)), N);
    }
    chk('cada gráfico arranca con una frase con su número', Object.keys(M.frases).length === 12 && Object.keys(M.frases).every(k => /\d/.test(M.frases[k]) && M.frases[k].length > 12), M.frases);
    Object.keys(M.frases).forEach(k => console.log('       «' + M.frases[k] + '»'));
    await captura('evolucion-semana');

    /* ── El detalle al tocar ── */
    await enLaTab();
    const tip = await evaluar(cli, `(function(){
      var box=document.querySelector('#p-evolucion .evu-graf[data-evu="ventas"]'),svg=box.querySelector('svg'),r=svg.getBoundingClientRect();
      var c=_evuCfg.ventas,g=c._g;
      box.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+g.padL+g.pw,clientY:r.top+60,bubbles:true,pointerType:'mouse'}));
      var t=box.querySelector('.evu-tip');
      var tr=t.getBoundingClientRect(),br=box.getBoundingClientRect();
      return {on:t.classList.contains('on'),txt:t.innerText,dentro:tr.left>=br.left-1&&tr.right<=br.right+1,cross:box.querySelector('.evu-cross').style.display!=='none'};
    })()`);
    chk('al pasar por el último punto aparece el detalle', tip.on && tip.cross, tip);
    chk('el detalle dice «Semana del dd/mm al dd/mm» y el número entero', /Semana del \d\d\/\d\d al \d\d\/\d\d/.test(tip.txt) && (R.uVacio ? /sin entregas/i.test(tip.txt) && !/\$0/.test(tip.txt) : tip.txt.indexOf('$' + Math.round(R.uF).toLocaleString('es-AR')) >= 0), tip.txt);
    chk('el detalle no se sale del gráfico', tip.dentro, tip);
    await evaluar(cli, `document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);

    /* ── Por mes: el mes en curso NO baja ── */
    await evaluar(cli, `evuPer('6m');evuGrupo('mes')`);
    await pausa(600);
    const R2 = await evaluar(cli, `(function(){var S=window._evuUltimo.S,u=S.b[S.b.length-1];
      var d=new Date(),ult=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      var vis=EVU_CAN.filter(function(c){return !EVU_OFF[c[0]];}).length;
      return {gr:S.gr,n:S.b.length,uF:u.f,curso:u.curso,finDeMes:d.getDate()===ult,labs:S.b.map(function(b){return b.lab;}),vis:vis,
        proy:u.proy?Math.round(u.proy.f):null};})()`);
    M = await evaluar(cli, medir);
    chk('por mes: el último punto = el acumulado de Total Maleu', R2.gr === 'mes' && Math.abs(R2.uF - R.mesF) < 0.5, [R2.uF, R.mesF]);
    dibujoOk(M, 'por mes');
    if (!R2.finDeMes) {
      chk('por mes: lo de hoy son puntos huecos sueltos (ventas, entregas, ticket y 5 canales)', R2.curso && P12.reduce((a, id) => a + M.por[id].huecos, 0) === 3 && M.por.canales.huecos === R2.vis, [M.por.ventas, M.por.canales]);
      chk('por mes: la línea LLENA termina en el mes cerrado (no baja a lo de hoy)', ['ventas', 'entregas', 'ticket'].every(id => M.por[id].llena[0] === R2.n - 1) && M.por.canales.llena.every(x => x === R2.n - 1), [M.por.ventas.llena, M.por.canales.llena, R2.n]);
      if (R.proy) {
        chk('por mes: la proyección del gráfico = la del acumulado = la de Objetivo', R2.proy === R.proy, [R2.proy, R.proy]);
        chk('por mes: ventas, entregas, acumulado y cada canal proyectan; el ticket se une sin proyectar', M.por.ventas.proy === 1 && M.por.entregas.proy === 1 && M.por.acum.proy === 1 && M.por.canales.proy === R2.vis && M.por.ticket.proy === 0 && M.por.ticket.curso === 1, M.por);
      }
      chk('rentabilidad, casas y caja: el mes en curso es un punto hueco y la línea llena no llega a él',
        ['margen', 'resultado', 'casas', 'nuevas'].every(id => M.por[id].huecos === 1) && M.por.plata.huecos === 2 && M.por.resultado.curso === 0 && M.por.casas.curso === 0 && M.por.plata.curso === 0 && M.por.margen.proy === 0,
        { margen: M.por.margen, resultado: M.por.resultado, casas: M.por.casas, plata: M.por.plata });
    }
    console.log('       meses: ' + R2.labs.join(' · '));
    ['ventas', 'acum', 'entregas', 'ticket'].forEach(k => console.log('       «' + M.frases[k] + '»'));
    await captura('evolucion-mes');
    await enLaTab();

    /* ── 3. Canales: apagar uno no repinta a los otros ── */
    const antes = M.por.canales.colores.join();
    await evaluar(cli, `evuCanal('Red')`); await pausa(400);
    let Mc = await evaluar(cli, medir);
    chk('apagar Red saca una línea y los otros canales conservan su color', Mc.por.canales.colores.length === R2.vis - 1 && antes.replace(',#7B5EA7', '') === Mc.por.canales.colores.join(), [antes, Mc.por.canales.colores]);
    await evaluar(cli, `evuCanal('Red')`); await pausa(300);
    /* Home aplasta a los otros cuatro contra el eje: apagado, la escala baja a la de
       los canales chicos, que pasan a ocupar el alto del gráfico. */
    const esc = `(function(){var c=_evuCfg.canales,g=c._g,mx=0;
      c.series.forEach(function(s){if(s.nom==='Home')return;s.v.forEach(function(v){if(v>mx)mx=v;});if(s.proy&&s.proy.v>mx)mx=s.proy.v;});
      var ch=[].slice.call(document.querySelectorAll('#p-evolucion [data-card="canales"] .evu-chip')).map(function(b){return b.textContent+'|'+b.getAttribute('aria-pressed');});
      return {top:g.top,maxChicos:mx,ocupa:mx/g.top,chips:ch,series:c.series.map(function(s){return s.nom;})};})()`;
    const e1 = await evaluar(cli, esc);
    chk('Canales tiene el chip Home, y arranca prendido', e1.chips.length === 3 && e1.chips[0] === 'Home|true' && e1.series[0] === 'Home', e1.chips);
    await evaluar(cli, `evuCanal('Home')`); await pausa(400);
    const e2 = await evaluar(cli, esc);
    Mc = await evaluar(cli, medir);
    console.log('       eje con Home $' + Math.round(e1.top) + ' (los chicos ocupan el ' + Math.round(e1.ocupa * 100) + '% del alto) · sin Home $' + Math.round(e2.top) + ' (' + Math.round(e2.ocupa * 100) + '%)');
    chk('apagar Home baja la escala a la de los canales chicos', e2.series.indexOf('Home') < 0 && e2.top < e1.top && e2.ocupa > 0.6 && e2.ocupa > e1.ocupa, [e1, e2]);
    chk('sin Home: los otros conservan su color, y nada se pisa ni se sale', antes.replace('#E5662F,', '') === Mc.por.canales.colores.join() && Mc.pisadas.length === 0 && Mc.fuera.length === 0 && Mc.sinAncho.length === 0, [Mc.por.canales.colores, Mc.pisadas, Mc.fuera]);
    await captura('evolucion-sin-home');
    await enLaTab();
    await evaluar(cli, `evuCanal('Home')`); await pausa(300);

    /* ── 4, 5 y 6. Rentabilidad, clientes y plata, contra su fuente ── */
    const R3 = await evaluar(cli, `(function(){
      var E=window._evuUltimoEerr.ks,C=window._evuUltimoCli,Pl=window._evuUltimoPlata,malE=[],malC=[],malCo=[],malP=[];
      E.forEach(function(z){var p=z.ym.split('-'),k=eerrKpisMes(+p[1],+p[0]);if(!k||Math.abs(k.mbPct-z.mbPct)>1e-6||Math.abs(k.resNeto-z.resNeto)>0.5)malE.push(z.ym);});
      C.meses.forEach(function(m){
        var hasta=m.curso?new Date().getDate():m.dias;
        if(window._planIndicadorMes('casas',m.y,m.m0,hasta)!==m.act||window._planIndicadorMes('casas_nuevas',m.y,m.m0,hasta)!==m.nue)malC.push(m.ym);
      });
      /* la cohorte cuenta las casas nuevas por OTRO camino: tiene que dar lo de Objetivo */
      var n=0;C.co.forEach(function(c){var ult=new Date(c.y,c.m0+1,0).getDate(),hoy=new Date();
        var hasta=(c.y===hoy.getFullYear()&&c.m0===hoy.getMonth())?hoy.getDate():ult;
        n++;if(window._planIndicadorMes('casas_nuevas',c.y,c.m0,hasta)!==c.nuevas)malCo.push(c.ym+': '+c.nuevas);});
      Pl.fs.forEach(function(z){var p=z.ym.split('-'),f=eerrFlujoMes(+p[1],+p[0]);if(Math.abs(f.entradas-z.entradas)>0.5||Math.abs(f.salidas-z.salidas)>0.5)malP.push(z.ym);});
      var u=E[E.length-1];
      return {nE:E.length,malE:malE,nC:C.meses.length,malC:malC,nCo:n,malCo:malCo,nP:Pl.fs.length,malP:malP,
        eerrMes:u.ym,eerrFact:u.totFact,completas:C.co.filter(function(c){return c.completa;}).length,
        incompletaDibujada:document.querySelectorAll('#p-evolucion [data-card="segunda"] .evu-tb tbody tr').length,
        cobrar:Pl.cobrar,cobrarTxt:'$'+f$(Math.round(Pl.cobrar)),cobrarDom:(document.getElementById('evuCobrar')||{}).textContent};
    })()`);
    chk('margen y resultado = eerrKpisMes, mes por mes (' + R3.nE + ' meses)', R3.nE >= 2 && R3.malE.length === 0, R3.malE);
    chk('lo vendido del mes según el EERR (ventas) = el acumulado de arriba (pedidos)', R3.eerrMes === R.ym && Math.abs(R3.eerrFact - R.mesF) < 1, [R3.eerrMes, R3.eerrFact, R.mesF]);
    chk('casas activas y nuevas = el indicador de Objetivo (' + R3.nC + ' meses)', R3.nC >= 2 && R3.malC.length === 0, R3.malC);
    chk('las casas nuevas de cada cohorte, contadas aparte, dan lo de Objetivo (' + R3.nCo + ' meses)', R3.nCo >= 3 && R3.malCo.length === 0, R3.malCo);
    chk('segunda compra: solo se dibujan los meses que ya cumplieron los 60 días', R3.incompletaDibujada === R3.completas && R3.completas >= 1, [R3.incompletaDibujada, R3.completas]);
    chk('lo que entró y salió = eerrFlujoMes, mes por mes (' + R3.nP + ' meses)', R3.nP >= 2 && R3.malP.length === 0, R3.malP);
    chk('«Falta cobrar» está ESCRITO en Inicio › A cobrar (' + R3.cobrarTxt + ')', snapTxt.indexOf(R3.cobrarTxt) >= 0 && R3.cobrarDom === R3.cobrarTxt, [snapTxt.slice(0, 300), R3.cobrarDom]);

    /* ── El período más largo, por semana: muchos puntos en poco ancho ── */
    await enLaTab();
    await evaluar(cli, `evuPer('anio');evuGrupo('sem')`);
    await pausa(600);
    M = await evaluar(cli, medir);
    const n3 = await evaluar(cli, `window._evuUltimo.S.b.length`);
    dibujoOk(M, 'este año por semana (' + n3 + ' puntos)');
    await captura('evolucion-anio');


    /* ── LOS CARTELES, PUNTO POR PUNTO (12/10/2026) ──────────────────────────
       Se pasa el puntero por CADA punto de CADA gráfico, en tres vistas. En cada
       uno: el cartel aparece, no se sale de su caja ni de la pantalla, no tapa
       los puntos de esa fecha, dice el período, y trae una fila por serie. */
    const recorrer = `(function(){
      var out={puntos:0,graf:0,sinCartel:[],fuera:[],tapa:[],sinTitulo:[],filasMal:[],desorden:[],sinProy:[],sinCurso:[]};
      document.querySelectorAll('#p-evolucion .evu-graf').forEach(function(box){
        var id=box.getAttribute('data-evu'),c=_evuCfg[id],svg=box.querySelector('svg'); if(!c||!svg||!c._g)return;
        out.graf++;
        var g=c._g,r=svg.getBoundingClientRect(),br=box.getBoundingClientRect();
        for(var i=0;i<g.n;i++){
          var con=c.series.filter(function(se){return (se.v[i]!==null&&se.v[i]!==undefined)||(se.proy&&se.proy.i===i);});
          if(!con.length)continue;
          out.puntos++;
          var x=g.n===1?g.padL+g.pw/2:g.padL+i*g.pw/(g.n-1);
          box.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+x,clientY:r.top+40,bubbles:true,pointerType:'mouse'}));
          var t=box.querySelector('.evu-tip');
          if(!t||!t.classList.contains('on')||box._evuI!==i){out.sinCartel.push(id+'#'+i);continue;}
          var tr=t.getBoundingClientRect();
          if(tr.left<br.left-1||tr.right>br.right+1||tr.left<0||tr.right>window.innerWidth+0.5||tr.top<br.top-1)out.fuera.push(id+'#'+i);
          c.series.forEach(function(se){
            var v=(se.v[i]!==null&&se.v[i]!==undefined)?se.v[i]:((se.proy&&se.proy.i===i)?se.proy.v:null); if(v===null)return;
            var px=r.left+x,py=r.top+g.Y(v);
            if(px>tr.left+1&&px<tr.right-1&&py>tr.top+1&&py<tr.bottom-1)out.tapa.push(id+'#'+i+' '+se.nom);
          });
          var tit=t.querySelector('.evu-tip-t').textContent;
          if(!/\\d/.test(tit)||tit.length<8)out.sinTitulo.push(id+'#'+i+': '+tit);
          var filas=[].slice.call(t.querySelectorAll('.evu-tip-f'));
          if(filas.length!==con.length)out.filasMal.push(id+'#'+i+': '+filas.length+' de '+con.length);
          if(c.series.length>1&&c.series.every(function(se){return se.multi;})){
            var vs=con.map(function(se){return (se.v[i]!==null&&se.v[i]!==undefined)?se.v[i]:se.proy.v;}).sort(function(a,b){return b-a;});
            var txt=filas.map(function(f){return f.querySelector('b').textContent;});
            var esp=vs.map(function(v){return c.fmtVal(v);});
            if(txt.map(function(s){return s.replace('≈ ','');}).join('|')!==esp.join('|'))out.desorden.push(id+'#'+i+': '+txt.join(' '));
          }
          c.series.forEach(function(se){
            if(se.proy&&se.proy.i===i&&!/≈/.test(t.textContent)&&!/cierra en/.test(t.textContent))out.sinProy.push(id+'#'+i+' '+se.nom);
          });
          if((c.x[i].curso||c.x[i].hoy)&&!/en curso|no cerró|sin entregas|proyectado/.test(t.textContent))out.sinCurso.push(id+'#'+i);
        }
        box.dispatchEvent(new PointerEvent('pointerleave',{bubbles:false,pointerType:'mouse'}));
      });
      return out;})()`;
    const cartelesOk = (T, que) => {
      console.log('  · ' + que + ': ' + T.puntos + ' puntos en ' + T.graf + ' gráficos');
      chk(que + ': el cartel aparece en todos los puntos (' + T.puntos + ')', T.puntos > 40 && T.graf === 11 && T.sinCartel.length === 0, T.sinCartel);
      chk(que + ': ningún cartel se sale de su caja ni de la pantalla', T.fuera.length === 0, T.fuera);
      chk(que + ': ningún cartel tapa los puntos que explica', T.tapa.length === 0, T.tapa);
      chk(que + ': el cartel dice el período', T.sinTitulo.length === 0, T.sinTitulo);
      chk(que + ': una fila por serie con dato en esa fecha', T.filasMal.length === 0, T.filasMal);
      chk(que + ': con varias líneas, van de mayor a menor', T.desorden.length === 0, T.desorden);
      chk(que + ': lo proyectado se nombra como tal', T.sinProy.length === 0, T.sinProy);
      chk(que + ': lo que no cerró lo dice', T.sinCurso.length === 0, T.sinCurso);
    };
    /* La tabla de «Ver los números» = el gráfico, celda por celda. */
    const tablas = `(function(){var mal=[],celdas=0;
      document.querySelectorAll('#p-evolucion .evu-card[data-card]').forEach(function(cd){
        var id=cd.getAttribute('data-card'),c=_evuCfg[id],tb=cd.querySelector('.evu-tb tbody'); if(!c||!tb)return;
        var filas=[].slice.call(tb.querySelectorAll('tr')),k=0;
        c.x.forEach(function(x,i){
          if(!c.series.some(function(se){return se.v[i]!==null&&se.v[i]!==undefined;}))return;
          var tr=filas[k++]; if(!tr){mal.push(id+': falta la fila '+i);return;}
          var tds=tr.querySelectorAll('td');
          c.series.forEach(function(se,j){celdas++;var v=se.v[i],esp=(v===null||v===undefined)?'—':c.fmtVal(v);
            if(!tds[j]||tds[j].textContent!==esp)mal.push(id+'#'+i+' '+se.nom+': '+(tds[j]?tds[j].textContent:'?')+' ≠ '+esp);});
        });
        if(k!==filas.length)mal.push(id+': sobran filas');
      });
      return {mal:mal.slice(0,8),n:mal.length,celdas:celdas};})()`;

    await enLaTab();
    for (const [per, gr, que] of [['8s', 'sem', '8 semanas'], ['6m', 'mes', '6 meses por mes'], ['anio', 'sem', 'este año por semana'], ['12m', 'mes', '12 meses por mes']]) {
      await evaluar(cli, `evuPer('${per}');evuGrupo('${gr}')`); await pausa(500);
      cartelesOk(await evaluar(cli, recorrer), 'carteles, ' + que);
      const Tb = await evaluar(cli, tablas);
      chk('«Ver los números», ' + que + ': la tabla = el gráfico (' + Tb.celdas + ' celdas)', Tb.celdas > 80 && Tb.n === 0, Tb.mal);
    }
    /* El acumulado: el último día del mes trae la proyección, nombrada. */
    await evaluar(cli, `evuPer('8s')`); await pausa(400);
    const pA = await evaluar(cli, `(function(){var box=document.querySelector('#p-evolucion .evu-graf[data-evu="acum"]'),c=_evuCfg.acum,g=c._g,r=box.querySelector('svg').getBoundingClientRect();
      var pr=c.series[0].proy; if(!pr)return {sin:true};
      box.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+g.padL+pr.i*g.pw/(g.n-1),clientY:r.top+40,bubbles:true,pointerType:'mouse'}));
      var t=box.querySelector('.evu-tip').textContent; box.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));
      return {txt:t,esp:'≈ '+c.fmtVal(pr.v)};})()`);
    /* …también SIN objetivo cargado, cuando ese día no tiene ninguna otra serie. */
    const pB = await evaluar(cli, `(function(){var m=_evuMeta;_evuMeta={label:m?m.label:'',v:0,hace:''};rEvolucion();
      var box=document.querySelector('#p-evolucion .evu-graf[data-evu="acum"]'),c=_evuCfg.acum,g=c._g,r=box.querySelector('svg').getBoundingClientRect(),pr=c.series[0].proy,o={sin:!pr};
      if(pr){box.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+g.padL+pr.i*g.pw/(g.n-1),clientY:r.top+40,bubbles:true,pointerType:'mouse'}));o.i=box._evuI;o.esp=pr.i;o.txt=box.querySelector('.evu-tip').textContent;}
      _evuMeta=m;rEvolucion();return o;})()`);
    if (!pB.sin) chk('acumulado sin objetivo: el cartel del cierre proyectado cae en su día, no en el de al lado', pB.i === pB.esp && /proyectado al cierre/.test(pB.txt), pB);
    if (!pA.sin) chk('acumulado: el último día del mes muestra el cierre proyectado, con ≈ y «proyectado»', pA.txt.indexOf(pA.esp) >= 0 && /proyectado al cierre/.test(pA.txt), pA);

    /* En el celular: se abre al tocar, se cierra al tocar afuera, al hacer scroll
       y al cambiar de período. */
    const toque = `(function(){var box=document.querySelector('#p-evolucion .evu-graf[data-evu="ventas"]'),r=box.querySelector('svg').getBoundingClientRect(),g=_evuCfg.ventas._g;
      box.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+g.padL+g.pw/2,clientY:r.top+50,bubbles:true,pointerType:'touch'}));
      return document.querySelectorAll('#p-evolucion .evu-tip.on').length;})()`;
    const abiertos = `document.querySelectorAll('#p-evolucion .evu-tip.on').length`;
    chk('tocar un gráfico abre su cartel', await evaluar(cli, toque) === 1);
    await evaluar(cli, `document.querySelector('#p-evolucion .evu-h').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}))`);
    chk('…tocar afuera lo cierra', await evaluar(cli, abiertos) === 0);
    await evaluar(cli, toque);
    await evaluar(cli, `window.scrollBy(0,120)`); await pausa(300);
    chk('…al hacer scroll no queda colgado', await evaluar(cli, abiertos) === 0);
    await evaluar(cli, `window.scrollTo(0,0)`); await pausa(200);
    await evaluar(cli, toque);
    await evaluar(cli, `evuPer('6m')`); await pausa(300);
    chk('…ni al cambiar de período', await evaluar(cli, abiertos) === 0);

    /* Con teclado. */
    const tecla = k => `(function(){var box=document.querySelector('#p-evolucion .evu-graf[data-evu="ventas"]');box.focus();
      box.dispatchEvent(new KeyboardEvent('keydown',{key:'${k}',bubbles:true}));
      var t=box.querySelector('.evu-tip');return {i:box._evuI,on:!!t&&t.classList.contains('on'),tab:box.tabIndex,n:_evuCfg.ventas._g.n};})()`;
    const k1 = await evaluar(cli, tecla('End')), k2 = await evaluar(cli, tecla('ArrowLeft')), k3 = await evaluar(cli, tecla('Home')), k4 = await evaluar(cli, tecla('Escape'));
    chk('teclado: el gráfico recibe el foco y las flechas recorren los puntos', k1.tab === 0 && k1.on && k1.i === k1.n - 1 && k2.i === k1.n - 2 && k3.i === 0 && k4.on === false, [k1, k2, k3, k4]);
    await evaluar(cli, `document.activeElement&&document.activeElement.blur()`);

    /* Cambiar rápido: no queda un gráfico del período anterior. */
    await evaluar(cli, `['8s','6m','12m','anio','8s','12m'].forEach(function(p){evuPer(p);});['sem','mes','sem','mes'].forEach(function(g){evuGrupo(g);});`);
    await pausa(500);
    const rap = await evaluar(cli, `(function(){var S=window._evuUltimo.S;return {per:S.per,gr:S.gr,n:S.b.length,svgs:document.querySelectorAll('#p-evolucion .evu-graf svg').length,
      pts:_evuCfg.ventas.x.length,on:document.querySelector('#p-evolucion .evu-seg button.on').textContent};})()`);
    chk('cambiar rápido de período y agrupación: queda el último, entero', rap.per === '12m' && rap.gr === 'mes' && rap.svgs === 11 && rap.pts === rap.n && rap.on === '12 meses', rap);
    M = await evaluar(cli, medir); dibujoOk(M, '12 meses por mes');

    /* Los tres chips, en las 8 combinaciones. «Ver los números» abierto no se cierra. */
    await evaluar(cli, `evuPer('8s');document.querySelector('#p-evolucion [data-card="canales"] details').open=true;`); await pausa(300);
    const combos = [];
    for (let m = 0; m < 8; m++) {
      await evaluar(cli, `EVU_OFF={Home:${!!(m & 1)},Red:${!!(m & 2)},Catering:${!!(m & 4)}};rEvolucion()`); await pausa(250);
      const Mx = await evaluar(cli, medir);
      const cx = await evaluar(cli, `({n:_evuCfg.canales.series.length,abierta:document.querySelector('#p-evolucion [data-card="canales"] details').open,top:_evuCfg.canales._g.top})`);
      if (cx.n !== 5 - ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1)) || !cx.abierta || !(cx.top > 0) || Mx.fuera.length || Mx.pisadas.length || Mx.sinAncho.length || Mx.graf !== 11) combos.push({ m, cx, fuera: Mx.fuera, pisadas: Mx.pisadas });
    }
    chk('Home, Red y Catering en sus 8 combinaciones: nada se pisa ni se sale, y la tabla abierta sigue abierta', combos.length === 0, combos);
    await evaluar(cli, `EVU_OFF={};rEvolucion()`); await pausa(300);

    /* Girar el celular / cambiar el ancho con la tab abierta, con un cartel abierto. */
    await evaluar(cli, toque);
    const ancho2 = ANCHO < 700 ? 844 : 1100;
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ancho2, height: ANCHO < 700 ? 390 : 800, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await pausa(900);
    M = await evaluar(cli, medir);
    chk('al girar o cambiar el ancho (' + ancho2 + ' px) los gráficos se rehacen a su caja, sin cartel colgado', M.graf === 11 && M.sinAncho.length === 0 && M.fuera.length === 0 && await evaluar(cli, `(function(){var p=document.getElementById('p-evolucion');return p.scrollWidth-p.clientWidth;})()`) <= 0 && await evaluar(cli, abiertos) === 0, [M.sinAncho, M.fuera]);
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await pausa(900);
    M = await evaluar(cli, medir);
    chk('…y al volver, también', M.graf === 11 && M.sinAncho.length === 0 && M.fuera.length === 0, [M.sinAncho, M.fuera]);

    /* Si el backend no contesta, se dice (no queda «Trayendo…» para siempre). */
    const falla = await evaluar(cli, `(function(){var g=window.VD;window.VD=null;_evuEerrPedido=true;_evuEerrFallo='las ventas';rEvolucion();
      var t=document.getElementById('evuBody').innerText,n=document.querySelectorAll('#p-evolucion .evu-graf svg').length;
      window.VD=g;_evuEerrFallo='';rEvolucion();
      return {dice:/No se pudieron traer las ventas/.test(t),trayendo:/Trayendo el EERR/.test(t),svgs:n,vuelve:document.querySelectorAll('#p-evolucion .evu-graf svg').length};})()`);
    chk('sin las ventas: lo dice, los otros bloques se dibujan igual, y vuelve cuando llegan', falla.dice && !falla.trayendo && falla.svgs >= 8 && falla.vuelve === 11, falla);

    /* El ↻ trae TODO lo que la tab dibuja: pedidos, ventas y caja. */
    const fu = await evaluar(cli, `JSON.stringify(_fuentesDeTab('evolucion'))`);
    chk('las fuentes de la tab son los pedidos, las ventas y la caja', /pedidos/.test(fu) && /ventas/.test(fu) && /caja/.test(fu), fu);
    await evaluar(cli, `(function(){window.__evuPed=[];var f=window.fetch;window.__evuF=f;window.fetch=function(u){try{var m=/action=([A-Za-z]+)/.exec(String(u&&u.url||u));if(m)window.__evuPed.push(m[1]);}catch(e){}return f.apply(this,arguments);};refreshContextual();})()`);
    await esperar(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`, 120000);
    const ped = await evaluar(cli, `(function(){window.fetch=window.__evuF;return JSON.stringify(window.__evuPed);})()`);
    chk('el ↻ pide las ventas y la caja además de los pedidos', /"ventas"/.test(ped) && /"cajaLight"/.test(ped) && /pedidosLight|"lote"/.test(ped), ped);
    chk('…y la tab queda entera después', await evaluar(cli, `document.querySelectorAll('#p-evolucion .evu-graf svg').length`) === 11);
    chk('el sello dice de cuándo son los datos', /Ventas de /.test(await evaluar(cli, `document.getElementById('evuSello').textContent`)));

    const errs = await evaluar(cli, `JSON.stringify((window.__err||[]).filter(function(e){return /evolu|evu|rEvol|eerr|flujo/i.test(e);}))`);
    chk('sin errores de la tab en consola', errs === '[]', errs);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(1); }
})();
