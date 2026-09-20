/* Inicio > Resumen: qué cuenta como venta y de dónde salen los pendientes.

     node probar_resumen_retail.js
     APP=app_viejo_tmp.html node probar_resumen_retail.js   ← la contraria

   Tadeo, 19/9/2026: *"'Red $0 sin ventas en el período' y en realidad debería
   decir que nosotros ya entregamos el pedido al vendedor"* y *"no se sabe de
   dónde salen esos 6 pedidos"*.

   Medido ese día contra producción: de 103 pedidos de Red vivos, los 103 tenían
   la col BE "Entregado a Vendedor" marcada, y 3 seguían con la col L (la entrega
   del vendedor a SU cliente) en "Pendiente". Esos 3 figuraban a la vez como
   "Red $0" y como pendientes que inflaban la Proyección: mal contados dos veces.

   Sostiene:
   · una bolsa ya entregada al vendedor CUENTA como venta de Red aunque su
     estado siga en Pendiente;
   · y por lo tanto NO cuenta como pendiente (si no, se cuenta dos veces);
   · una entrega de Red se cuenta por bolsa (vendedor + día), no por pedido;
   · los otros canales siguen contando solo con "Entregado";
   · la Proyección dice de qué canal sale cada pedido pendiente;
   · el número de entregas sale grande al lado del nombre del canal.

   Los nombres son inventados a propósito: este repo es público. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};

/* Una semana fija, para que el test no cambie de resultado según el día en que
   se corra: se le pasa a rtPer('mes') con un D armado sobre el mes en curso. */
