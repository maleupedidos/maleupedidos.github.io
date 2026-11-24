#!/usr/bin/env node
/* VENTAS › TENDENCIA (24/11/2026, encargo de Tadeo: «es lo más importante del negocio»). Con los datos reales, sin escribir:
     1. Barrio según el canal: con Home el desplegable trae solo barrios con ventas de Home en la ventana; con Clubes, nada.
     2. Los períodos en cero se ven: Clubes › Entregas por mes y por semana llegan hasta el período de HOY.
     3. Retail = Home + Pilar + Red, al peso y entrega por entrega, período por período (facturado y entregas).
     4. Red por representante: los gráficos chiquitos suman, período por período, las entregas de Red.
     5. Tocar un punto: lo que lo compone suma lo que dice el punto (facturado y entregas).
   Suelta:  SESION=<sesion_prueba.json> [BASE=http://localhost:8080/app.html] [FOTOS=<dir>] node cruce_tendencia.js
   Robot:   const { EXPR } = require('../pruebas/cruce_tendencia.js'); await ev(EXPR) */
'use strict';
const fs = require('fs');

const EXPR = `(async function(){
  var pausa=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  try{ if(typeof go==='function')go('ventas'); }catch(e){}
  for(var i=0;i<240&&!(typeof VD!=='undefined'&&VD&&VD.length&&window.D&&D.pedidos&&D.pedidos.length);i++)await pausa(500);
  if(!(typeof VD!=='undefined'&&VD&&VD.length))return {ok:false,difs:['no llegaron las ventas (VD)']};
  try{ if(typeof vSwitchTab==='function')vSwitchTab('tendencia'); }catch(e){}
  await pausa(300);
  var filas=[],difs=[];
  var cmp=function(que,a,b,tol){ var ok=Math.abs((Number(a)||0)-(Number(b)||0))<=(tol||0); filas.push({que:que,a:a,b:b,ok:ok}); if(!ok)difs.push(que+': '+a+' / '+b); };
  var poner=function(o){ ['vtSubcanal','vtBarrio','vtDow','vtMetric','vtWindow'].forEach(function(id){ if(o[id]!==undefined){ var el=document.getElementById(id); if(el)el.value=o[id]; } }); TEND_REP=o.rep||null; rTendencia(); };
  var serie=function(){ return ((window._tendUltima||{}).serie||[]).map(function(x){ return {key:x.key,n:x.n,fact:Math.round(x.fact)}; }); };
  var opciones=function(id){ var el=document.getElementById(id); return el?[].map.call(el.options,function(o){return o.value;}).filter(function(v){return v!=='__all';}):[]; };
  /* 1. Barrio según el canal */
  poner({vtSubcanal:'Home',vtBarrio:'__all',vtDow:'week',vtMetric:'fact',vtWindow:'12'});
  var bH=opciones('vtBarrio'), noHome=bH.filter(function(b){ return b!=='Estancias del Pilar'&&b!=='Estancias del Río'; });
  filas.push({que:'barrios con Home',lista:bH});
  if(noHome.length||!bH.length)difs.push('con Home el barrio trae '+JSON.stringify(bH));
  poner({vtSubcanal:'Clubes',vtBarrio:'__all'});
  if(!document.getElementById('vtBarrio').disabled)difs.push('con Clubes el barrio no queda deshabilitado ('+JSON.stringify(opciones('vtBarrio'))+')');
  /* 2. Los períodos en cero: Clubes por mes y por semana llegan a hoy */
  var h=new Date(), kMes=h.getFullYear()+'-M'+String(h.getMonth()).padStart(2,'0');
  var kSem=_isoWeek(h)[0]+'-W'+String(_tendISOWeek(h)).padStart(2,'0');
  poner({vtSubcanal:'Clubes',vtDow:'month',vtMetric:'ped',vtWindow:'12'});
  var sM=serie(); filas.push({que:'Clubes por mes',serie:sM.slice(-4)});
  if(!sM.length||sM[sM.length-1].key!==kMes)difs.push('Clubes por mes no llega a '+kMes+' (termina en '+(sM.length?sM[sM.length-1].key:'nada')+')');
  poner({vtSubcanal:'Clubes',vtDow:'week',vtMetric:'ped',vtWindow:'12'});
  var sS=serie(); filas.push({que:'Clubes por semana',serie:sS.slice(-6)});
  if(!sS.length||sS[sS.length-1].key!==kSem)difs.push('Clubes por semana no llega a '+kSem+' (termina en '+(sS.length?sS[sS.length-1].key:'nada')+')');
  if(sS.length!==12)difs.push('Clubes por semana: '+sS.length+' semanas en una ventana de 12');
  /* 3. Retail = Home + Pilar + Red */
  var por=function(sub,dow){ poner({vtSubcanal:sub,vtBarrio:'__all',vtDow:dow,vtMetric:'fact',vtWindow:'0'}); var o={}; serie().forEach(function(x){ o[x.key]=x; }); return o; };
  ['week','month'].forEach(function(dow){
    var R=por('__retail',dow), H=por('Home',dow), P=por('Otras zonas',dow), D_=por('Red',dow), n=0;
    Object.keys(R).forEach(function(k){ n++;
      var f=(H[k]?H[k].fact:0)+(P[k]?P[k].fact:0)+(D_[k]?D_[k].fact:0), e=(H[k]?H[k].n:0)+(P[k]?P[k].n:0)+(D_[k]?D_[k].n:0);
      cmp('Retail '+dow+' '+k+' facturado = Home + Pilar + Red',R[k].fact,f,1); cmp('Retail '+dow+' '+k+' entregas = Home + Pilar + Red',R[k].n,e,0); });
    filas.push({que:'Retail '+dow+' períodos comparados',n:n});
  });
  /* 4. Red por representante: suman Red */
  poner({vtSubcanal:'Red',vtBarrio:'__all',vtDow:'week',vtMetric:'ped',vtWindow:'12'});
  var sR=serie(), reps=window._tendReps||[];
  filas.push({que:'representantes',reps:reps.map(function(x){ return x.r+' '+x.tot; })});
  if(!reps.length)difs.push('con Red y Entregas no hay gráficos por representante');
  sR.forEach(function(x,j){ cmp('Red '+x.key+' entregas = suma de representantes',x.n,reps.reduce(function(a,r){ return a+(r.vals[j]||0); },0),0); });
  if(reps.length){ var r0=reps[0].r; tendRep(r0); var sF=serie(); sF.forEach(function(x,j){ cmp('Red filtrado por '+r0+' '+x.key,x.n,reps[0].vals[j]||0,0); }); tendRep(null); }
  /* 5. Tocar un punto: la composición suma el punto */
  ['fact','ped'].forEach(function(met){
    poner({vtSubcanal:'__all',vtBarrio:'__all',vtDow:'month',vtMetric:met,vtWindow:'6',rep:null});
    var hits=[].slice.call(document.querySelectorAll('#vtChart .vt-hit'));
    hits.forEach(function(r,j){
      var c=(window._tendComp||[])[j]||'', div=document.createElement('div'); div.innerHTML=c;
      var suma=[].reduce.call(div.querySelectorAll('.vt-cmp-r b'),function(a,b){ var t=b.textContent.split('·')[0]; var n=Number(t.replace(/[^0-9,-]/g,'').replace(',','.'))||0; return a+n; },0);
      var tot=Number(String(r.getAttribute('data-val')).replace(/[^0-9,-]/g,'').replace(',','.'))||0;
      if(div.querySelectorAll('.vt-cmp-r').length)cmp('toque '+met+' punto '+j+' (composición = punto)',tot,suma,met==='fact'?(div.querySelectorAll('.vt-cmp-r').length+1):0);
    });
  });
  return {ok:!difs.length,filas:filas,difs:difs};
})()`;
module.exports = { EXPR };

