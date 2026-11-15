#!/usr/bin/env node
/* EL MISMO PERÍODO TIENE QUE DAR LO MISMO EN TODAS LAS PANTALLAS (15/11/2026).

   Tadeo: «No tiene que haber ninguna diferencia de datos entre cada sección del ERP». Ese día Inicio decía 67 entregas
   en la semana y Tendencia 71: cada pantalla tenía su propia cuenta. La referencia es Inicio › Ventas retail
   (`_rtSumar`, con `_rtCuentaRetail` y `_rtEntregas`). Esta prueba toma 4 períodos (semana en curso, semana pasada, mes
   en curso, mes pasado) y compara contra la referencia, con los datos reales y SIN escribir nada:
     · Ventas › TENDENCIA   facturado, margen y entregas (lo que dibuja: `window._tendUltima`)
     · Ventas › VENTAS      facturado y entregas de lo retail (`_vCalcular` + `_vEntregas`), Catering y B2B aparte
     · Resultados           ventas del mes (con Catering) y entregas (`_eerrCalc`)
     · Ventas › RED         lo que le quedó a Maleu y las ventas de Red (`_redDatos`)
     · Mi Portal            lo vendido (bruto) y los pedidos de cada representante = lo que RED dice de él
   El CRM no entra: no muestra ventas por período (son totales de toda la historia por cliente).
   Tiene que dar 0 diferencias. Lo que no cierra se dice con el número de cada lado.

   Suelta:   SESION=<archivo de sesion_prueba.py> [BASE=http://localhost:8080/app.html] node cruce_ventas.js
   Robot:    const { cruzar } = require('../pruebas/cruce_ventas.js'); await cruzar(ev)   (ev = evaluar una expresión) */
'use strict';
const fs = require('fs');