const HOY = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const diaDelMes = n => iso(new Date(HOY.getFullYear(), HOY.getMonth(), n));

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    console.log('\n== Inicio > Resumen · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof rRetail==='function'&&typeof _rtSumar==='function'`, 60000)) {
      console.log('  el ERP no arranco'); salir(1);
    }
    await pausa(800);

    /* D armado a mano. `ev` es la col BE "Entregado a Vendedor". */
    const D = {
      stock: [], ventasExtra: [],
      pedidos: [
        /* Red: bolsa ya entregada al vendedor, su col L todavia en Pendiente.
           Dos pedidos del MISMO vendedor el MISMO dia = UNA bolsa. */
        { n: '1', h: 'Red', c: 'Cliente Uno (Red: Vendedora Norte)', br: 'Vendedora Norte',
          dee: diaDelMes(3), es: 'Pendiente', ev: 'Entregado', $: 100000, co: 60000 },
        { n: '2', h: 'Red', c: 'Cliente Dos (Red: Vendedora Norte)', br: 'Vendedora Norte',
          dee: diaDelMes(3), es: 'Pendiente', ev: 'Entregado', $: 50000, co: 30000 },
        /* Red: otro vendedor, otra bolsa. */
        { n: '3', h: 'Red', c: 'Cliente Tres (Red: Vendedor Sur)', br: 'Vendedor Sur',
          dee: diaDelMes(4), es: 'Pendiente', ev: 'Entregado', $: 70000, co: 40000 },
        /* Red TODAVIA en el freezer: no se la dimos a nadie. Es pendiente. */
        { n: '4', h: 'Red', c: 'Cliente Cuatro (Red: Vendedor Sur)', br: 'Vendedor Sur',
          dee: diaDelMes(26), es: 'Pendiente', ev: '', $: 33000, co: 20000 },
        /* Home entregado y Home pendiente. */
        { n: '5', h: 'Home', c: 'Casa Entregada', bar: 'Estancias del Pilar',
          dee: diaDelMes(5), fex: diaDelMes(5), es: 'Entregado', $: 40000, co: 24000 },
        { n: '6', h: 'Home', c: 'Casa Pendiente', bar: 'Estancias del Pilar',
          dee: diaDelMes(27), es: 'Reservado', $: 25000, co: 15000 },
        /* Clubes: dos entregas, del MISMO club pero de grupos distintos. `gr`
           viene del backend (col K "Grupo"). La fila vieja de la planilla dice
           "Linea" sin tilde: el panel tiene que mostrarlas como el mismo equipo. */
        { n: '7', h: 'Clubes', c: 'Alguien (Club Del Norte)', br: 'Club Del Norte',
          gr: 'Plantel Superior Linea C',
          dee: diaDelMes(6), es: 'Entregado', $: 200000, co: 140000 },
        { n: '8', h: 'Clubes', c: 'Otra (Club Del Norte)', br: 'Club Del Norte',
          gr: 'Infantiles',
          dee: diaDelMes(7), es: 'Entregado', $: 125000, co: 90000 },
        /* Cancelado: no cuenta ni como venta ni como pendiente. */
        { n: '9', h: 'Red', c: 'Cliente Cinco (Red: Vendedor Sur)', br: 'Vendedor Sur',
          dee: diaDelMes(8), es: 'Cancelado', ev: 'Entregado', $: 999999, co: 1 }
      ]
    };
    await evaluar(cli, `window.D=${JSON.stringify(D)}; window.M6=null; 1`);
    await evaluar(cli, `rtPer('mes'); 1`);
    await pausa(500);

    const g = await evaluar(cli, `(function(){
      var P=_rtPeriodo('mes',new Date());
      var g=_rtSumar(P.d,P.h), cp=_rtComprometido(P,new Date());
      return {red:{f:g.red.f,ent:g.red.ent}, clubes:{f:g.clubes.f,ent:g.clubes.ent},
              home:{f:g.home.f,ent:g.home.ent}, tot:{f:g.tot.f,ent:g.tot.ent},
              cp:{ped:cp.ped,f:cp.f,det:cp.det}};
    })()`);

    /* 1) La bolsa ya entregada al vendedor ES venta de Red. */
    chk('Red cuenta lo ya entregado al vendedor (220.000, no 0)', g.red.f === 220000, g.red);
    chk('y lo cuenta por BOLSA: 2 entregas, no 3 pedidos', g.red.ent === 2, g.red);

    /* 2) Y entonces NO esta pendiente: el unico Red pendiente es el que sigue
          en el freezer. Mas la casa pendiente = 2. */
    chk('lo ya entregado al vendedor NO se cuenta dos veces', g.cp.ped === 2, g.cp);
    chk('el pendiente son $58.000 (la casa + la bolsa sin entregar)', g.cp.f === 58000, g.cp);

    /* 3) La proyeccion dice de que canal sale cada uno. */
    /* Con guardas: contra el código viejo `det` no existe, y sin esto el test
       explotaba en vez de dar rojo — un test que explota no dice nada. */
    const det = g.cp.det || {};
    chk('el pendiente dice de que canal sale', !!(det.Red && det.Domiciliario), det);
    chk('   1 Red y 1 Domiciliario', !!(det.Red && det.Domiciliario) && det.Red.n === 1 && det.Domiciliario.n === 1, det);

    /* 4) Los otros canales no cambiaron. */
    chk('Clubes sigue contando solo lo Entregado (325.000)', g.clubes.f === 325000, g.clubes);
    chk('   y son 2 entregas', g.clubes.ent === 2, g.clubes);
    /* 20/9/2026: adentro de un club, cada GRUPO se cuenta aparte. */
    const dc = await evaluar(cli, `(function(){var P=_rtPeriodo('mes',new Date());return _rtSumar(P.d,P.h).clubes.det;})()`);
    chk('Clubes separa por grupo, no solo por club',
        !!(dc && dc['Club Del Norte Línea C'] && dc['Club Del Norte Infantiles']), dc);
    chk('   y "Linea" sin tilde se muestra como "Línea"',
        !!(dc && dc['Club Del Norte Línea C'] === 1), dc);
    chk('Home cuenta solo lo Entregado (40.000)', g.home.f === 40000, g.home);
    chk('el cancelado no entra en ningun lado', g.tot.f === 585000, g.tot);

    /* 5) Lo que se ve en pantalla. */
    await evaluar(cli, `rRetail(); 1`);
    await pausa(400);
    const vista = await evaluar(cli, `(function(){
      var b=document.getElementById('hRetail'); if(!b)return null;
      var t=b.innerText||'';
      var ents=[].slice.call(b.querySelectorAll('.rt-ent b')).map(function(x){return x.textContent;});
      /* La fila de Red, no la tarjeta entera: "sin ventas en el período" sigue
         siendo correcto para B2B, que en este D no tiene nada. */
      /* textContent y no innerText: innerText devuelve '' en lo que no está
         pintado, y en el test la tab Inicio no es la activa. */
      var filaRed=null;
      [].slice.call(b.querySelectorAll('.rt-fila')).forEach(function(f){
        var n=f.querySelector('.rt-fila-n');
        /* Sin \\b: el textContent sale pegado ("Red2entregas") porque el número
           de entregas es un <span> hermano y la separación la da el flex gap.
           Con /^Red\\b/ no matcheaba nunca y el test parecía un bug del ERP. */
        if(n&&(n.textContent||'').trim().indexOf('Red')===0)filaRed=(f.textContent||'');
      });
      var cab=b.querySelector('.rt-hl'); cab=cab?(cab.textContent||''):'';
      return {txt:(t||b.textContent||''), ents:ents, red:filaRed, cab:cab,
              px:(function(){var e=b.querySelector('.rt-ent b');return e?getComputedStyle(e).fontSize:'';})()};
    })()`);
    chk('el numero de entregas sale como elemento propio', !!(vista && vista.ents.length >= 3), vista && vista.ents);
    chk('   y es grande (>=20px)', parseFloat(vista.px) >= 20, vista && vista.px);
    chk('encontre la fila de Red', !!vista.red, vista && vista.txt.slice(0, 200));
    chk('la fila de Red ya no dice "sin ventas en el periodo"',
        (vista.red || '').indexOf('sin ventas en el período') < 0, vista.red);
    chk('   y muestra sus $220.000', (vista.red || '').indexOf('220.000') >= 0, vista.red);
    /* 20/9/2026: el cartelito explicativo salió (Tadeo: "no hace falta aclarar
       esto, poco profesional"). Lo que queda es el dato: quién y cuántos. */
    chk('la fila de Red NO explica la regla, solo nombra a los vendedores',
        (vista.red || '').indexOf('bolsa que le dimos al vendedor') < 0
        && /Vendedora Norte/.test(vista.red || '') && /Vendedor Sur/.test(vista.red || ''), vista.red);
    chk('   y dice cuantos PEDIDOS cargo cada uno (Norte 2, Sur 1)',
        /Vendedora Norte 2/.test(vista.red || '') && /Vendedor Sur 1/.test(vista.red || ''), vista.red);
    chk('el parrafo de notas al pie ya no esta',
        vista.txt.indexOf('es asunto suyo') < 0 && vista.txt.indexOf('neta de su comisión') < 0, vista.txt.slice(-300));
    chk('de cuando son los numeros se dice arriba',
        /Lo entregado, por el día de entrega/.test(vista.cab || ''), vista.cab);
    /* Sin distinguir mayusculas: el CSS lo pinta "ENTREGAS RETAIL". */
    chk('el KPI dice "Entregas Retail"', /entregas retail/i.test(vista.txt), vista.txt.slice(0, 300));
    chk('cada canal muestra su ticket', (vista.red || '').indexOf('ticket') >= 0, vista.red);
    chk('la proyeccion nombra los canales', /Red/.test(vista.txt) && /Domiciliario/.test(vista.txt), vista.txt.slice(0, 300));

    /* 6) El bloque de la OC y la carne ya no esta en Resumen. */
    const semana = await evaluar(cli, `!!document.getElementById('hSemana')`);
    chk('el bloque de cierre de OC / carne no esta en Resumen', semana === false, { hSemana: semana });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
