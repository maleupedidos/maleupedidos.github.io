/* CRM › Leads (21/9/2026).

   node probar_leads.js [390|1440]

   Backend STUBBEADO con leads inventados (repo publico: ningun nombre ni
   telefono real) y el reloj en el lunes 21/9/2026 15:00. No hace falta token.

   Sostiene:
   · la lista pinta cada lead con su estado: "Compró el ..." con la plata,
     "Todavía no compró", o "Ya era cliente"; y arriba cuantos trajo cada uno en
     el mes y en la semana, sin contar los que ya eran clientes;
   · el alta NO sale sin telefono (ni llega al backend), y si el backend dice que
     ese telefono ya compro, el panel queda abierto y dice quien es;
   · un alta buena cierra el panel, aparece primera y queda en la copia local;
   · editar manda el id; borrar saca la fila;
   · en Planificacion, un objetivo en LEADS se cuenta solo desde CRM › Leads
     (del mes, o de su semana ISO, y del responsable), sin +/- y sin POST. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 700) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(250); }
  return false;
};
const txt = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent.replace(/\\s+/g,' ').trim():null;})()`;

const L = (id, fecha, nombre, tel, resp, extra) => Object.assign({ id, fecha, iso: fecha.slice(6) + '-' + fecha.slice(3, 5) + '-' + fecha.slice(0, 2), nombre, tel,
  telNorm: tel.replace(/\D/g, '').slice(-10), origen: 'Folleto colegio', responsable: resp, barrio: '', notas: '', cargadoPor: resp + ' Prueba',
  creado: fecha + ' 12:00', actualizado: fecha + ' 12:00', yaCliente: null, compro: null, cargadoTarde: false }, extra || {});
const LEADS = [
  L('L-0003', '21/09/2026', 'Beto Prueba', '11 5555-0002', 'Lucas', { compro: { primera: '21/09/2026', primeraIso: '2026-09-21', pedidos: 1, facturado: 42000 } }),
  L('L-0005', '16/09/2026', 'Ana Prueba', '11 5555-0011', 'Lucas', { yaCliente: { nombre: 'Ana Prueba', primera: '01/08/2026', ultima: '01/08/2026', pedidos: 1 } }),
  L('L-0002', '15/09/2026', 'Juan Prueba', '11 5555-0009', 'Lucas'),
  L('L-0001', '10/09/2026', 'Caro Prueba', '11 5555-0003', 'Tadeo'),
  L('L-0000', '20/08/2026', 'Dani Prueba', '11 5555-0004', 'Lucas')
];
const LIGHT = { ts: 1, pedidos: [{ n: '700', h: 'Home', c: 'Eli Prueba', es: 'Entregado', de: 'Viernes', o: 'Deposito', ep: 'Cobrado', fp: 'Efectivo', co: 0,
  p: [{ a: 'PPM', q: 1 }], bar: 'Estancias del Pilar', $: 50000, fex: '2026-09-18', dee: '2026-09-18', mc: '2026-09', f: '18/09/2026' }],
  canales: [], light: true, saludSem: {}, saludMes: {}, ventasExtra: [] };
const OBJ = (id, periodo, resp, unidad, meta, avance) => ({ id, periodo, empresa: 'Maleu', foco: 'Vender', objetivo: 'Objetivo ' + id, responsable: resp,
  medida: '', meta, unidad, avance, aporta: '', estado: 'En curso', notas: '' });
const PLAN_SEP = { ok: true, mes: 'Septiembre 2026', yyyy: 2026, mm: 9, diasMes: 30, diasTrans: 21,
  metas: { 'Total|': { canal: 'Total', barrio: '', metaFact: 3000000, metaPedidos: 0, metaTicket: 0, metaClientes: 0, metaCasas: 0, semanales: '', semanalesM: '', semanalesP: '', notas: '' } },
  objetivos: [OBJ('O-001', 'Mes', 'Lucas', 'leads', 50, 0), OBJ('O-002', 'Semana 39', 'Lucas', 'leads', 20, 0),
              OBJ('O-003', 'Semana 38', 'Lucas', 'leads', 20, 7), OBJ('O-004', 'Mes', 'Tadeo', '%', 100, 30)],
  real: {}, acciones: [], origen: [], barriosHome: ['Estancias del Pilar'], canalesPrincipales: ['Venta Directa', 'Clubes', 'Red', 'Catering', 'B2B'] };

const RELOJ = `(function(){var AH=new Date(2026,8,21,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__posts=[]; window.__err=[]; window.__toasts=[];
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  window.confirm=function(){return true;};
  if(window.top===window){ try{
    localStorage.setItem('maleu_tab','inicio');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('maleu_plan_cache_')===0||k.indexOf('mc_')===0) localStorage.removeItem(k); });
  }catch(e){} }
  /* El backend simulado GUARDA lo que se da de alta o se borra, como el de
     verdad: si no, Planificacion vuelve a pedir los leads y cuenta la lista vieja. */
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      var resp=function(c,ms){var t=JSON.stringify(c);return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},ms||150);});};
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        var bb={}; Object.keys(b).forEach(function(k){ if(k!=='token') bb[k]=b[k]; }); window.__posts.push(bb);
        if(b.action==='crmLeadSet'){
          if(String(b.tel||'').replace(/\\D/g,'').slice(-8)==='55550001') return resp({ok:false,error:'Ese teléfono ya compró antes: no es un lead nuevo',yaCliente:{nombre:'Ana Vieja Prueba',primera:'10/08/2026',ultima:'05/09/2026',pedidos:2}});
          var f=b.fecha||'21/09/2026';
          var viejo=(window.__LEADS||[]).filter(function(l){return l.id===b.id;})[0]||{};
          var nuevo=Object.assign({},viejo,{id:b.id||'L-0006',fecha:f,iso:f.slice(6)+'-'+f.slice(3,5)+'-'+f.slice(0,2),nombre:b.nombre,tel:b.tel,origen:b.origen||'',responsable:b.responsable||'',barrio:b.barrio||'',notas:b.notas||''});
          window.__LEADS=[nuevo].concat((window.__LEADS||[]).filter(function(l){return l.id!==nuevo.id;}));
          return resp({ok:true,lead:{id:b.id||'L-0006',fecha:f,iso:f.slice(6)+'-'+f.slice(3,5)+'-'+f.slice(0,2),nombre:b.nombre,tel:b.tel,telNorm:String(b.tel).replace(/\\D/g,'').slice(-10),
            origen:b.origen||'',responsable:b.responsable||'',barrio:b.barrio||'',notas:b.notas||'',cargadoPor:'Tadeo Prueba',creado:'21/09/2026 15:00',actualizado:'21/09/2026 15:00',yaCliente:null,compro:null,cargadoTarde:false}});
        }
        if(b.action==='crmLeadDelete') window.__LEADS=(window.__LEADS||[]).filter(function(l){return l.id!==b.id;});
        return resp({ok:true});
      }
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='crmLeads'){ if(!window.__LEADS) window.__LEADS=${JSON.stringify(LEADS)}; cuerpo={ok:true,ts:1,leads:window.__LEADS.slice().sort(function(x,y){return x.iso<y.iso?1:(x.iso>y.iso?-1:(x.id<y.id?1:-1));})}; }
      else if(a==='planMes') cuerpo=${JSON.stringify(PLAN_SEP)};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      return resp(cuerpo);
    }
    return o.apply(this,arguments); }; })();`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    console.log('\n== CRM › Leads · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?tab=inicio' });
    if (!await esperar(cli, `typeof go==='function' && typeof estSwitch==='function' && window.D && D.pedidos && D.pedidos.length===1`, 90000)) throw new Error('el ERP no cargo');
    await ev(cli, `var _t=window.toast;window.toast=function(m){window.__toasts.push(String(m));return _t.apply(this,arguments);};go('estancias');estSwitch('leads')`);
    if (!await esperar(cli, `document.querySelectorAll('#leadsList .lead').length===5`, 20000)) throw new Error('la lista no pinto: ' + await ev(cli, txt('#leadsList')));

    console.log('\n-- la lista --');
    const res = await ev(cli, txt('#leadsResumen'));
    chk('arriba: septiembre tiene 3 (el que ya era cliente y el de agosto no cuentan)', /Todo septiembre\s*3/.test(res || ''), res);
    chk('Lucas: 2 en el mes, 1 esta semana (la 39, del 21 al 27/9) y 1 compró por $42.000', /Lucas\s*2\s*1 esta semana · 1 compró \(\$42\.000\)/.test(res || ''), res);
    chk('Tadeo: 1 en el mes, 0 esta semana', /Tadeo\s*1\s*0 esta semana · 0 compraron/.test(res || ''), res);
    const filas = JSON.parse(await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#leadsList .lead'),function(e){return {t:e.textContent.replace(/\\s+/g,' ').trim(),c:e.className};}))`));
    chk('el que compró dice cuándo y cuánto, y se marca en verde', /L-0003\s*Beto Prueba/.test(filas[0].t) && /Compró el 21\/09\/2026\s*\$42\.000/.test(filas[0].t) && /\bok\b/.test(filas[0].c), filas[0]);
    chk('el que ya era cliente lo dice, en rojo', /Ya era cliente\s*compró el 01\/08\/2026/.test(filas[1].t) && /\bno\b/.test(filas[1].c), filas[1]);
    chk('el resto: "Todavía no compró", con teléfono, origen y quién lo trajo', /11 5555-0009 · Folleto colegio · lo trajo Lucas · 15\/09\/2026/.test(filas[2].t) && /Todavía no compró/.test(filas[2].t), filas[2]);
    chk('la pantalla dice de cuándo son los datos', /recién|copia/.test(await ev(cli, txt('#leadsSello')) || ''));
    await ev(cli, `leadsBuscar('caro')`);
    chk('buscar filtra por nombre', await ev(cli, `document.querySelectorAll('#leadsList .lead').length`) === 1);
    await ev(cli, `leadsBuscar('')`);

    console.log('\n-- el alta --');
    await ev(cli, `window.__posts=[];leadNuevo()`);
    chk('+ Lead abre el panel con la fecha de hoy', await ev(cli, `document.getElementById('leadDrawer').classList.contains('on') && document.getElementById('leadFecha').value==='21/09/2026'`) === true);
    await ev(cli, `document.getElementById('leadNom').value='Nuevo Prueba';document.getElementById('leadTel').value='';document.getElementById('leadResp').value='Lucas';leadGuardar('')`);
    await pausa(400);
    chk('sin teléfono no sale el POST y el panel lo dice', await ev(cli, `window.__posts.length===0 && !document.getElementById('leadErr').hidden && /Falta el teléfono/.test(document.getElementById('leadErr').textContent)`) === true);
    await ev(cli, `document.getElementById('leadTel').value='11 5555-0001';leadGuardar('')`);
    await esperar(cli, `window.__posts.length>0 && !document.getElementById('leadErr').hidden && /No es un lead nuevo/.test(document.getElementById('leadErr').textContent)`, 5000);
    const p1 = JSON.parse(await ev(cli, `JSON.stringify(window.__posts[0]||null)`) || 'null') || {};
    chk('el POST manda el alta sin id, con quién lo consiguió y la fecha', p1.action === 'crmLeadSet' && !('id' in p1) && p1.responsable === 'Lucas' && p1.fecha === '21/09/2026' && p1.nombre === 'Nuevo Prueba', p1);
    const e1 = await ev(cli, txt('#leadErr'));
    chk('si ya compró, el panel queda abierto y dice quién es y cuándo compró', /Ana Vieja Prueba/.test(e1 || '') && /10\/08\/2026/.test(e1 || '') && await ev(cli, `document.getElementById('leadDrawer').classList.contains('on')`) === true, e1);
    await ev(cli, `document.getElementById('leadTel').value='11 5555-0077';document.getElementById('leadOrig').value='La Pionera';leadGuardar('')`);
    await esperar(cli, `!document.getElementById('leadDrawer').classList.contains('on')`, 5000);
    const f0 = await ev(cli, txt('#leadsList .lead'));
    chk('un alta buena cierra el panel y aparece primera', /L-0006\s*Nuevo Prueba/.test(f0 || '') && await ev(cli, `document.querySelectorAll('#leadsList .lead').length`) === 6, f0);
    chk('avisa con su número', (await ev(cli, `JSON.stringify(window.__toasts)`) || '').indexOf('Lead cargado: L-0006') >= 0);
    chk('y queda en la copia local (la que lee Planificación)', await ev(cli, `(function(){var g=_swrLeer('crmLeads');return !!g&&g.d.leads.some(function(l){return l.id==='L-0006';});})()`) === true);
    chk('arriba ahora Lucas tiene 3 en el mes', /Lucas\s*3\s*2 esta semana/.test(await ev(cli, txt('#leadsResumen')) || ''), await ev(cli, txt('#leadsResumen')));

    console.log('\n-- editar y borrar --');
    await ev(cli, `window.__posts=[];leadEditar('L-0002')`);
    chk('tocar un lead abre su panel con sus datos y el botón Borrar', await ev(cli, `document.getElementById('leadNom').value==='Juan Prueba' && /Borrar/.test(document.getElementById('leadBody').textContent)`) === true);
    await ev(cli, `document.getElementById('leadNotas').value='Llamar el jueves';leadGuardar('L-0002')`);
    await esperar(cli, `window.__posts.length>0 && !document.getElementById('leadDrawer').classList.contains('on')`, 5000);
    const p2 = JSON.parse(await ev(cli, `JSON.stringify(window.__posts[0]||null)`) || 'null') || {};
    chk('guardar un lead existente manda su id', p2.action === 'crmLeadSet' && p2.id === 'L-0002' && p2.notas === 'Llamar el jueves', p2);
    await ev(cli, `window.__posts=[];leadEditar('L-0001');leadBorrar('L-0001')`);
    await esperar(cli, `window.__posts.length>0 && !document.getElementById('leadDrawer').classList.contains('on')`, 5000);
    chk('borrar manda el id y saca la fila', (await ev(cli, `JSON.stringify(window.__posts[0])`) || '') === '{"action":"crmLeadDelete","id":"L-0001"}' && await ev(cli, `document.querySelectorAll('#leadsList .lead').length`) === 5);

    if (ANCHO <= 560) {
      await ev(cli, `leadNuevo()`); await pausa(300);
      const W = await ev(cli, `JSON.stringify({sw:document.documentElement.scrollWidth,iw:window.innerWidth,d:Math.round(document.getElementById('leadDrawer').getBoundingClientRect().width)})`);
      const w = JSON.parse(W || '{}');
      chk('en el celular no hay scroll horizontal, ni con el panel abierto', w.sw <= w.iw + 1 && w.d <= w.iw + 1, w);
      await ev(cli, `leadCerrar()`);
    }

    console.log('\n-- Planificación: los objetivos en leads se cuentan solos --');
    await ev(cli, `window.__posts=[];go('planificacion')`);
    if (!await esperar(cli, `/O-001/.test((document.getElementById('planEquipo')||{}).textContent||'') && /lo cuenta CRM/.test((document.getElementById('planEquipo')||{}).textContent||'')`, 30000)) throw new Error('planificacion no pinto los objetivos: ' + await ev(cli, txt('#planEquipo')));
    const O = JSON.parse(await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#planEquipo .plan-obj'),function(e){return {t:e.textContent.replace(/\\s+/g,' ').trim(),b:e.querySelectorAll('.plan-obj-q button').length};}))`));
    const de = id => O.find(x => x.t.indexOf(id) >= 0) || {};
    chk('el del mes de Lucas: 3 de 50 (los de septiembre, sin el que ya era cliente), sin +/−', /3 \/ 50 leads\s*lo cuenta CRM › Leads/.test(de('O-001').t) && de('O-001').b === 0, de('O-001'));
    chk('el de la semana 39: 2 (los del 21/9), aunque la hoja diga 0', /2 \/ 20 leads/.test(de('O-002').t), de('O-002'));
    chk('el de la semana 38: 1 (el del 15/9), aunque la hoja diga 7', /1 \/ 20 leads/.test(de('O-003').t), de('O-003'));
    chk('un objetivo en % sigue con su +/− y su avance de la hoja', de('O-004').b === 2 && /30 \/ 100%/.test(de('O-004').t), de('O-004'));
    await ev(cli, `planObjAvance('O-001',1)`); await pausa(500);
    chk('el +/− de un objetivo en leads no manda nada', await ev(cli, `window.__posts.filter(function(p){return p.action==='planObjetivoSet';}).length`) === 0);
    await ev(cli, `planEditarObjetivo('O-001')`);
    chk('en el editor, el avance dice que lo cuenta CRM y no se puede tipear', await ev(cli, `document.getElementById('objAv').readOnly===true && /lo cuenta CRM/.test(document.getElementById('planObjBody').textContent)`) === true);
    await ev(cli, `planCerrarObjetivo()`);

    const errs = await ev(cli, `JSON.stringify(window.__err||[])`);
    chk('ningún error de JavaScript en toda la prueba', errs === '[]', errs);
  } catch (e) { mal++; console.log('  EXPLOTO ' + e.message); }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  salir(mal ? 1 : 0);
})();
