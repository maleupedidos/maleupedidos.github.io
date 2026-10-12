/* La tab EVOLUCIÓN: que cada serie dé el MISMO número que la pantalla de referencia.

     python leer_sesion.py                        ← un token admin
     node probar_evolucion.js <token> [390|1440]
     SHOT=carpeta node probar_evolucion.js <token> 1440   ← además guarda capturas

   Evolución no define nada: dibuja lo que ya cuentan Inicio › Total Maleu,
   Objetivo y el Resumen (`_rtSumar`). La regla del encargo (11/10/2026): si el
   último punto de una serie no coincide con esas pantallas, el que está mal es
   el gráfico. Este test lo sostiene con la SESIÓN REAL (los datos son los de
   verdad; los POST van interceptados y no se escribe nada):

   · el acumulado del mes a hoy está ESCRITO en la tarjeta Total Maleu de Inicio;
   · la semana y el mes en curso dan lo de `_rtSumar` cortado en hoy;
   · entregas y ticket salen del mismo tramo (facturado = entregas × ticket);
   · el período en curso va punteado y con el punto hueco, y solo él;
   · nada desborda: ni la página ni un solo texto fuera de su gráfico;
   · el detalle al tocar muestra el número entero.

   Dice cuántas cosas miró: «0 fallas sobre 0 elementos» es un verde falso. */
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
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(300); }
  return false;
};

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const captura = async (nombre) => {
    if (!SHOT) return;
    const alto = await evaluar(cli, `Math.ceil(document.getElementById('p-evolucion').getBoundingClientRect().bottom+window.scrollY+16)`);
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: Math.max(700, Math.min(alto, 4200)), deviceScaleFactor: 2, mobile: ANCHO < 700 });
    await pausa(700);
    const sh = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(SHOT, { recursive: true });
    fs.writeFileSync(path.join(SHOT, nombre + '-' + ANCHO + '.png'), Buffer.from(sh.data, 'base64'));
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await pausa(500);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    /* En escritorio, con el cajón lateral DESPLEGADO: es como lo usa Tadeo, y ahí
       el contenido pierde 208 px. */
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, 'try{localStorage.setItem("maleu_sb_open","' + (ANCHO >= 900 ? '1' : '0') + '");localStorage.removeItem("maleu_evu");}catch(e){}') });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    console.log('\n== Evolución · ' + ANCHO + 'px · ' + BASE + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, `typeof rEvolucion==='function'&&typeof D!=='undefined'&&D&&Array.isArray(D.pedidos)&&D.pedidos.length>50`)) {
      chk('el ERP cargó los pedidos', false, await evaluar(cli, `JSON.stringify((window.__err||[]).slice(0,5))`)); salir(1);
    }
    /* La referencia se lee ANTES, en Inicio: la tarjeta Total Maleu. */
    await esperar(cli, `!!document.querySelector('.card.mt')`, 30000);
    const inicioTxt = await evaluar(cli, `(function(){var c=document.querySelector('.card.mt');return c?c.innerText:'';})()`);

    await evaluar(cli, `go('evolucion')`);
    if (!await esperar(cli, `document.querySelectorAll('#p-evolucion .evu-graf svg').length===4`, 20000)) {
      chk('la tab dibuja sus 4 gráficos', false, await evaluar(cli, `document.getElementById('evuBody').innerText.slice(0,200)+' | '+JSON.stringify((window.__err||[]).slice(0,5))`)); salir(1);
    }
    /* La meta del mes llega aparte (planMes): se la espera para la captura. */
    await esperar(cli, `!!(window._evuUltimo&&window._evuUltimo.meta)`, 30000);
    await pausa(400);

    /* ── 1. Los números, contra el motor y contra la pantalla ── */
    const R = await evaluar(cli, `(function(){
      var U=window._evuUltimo,S=U.S,A=U.A,u=S.b[S.b.length-1],hoy=new Date();
      var t=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate());
      var lun=_rtDia(t,-((t.getDay()+6)%7));
      var gs=_rtSumar(_rtIso(lun),_rtIso(t));
      var gm=_rtSumar(_rtIso(new Date(t.getFullYear(),t.getMonth(),1)),_rtIso(t));
      var P=_rtPeriodo('sem',hoy), gp=_rtSumar(P.d,P.h);
      var PM=_rtPeriodo('mes',hoy), gc=_rtSumar(PM.cd,PM.ch);
      return {gr:S.gr,n:S.b.length,uF:u.f,uEnt:u.ent,uTk:u.tk,uCurso:u.curso,
        semF:gs.tot.f+gs.cat.f,semEnt:gs.tot.ent,semFr:gs.tot.f,
        semPartida:(P.d!==_rtIso(lun)),resumenSemF:gp.tot.f+gp.cat.f,
        mesF:gm.tot.f+gm.cat.f,acumHoy:A.hoyF,acumAnt:A.antMismoDia,mesAntMismoDia:gc.tot.f+gc.cat.f,
        mesTxt:'$'+f$(Math.round(gm.tot.f+gm.cat.f)),domingo:t.getDay()===0,
        meta:U.meta?U.meta.v:null,cat:gm.cat.f};
    })()`);
    console.log('  · ' + R.n + ' semanas · esta semana $' + Math.round(R.uF) + ' · ' + R.uEnt + ' entregas · mes $' + Math.round(R.acumHoy) + ' (catering $' + Math.round(R.cat) + ') · meta ' + R.meta);
    chk('arranca en 8 semanas por semana', R.gr === 'sem' && R.n >= 2 && R.n <= 8, R);
    chk('el último punto de Facturado = _rtSumar(lunes, hoy) con catering', Math.abs(R.uF - R.semF) < 0.5, [R.uF, R.semF]);
    if (!R.semPartida) chk('…y es la semana que muestra Inicio › Resumen', Math.abs(R.uF - R.resumenSemF) < 0.5, [R.uF, R.resumenSemF]);
    else console.log('  --   la semana está partida por el fin de mes: Inicio muestra el tramo del mes; la serie, la semana entera (a propósito)');
    chk('el último punto de Entregas = las entregas del mismo tramo', R.uEnt === R.semEnt, [R.uEnt, R.semEnt]);
    chk('ticket × entregas = lo facturado sin catering', R.uEnt === 0 || Math.abs(R.uTk * R.uEnt - R.semFr) < 1, [R.uTk, R.uEnt, R.semFr]);
    chk('el acumulado de hoy = _rtSumar(1 del mes, hoy) con catering', Math.abs(R.acumHoy - R.mesF) < 0.5, [R.acumHoy, R.mesF]);
    chk('ese número está ESCRITO en Inicio › Total Maleu (' + R.mesTxt + ')', inicioTxt.indexOf(R.mesTxt) >= 0, inicioTxt.slice(0, 200));
    chk('el mes pasado al mismo día = la comparación de Inicio', Math.abs(R.acumAnt - R.mesAntMismoDia) < 0.5, [R.acumAnt, R.mesAntMismoDia]);
    chk('la semana en curso se marca solo si no terminó', R.uCurso === !R.domingo, [R.uCurso, R.domingo]);

    /* ── 2. El dibujo ── */
    const medir = `(function(){
      var out={graf:0,textos:0,fuera:[],sinAncho:[],curso:0,huecos:0,scrollX:document.scrollingElement.scrollWidth-window.innerWidth,frases:[],fines:0};
      document.querySelectorAll('#p-evolucion .evu-card').forEach(function(card){
        var id=card.getAttribute('data-card'),svg=card.querySelector('svg'),box=card.querySelector('.evu-graf');
        out.graf++; out.frases.push(card.querySelector('.evu-frase').textContent);
        var w=Number(svg.getAttribute('width')),bw=box.clientWidth;
        if(Math.abs(w-bw)>2)out.sinAncho.push(id+': svg '+w+' caja '+bw);
        var r=svg.getBoundingClientRect();
        svg.querySelectorAll('text').forEach(function(t){
          out.textos++; var b=t.getBoundingClientRect();
          if(b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1)out.fuera.push(id+': '+t.textContent);
        });
        out.curso+=svg.querySelectorAll('.evu-l.curso').length;
        out.huecos+=svg.querySelectorAll('.evu-p.hueco').length;
        out.fines+=svg.querySelectorAll('.evu-fv').length;
      });
      return out;
    })()`;
    let M = await evaluar(cli, medir);
    console.log('  · ' + M.graf + ' gráficos · ' + M.textos + ' textos medidos');
    chk('se midieron 4 gráficos con texto', M.graf === 4 && M.textos > 30, M);
    chk('cada SVG está dibujado al ancho real de su caja', M.sinAncho.length === 0, M.sinAncho);
    chk('ningún texto se sale de su gráfico', M.fuera.length === 0, M.fuera);
    chk('la página no tiene scroll horizontal', M.scrollX <= 0, M.scrollX);
    chk('cada línea principal termina con su valor escrito', M.fines === 4, M.fines);
    chk('por semana: punteado y punto hueco solo si la semana no cerró', R.domingo ? (M.curso === 0 && M.huecos === 0) : (M.curso === 3 && M.huecos === 3), [M.curso, M.huecos]);
    chk('cada gráfico arranca con una frase con su número', M.frases.every(f => /\d/.test(f) && f.length > 12), M.frases);
    M.frases.forEach(f => console.log('       «' + f + '»'));
    await captura('evolucion-semana');

    /* ── 3. El detalle al tocar ── */
    const tip = await evaluar(cli, `(function(){
      var box=document.querySelector('#p-evolucion .evu-graf[data-evu="ventas"]'),svg=box.querySelector('svg'),r=svg.getBoundingClientRect();
      var c=_evuCfg.ventas,g=c._g;
      box.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+g.padL+g.pw,clientY:r.top+60,bubbles:true,pointerType:'mouse'}));
      var t=box.querySelector('.evu-tip');
      var tr=t.getBoundingClientRect(),br=box.getBoundingClientRect();
      return {on:t.classList.contains('on'),txt:t.innerText,dentro:tr.left>=br.left-1&&tr.right<=br.right+1,cross:box.querySelector('.evu-cross').style.display!=='none'};
    })()`);
    chk('al pasar por el último punto aparece el detalle', tip.on && tip.cross, tip);
    chk('el detalle trae el número entero', tip.txt.indexOf('$' + Math.round(R.uF).toLocaleString('es-AR')) >= 0, tip.txt);
    chk('el detalle no se sale del gráfico', tip.dentro, tip);
    await captura('evolucion-detalle');
    await evaluar(cli, `document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);

    /* ── 4. Por mes: el mes en curso es el mismo número, y va marcado ── */
    await evaluar(cli, `evuPer('6m');evuGrupo('mes')`);
    await pausa(500);
    const R2 = await evaluar(cli, `(function(){var S=window._evuUltimo.S,u=S.b[S.b.length-1];
      var d=new Date(),ult=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      return {gr:S.gr,n:S.b.length,uF:u.f,curso:u.curso,finDeMes:d.getDate()===ult,labs:S.b.map(function(b){return b.lab;})};})()`);
    M = await evaluar(cli, medir);
    chk('por mes: el último punto = el acumulado de Total Maleu', R2.gr === 'mes' && Math.abs(R2.uF - R.mesF) < 0.5, [R2.uF, R.mesF]);
    chk('por mes: el mes en curso va punteado y con el punto hueco', R2.finDeMes ? true : (R2.curso && M.curso === 3 && M.huecos === 3), [R2, M.curso, M.huecos]);
    chk('por mes: ningún texto se sale y no hay scroll horizontal', M.fuera.length === 0 && M.scrollX <= 0 && M.sinAncho.length === 0, [M.fuera, M.scrollX, M.sinAncho]);
    console.log('       meses: ' + R2.labs.join(' · '));
    await captura('evolucion-mes');

    /* ── 5. El período más largo, por semana: muchos puntos en poco ancho ── */
    await evaluar(cli, `evuPer('anio');evuGrupo('sem')`);
    await pausa(500);
    M = await evaluar(cli, medir);
    const n3 = await evaluar(cli, `window._evuUltimo.S.b.length`);
    chk('este año por semana (' + n3 + ' puntos): nada se sale ni se pisa el ancho', M.fuera.length === 0 && M.scrollX <= 0 && M.sinAncho.length === 0, [M.fuera, M.scrollX, M.sinAncho]);
    const pisados = await evaluar(cli, `(function(){var mal=[];document.querySelectorAll('#p-evolucion svg').forEach(function(svg){
      var ls=[].slice.call(svg.querySelectorAll('.evu-xlbl')).map(function(t){return t.getBoundingClientRect();}).sort(function(a,b){return a.left-b.left;});
      for(var i=1;i<ls.length;i++)if(ls[i].left<ls[i-1].right-0.5)mal.push(Math.round(ls[i-1].right-ls[i].left));});return mal;})()`);
    chk('las fechas del eje no se pisan entre sí', pisados.length === 0, pisados);
    await captura('evolucion-anio');

    const errs = await evaluar(cli, `JSON.stringify((window.__err||[]).filter(function(e){return /evolu|evu|rEvol/i.test(e);}))`);
    chk('sin errores de la tab en consola', errs === '[]', errs);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(1); }
})();