if (require.main === module) (async () => {
  const cdp = require('./cdp.js');
  const S = process.env.SESION, BASE = process.env.BASE || 'http://localhost:8080/app.html';
  if (!S || !fs.existsSync(S)) { console.log('falta SESION=<archivo de sesion_prueba.py>'); process.exit(1); }
  const ses = JSON.parse(fs.readFileSync(S, 'utf8'));
  const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
  const PREP = `try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
      var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m==='POST'&&(/script\\.google\\.com/.test(s)||(r&&(!/_(pantalla|datos|base)$|^permiso_base$/.test(r[1])||/directo/.test(r[1])))))return Promise.resolve(new Response('{"ok":false,"err":"cortado"}',{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`;
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE });
    for (let i = 0; i < 120; i++) { try { if (await cdp.evaluar(cli, "typeof go==='function'&&!!window.D")) break; } catch (e) {} await new Promise((r) => setTimeout(r, 500)); }
    let r = await cdp.evaluar(cli, EXPR); if (typeof r === 'string') r = JSON.parse(r);
    (r.filas || []).filter((f) => !('ok' in f)).forEach((f) => console.log('  · ' + JSON.stringify(f).slice(0, 300)));
    const n = (r.filas || []).filter((f) => 'ok' in f).length;
    (r.difs || []).forEach((d) => console.log('  DIFIERE ' + d));
    console.log('\n' + n + ' comparaciones · ' + (r.ok ? '0 diferencias' : r.difs.length + ' diferencias'));
    process.exitCode = r.ok ? 0 : 1;
  } finally { try { cli.matar(); } catch (e) {} }
})();
