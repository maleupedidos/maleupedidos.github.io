/* La tarjeta "La copia a la base nueva", en Ajustes → Avisos (23/9/2026).

   node probar_tarjeta_replica.js [390|1440]

   Backend STUBBEADO con datos inventados (repo público). No hace falta token.

   ── Por qué existe ──
   El backend sabe si la copia a PostgreSQL está sana, pero durante un día eso no
   se podía mirar desde ningún lado: la única forma de saberlo era preguntárselo
   a quien la escribió. Una copia que nadie puede mirar no es una red.

   Lo que esta prueba sostiene, y que en los tres casos es la diferencia entre
   informar y mentir:
   · cuando coinciden, lo dice y muestra la tabla canal por canal — un total que
     cuadra puede esconder un canal de más y otro de menos;
   · cuando NO coinciden, lo dice **y aclara que la planilla sigue siendo la
     buena**, porque el susto natural es creer que se perdió algo;
   · cuando el backend no pudo leer el estado, lo dice en vez de quedarse con el
     cartel de antes, que sería mostrar un dato viejo como si fuera de ahora. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(250); }
  return false;
};

const TABS = ['inicio', 'ventas', 'pedidos', 'caja', 'ajustes'];
const AJ = { ok: true, tabsMeta: TABS.map(t => ({ id: t, label: t })), roles: ['admin'],
  usuarios: [], permisos: { admin: TABS.slice() }, configMaleu: [], provisiones: [],
  configNegocio: [], contadores: [], vendedores: [] };

/* La respuesta de `avisosSetup` la decide el test fijando `window.__caso`. Los
   sellos van en milisegundos relativos a ahora, así el cartel no envejece con el
   archivo: un test con una fecha fija adentro se pone rojo solo con el tiempo. */
const STUB = `
  window.__posts=[]; window.__toasts=[]; window.__caso='coinciden';
  if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0) localStorage.removeItem(k); });
  }catch(e){} }
  window.__respAvisos=function(){
    var ahora=Date.now();
    var canalesOk=[{canal:'Home',planilla:56526275,base:56526274,pedidosHoja:1000,pedidosBase:1000,ok:true},
                   {canal:'Pilar',planilla:8157145,base:8157145,pedidosHoja:70,pedidosBase:70,ok:true}];
    var canalesMal=[{canal:'Home',planilla:56526275,base:56526274,pedidosHoja:1000,pedidosBase:1000,ok:true},
                    {canal:'Pilar',planilla:8157145,base:8000000,pedidosHoja:70,pedidosBase:69,ok:false}];
    var base={ok:true,canal:'mail',destino:'x@y.z',instalacion:'listo',triggers:[],respaldoCatering:{ok:true},
      replica:{ok:true,configurado:true,
        crm:{lastOkAt:String(ahora-9*60000)},
        inventario:{lastOkAt:String(ahora-4*60000)},
        pedidos:{lastOkAt:String(ahora-2*60000)}}};
    if(window.__caso==='coinciden'){
      base.cruzado='ok';
      base.cruce={ok:true,lastAt:new Date(ahora-30000).toISOString(),lastErrorAt:'',ultimo:{ok:true,canales:canalesOk}};
    } else if(window.__caso==='difieren'){
      base.cruzado='diferencias';
      base.cruce={ok:true,lastAt:new Date(ahora-30000).toISOString(),lastErrorAt:new Date(ahora-30000).toISOString(),ultimo:{ok:false,canales:canalesMal}};
    } else if(window.__caso==='sinEstado'){
      base.cruzado='ok';
      delete base.replica; base.replicaError='la base no contesta';
      base.cruce={ok:true,lastAt:'',lastErrorAt:'',ultimo:null};
    } else if(window.__caso==='sinConectar'){
      base.cruzado='sin configurar';
      base.replica={ok:true,configurado:false,crm:{},inventario:{},pedidos:{}};
      base.cruce={ok:true,lastAt:'',lastErrorAt:'',ultimo:null};
    }
    return base;
  };
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      var resp=function(c){var t=JSON.stringify(c);return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},80);});};
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        var bb={}; Object.keys(b).forEach(function(k){ if(k!=='token') bb[k]=b[k]; });
        window.__posts.push(bb);
        if(bb.action==='avisosSetup') return resp(window.__respAvisos());
        return resp({ok:true});
      }
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?', cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo={ts:1,pedidos:[],canales:[],light:true,saludSem:{},saludMes:{},ventasExtra:[]};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ajustesData') cuerpo=${JSON.stringify(AJ)};
      else if(a==='miSesion') cuerpo={ok:true,usuario:'tadeo',rol:'admin',nombre:'Tadeo Prueba',activo:true,tabs:${JSON.stringify(TABS)}};
      return resp(cuerpo);
    }
    return o.apply(this,arguments); }; })();`;

const LEER = `JSON.stringify({
  estado:(document.getElementById('ajRepEstado')||{}).innerHTML||'',
  salida:(document.getElementById('ajRepOut')||{}).innerHTML||'',
  oculto:!!(document.getElementById('ajRepOut')||{classList:{contains:function(){return true;}}}).classList.contains('hidden'),
  filas:[].map.call(document.querySelectorAll('#p-ajustes table.aj-cruce tbody tr, #p-ajustes table.aj-cruce tr'),function(t){return t.className+'|'+t.textContent.replace(/\\s+/g,' ').trim();}),
  btn:(document.getElementById('ajRepBtn')||{}).textContent||''
})`;

