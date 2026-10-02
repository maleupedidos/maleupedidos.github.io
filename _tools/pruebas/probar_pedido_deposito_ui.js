/* LA FICHA DEL PEDIDO DICE DE QUE FREEZER SALE. (28/9/2026)

     node probar_pedido_deposito_ui.js
     APP=app_viejo_tmp.html node probar_pedido_deposito_ui.js   <- la contraria

   Tadeo: *"es importante actualizar la tab pedidos porque ahora hay dos tipos
   de deposito y para cada pedido dice deposito y orden de compra, pero ahora
   hay dos depositos"*.

   El backend guarda el deposito en la fila desde el 27/9 y NINGUNA pantalla lo
   leia. Lo que tiene que ser cierto:

     · la ficha dice de que freezer sale, con el nombre de la hoja Depositos;
     · un pedido sin elegir lo dice como lo que es —"el default de cada
       producto"— y no como una falta;
     · se puede cambiar mientras no se entrego;
     · ya entregado NO se ofrece, y explica por que (la mercaderia ya salio:
       cambiar la etiqueta haria que la devolucion entre al otro freezer);
     · en RED la salida es "Entregado a Vendedor", no el estado del pedido;
     · un pedido que va entero a OC no lo muestra: no toca el freezer;
     · con UN solo deposito la pantalla queda como estaba;
     · y el POST manda hoja, fila y deposito.

   Los nombres son inventados a proposito: este repo es publico. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 320) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};
/* Con guarda: contra el ERP anterior `_pedDepHTML` no existe y el test tiene
   que dar ROJO, no explotar en la primera linea. */
const pintar = (cli, p, homeOnly) =>
  evaluar(cli, `(function(){try{return _pedDepHTML(${JSON.stringify(p)},${homeOnly ? 'true' : 'false'});}catch(e){return null;}})()`);

