/* Ventas → 📈 COMPARAR: dos períodos, y POR QUÉ cambió.

     node probar_comparar.js
     APP=app_viejo_tmp.html node probar_comparar.js   ← la contraria

   Tadeo, 20/9/2026: *"tuve casi las mismas ventas entre esta semana y la
   anterior pero en la anterior me fue muuucho mejor"*.

   La pieza que contesta eso es la descomposición:

       facturado = entregas × ticket
       efecto entregas = (Ea − Eb) × Tb
       efecto ticket   = (Ta − Tb) × Ea

   Lo que este test sostiene, y es lo único que la hace confiable:
   · las dos partes suman EXACTAMENTE la diferencia, sin resto;
   · y eso vale en los cuatro casos que importan — subió por volumen, subió por
     ticket, bajó por volumen, bajó por ticket— y también cuando uno de los dos
     períodos está vacío (dividir por cero es justo donde esto se rompe);
   · los números salen del MISMO motor que Resumen, así que las dos pantallas no
     pueden decir cosas distintas de lo mismo;
   · las fechas a medida se escriben dd/mm/aaaa y una inválida avisa, no rompe.

   Los datos son inventados: este repo es público. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 300) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};

const HOY = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
/* Lunes de esta semana y de la anterior: los dos períodos que compara 'sem'. */
const LUN = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() - ((HOY.getDay() + 6) % 7));
const diaA = n => iso(new Date(LUN.getFullYear(), LUN.getMonth(), LUN.getDate() + n));
const diaB = n => iso(new Date(LUN.getFullYear(), LUN.getMonth(), LUN.getDate() - 7 + n));