async function correr(cli, caso) {
  await ev(cli, `window.__caso='${caso}'; window.__posts=[]; window.__toasts=[];
    var o=document.getElementById('ajRepOut'); if(o){o.innerHTML='';o.classList.add('hidden');}
    var e=document.getElementById('ajRepEstado'); if(e){e.innerHTML='sin tocar';}
    ajReplicaCruzar();1`);
  await esperar(cli, `!document.getElementById('ajRepOut').classList.contains('hidden')`, 10000);
  await pausa(150);
  return JSON.parse(await ev(cli, LEER));
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + STUB });
    console.log('\n== La copia a la base nueva · Ajustes → Avisos · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?tab=inicio' });
    if (!await esperar(cli, `typeof go==='function' && typeof ajGo==='function'`, 90000)) throw new Error('el ERP no cargó');
    await ev(cli, `var _t=window.toast;window.toast=function(m){window.__toasts.push(String(m));return _t.apply(this,arguments);};1`);

    await ev(cli, `go('ajustes')`);
    await esperar(cli, `!!window.AJ_DATA`, 20000);
    await ev(cli, `ajGo('avisos');1`);
    if (!await esperar(cli, `!!document.getElementById('ajRepBtn')`, 10000)) throw new Error('la tarjeta no se dibujó');

    console.log('\n-- la tarjeta existe y dice qué es --');
    const t0 = JSON.parse(await ev(cli, LEER));
    chk('el botón está y se lee', /Comparar la planilla con la base/.test(t0.btn), t0.btn);
    chk('la salida arranca oculta, sin inventar un resultado', t0.oculto === true, t0);
    const desc = await ev(cli, `(function(){var c=[].find.call(document.querySelectorAll('#p-ajustes .aj-card'),function(x){return /La copia a la base nueva/.test(x.textContent);}); return c?c.querySelector('.desc').textContent:'';})()`);
    chk('la tarjeta aclara que la planilla sigue mandando', /planilla sigue mandando/i.test(String(desc)), desc);
    chk('y que el mail llega sólo si no coinciden', /solo si no coinciden|sólo si no coinciden/i.test(String(desc)), desc);

    console.log('\n-- coinciden --');
    const a = await correr(cli, 'coinciden');
    chk('dice que dicen lo mismo', /dicen lo mismo/.test(a.salida), a.salida);
    chk('muestra la tabla canal por canal', a.filas.length >= 3, a.filas);
    chk('con la plata de los dos lados', /\$56\.526\.275/.test(a.salida) && /\$56\.526\.274/.test(a.salida), a.salida);
    chk('ninguna fila marcada en rojo', !a.filas.some(f => /^mal\|/.test(f)), a.filas);
    chk('el estado dice cuándo fue la última copia de cada dominio',
      /pedidos: <b>/.test(a.estado) && /stock: <b>/.test(a.estado) && /clientes: <b>/.test(a.estado), a.estado);
    chk('y no dice "todavía no" cuando hay sellos', !/todav/.test(a.estado), a.estado);
    chk('el botón vuelve a quedar usable', /Comparar la planilla/.test(a.btn), a.btn);
    const posts = await ev(cli, `JSON.stringify(window.__posts)`);
    chk('pide el cruce con la bandera, sin una acción nueva',
      /"action":"avisosSetup"/.test(String(posts)) && /"cruzar":true/.test(String(posts)), posts);

    console.log('\n-- no coinciden --');
    const b = await correr(cli, 'difieren');
    chk('dice que no coinciden', /No coinciden/.test(b.salida), b.salida);
    chk('y aclara que la planilla sigue siendo la buena', /planilla sigue siendo la buena/.test(b.salida), b.salida);
    chk('marca en rojo el canal que falla, y sólo ése',
      b.filas.filter(f => /^mal\|/.test(f)).length === 1 && b.filas.some(f => /^mal\|.*Pilar/.test(f)), b.filas);
    chk('muestra los pedidos de los dos lados cuando no coinciden', /70 \/ 69/.test(b.salida), b.salida);
    chk('el estado avisa que el control encontró diferencias', /encontr/.test(b.estado), b.estado);

    console.log('\n-- el backend no pudo leer el estado --');
    const c = await correr(cli, 'sinEstado');
    chk('lo dice en vez de dejar el cartel de antes', /No se pudo leer el estado/.test(c.estado), c.estado);
    chk('y no inventa una fecha de última copia', !/pedidos: <b>/.test(c.estado), c.estado);

    console.log('\n-- la base no está conectada --');
    const d = await correr(cli, 'sinConectar');
    chk('lo dice con todas las letras', /no est.* conectada/.test(d.estado), d.estado);

    console.log('\n-- sin errores en consola --');
    const errs = await ev(cli, `JSON.stringify(window.__err||['SIN __err'])`);
    chk('la consola quedó limpia', errs === '[]', errs);

    console.log('\n' + (mal ? '\x1b[31m' : '\x1b[32m') + ok + ' ok, ' + mal + ' mal\x1b[0m');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.error('\nREVENTÓ: ' + (e && e.message || e));
    salir(1);
  }
})();
