/* EL AVISO DE STOCK MOVIDO SIN REGISTRO, EN LA PANTALLA. (28/9/2026)

   Tadeo vio "54 franuis" en la tab Productos y supo que no eran. El Kardex
   decia 30 desde el 25/9 y ninguna pantalla comparaba los dos numeros.

   El backend ya los compara (`probar_stock_sin_registro.js`, 23 ok). Esto
   prueba la otra mitad: que el resultado se VEA, y que diga los dos numeros —
   un "algo no cuadra" manda a buscar, y no se busca.

   Lo que tiene que ser cierto:
     · con un descuadre, el aviso aparece ARRIBA de los indicadores;
     · dice el producto y los DOS numeros, no solo que hay un problema;
     · con la hoja sana no aparece nada (un cartel que suena siempre se ignora);
     · un backend viejo que no manda el campo no dibuja nada ni revienta. */
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };

/* Un stock minimo pero con la forma real: la tabla necesita abbr, fisico,
   reservado, disponible y unidad para dibujarse. */
const STOCK = JSON.stringify([
  { n: 'Franui Leche', a: 'F', f: 54, r: 0, d: 54, p: 9000, co: 5350, i: 54, v: 0, c: 0, iv: 288900, u: 'u' },
  { n: 'Pack Muzzarella x2', a: 'PPM', f: 11, r: 0, d: 11, p: 17000, co: 9200, i: 11, v: 0, c: 0, iv: 101200, u: 'u' },
  { n: 'Carne Vacío', a: 'CVa', f: 14.256, r: 0, d: 14.256, p: 26000, co: 18200, i: 14.256, v: 0, c: 0, iv: 259459, u: 'kg' },
]);

const LEER = `(function(){
  var b=document.getElementById('sKpi');
  if(!b)return {hay:false};
  var c=b.querySelector('.st-sinreg');
  var kpi=b.querySelector('.card');
  var antes=false;
  if(c&&kpi&&c.compareDocumentPosition){
    antes=!!(c.compareDocumentPosition(kpi)&4);   /* el KPI viene DESPUES */
  }
  return {hay:!!c, txt:c?(c.innerText||''):'', filas:c?c.querySelectorAll('.st-sinreg-l').length:0, antesDeLosKpis:antes};
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html?prueba=1' });
    for (let i = 0; i < 90; i++) { try { if (await evaluar(cli, `typeof rStock==='function'`)) break; } catch (e) {} await pausa(250); }
    await pausa(700);

    /* ── 1. EL CASO REAL ── */
    console.log('\n== El caso de las Franui ==');
    await evaluar(cli, `window.D={stock:${STOCK},stockDeps:[],stockTs:Date.now(),
      stockSinReg:{ok:true,total:1,saltos:[],cola:[{a:'F',n:'Franui Leche',delta:24,kardex:30,hoja:54,f:'25/09/2026'}]}};
      go('stock'); if(typeof stSubTab==='function')stSubTab('productos'); rStock(); 1`);
    await pausa(500);

    const v = await evaluar(cli, LEER);
    chk('el aviso aparece', v.hay === true, v);
    chk('nombra el producto', v.txt.indexOf('Franui') >= 0, v.txt.slice(0, 160));
    chk('dice los DOS numeros: lo que muestra la tabla y lo que dejo el Kardex',
        v.txt.indexOf('54') >= 0 && v.txt.indexOf('30') >= 0, v.txt.slice(0, 200));
    chk('y desde cuando', v.txt.indexOf('25/09/2026') >= 0, v.txt.slice(0, 220));
    chk('va ARRIBA de los indicadores, no perdido abajo', v.antesDeLosKpis === true, v);
    chk('dice que hacer, y que el conteo si queda anotado',
        v.txt.indexOf('CONTAR') >= 0, v.txt.slice(-160));

    /* ── 2. UN SALTO DEL MEDIO ── */
    console.log('\n== Un salto en el medio ==');
    await evaluar(cli, `D.stockSinReg={ok:true,total:1,cola:[],saltos:[{a:'PPM',n:'Pack Muzzarella x2',delta:15,desde:16,hasta:31,f:'25/09/2026 19:32'}]}; rStock(); 1`);
    await pausa(300);
    const v2 = await evaluar(cli, LEER);
    chk('tambien se ve', v2.hay === true, v2);
    chk('y dice entre que dos numeros se abrio',
        v2.txt.indexOf('16') >= 0 && v2.txt.indexOf('31') >= 0, v2.txt.slice(0, 200));

    /* Los kilos con coma, no con punto: "14.256" se lee catorce mil. */
    await evaluar(cli, `D.stockSinReg={ok:true,total:1,cola:[{a:'CVa',n:'Carne Vacío',delta:-4.904,kardex:19.16,hoja:14.256,f:'27/09/2026'}],saltos:[]}; rStock(); 1`);
    await pausa(300);
    const v3 = await evaluar(cli, LEER);
    chk('los kilos van con coma decimal', v3.txt.indexOf('14,256') >= 0, v3.txt.slice(0, 200));

    /* ── 3. CON LA HOJA SANA, SILENCIO ── */
    console.log('\n== Sin descuadres ==');
    await evaluar(cli, `D.stockSinReg={ok:true,total:0,saltos:[],cola:[]}; rStock(); 1`);
    await pausa(300);
    const v4 = await evaluar(cli, LEER);
    chk('no dibuja nada: un cartel que suena siempre se ignora', v4.hay === false, v4);

    /* ── 4. UN BACKEND VIEJO NO ROMPE NADA ── */
    await evaluar(cli, `delete D.stockSinReg; rStock(); 1`);
    await pausa(300);
    const v5 = await evaluar(cli, LEER);
    chk('sin el campo (backend anterior) tampoco dibuja', v5.hay === false, v5);
    chk('y la tabla de stock sigue en pie',
        await evaluar(cli, `!!document.querySelector('#sList .st-tabla, #sList .si')`) === true);

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