const ped = (o) => Object.assign({
  h: 'Home', c: 'Casa Prueba', bar: 'Estancias del Pilar', es: 'Entregado', co: 0
}, o);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    console.log('\n== Ventas > Comparar · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof _cmpDesc==='function'&&typeof rComparar==='function'`, 60000)) {
      console.log('  la sub-tab Comparar no existe en este app.html'); salir(1);
    }
    await pausa(600);

    /* ── 1. LA CUENTA: las dos partes suman la diferencia, siempre ────── */
    const casos = [
      { n: 'subió por volumen',  a: { f: 200000, ent: 10 }, b: { f: 100000, ent: 5 } },
      { n: 'subió por ticket',   a: { f: 200000, ent: 5 },  b: { f: 100000, ent: 5 } },
      { n: 'bajó por volumen',   a: { f: 100000, ent: 5 },  b: { f: 200000, ent: 10 } },
      { n: 'bajó por ticket',    a: { f: 100000, ent: 10 }, b: { f: 200000, ent: 10 } },
      { n: 'mezcla',             a: { f: 173000, ent: 7 },  b: { f: 241000, ent: 6 } },
      { n: 'el período B vacío', a: { f: 100000, ent: 4 },  b: { f: 0, ent: 0 } },
      { n: 'el período A vacío', a: { f: 0, ent: 0 },       b: { f: 100000, ent: 4 } }
    ];
    for (const c of casos) {
      const r = await evaluar(cli, `(function(){
        var x=_cmpDesc(${JSON.stringify(c.a)},${JSON.stringify(c.b)});
        return {d:x.d, suma:x.vol+x.tick, vol:x.vol, tick:x.tick};
      })()`);
      /* Tolerancia de un centavo: son flotantes, no una comparación exacta. */
      chk('las dos partes suman la diferencia — ' + c.n,
          Math.abs(r.suma - r.d) < 0.01, r);
    }

    /* ── 2. Contra el MISMO motor que Resumen ─────────────────────────── */
    const D = {
      stock: [], ventasExtra: [],
      pedidos: [
        /* Esta semana: 2 entregas, $300.000 → ticket 150.000 */
        ped({ n: '1', dee: diaA(1), fex: diaA(1), $: 200000, co: 120000 }),
        ped({ n: '2', dee: diaA(2), fex: diaA(2), $: 100000, co: 60000, c: 'Otra Casa' }),
        /* La anterior: 4 entregas, $300.000 → ticket 75.000.
           Mismo facturado, el doble de entregas: TODO el cambio es ticket. */
        ped({ n: '3', dee: diaB(1), fex: diaB(1), $: 75000, co: 45000, c: 'Casa A' }),
        ped({ n: '4', dee: diaB(2), fex: diaB(2), $: 75000, co: 45000, c: 'Casa B' }),
        ped({ n: '5', dee: diaB(3), fex: diaB(3), $: 75000, co: 45000, c: 'Casa C' }),
        ped({ n: '6', dee: diaB(4), fex: diaB(4), $: 75000, co: 45000, c: 'Casa D' })
      ]
    };
    await evaluar(cli, `window.D=${JSON.stringify(D)}; window.M6=null; CMP={modo:'sem',a:null,b:null}; 1`);
    const comp = await evaluar(cli, `(function(){
      var R=_cmpRangos(), A=_rtSumar(R.A.d,R.A.h), B=_rtSumar(R.B.d,R.B.h);
      return {a:{f:A.tot.f,ent:A.tot.ent}, b:{f:B.tot.f,ent:B.tot.ent}, x:_cmpDesc(A.tot,B.tot)};
    })()`);
    chk('lee los dos períodos con el motor de Resumen (2 y 4 entregas)',
        comp.a.ent === 2 && comp.b.ent === 4, comp);
    chk('   mismo facturado en los dos ($300.000)',
        comp.a.f === 300000 && comp.b.f === 300000, comp);
    chk('con el facturado igual, la diferencia total es 0', comp.x.d === 0, comp.x);
    chk('   pero NO dice "no pasó nada": el efecto ticket es +$150.000',
        Math.round(comp.x.tick) === 150000, comp.x);
    chk('   y el de entregas, −$150.000 (se compensan)',
        Math.round(comp.x.vol) === -150000, comp.x);

    /* ── 3. Lo que se ve ──────────────────────────────────────────────── */
    await evaluar(cli, `rComparar(); 1`);
    await pausa(400);
    const vista = await evaluar(cli, `(function(){
      var b=document.getElementById('vComparar'); if(!b)return null;
      var g=b.querySelector('.cmp-graf svg');
      var txts=g?[].map.call(g.querySelectorAll('text'),function(t){return t.textContent;}):[];
      return {txt:(b.innerText||b.textContent||''),
              porque:!!b.querySelector('.cmp-porque'),
              graf:b.querySelectorAll('.cmp-graf svg rect.cmp-b').length,
              /* Lo que el gráfico viejo NO hacía: escribir los números. Vivían
                 en un <title>, o sea en un tooltip que en el celular no existe.
                 [!] Las barras van DOBLES: esto viaja adentro de un template
                 literal, y ahí \\$ y \\d se comen la barra antes de salir —
                 la regex llegaba al navegador como /^$/ y /^Sd+$/. */
              rotulos:txts.filter(function(s){return /^\\$/.test(s);}).length,
              semanas:txts.filter(function(s){return /^S\\d+$/.test(s);}).length,
              vb:g?g.getAttribute('viewBox'):'',
              alto:g?(g.getAttribute('height')||''):'',
              canales:b.querySelectorAll('.cmp-c').length};
    })()`);
    chk('la pantalla arranca por "Por qué cambió"', vista.porque === true, vista && vista.txt.slice(0, 120));
    chk('   y nombra las dos causas', /entregas/i.test(vista.txt) && /ticket/i.test(vista.txt), vista.txt.slice(0, 400));
    chk('el gráfico dibuja 8 semanas', vista.graf === 8, { barras: vista.graf });
    chk('   y rotula las 8 con su número de semana', vista.semanas === 8, vista);
    /* Las dos semanas con datos tienen que traer su monto Y su ticket escritos:
       2 barras rotuladas + 2 puntos de ticket = 4 como piso. */
    chk('   los montos se ESCRIBEN, no viven en un tooltip', vista.rotulos >= 4, { rotulos: vista.rotulos });
    /* El bug de fondo del gráfico viejo: alto fijo + viewBox chico = dibujo de
       320px centrado en una caja de 1050. Sin `height`, el SVG usa todo el ancho. */
    chk('   y usa todo el ancho (sin alto fijo que lo encoja)', vista.alto === '', { viewBox: vista.vb, height: vista.alto });
    chk('muestra el desglose por canal', vista.canales >= 1, { canales: vista.canales });

    /* ── 4. Las fechas a medida: dd/mm/aaaa, y una mala avisa ─────────── */
    const fechas = await evaluar(cli, `[_cmpFecha('5/9/2026'), _cmpFecha('31/2/2026'), _cmpFecha('2026-09-05'), _cmpFecha('')]`);
    chk('dd/mm/aaaa se entiende', fechas[0] === '2026-09-05', fechas);
    chk('   el 31 de febrero no existe y se rechaza', fechas[1] === '', fechas);
    chk('   y el formato con guiones tampoco se acepta', fechas[2] === '', fechas);
    await evaluar(cli, `cmpModo('libre'); 1`);
    await pausa(300);
    await evaluar(cli, `(function(){
      document.getElementById('cmpAd').value='31/2/2026'; cmpLibre();
    })(); 1`);
    await pausa(300);
    const aviso = await evaluar(cli, `(document.getElementById('cmpAviso')||{textContent:''}).textContent`);
    chk('una fecha invalida avisa y no rompe la pantalla', /dd\/mm\/aaaa/.test(aviso || ''), aviso);

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