/* Lo que corre ADENTRO de la página. Devuelve {ok, filas, difs}. Tolerancia: $1 (redondeo) y 0 en conteos. */
const EXPR = `(async function(){
  var pausa=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  var iso=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  try{ if(typeof go==='function')go('ventas'); }catch(e){}
  for(var i=0;i<240&&!(typeof VD!=='undefined'&&VD&&VD.length&&window.D&&D.pedidos&&D.pedidos.length);i++)await pausa(500);
  /* Los pedidos livianos llegan primero y el volcado completo unos segundos después: se espera al completo. */
  for(var i2=0;i2<60&&!(typeof _pedidosCompletos==='function'?_pedidosCompletos():(D.pedidos.length>VD.length*0.9));i2++)await pausa(500);
  if(!(typeof VD!=='undefined'&&VD&&VD.length))return {ok:false,difs:['no llegaron las ventas (VD)']};
  try{ if(typeof vClearAll==='function')vClearAll(true); }catch(e){}
  var h=new Date(); h=new Date(h.getFullYear(),h.getMonth(),h.getDate());
  var lun=new Date(h.getFullYear(),h.getMonth(),h.getDate()-((h.getDay()+6)%7));
  var P=[
    {nom:'semana en curso',tipo:'sem',d:iso(lun),h:iso(h),off:0},
    {nom:'semana pasada',tipo:'sem',d:iso(new Date(lun.getFullYear(),lun.getMonth(),lun.getDate()-7)),h:iso(new Date(lun.getFullYear(),lun.getMonth(),lun.getDate()-1)),off:-1},
    {nom:'mes en curso',tipo:'mes',d:iso(new Date(h.getFullYear(),h.getMonth(),1)),h:iso(h),off:0,mn:h.getMonth()+1,anio:h.getFullYear()},
    {nom:'mes pasado',tipo:'mes',d:iso(new Date(h.getFullYear(),h.getMonth()-1,1)),h:iso(new Date(h.getFullYear(),h.getMonth(),0)),off:-1,
      mn:new Date(h.getFullYear(),h.getMonth()-1,1).getMonth()+1,anio:new Date(h.getFullYear(),h.getMonth()-1,1).getFullYear()}
  ];
  var filas=[],difs=[];
  var cmp=function(per,pant,que,a,b,tol){ var d=Math.abs((Number(a)||0)-(Number(b)||0)); var ok=d<=(tol||0);
    filas.push({periodo:per,pantalla:pant,que:que,ref:a,pantallaDice:b,ok:ok}); if(!ok)difs.push(per+' · '+pant+' · '+que+': Inicio '+a+' / '+pant+' '+b); };
  var redP=(typeof RED_PER!=='undefined')?RED_PER:null, redO=(typeof RED_OFF!=='undefined')?RED_OFF:null;
  for(var k=0;k<P.length;k++){
    var p=P[k], g=_rtSumar(p.d,p.h), ref={f:Math.round(g.tot.f),c:Math.round(g.tot.c),ent:g.tot.ent,catF:Math.round(g.cat.f),b2bF:Math.round(g.b2b.f)};
    filas.push({periodo:p.nom,desde:p.d,hasta:p.h,inicio:ref});
    /* TENDENCIA: el último punto de la serie del tipo de período (la semana o el mes en curso, o el anterior). */
    try{
      document.getElementById('vtDow').value=(p.tipo==='sem'?'week':'month');
      var sel=document.getElementById('vtSubcanal'); if(sel)sel.value='__all';
      var br=document.getElementById('vtBarrio'); if(br)br.value='__all';
      document.getElementById('vtMetric').value='fact'; rTendencia();
      var s=(window._tendUltima&&window._tendUltima.serie)||[], it=s[s.length-1+p.off];
      if(!it)difs.push(p.nom+' · Tendencia: no hay punto');
      else{ cmp(p.nom,'Tendencia','facturado',ref.f,Math.round(it.fact),1); cmp(p.nom,'Tendencia','entregas',ref.ent,it.n,0); cmp(p.nom,'Tendencia','margen',ref.f-ref.c,Math.round(it.mb),2); }
    }catch(e){ difs.push(p.nom+' · Tendencia: '+e.message); }
    /* VENTAS: lo retail (sin Catering ni B2B, que Inicio suma aparte) con la misma cuenta. */
    try{
      var l=_vCalcular({d:p.d,h:p.h}).lista||[];
      var ret=l.filter(function(v){return v.canal!=='Catering'&&v.canal!=='B2B';});
      cmp(p.nom,'Ventas','facturado retail',ref.f-ref.b2bF,Math.round(ret.reduce(function(a,v){return a+(+v.$||0);},0)),1);
      cmp(p.nom,'Ventas','entregas retail',ref.ent-g.b2b.ent,_vEntregas(ret),0);
      cmp(p.nom,'Ventas','Catering',ref.catF,Math.round(l.filter(function(v){return v.canal==='Catering';}).reduce(function(a,v){return a+(+v.$||0);},0)),1);
      cmp(p.nom,'Ventas','B2B',ref.b2bF,Math.round(l.filter(function(v){return v.canal==='B2B';}).reduce(function(a,v){return a+(+v.$||0);},0)),1);
    }catch(e){ difs.push(p.nom+' · Ventas: '+e.message); }
    /* VENTAS, LA PANTALLA (15/11/2026): el período puesto con el control de arriba (las claves de Inicio), sin filtros, y
       lo que dicen la tarjeta «Ventas» y el botón «Ver N ventas» de la hoja de filtros. Ese día los chips decían 74 y 128
       (filas) donde Inicio 69 y 121: ningún chip puede llevar número. */
    try{
      if(typeof _vPerPoner==='function'){
        var vtA=vTab; if(vTab!=='ventas'&&typeof vSwitchTab==='function')vSwitchTab('ventas');
        _vPerPoner(p.tipo==='sem'?'sem':'mes',false); if(p.off)vPerMover(p.off); else rVentas();
        var Rv=vRango||{};
        if(Rv.d!==p.d||Rv.h!==p.h)difs.push(p.nom+' · Ventas (pantalla): el control puso '+Rv.d+' a '+Rv.h+' y el período es '+p.d+' a '+p.h);
        var lv=_vCalcular().lista, catN=lv.filter(function(v){return v.canal==='Catering';}).length;
        var kv=document.querySelectorAll('#vSum .vs-top .v-kpi')[1], kn=kv?Number(String(kv.querySelector('.v-kpi-v').textContent).replace(/\\D/g,'')):-1;
        cmp(p.nom,'Ventas (pantalla)','tarjeta Ventas (entregas de Inicio + '+catN+' de Catering)',ref.ent+catN,kn,0);
        vfAbrirFiltros();
        var okb=document.querySelector('#vfHoja .vf-h-ok'), bn=okb?Number(String(okb.textContent).replace(/\\D/g,'')):-1;
        var conN=[].slice.call(document.querySelectorAll('#vfHoja .vf-op')).filter(function(b){return /\\d/.test(b.textContent)&&b.closest('[data-dim]')&&b.closest('[data-dim]').getAttribute('data-dim')!=='barrio';});
        vfCerrarHoja();
        cmp(p.nom,'Ventas (pantalla)','botón «Ver N ventas» = la tarjeta',kn,bn,0);
        cmp(p.nom,'Ventas (pantalla)','chips de filtro con un número',0,conN.length,0);
        if(vtA!=='ventas'&&typeof vSwitchTab==='function')try{vSwitchTab(vtA);}catch(e){}
      }
    }catch(e){ difs.push(p.nom+' · Ventas (pantalla): '+e.message); }
    if(p.tipo==='mes'){
      /* RESULTADOS: las ventas del mes (con Catering) y las entregas. */
      try{
        var R=_eerrCalc(p.mn,p.anio);
        cmp(p.nom,'Resultados','ventas (con Catering)',ref.f+ref.catF,Math.round(R.totFact),1);
        cmp(p.nom,'Resultados','entregas',ref.ent,R.entTot,0);
      }catch(e){ difs.push(p.nom+' · Resultados: '+e.message); }
      /* RED: lo que le quedó a Maleu y las ventas. */
      try{
        RED_PER='mes'; RED_OFF=p.off; var rd=_redDatos();
        cmp(p.nom,'Red','le quedó a Maleu',Math.round(g.red.f),Math.round(rd.total.mal),1);
        cmp(p.nom,'Red','ventas',g.red.ent,rd.ventas,0);
        /* MI PORTAL: lo que ve cada representante (bruto, «lo que vendiste») = lo que RED dice de él. */
        if(typeof _dvMotorArmarAca==='function'&&typeof _baseRpc==='function'){
          var vs=Object.keys(rd.porV).filter(function(v){return v!=='sin representante';});
          for(var j=0;j<vs.length;j++){
            var v=vs[j], e=rd.porV[v];
            try{
              var a=await _dvMotorArmarAca(await _baseRpc('dashboard_vendedor_pantalla',{p_nombre:v}));
              var st=a&&a.stats||{}, mm=(p.off===0)?st.mes:((st.mesesAnt||[]).filter(function(x){return x.m===p.mn&&x.y===p.anio;})[0]);
              cmp(p.nom,'Mi Portal','vendido de '+v,Math.round(e.sub),Math.round((mm&&mm.facturado)||0),1);
              cmp(p.nom,'Mi Portal','pedidos de '+v,e.ped,(mm&&mm.pedidos)||0,0);
            }catch(e2){ difs.push(p.nom+' · Mi Portal de '+v+': '+(e2&&e2.message||e2)); }
          }
        }
      }catch(e){ difs.push(p.nom+' · Red: '+e.message); }
    }
  }
  try{ if(redP!==null)RED_PER=redP; if(redO!==null)RED_OFF=redO; }catch(e){}
  return {ok:!difs.length,filas:filas,difs:difs};
})()`;

