/* CRM › Leads · LA CARGA RÁPIDA (23/9/2026).
 *
 *   node probar_leads_rapido.js [390|1440]
 *
 * Backend STUBBEADO (repo público: ningún nombre ni teléfono real) y el reloj
 * clavado el lunes 21/9/2026 15:00. No hace falta token.
 *
 * Por qué existe: Tadeo y Lucas cargan leads de a muchos seguidos y el cajón de
 * "+ Lead" obliga, POR LEAD, a abrirlo, llenar siete campos, esperar al servidor
 * y volver a abrirlo. Se copió la forma de RECIBIR CARNE: quién lo trajo, de
 * dónde salió y la fecha se eligen UNA vez; el nombre y el teléfono van a una
 * cola local sin tocar el servidor; y al final un botón los manda a todos juntos.
 *
 * Lo que se mide:
 * · que agregar a la cola NO llame al backend (es lo que lo hacía lento);
 * · que los tres de arriba queden puestos para el siguiente;
 * · que el envío sea UNA sola llamada con todos adentro;
 * · que uno rechazado NO se lleve puestos a los demás, y se quede con el motivo;
 * · y que un objetivo en leads cuente los de TODO el equipo, no los de su
 *   responsable (Tadeo y Lucas, 23/9: "no importa de quién fue el lead").
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return { __err: String(x.message || x) }; } };
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(c, e) === true) return true; await pausa(200); } return false; };
const txt = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent.replace(/\\s+/g,' ').trim():null;})()`;

const L = (id, fecha, nombre, tel, resp, extra) => Object.assign({ id, fecha, iso: fecha.slice(6) + '-' + fecha.slice(3, 5) + '-' + fecha.slice(0, 2), nombre, tel,
  telNorm: tel.replace(/\D/g, '').slice(-10), origen: 'Folleto', responsable: resp, barrio: '', notas: '', cargadoPor: resp + ' Prueba',
  creado: fecha + ' 12:00', actualizado: fecha + ' 12:00', yaCliente: null, compro: null, cargadoTarde: false }, extra || {});
/* En septiembre y sin contar al que ya era cliente quedan TRES: dos de Lucas y
   uno de Tadeo. Es la diferencia que mide la última prueba. */
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
  objetivos: [OBJ('O-001', 'Mes', 'Lucas', 'leads', 50, 0), OBJ('O-004', 'Mes', 'Tadeo', '%', 100, 30)],
  real: {}, acciones: [], origen: [], barriosHome: ['Estancias del Pilar'], canalesPrincipales: ['Venta Directa'] };

