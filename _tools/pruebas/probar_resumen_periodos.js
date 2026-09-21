/* Inicio > Resumen: elegir cualquier semana, mes o rango (21/9/2026).

   Hasta hoy el Resumen tenia cuatro periodos fijos —esta semana, la pasada,
   este mes, el pasado— y no habia forma de ver, por ejemplo, las semanas de
   septiembre. Ahora hay flechas y un selector.

   Lo que se prueba es la LOGICA DE FECHAS, que es donde estan los bugs que no
   se ven: una semana ISO mal anclada corre todo una semana y los numeros
   siguen pareciendo razonables. Por eso casi todo es ida y vuelta y bordes de
   año, no "se dibujo el boton".

   `_rtPeriodo(k, hoy)` toma el dia como PARAMETRO, asi que se prueba con fechas
   fijas: un test que dependa de la fecha real se pone rojo solo algun lunes.

   Corre con ?prueba=1: sin token, sin backend, sin tocar produccion.

   node probar_resumen_periodos.js
*/
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(c, e)) return true; } catch (x) {} await pausa(300); } return false; };

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, "typeof _rtPeriodo==='function' && typeof _rtMover==='function'")) {
      console.log('  el ERP no arranco (o falta _rtPeriodo/_rtMover)'); process.exit(1);
    }
    console.log('\n== Resumen: elegir cualquier periodo ==\n');

    // ── 1) La semana ISO, ida y vuelta ───────────────────────────────────
    /* `_rtLunesISO` se ancla en el 4 de enero porque es el unico dia que SIEMPRE
       cae en la semana 1. Si se anclara en el 1/1, los años que arrancan jueves
       o viernes se corren una semana entera y nadie lo nota. */
    const vuelta = await evaluar(cli, `(function(){
      var mal = [];
      for (var y = 2024; y <= 2030; y++){
        for (var w = 1; w <= 52; w++){
          var L = _rtLunesISO(y, w);
          if (L.getDay() !== 1) { mal.push(y+'-'+w+' no cae lunes'); continue; }
          /* El año de una semana ISO es el de su JUEVES, no el del lunes. */
          var ju = new Date(L.getFullYear(), L.getMonth(), L.getDate()+3);
          if (getWeek(L) !== w || ju.getFullYear() !== y) mal.push(y+'-'+w+' vuelve '+ju.getFullYear()+'-'+getWeek(L));
        }
      }
      return mal.slice(0, 6);
    })()`);
    chk('toda semana ISO de 2024 a 2030 vuelve a ser ella misma', Array.isArray(vuelta) && vuelta.length === 0, vuelta);

    // ── 2) Los bordes de año ─────────────────────────────────────────────
    /* 2026 arranca jueves: el 1/1/2026 cae en la semana 1, cuyo lunes es del
       2025. Es el caso que un anclaje al 1/1 rompe. */
    const borde = await evaluar(cli, `(function(){
      var L = _rtLunesISO(2026, 1);
      var P = _rtPeriodo('w:2026-1', new Date(2026,5,15));
      return { lun: _rtIso(L), d: P.d, h: P.h, tit: P.tit };
    })()`);
    chk('la semana 1 de 2026 arranca el lunes 29/12/2025',
      borde && borde.lun === '2025-12-29' && borde.d === '2025-12-29' && borde.h === '2026-01-04', borde);

    // ── 3) Un periodo elegido se compara contra el anterior ───────────────
    const w38 = await evaluar(cli, `(function(){
      var P = _rtPeriodo('w:2026-38', new Date(2026,11,1));
      return { d:P.d, h:P.h, cd:P.cd, ch:P.ch, tipo:P.tipo, enCurso:!!P.enCurso, tit:P.tit };
    })()`);
    chk('la semana 38 de 2026 va del lun 14/9 al dom 20/9',
      w38 && w38.d === '2026-09-14' && w38.h === '2026-09-20', w38);
    chk('y se compara contra la 37 entera',
      w38 && w38.cd === '2026-09-07' && w38.ch === '2026-09-13', w38);
    chk('una semana ya cerrada no se marca "en curso"', w38 && w38.enCurso === false, w38);

    // ── 4) La semana EN CURSO se corta en hoy ────────────────────────────
    /* Mostrarla entera sumaria dias que todavia no pasaron: el total caeria por
       abajo sin motivo y pareceria una mala semana. Y la comparacion tiene que
       cortarse igual, o se compara media semana contra una entera. */
    const curso = await evaluar(cli, `(function(){
      /* miercoles 16/9/2026, adentro de la semana 38 */
      var P = _rtPeriodo('w:2026-38', new Date(2026,8,16));
      return { d:P.d, h:P.h, cd:P.cd, ch:P.ch, enCurso:!!P.enCurso, tit:P.tit };
    })()`);
    chk('la semana en curso se corta en hoy, no en el domingo',
      curso && curso.h === '2026-09-16' && curso.enCurso === true, curso);
    chk('y la comparacion se corta en el MISMO dia de la semana anterior',
      curso && curso.cd === '2026-09-07' && curso.ch === '2026-09-09', curso);

    // ── 5) Los meses ─────────────────────────────────────────────────────
    const sep = await evaluar(cli, `(function(){
      var P = _rtPeriodo('m:2026-09', new Date(2026,11,1));
      var Pc = _rtPeriodo('m:2026-09', new Date(2026,8,21));
      return { ent:{d:P.d,h:P.h,cd:P.cd,ch:P.ch,enCurso:!!P.enCurso},
               cur:{d:Pc.d,h:Pc.h,cd:Pc.cd,ch:Pc.ch,enCurso:!!Pc.enCurso} };
    })()`);
    chk('septiembre cerrado va del 1 al 30 y se compara con agosto entero',
      sep && sep.ent.d === '2026-09-01' && sep.ent.h === '2026-09-30'
         && sep.ent.cd === '2026-08-01' && sep.ent.ch === '2026-08-31', sep && sep.ent);
    chk('septiembre EN CURSO se corta en hoy y compara los mismos dias de agosto',
      sep && sep.cur.h === '2026-09-21' && sep.cur.ch === '2026-08-21' && sep.cur.enCurso === true, sep && sep.cur);

    /* Marzo EN CURSO un dia 30, contra febrero, que tiene 28. El "hasta" de la
       comparacion no puede pasarse del ultimo dia del mes anterior: pedirle el
       "30 de febrero" no da error, JS lo corre solo al 2 de marzo y entonces la
       comparacion se mete en el mes que se esta mirando.

       Ojo con el dia elegido: al 31/3 el mes ya esta cerrado y la rama del
       "en curso" ni se ejecuta — con el 31 este caso daba verde sin probar
       nada (lo agarro el reinyector). Tiene que ser un dia en que marzo siga
       abierto Y que no exista en febrero. */
    const feb = await evaluar(cli, `(function(){
      var P = _rtPeriodo('m:2026-03', new Date(2026,2,30));
      return { h:P.h, cd:P.cd, ch:P.ch, enCurso:!!P.enCurso };
    })()`);
    chk('marzo en curso un dia 30 no le inventa a febrero un dia 30',
      feb && feb.enCurso === true && feb.ch === '2026-02-28', feb);

    // ── 6) Las flechas ───────────────────────────────────────────────────
    /* Parado en un atajo, la flecha lo convierte en la clave concreta: es lo
       que permite seguir yendo para atras desde cualquier lado. */
    const flechas = await evaluar(cli, `(function(){
      var hoy = new Date(2026,8,21);           /* lunes 21/9/2026 */
      var a = _rtMover('sem', hoy, -1);
      var b = _rtMover(a, hoy, -1);
      var c = _rtMover('mes', hoy, -1);
      var d = _rtMover('mes', hoy, 1);
      var e = _rtMover('r:2026-09-01:2026-09-10', hoy, -1);
      /* Borde de año: la semana 1 de 2026 tiene el lunes en DICIEMBRE DE 2025.
         Si la clave se armara con el año del lunes saldria 'w:2025-1', que es
         otra semana — y en enero la flecha te mandaria un año atras. El año de
         una semana ISO es el de su jueves. */
      var f = _rtMover('w:2026-2', hoy, -1);
      var g = _rtMover('w:2026-1', hoy, -1);
      return { a:a, b:b, c:c, d:d, e:e, f:f, g:g };
    })()`);
    chk('desde "esta semana" la flecha lleva a la semana concreta anterior',
      flechas && flechas.a === 'w:2026-38', flechas);
    chk('y se puede seguir yendo para atras', flechas && flechas.b === 'w:2026-37', flechas);
    chk('desde "este mes" lleva a agosto', flechas && flechas.c === 'm:2026-08', flechas);
    chk('y para adelante a octubre', flechas && flechas.d === 'm:2026-10', flechas);
    /* Un rango se corre por su PROPIO largo: 10 dias saltan 10 dias. */
    chk('un rango a medida se mueve por su propio largo',
      flechas && flechas.e === 'r:2026-08-22:2026-08-31', flechas);
    chk('en el borde de año la flecha usa el año del JUEVES, no el del lunes',
      flechas && flechas.f === 'w:2026-1', flechas && flechas.f);
    chk('y desde la semana 1 de 2026 se pasa a la ultima de 2025',
      flechas && flechas.g === 'w:2025-52', flechas && flechas.g);

    // ── 7) El rango a medida ─────────────────────────────────────────────
    const libre = await evaluar(cli, `(function(){
      var P = _rtPeriodo('r:2026-09-01:2026-09-10', new Date(2026,11,1));
      var mal = _rtPeriodo('r:2026-09-10:2026-09-01', new Date(2026,11,1));
      return { d:P.d, h:P.h, cd:P.cd, ch:P.ch, tipo:P.tipo, tit:P.tit, malK:mal.k };
    })()`);
    chk('un rango de 10 dias se compara contra los 10 anteriores',
      libre && libre.cd === '2026-08-22' && libre.ch === '2026-08-31', libre);
    chk('el titulo dice cuantos dias son', libre && /10 días/.test(libre.tit), libre && libre.tit);
    /* Un rango al reves no puede dejar la pantalla en blanco: cae al default. */
    chk('un rango invertido cae en "mes pasado" en vez de romper', libre && libre.malK === 'mesAnt', libre);

    // ── 8) Las semanas que se ofrecen para un mes ────────────────────────
    const sem9 = await evaluar(cli, `(function(){
      var s = _rtSemanasDelMes('2026-09');
      return { n: s.length, ks: s.map(function(x){ return x.k; }) };
    })()`);
    /* Septiembre 2026 lo tocan las semanas 36 a 40: la 36 arranca el 31/8 y la
       40 termina el 4/10. Salen en los dos meses a proposito. */
    chk('septiembre ofrece las 5 semanas que lo tocan, incluidas las de borde',
      sem9 && sem9.n === 5 && sem9.ks[0] === '2026-36' && sem9.ks[4] === '2026-40', sem9);

    // ── 9) El cuadro de clientes no se inventa ───────────────────────────
    /* Viene precalculado POR SEMANA y POR MES: un cliente que compro dos veces
       cuenta una sola, y eso no se puede rearmar para un rango cualquiera. */
    const cli9 = await evaluar(cli, `(function(){
      D = D || {}; D.saludSem = {'2026-38':{total:9}}; D.saludMes = {'2026-09':{total:40}};
      return { sem: (_rtClientes(_rtPeriodo('w:2026-38', new Date(2026,11,1)))||{}).total || 0,
               mes: (_rtClientes(_rtPeriodo('m:2026-09', new Date(2026,11,1)))||{}).total || 0,
               libre: _rtClientes(_rtPeriodo('r:2026-09-01:2026-09-10', new Date(2026,11,1))) };
    })()`);
    chk('una semana elegida a mano SI trae su cuadro de clientes', cli9 && cli9.sem === 9, cli9);
    chk('un mes elegido tambien', cli9 && cli9.mes === 40, cli9);
    chk('un rango a medida no lo dibuja en vez de inventarlo', cli9 && cli9.libre === null, cli9);

    // ── 10) El periodo elegido no sobrevive al cambio de dia ─────────────
    const guard = await evaluar(cli, `(function(){
      _rtGuardarPer('w:2026-35');
      var hoyOk = _rtPerGuardado(new Date());
      var otroDia = _rtPerGuardado(new Date(2020,0,1));
      return { hoyOk: hoyOk, otroDia: otroDia };
    })()`);
    chk('lo elegido sobrevive a recargar la pantalla', guard && guard.hoyOk === 'w:2026-35', guard);
    chk('pero al otro dia vuelve el default (el lunes, la semana que cerro)',
      guard && guard.otroDia === null, guard);

    // ── 11) Que la pantalla DIBUJE, no solo que la cuenta cierre ─────────
    /* Sin backend, los pedidos se ponen a mano. Lo que se mide aca no son los
       montos sino el armazon: que los botones esten, que las flechas se apaguen
       en los bordes de lo que hay cargado, y que el selector ofrezca los meses
       que existen y no el año entero. Nombres inventados (repo publico). */
    const pintado = await evaluar(cli, `(function(){
      D = D || {};
      /* Una venta por semana, de junio a septiembre de 2026. */
      var ps = [], d = new Date(2026,5,1);
      while (d <= new Date(2026,8,20)){
        ps.push({ h:'Home', es:'Entregado', c:'Cliente Prueba', $:10000, co:6000,
                  bar:'Estancias del Pilar', fex: _rtIso(d) });
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate()+7);
      }
      D.pedidos = ps;
      _rtRangoN = -1;                      /* que recalcule el rango memoizado */
      _rtPer = null; _rtAbierto = false;
      try { localStorage.removeItem('maleu_rt_per'); } catch(e){}
      go('inicio'); rRetail();
      var box = document.getElementById('hRetail');
      return { hay: !!(box && box.innerHTML),
               chips: box ? box.querySelectorAll('.rt-per .rt-chip').length : 0,
               flechas: box ? box.querySelectorAll('.rt-nav-b').length : 0,
               rango: _rtRangoDatos(),
               meses: _rtMesesConDatos() };
    })()`);
    chk('el Resumen dibuja con los pedidos puestos a mano', !!(pintado && pintado.hay), pintado);
    chk('estan los 4 atajos + "Elegir…"', pintado && pintado.chips === 5, pintado && pintado.chips);
    chk('y las dos flechas', pintado && pintado.flechas === 2, pintado && pintado.flechas);
    chk('el rango de datos sale de los pedidos, no de una constante',
      pintado && pintado.rango && pintado.rango.min === '2026-06-01', pintado && pintado.rango);
    chk('el selector ofrece los 4 meses que tienen ventas, del mas nuevo al mas viejo',
      pintado && Array.isArray(pintado.meses) && pintado.meses.join(',') === '2026-09,2026-08,2026-07,2026-06',
      pintado && pintado.meses);

    /* Y cuando llega un volcado nuevo, el rango tiene que SEGUIRLO. Esta guardado
       en memoria para no recorrer miles de pedidos en cada repintado; si el
       guardado se quedara pegado, las flechas se apagarian donde no va y el
       selector ofreceria meses que ya no estan. Lo agarro el reinyector: sin
       este caso, cachear mal daba verde igual. */
    const refresco = await evaluar(cli, `(function(){
      var guardo = D.pedidos;
      D.pedidos = [{ h:'Home', es:'Entregado', c:'Cliente Prueba', $:9000, co:5000,
                     bar:'Estancias del Pilar', fex:'2026-02-10' },
                   { h:'Home', es:'Entregado', c:'Cliente Prueba', $:9000, co:5000,
                     bar:'Estancias del Pilar', fex:'2026-04-10' }];
      var r = { rango: _rtRangoDatos(), meses: _rtMesesConDatos() };
      D.pedidos = guardo;        /* los de junio-septiembre, que usan los casos de abajo */
      _rtRangoDatos();           /* y que el rango vuelva a ser el de ellos */
      return r;
    })()`);
    chk('si llega un volcado con otra historia, el rango la sigue',
      refresco && refresco.rango && refresco.rango.min === '2026-02-10' && refresco.rango.max === '2026-04-10',
      refresco && refresco.rango);
    chk('y el selector ofrece los meses nuevos, no los de antes',
      refresco && refresco.meses.join(',') === '2026-04,2026-03,2026-02', refresco && refresco.meses);

    /* La flecha hacia atras tiene que apagarse cuando ya no hay mas historia:
       una flecha que lleva a una pantalla vacia es peor que una que no esta. */
    const bordes = await evaluar(cli, `(function(){
      function estado(k){
        _rtPer = k; rRetail();
        var b = document.querySelectorAll('#hRetail .rt-nav-b');
        return { atras: !b[0].disabled, adelante: !b[1].disabled };
      }
      return { viejo: estado('m:2026-06'), medio: estado('m:2026-07'), hoy: estado('sem') };
    })()`);
    chk('en el mes mas viejo la flecha de atras se apaga',
      bordes && bordes.viejo.atras === false && bordes.viejo.adelante === true, bordes && bordes.viejo);
    chk('en el medio andan las dos', bordes && bordes.medio.atras === true && bordes.medio.adelante === true, bordes && bordes.medio);
    chk('en la semana en curso la de adelante se apaga (no hay futuro)',
      bordes && bordes.hoy.adelante === false, bordes && bordes.hoy);

    /* El panel: elegir un mes tiene que cambiar las semanas que ofrece. */
    const panel = await evaluar(cli, `(function(){
      _rtPer = 'm:2026-07'; _rtAbierto = true; rRetail();
      var sems = [].map.call(document.querySelectorAll('#hRetail .rt-eleg-f:nth-child(2) .rt-chip'), function(b){ return b.textContent; });
      var lbl = (document.querySelector('#hRetail .rt-eleg-f:nth-child(2) .rt-eleg-l')||{}).textContent || '';
      /* y elegir una de esas semanas cambia el titulo de arriba */
      rtPer('w:2026-28');
      var tit = (document.querySelector('#hRetail .rt-sub')||{}).textContent || '';
      var pdf = !!document.querySelector('#hRetail .rt-pdf');
      return { sems: sems, lbl: lbl, tit: tit, pdf: pdf, abierto: !!document.querySelector('#hRetail .rt-eleg') };
    })()`);
    chk('el panel ofrece las semanas del mes que se esta mirando',
      panel && /julio/i.test(panel.lbl) && panel.sems.length >= 4, panel);
    chk('elegir una semana cambia el titulo a esa semana', panel && /Semana 28/.test(panel.tit), panel && panel.tit);
    /* El PDF es de una semana: antes miraba la clave del atajo y una semana
       elegida a mano se quedaba sin el. */
    chk('una semana elegida a mano tambien ofrece el PDF', panel && panel.pdf === true, panel);
    chk('el panel no se cierra solo al elegir (asi se sigue navegando)', panel && panel.abierto === true, panel);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