async function cruzar(ev) {
  const r = await ev(EXPR);
  return typeof r === 'string' ? JSON.parse(r) : r;
}
module.exports = { EXPR, cruzar };

if (require.main === module) (async () => {
  const cdp = require('./cdp.js');
  const S = process.env.SESION, BASE = process.env.BASE || 'http://localhost:8080/app.html';
  if (!S || !fs.existsSync(S)) { console.log('falta SESION=<archivo de sesion_prueba.py>'); process.exit(1); }
  const ses = JSON.parse(fs.readFileSync(S, 'utf8'));
  const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
  const usuario = ses.usuario || 'tadeo';
  /* La sesión va al localStorage; las escrituras se cortan (solo lecturas: *_pantalla, *_datos, *_base). Nada se imprime. */
  const PREP = `try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:${JSON.stringify(usuario)},rol:'admin',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: usuario, url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
      var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m==='POST'&&(/script\\.google\\.com/.test(s)||(r&&!/_(pantalla|datos|base)$|^permiso_base$|^demanda_por_deposito$|^dashboard_vendedor_pantalla$/.test(r[1]))))return Promise.resolve(new Response('{"ok":false,"err":"cortado"}',{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`;
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE });
    for (let i = 0; i < 120; i++) { try { if (await cdp.evaluar(cli, "typeof go==='function'&&!!window.D")) break; } catch (e) {} await new Promise((r) => setTimeout(r, 500)); }
    const r = await cruzar((e) => cdp.evaluar(cli, e));
    (r.filas || []).forEach((f) => {
      if (f.inicio) console.log('\n' + f.periodo + ' (' + f.desde + ' a ' + f.hasta + ') · Inicio: ' + f.inicio.ent + ' entregas, $' + f.inicio.f + ', Catering $' + f.inicio.catF + ', B2B $' + f.inicio.b2bF);
      else console.log((f.ok ? '  ok    ' : '  DIFIERE ') + f.pantalla + ' · ' + f.que + ': ' + f.ref + (f.ok ? '' : ' / ' + f.pantallaDice));
    });
    console.log('\n' + (r.ok ? '0 diferencias' : r.difs.length + ' diferencias'));
    process.exitCode = r.ok ? 0 : 1;
  } finally { try { cli.matar(); } catch (e) {} }
})();
