/* QUIEN TRAJO AL CLIENTE, EN CADA PEDIDO DE RED. (28/9/2026)

   Tadeo: *"cuando el cliente lo trae Maleu, el vendedor cobre solo el envio"*.
   En septiembre la Red hizo 14 pedidos por $1.486.800 y los tres vendedores se
   llevaron $285.126, sin distinguir quien consiguio a cada cliente.

   Lo que se prueba, en este orden:
     1. con el volcado REAL —que no tiene el dato— todo cae en "sin dato", y
        NADA se cuenta como propio del vendedor. Es el punto 3 del pedido;
     2. con el dato cargado, los tres baldes separan y la suma cierra;
     3. la tabla parte lo que se lleva el vendedor en comision y envios;
     4. la ficha del pedido muestra y deja corregir de donde vino el cliente.

   El volcado sale de `admin.json`: los 103 pedidos de Red de verdad. */
'use strict';
const fs = require('fs');
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const S = 'C:/Users/tadeu/AppData/Local/Temp/claude/c--Tadeo-Ustariz-Trabajo-Grupo-Matriz-Maleu/6cacc9b9-db90-43db-9fee-739798f58a0d/scratchpad/';
const adm = JSON.parse(fs.readFileSync(S + 'admin.json', 'utf8'));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };

/* Lee la caja de la liquidacion: los tres baldes y la nota de abajo. */
const LEER = `(function(){
  var b=document.getElementById('vRed');
  var caja=b.querySelector('.red-liq');
  if(!caja)return {hay:false};
  var fs=caja.querySelectorAll('tbody tr');
  var filas=[];
  for(var i=0;i<fs.length;i++){
    var td=fs[i].querySelectorAll('td');
    filas.push({q:(td[0]||{}).innerText||'', ped:(td[1]||{}).innerText||'',
                vend:(td[2]||{}).innerText||'', com:(td[3]||{}).innerText||'',
                env:(td[4]||{}).innerText||'', lleva:(td[5]||{}).innerText||'',
                gris:fs[i].className.indexOf('red-liq-sd')>=0});
  }
  return {hay:true, filas:filas,
          nota:(caja.querySelector('.red-liq-n')||{}).innerText||'',
          tabla:(b.querySelector('.red-tabla-wrap')||{}).innerText||''};
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html?prueba=1' });
    for (let i = 0; i < 90; i++) { try { if (await evaluar(cli, `typeof rRed==='function'`)) break; } catch (e) {} await pausa(250); }
    await pausa(700);

    /* ── 1) COMO ESTA HOY: ningun pedido tiene el dato ───────────────── */
    console.log('\n== Con los pedidos de verdad, que todavia no tienen el dato ==');
    await evaluar(cli, `window.D={stock:[],ventasExtra:[],pedidos:${JSON.stringify(adm.pedidos)}}; RED_PER='anio'; 1`);
    await evaluar(cli, `go('ventas'); vSwitchTab('red'); 1`);
    await pausa(900);

    const v0 = await evaluar(cli, LEER);
    chk('la caja de la liquidacion esta', v0.hay === true, v0);
    chk('tiene los TRES baldes, no dos', v0.filas.length === 3, v0.filas.map(f => f.q));

    const sd0 = v0.filas[2] || {};
    chk('el balde de "sin dato" se llevo TODOS los pedidos', sd0.ped === '103', { sinDato: sd0.ped, filas: v0.filas.map(f => f.ped) });
    chk('y ninguno cayo del lado del vendedor', (v0.filas[0] || {}).ped === '0', v0.filas.map(f => f.ped));
    chk('ni del lado de Maleu', (v0.filas[1] || {}).ped === '0', v0.filas.map(f => f.ped));
    /* Atenuado pero presente: es la fila que dice cuanto de esta cuenta todavia
       no se puede contestar. Esconderla seria decir que ya esta contestada. */
    chk('la fila de "sin dato" se ve, atenuada pero no escondida', sd0.gris === true, sd0);
    chk('y la nota lo dice en vez de mostrar un $0 que parece una respuesta',
        v0.nota.indexOf('Todav') >= 0 && v0.nota.indexOf('ning') >= 0, v0.nota);

    /* ── 2) CON EL DATO CARGADO ──────────────────────────────────────── */
    console.log('\n== Con el dato cargado en los pedidos ==');
    /* Marco los pedidos de Red de Marcos: los 5 primeros como traidos por
       Maleu, los demas como suyos. Fini y Rufino quedan sin dato a proposito,
       para que los tres baldes tengan algo al mismo tiempo. */
    const rep = await evaluar(cli, `(function(){
      var n=0, m=0, v=0;
      D.pedidos.forEach(function(p){
        if(p.h!=='Red')return;
        if(String(p.br||'').indexOf('Marcos')!==0)return;
        n++;
        if(n<=5){ p.tc='Maleu'; m++; } else { p.tc='Vendedor'; v++; }
      });
      rRed();
      return {maleu:m, vendedor:v};
    })()`);
    await pausa(500);
    chk('quedaron 5 pedidos traidos por Maleu', rep.maleu === 5, rep);

    const v1 = await evaluar(cli, LEER);
    chk('ahora el balde de Maleu tiene los 5', (v1.filas[1] || {}).ped === '5', v1.filas.map(f => f.ped));
    chk('el del vendedor tiene el resto de los de Marcos', (v1.filas[0] || {}).ped === String(rep.vendedor), v1.filas.map(f => f.ped));
    chk('y los de los otros dos vendedores siguen sin dato',
        (v1.filas[2] || {}).ped === String(103 - rep.maleu - rep.vendedor), v1.filas.map(f => f.ped));

    /* El control que sostiene toda la caja: los tres baldes son el total, ni un
       peso de mas ni de menos. Si alguna vez se cuenta un pedido en dos baldes
       —o en ninguno— esto se pone rojo. */
    const suma = await evaluar(cli, `(function(){
      var x=_redDatos(), O=x.total.ori;
      return {ped:O.v.ped+O.m.ped+O.s.ped, totPed:x.total.ped,
              sub:Math.round(O.v.sub+O.m.sub+O.s.sub), totSub:Math.round(x.total.sub),
              env:Math.round(O.v.env+O.m.env+O.s.env), totEnv:Math.round(x.total.env),
              com:Math.round(O.v.com+O.m.com+O.s.com), comEsperada:Math.round(x.total.sub-x.total.mal)};
    })()`);
    chk('los tres baldes suman los pedidos del periodo', suma.ped === suma.totPed, suma);
    chk('y lo vendido, al peso', suma.sub === suma.totSub, suma);
    chk('y los envios', suma.env === suma.totEnv, suma);
    chk('la comision repartida es la MISMA que se paga hoy (vendido - lo de Maleu)',
        Math.abs(suma.com - suma.comEsperada) <= 3, suma);

    /* El numero que Tadeo fue a buscar. */
    chk('la nota dice cuanto se ahorraria pagando solo el envio en los de Maleu',
        v1.nota.indexOf('solo el env') >= 0 && v1.nota.indexOf('menos') >= 0, v1.nota);

    /* ── 3) LA TABLA PARTE LO QUE SE LLEVA EL VENDEDOR ───────────────── */
    console.log('\n== La tabla de vendedores ==');
    chk('la columna ya no se llama "Comision" a secas', v1.tabla.indexOf('SE LLEVA') >= 0, v1.tabla.slice(0, 220));
    chk('y cada vendedor muestra la comision y los envios por separado',
        v1.tabla.indexOf('comisi') >= 0 && v1.tabla.indexOf('env') >= 0, v1.tabla.slice(0, 300));

    const parte = await evaluar(cli, `(function(){
      var x=_redDatos(), k=Object.keys(x.porV).filter(function(n){return n.indexOf('Marcos')===0;})[0];
      var e=x.porV[k];
      return {com:Math.round(e.sub-e.mal), env:Math.round(e.env), lleva:Math.round((e.sub-e.mal)+e.env)};
    })()`);
    chk('y las dos partes suman lo que se lleva', parte.com + parte.env === parte.lleva, parte);

    /* El reparto DE CADA VENDEDOR. La liquidacion se le paga a una persona:
       con tres vendedores y mezclas distintas, el total global no alcanza.
       Estos chequeos existen porque la contraprueba encontro que este desglose
       se acumulaba sin que lo leyera nadie. */
    console.log('\n== El reparto de cada vendedor ==');
    const porV = await evaluar(cli, `(function(){
      var x=_redDatos(), out={};
      Object.keys(x.porV).forEach(function(k){
        var e=x.porV[k], o=e.ori;
        out[k.split(' ')[0]]={
          ped:o.v.ped+o.m.ped+o.s.ped, totPed:e.ped,
          sub:Math.round(o.v.sub+o.m.sub+o.s.sub), totSub:Math.round(e.sub),
          com:Math.round(o.v.com+o.m.com+o.s.com), comEsp:Math.round(e.sub-e.mal),
          m:o.m.ped, v:o.v.ped, s:o.s.ped };
      });
      return out;
    })()`);
    Object.keys(porV).forEach(function(n){
      const e = porV[n];
      chk(n + ': sus tres baldes suman sus pedidos', e.ped === e.totPed, e);
      chk('   y lo que vendio, al peso', e.sub === e.totSub, e);
      chk('   y su comision no se duplica ni se pierde', Math.abs(e.com - e.comEsp) <= 2, e);
    });
    chk('Marcos es el unico con el dato cargado', porV.Marcos.m === 5 && porV.Rufino.m === 0, porV);

    const vista = await evaluar(cli, `(function(){
      rRed(); redVer(0);
      var b=document.getElementById('redv-0');
      return b ? (b.innerText||'') : '';
    })()`);
    /* Se busca en MAYUSCULAS: `innerText` devuelve el texto con el
       text-transform del CSS ya aplicado, y el titulo de la columna va en
       uppercase. Buscarlo como esta escrito en la fuente da -1 siempre. */
    chk('y el detalle del vendedor lo muestra',
        vista.indexOf('SALEN SUS COMISIONES') >= 0 && vista.indexOf('Clientes de Maleu') >= 0, vista.slice(-220));

    /* ── 4) LA FICHA DEL PEDIDO ──────────────────────────────────────── */
    console.log('\n== La ficha del pedido, que es donde se corrige ==');
    const ficha = await evaluar(cli, `(function(){
      var p=null;
      D.pedidos.forEach(function(x){ if(!p && x.h==='Red' && x.tc==='Maleu') p=x; });
      if(!p)return {hay:false};
      openOrdDetail('Red', p.n);
      var caja=document.querySelector('#ordBody .ord-trajo');
      if(!caja)return {hay:false, n:p.n};
      var bs=caja.querySelectorAll('.ord-trajo-op');
      var ops=[];
      for(var i=0;i<bs.length;i++) ops.push({t:bs[i].innerText, on:bs[i].className.indexOf('on')>=0});
      return {hay:true, n:p.n, ops:ops, sub:(caja.querySelector('.ord-trajo-s')||{}).innerText||''};
    })()`);
    chk('la ficha de un pedido de Red pregunta quien trajo al cliente', ficha.hay === true, ficha);
    chk('con las tres opciones', ficha.hay && ficha.ops.length === 3, ficha.ops);
    chk('y marca la que corresponde: la trajo Maleu',
        ficha.hay && ficha.ops[1].on === true && ficha.ops[0].on === false, ficha.ops);
    chk('y dice lo que eso significa para la plata',
        ficha.hay && ficha.sub.indexOf('env') >= 0, ficha.sub);

    /* El telefono del cliente final. Se guarda desde hoy en su propia columna, y
       un dato que se escribe y no se lee no sirve de nada. */
    const tel = await evaluar(cli, `(function(){
      closeOrdDetail();
      var p=null;
      D.pedidos.forEach(function(x){ if(!p && x.h==="Red") p=x; });
      p.tcl="1165432198";
      openOrdDetail("Red", p.n);
      var caja=document.querySelector("#ordBody .ord-trajo");
      var t=caja?(caja.innerText||""):"";
      return {txt:t, link:caja?caja.querySelectorAll("a").length:-1};
    })()`);
    chk('el telefono del cliente final se muestra', tel.txt.indexOf('1165432198') >= 0, tel.txt.slice(0, 140));
    chk('y SIN link de WhatsApp: ese vecino nunca le escribio a Maleu', tel.link === 0, tel);

    /* En un pedido sin dato, ninguna opcion puede quedar prendida: "no se sabe"
       es un estado, no el default de "el vendedor". */
    const sinDato = await evaluar(cli, `(function(){
      closeOrdDetail();
      var p=null;
      D.pedidos.forEach(function(x){ if(!p && x.h==='Red' && !x.tc) p=x; });
      if(!p)return {hay:false};
      openOrdDetail('Red', p.n);
      var caja=document.querySelector('#ordBody .ord-trajo');
      if(!caja)return {hay:false};
      var bs=caja.querySelectorAll('.ord-trajo-op'), on=[];
      for(var i=0;i<bs.length;i++) if(bs[i].className.indexOf('on')>=0) on.push(bs[i].innerText);
      return {hay:true, on:on, sub:(caja.querySelector('.ord-trajo-s')||{}).innerText||''};
    })()`);
    chk('en un pedido sin dato se prende "No se sabe", no "El vendedor"',
        sinDato.hay && sinDato.on.length === 1 && sinDato.on[0].indexOf('No se') >= 0, sinDato);
    chk('y lo explica en vez de dejarlo mudo',
        sinDato.hay && sinDato.sub.indexOf('Sin cargar') >= 0, sinDato.sub);

    /* ── 5) EL DETALLE: cada cliente dice de donde vino ──────────────── */
    const det = await evaluar(cli, `(function(){
      closeOrdDetail();
      go('ventas'); vSwitchTab('red'); rRed(); redVer(0);
      var b=document.getElementById('redv-0');
      if(!b)return {hay:false};
      return {hay:true, mal:b.querySelectorAll('.red-ori.mal').length,
              ven:b.querySelectorAll('.red-ori.ven').length,
              mix:b.querySelectorAll('.red-ori.mix').length};
    })()`);
    await pausa(200);
    chk('en el detalle, los clientes traidos por Maleu quedan marcados', det.hay && det.mal + det.mix > 0, det);
    chk('y los del vendedor tambien', det.hay && det.ven > 0, det);

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