const RELOJ = `(function(){var AH=new Date(2026,8,21,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;

/* El lote simulado aplica LA MISMA regla que el backend de verdad: el teléfono
   terminado en 55550001 ya compró antes, así que ése vuelve rechazado y los
   otros entran. Es la situación que importa: una tanda mezclada. */
const STUB = `
  window.__gets=[]; window.__posts=[]; window.__err=[]; window.__toasts=[];
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio');
    localStorage.removeItem('maleu_lead_rap');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('maleu_plan_cache_')===0||k.indexOf('mc_')===0) localStorage.removeItem(k); });
  }catch(e){} }
  (function(){ var o=window.fetch, nid=6; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      var resp=function(c,ms){var t=JSON.stringify(c);return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},ms||150);});};
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        var bb={}; Object.keys(b).forEach(function(k){ if(k!=='token') bb[k]=b[k]; }); window.__posts.push(bb);
        if(b.action==='crmLeadsBulk'){
          var out=(b.leads||[]).map(function(e){
            if(String(e.tel||'').replace(/\\D/g,'').slice(-8)==='55550001')
              return {ok:false,error:'ya compro',yaCliente:{nombre:'Ana Vieja Prueba',primera:'10/08/2026',ultima:'05/09/2026',pedidos:2}};
            var f=e.fecha||'21/09/2026', id='L-'+('000'+(nid++)).slice(-4);
            var nuevo={id:id,fecha:f,iso:f.slice(6)+'-'+f.slice(3,5)+'-'+f.slice(0,2),nombre:e.nombre,tel:e.tel,
              telNorm:String(e.tel).replace(/\\D/g,'').slice(-10),origen:e.origen||'',responsable:e.responsable||'',barrio:'',notas:'',
              cargadoPor:'Tadeo Prueba',creado:'21/09/2026 15:00',actualizado:'21/09/2026 15:00',yaCliente:null,compro:null,cargadoTarde:false};
            window.__LEADS=[nuevo].concat(window.__LEADS||[]);
            return {ok:true,lead:nuevo};
          });
          return resp({ok:true,resultados:out,guardados:out.filter(function(r){return r.ok;}).length});
        }
        return resp({ok:true});
      }
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='crmLeads'){ if(!window.__LEADS) window.__LEADS=${JSON.stringify(LEADS)};
        cuerpo={ok:true,ts:1,leads:window.__LEADS.slice().sort(function(x,y){return x.iso<y.iso?1:(x.iso>y.iso?-1:(x.id<y.id?1:-1));})}; }
      else if(a==='planMes') cuerpo=${JSON.stringify(PLAN_SEP)};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      return resp(cuerpo);
    }
    return o.apply(this,arguments); }; })();`;

/* Tipear de verdad: pone el valor y dispara Enter, que es como se usa. */
const tipear = (id, val) => `(function(){var e=document.getElementById(${JSON.stringify(id)});e.focus();e.value=${JSON.stringify(val)};return e.value;})()`;
const enter = id => `(function(){var e=document.getElementById(${JSON.stringify(id)});e.focus();
  e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return document.activeElement.id;})()`;
const cola = `JSON.stringify([].map.call(document.querySelectorAll('#leadRapido .leadr-p'),function(e){return e.textContent.replace(/\\s+/g,' ').trim();}))`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    console.log('\n== CRM › Leads · la carga rápida · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?tab=inicio' });
    if (!await esperar(cli, `typeof go==='function' && typeof estSwitch==='function' && window.D && D.pedidos && D.pedidos.length===1`, 90000)) throw new Error('el ERP no cargó');
    await ev(cli, `var _t=window.toast;window.toast=function(m){window.__toasts.push(String(m));return _t.apply(this,arguments);};go('estancias');estSwitch('leads')`);
    if (!await esperar(cli, `document.querySelectorAll('#leadsList .lead').length===5`, 20000)) throw new Error('la lista no pintó');

    /* ── 1. El panel está y ofrece "Ambos" ────────────────────────── */
    console.log('\n-- el panel --');
    chk('la carga rápida está arriba de la lista', await ev(cli, `!!document.getElementById('rapNom') && !!document.getElementById('rapTel')`) === true);
    const resp = JSON.parse(await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#rapResp option'),function(o){return o.textContent;}))`));
    chk('"Lo consiguió" ofrece Ambos, para el lead que trajeron entre los dos', resp.indexOf('Ambos') >= 0, resp);

    /* ── 2. Cargar tres sin tocar el servidor ─────────────────────── */
    console.log('\n-- cargar de a muchos --');
    await ev(cli, `window.__posts=[]; document.getElementById('rapResp').value='Ambos'; leadRapPref('resp','Ambos');
      document.getElementById('rapOrig').value='Evento'; leadRapPref('orig','Evento');`);
    await ev(cli, tipear('rapNom', 'Uno Prueba'));
    chk('Enter en el nombre pasa al teléfono, sin soltar el teclado', await ev(cli, enter('rapNom')) === 'rapTel');
    await ev(cli, tipear('rapTel', '11 5555-0021'));
    await ev(cli, enter('rapTel'));
    await pausa(200);
    chk('Enter en el teléfono lo manda a la cola', JSON.parse(await ev(cli, cola)).length === 1, await ev(cli, cola));
    chk('y NO le pregunta nada al servidor (es lo que lo hacía lento)', JSON.parse(await ev(cli, `JSON.stringify(window.__posts)`)).length === 0);
    chk('deja los campos vacíos y el cursor en el nombre, listo para el próximo',
      await ev(cli, `document.getElementById('rapNom').value===''&&document.getElementById('rapTel').value===''&&document.activeElement.id==='rapNom'`) === true);
    chk('y "Ambos · Evento" quedan puestos para el siguiente', /Ambos · Evento/.test(JSON.parse(await ev(cli, cola))[0] || ''), await ev(cli, cola));

    for (const [n, t] of [['Dos Prueba', '11 5555-0022'], ['Tres Prueba', '11 5555-0001']]) {
      await ev(cli, tipear('rapNom', n)); await ev(cli, tipear('rapTel', t)); await ev(cli, enter('rapTel')); await pausa(150);
    }
    chk('van tres en la cola', JSON.parse(await ev(cli, cola)).length === 3, await ev(cli, cola));
    chk('el botón dice cuántos va a cargar', /Cargar 3 leads/.test(await ev(cli, txt('#rapGuardar')) || ''), await ev(cli, txt('#rapGuardar')));

    /* ── 3. Lo que NO deja hacer ──────────────────────────────────── */
    console.log('\n-- lo que frena antes de mandar --');
    await ev(cli, tipear('rapNom', 'Repetido')); await ev(cli, tipear('rapTel', '1155550022')); await ev(cli, enter('rapTel')); await pausa(200);
    chk('el mismo teléfono dos veces en la cola no entra, y lo dice ahí mismo',
      JSON.parse(await ev(cli, cola)).length === 3 && /ya está en la lista/.test(await ev(cli, txt('#leadRapido .lead-err')) || ''), await ev(cli, txt('#leadRapido .lead-err')));
    await ev(cli, tipear('rapNom', 'Sin tel')); await ev(cli, tipear('rapTel', '123')); await ev(cli, enter('rapTel')); await pausa(200);
    chk('sin teléfono válido no entra: sin eso el ERP no puede saber si después compró',
      JSON.parse(await ev(cli, cola)).length === 3 && /teléfono/.test(await ev(cli, txt('#leadRapido .lead-err')) || ''));

    /* ── 4. El envío: UNA llamada, y el rechazado no arrastra a nadie ── */
    console.log('\n-- mandar la tanda --');
    await ev(cli, `window.__posts=[]; leadRapGuardar();`);
    /* Esperar a que el boton se "des-apague" NO sirve: al terminar queda el
       rechazado en la cola, no hay nada nuevo que mandar y el boton sigue
       apagado, a proposito. Lo que marca el final es que la cola se achico. */
    if (!await esperar(cli, `document.querySelectorAll('#leadRapido .leadr-p').length===1 && !/Cargando/.test((document.getElementById('rapGuardar')||{}).textContent||'')`, 20000))
      throw new Error('no terminó de guardar · err=' + await ev(cli, `JSON.stringify(window.__err||[])`) + ' cola=' + await ev(cli, cola));
    await pausa(400);
    const posts = JSON.parse(await ev(cli, `JSON.stringify(window.__posts)`));
    chk('los tres viajan en UNA sola llamada, no en tres', posts.length === 1 && posts[0].action === 'crmLeadsBulk' && (posts[0].leads || []).length === 3, posts.map(p => p.action));
    chk('y cada uno lleva quién lo trajo y de dónde salió', (posts[0].leads || []).every(l => l.responsable === 'Ambos' && l.origen === 'Evento'), posts[0].leads);
    const c2 = JSON.parse(await ev(cli, cola));
    chk('los dos que entraron desaparecen de la cola', c2.length === 1, c2);
    chk('el rechazado se queda, con el motivo escrito', /Ya era cliente: compró el 10\/08\/2026/.test(c2[0] || ''), c2);
    chk('y los que entraron ya están en la lista de abajo',
      await ev(cli, `document.querySelectorAll('#leadsList .lead').length`) === 7, await ev(cli, `document.querySelectorAll('#leadsList .lead').length`));
    chk('el aviso cuenta cuántos entraron y cuántos no', /2 leads cargados · 1 quedaron con problema/.test((JSON.parse(await ev(cli, `JSON.stringify(window.__toasts)`)) || []).join(' | ')),
      await ev(cli, `JSON.stringify(window.__toasts)`));
    await ev(cli, `document.querySelector('#leadRapido .leadr-x').click()`);
    await pausa(200);
    chk('la × saca el que quedó mal', JSON.parse(await ev(cli, cola)).length === 0);

    /* ── 5. El objetivo cuenta los de TODO el equipo ───────────────── */
    console.log('\n-- el objetivo de leads --');
    await ev(cli, `go('planificacion')`);
    if (!await esperar(cli, `!!document.querySelector('#planEquipo .plan-obj')`, 30000)) throw new Error('no pintó el objetivo');
    await pausa(500);
    const fila = await ev(cli, txt('#planEquipo .plan-obj'));
    /* Septiembre, sin el que ya era cliente: los 3 de antes + los 2 recién
       cargados = 5. De Lucas sólo son 2 de los de antes: si filtrara por
       responsable diría 4. */
    chk('el objetivo de Lucas suma los leads de todo el equipo, no sólo los suyos',
      /5\s*\/\s*50/.test(fila || ''), fila);
    chk('y la fila lo dice, para que el número no sea un misterio', /todo el equipo/.test(fila || ''), fila);

    chk('ni un error en consola', JSON.parse(await ev(cli, `JSON.stringify(window.__err||[])`)).length === 0, await ev(cli, `JSON.stringify(window.__err||[])`));
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('\n  EXPLOTÓ: ' + (e && e.message || e) + '\n'); salir(1); }
})();