const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz' }, { id: 'moresco', nombre: 'Deposito Moresco' }];

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    console.log('\n== La ficha del pedido y los dos freezers · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof rPedidos==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(700);
    await evaluar(cli, `window.D=window.D||{}; D.stockDeps=${JSON.stringify(DEPS)}; 1`);

    /* ── 1. Un pedido con freezer elegido ── */
    const h1 = await pintar(cli, { h: 'Home', n: '900', r: 120, o: 'Deposito', es: 'Pendiente', dep: 'moresco' });
    chk('dibuja el bloque del freezer', typeof h1 === 'string' && h1.indexOf('ped-dep') >= 0, h1 && h1.slice(0, 120));
    chk('   con el nombre de la hoja, sin el "Depósito " de adelante',
        !!h1 && h1.indexOf('>Moresco<') >= 0, h1 && h1.slice(0, 300));
    chk('   y marca cuál está elegido', !!h1 && /ped-dep-x on[^>]*>Moresco/.test(h1.replace(/"/g, '')), h1);
    chk('   ofrece los dos freezers', !!h1 && h1.indexOf('Ustariz') >= 0 && h1.indexOf('Moresco') >= 0, h1);
    chk('   y la opción de volver al default', !!h1 && h1.indexOf('Por defecto') >= 0, h1);
    chk('el POST lleva hoja, fila y depósito',
        !!h1 && h1.indexOf("pedDep('Home',120,'ustariz',this)") >= 0, h1);

    /* ── 2. Sin elegir: no es una falta ── */
    const h2 = await pintar(cli, { h: 'Home', n: '901', r: 121, o: 'Deposito', es: 'Pendiente', dep: '' });
    chk('sin elegir, dice qué significa en vez de marcarlo como falta',
        !!h2 && h2.indexOf('Sin elegir') >= 0 && h2.indexOf('por defecto de cada producto') >= 0, h2 && h2.slice(0, 300));
    chk('   y "Por defecto" queda marcado', !!h2 && /ped-dep-x on[^>]*>Por defecto/.test(h2.replace(/"/g, '')), h2);

    /* ── 3. Ya entregado: no se toca ── */
    const h3 = await pintar(cli, { h: 'Home', n: '902', r: 122, o: 'Deposito', es: 'Entregado', dep: 'ustariz' });
    chk('entregado: sigue diciendo de dónde salió', !!h3 && h3.indexOf('Ustariz') >= 0, h3 && h3.slice(0, 200));
    chk('   pero NO ofrece cambiarlo', !!h3 && h3.indexOf('pedDep(') < 0, h3);
    chk('   y explica por qué, con la salida (el traspaso)',
        !!h3 && h3.indexOf('traspaso') >= 0, h3 && h3.slice(-220));

    /* ── 4. RED: la salida es la bolsa al vendedor ──
       Su "Estado de Entrega" es la entrega DEL VENDEDOR a su cliente y puede
       tardar dias; del freezer de Maleu sale cuando se le da la bolsa. */
    const h4 = await pintar(cli, { h: 'Red', n: '50', r: 60, o: 'Deposito', es: 'Pendiente', ev: 'Entregado', dep: 'ustariz' });
    chk('en Red, entregada la bolsa al vendedor, ya no se cambia',
        !!h4 && h4.indexOf('pedDep(') < 0, h4 && h4.slice(0, 200));
    const h5 = await pintar(cli, { h: 'Red', n: '51', r: 61, o: 'Deposito', es: 'Pendiente', ev: '', dep: 'ustariz' });
    chk('   y si todavía está en el freezer, sí', !!h5 && h5.indexOf('pedDep(') >= 0, h5 && h5.slice(0, 200));

    /* ── 5. Lo que NO toca el freezer ── */
    const h6 = await pintar(cli, { h: 'Home', n: '903', r: 123, o: 'Orden de Compra', es: 'Pendiente', dep: '' });
    chk('un pedido que va entero a OC no lo muestra', h6 === '', { h: h6 });
    const h7 = await pintar(cli, { h: 'Home', n: '904', r: 124, o: 'Pendiente', es: 'Pendiente', dep: '' });
    chk('   pero con el origen sin decidir SÍ: es el momento de elegirlo',
        !!h7 && h7.indexOf('ped-dep') >= 0, { h: h7 });

    /* ── 6. Con un solo freezer, la pantalla de antes ── */
    await evaluar(cli, `D.stockDeps=[{id:'ustariz',nombre:'Deposito Ustariz'}]; 1`);
    const h8 = await pintar(cli, { h: 'Home', n: '905', r: 125, o: 'Deposito', es: 'Pendiente', dep: '' });
    chk('con UN solo depósito no pregunta nada', h8 === '', { h: h8 });
    await evaluar(cli, `D.stockDeps=${JSON.stringify(DEPS)}; 1`);

    /* ── 7. El repartidor no decide de qué freezer sale ── */
    const h9 = await pintar(cli, { h: 'Home', n: '906', r: 126, o: 'Deposito', es: 'Pendiente', dep: '' }, true);
    chk('el repartidor no lo ve: no es su decisión', h9 === '', { h: h9 });

    /* ── 8. Supabase: el campo llega del atajo ── */
    const sb = await evaluar(cli, `(function(){try{
      return _sbAPedido({channel:'Home',order_number:'907',warehouse:'MORESCO ',customer_name:'X'}).dep;
    }catch(e){return null;}})()`);
    chk('el atajo de Supabase trae el freezer, normalizado', sb === 'moresco', { dep: sb });
    const sbv = await evaluar(cli, `(function(){try{
      return _sbAPedido({channel:'Home',order_number:'908',customer_name:'X'}).dep;
    }catch(e){return null;}})()`);
    chk('   y sin la columna (migración sin aplicar) queda vacío, no undefined', sbv === '', { dep: sbv });

    /* ── 9. EL TOQUE, de punta a punta (2/10/2026) ──
       Tadeo: *"los botones andan muy lentos, aun despues de v489"*. El boton
       recien cambiaba cuando volvia `_recargarPedidos()` — `pedidosLight` en
       frio, 12-17 s — y hasta ahi la pantalla no decia nada.
       Backend simulado ADENTRO de la pagina: el POST `pedidoDeposito` tarda
       1,5 s y contesta lo que diga `__depResp`; todo otro fetch se cuenta y
       se contesta vacio, asi nada sale a produccion. */
    await evaluar(cli, `(function(){
      window.__depPosts=0; window.__otros=[]; window.__depResp={ok:true};
      var f0=window.fetch;
      window.fetch=function(u,o){
        var b=(o&&o.body)||'';
        if(String(b).indexOf('pedidoDeposito')>=0){
          window.__depPosts++;
          return new Promise(function(r){ setTimeout(function(){
            r(new Response(JSON.stringify(window.__depResp),{headers:{'Content-Type':'application/json'}}));
          },1500); });
        }
        window.__otros.push(String(u).slice(0,120));
        return Promise.resolve(new Response('{"ok":false}',{headers:{'Content-Type':'application/json'}}));
      };
      /* La recarga NO sale por window.fetch (va por la cola de GETs, que se
         guardo su fetch al arrancar): mirando solo el fetch, este chequeo daba
         verde contra v489, con el bug adentro. Se espia la funcion. */
      window.__recargas=0;
      var r0=window._recargarPedidos;
      window._recargarPedidos=function(){ window.__recargas++; return Promise.resolve(); };
      window.__r0=r0;
      D.pedidos=[{h:'Home',n:'910',r:130,o:'Deposito',es:'Pendiente',dep:'',p:[]}];
      var w=document.createElement('div'); w.id='__depPrueba';
      w.innerHTML=_pedDepHTML(D.pedidos[0],false);
      document.body.appendChild(w);
      return 1;
    })()`);
    const tocar = nombre => evaluar(cli, `(function(){
      var bs=document.querySelectorAll('#__depPrueba button.ped-dep-x');
      for(var i=0;i<bs.length;i++)if(bs[i].textContent.trim()==='${nombre}'){
        window.__t0=performance.now(); bs[i].click(); return true; }
      return false;
    })()`);
    const estado = () => evaluar(cli, `(function(){
      var b=document.querySelector('#__depPrueba .ped-dep');
      if(!b)return null;
      var on=b.querySelector('button.ped-dep-x.on');
      var bs=b.querySelectorAll('button.ped-dep-x'), dis=0;
      for(var i=0;i<bs.length;i++)if(bs[i].disabled)dis++;
      return {on:on?on.textContent.trim():'', va:!!b.querySelector('button.va'),
              txt:(b.querySelector('button.va')||{}).textContent||'', dis:dis, n:bs.length,
              v:(b.querySelector('.ped-dep-v')||{}).textContent||'', dep:D.pedidos[0].dep};
    })()`);

    chk('el toque encuentra el botón', await tocar('Moresco') === true);
    const e0 = await estado();
    chk('al instante (sin esperar al servidor) el botón dice "Guardando…"',
        !!e0 && e0.va && e0.txt.indexOf('Guardando') >= 0, e0);
    chk('   y el bloque queda trabado: no se puede tocar otro mientras viaja',
        !!e0 && e0.dis === e0.n, e0);
    chk('   pero NO adelanta el resultado: el freezer sigue sin cambiar',
        !!e0 && e0.dep === '' && e0.v.indexOf('Sin elegir') >= 0, e0);
    await tocar('Ustariz');
    const listo = await esperar(cli, `(function(){var o=document.querySelector('#__depPrueba button.ped-dep-x.on');
      return !!o && o.textContent.trim()==='Moresco' && !document.querySelector('#__depPrueba button.va');})()`, 25000);
    const ms = await evaluar(cli, `Math.round(performance.now()-window.__t0)`);
    console.log('         toque → freezer marcado: ' + ms + ' ms (el POST simulado tarda 1500)');
    chk('con el OK, el freezer queda marcado en cuanto contesta el POST', listo && ms < 2500, { ms: ms });
    const e1 = await estado();
    chk('   y el bloque lo dice, con los botones vivos de nuevo',
        !!e1 && e1.v.indexOf('Moresco') >= 0 && e1.dis === 0 && e1.dep === 'moresco', e1);
    chk('un doble toque manda UN solo POST', await evaluar(cli, `window.__depPosts`) === 1,
        { posts: await evaluar(cli, `window.__depPosts`) });
    const recargas = await evaluar(cli, `window.__recargas`);
    chk('NO recarga la lista entera (era lo que costaba 12-17 s)', recargas === 0, { recargas: recargas });

    /* El servidor lo rechaza (p. ej. alguien lo entrego desde otro celular). */
    await evaluar(cli, `window.__depResp={ok:false,err:'el pedido ya se entrego'}; 1`);
    await tocar('Ustariz');
    await esperar(cli, `!document.querySelector('#__depPrueba button.va')`, 10000);
    const e2 = await estado();
    chk('rechazado: el freezer queda como estaba', !!e2 && e2.dep === 'moresco' && e2.on === 'Moresco', e2);
    chk('   y los botones se destraban, con su nombre', !!e2 && e2.dis === 0 &&
        await evaluar(cli, `!!Array.prototype.some.call(document.querySelectorAll('#__depPrueba button.ped-dep-x'),function(b){return b.textContent.trim()==='Ustariz';})`), e2);

    /* CODEX SOBRE ec3c322 (2/10/2026).
       (a) Dos pedidos Home sin numero ("-") compartian id de bloque: tocar uno
           repintaba el del otro. Se identifica por FILA.
       (b) El cambio vivia solo en memoria: ni `ma3` ni `_sbCambioLocal`, asi
           que al reabrir volvia el freezer viejo. */
    await evaluar(cli, `(function(){
      window.__depResp={ok:true};
      try{localStorage.removeItem('ma3');}catch(e){}
      _sbCambioLocal=0;
      D.pedidos=[{h:'Home',n:'-',r:140,o:'Deposito',es:'Pendiente',dep:'',p:[]},
                 {h:'Home',n:'-',r:141,o:'Deposito',es:'Pendiente',dep:'ustariz',p:[]}];
      var w=document.getElementById('__depPrueba'); w.innerHTML='';
      var a=document.createElement('div'); a.id='__depA'; a.innerHTML=_pedDepHTML(D.pedidos[0],false);
      var b=document.createElement('div'); b.id='__depB'; b.innerHTML=_pedDepHTML(D.pedidos[1],false);
      w.appendChild(a); w.appendChild(b); return 1;
    })()`);
    const ids = await evaluar(cli, `[document.querySelector('#__depA .ped-dep').id, document.querySelector('#__depB .ped-dep').id]`);
    chk('(a) dos pedidos Home "-" tienen bloques con id distinto', !!ids && ids[0] !== ids[1], ids);
    await evaluar(cli, `(function(){var bs=document.querySelectorAll('#__depA button.ped-dep-x');
      for(var i=0;i<bs.length;i++)if(bs[i].textContent.trim()==='Moresco'){bs[i].click();return 1;}return 0;})()`);
    await esperar(cli, `!document.querySelector('#__depPrueba button.va')`, 10000);
    const ab = await evaluar(cli, `(function(){
      var oa=document.querySelector('#__depA button.ped-dep-x.on'), ob=document.querySelector('#__depB button.ped-dep-x.on');
      return {a:oa?oa.textContent.trim():'', b:ob?ob.textContent.trim():'', da:D.pedidos[0].dep, db:D.pedidos[1].dep};
    })()`);
    chk('   tocar el de la fila 140 marca ESE bloque', !!ab && ab.a === 'Moresco' && ab.da === 'moresco', ab);
    chk('   y el de la fila 141 queda como estaba', !!ab && ab.b === 'Ustariz' && ab.db === 'ustariz', ab);
    const per = await evaluar(cli, `(function(){
      var c=null; try{c=JSON.parse(localStorage.getItem('ma3')||'null');}catch(e){}
      var f=c&&c.pedidos?c.pedidos.filter(function(p){return Number(p.r)===140;})[0]:null;
      var kp=(typeof _sbClavePedido==='function')?_sbClavePedido(D.pedidos[0]):'';
      return {ma3:f?f.dep:null, marca:_sbCambioLocal>0&&(Date.now()-_sbCambioLocal)<60000,
              porPedido:(typeof _sbCambiosPed==='object'&&kp)?!!_sbCambiosPed[kp]:false};
    })()`);
    chk('(b) el freezer nuevo queda guardado en la copia del celular (ma3)', !!per && per.ma3 === 'moresco', per);
    chk('   y se marca el cambio local: Supabase no lo pisa con la foto vieja', !!per && per.marca === true, per);
    chk('   también POR PEDIDO (_sbCambiosPed), que es como decide _sbFilaPisa', !!per && per.porPedido === true, per);

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
