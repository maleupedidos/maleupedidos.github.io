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
      return {gr:S.gr,n:S.b.length,uF:u.f,uEnt:u.ent,uTk:u.tk,uCurso:u.curso,uProy:u.proy?u.proy.f:null,
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
      hS === (R.uCurso ? 3 : 0) && pS === (R.proy ? 1 : 0) + (R.uCurso && R.uProy !== null ? 2 : 0), [hS, pS, R.uCurso]);
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
    chk('el detalle dice «Semana del dd/mm al dd/mm» y el número entero', /Semana del \d\d\/\d\d al \d\d\/\d\d/.test(tip.txt) && tip.txt.indexOf('$' + Math.round(R.uF).toLocaleString('es-AR')) >= 0, tip.txt);
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

    const errs = await evaluar(cli, `JSON.stringify((window.__err||[]).filter(function(e){return /evolu|evu|rEvol|eerr|flujo/i.test(e);}))`);
    chk('sin errores de la tab en consola', errs === '[]', errs);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(1); }
})();
