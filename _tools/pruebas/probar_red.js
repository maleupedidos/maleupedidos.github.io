/* Ventas > RED con los pedidos REALES del volcado, contra la planilla que Tadeo
   le armo a Joaco el 14/9/2026 — que es el control independiente: otra cuenta,
   hecha aparte, sobre los mismos hechos. */
'use strict';
const fs = require('fs');
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const S = 'C:/Users/tadeu/AppData/Local/Temp/claude/c--Tadeo-Ustariz-Trabajo-Grupo-Matriz-Maleu/6cacc9b9-db90-43db-9fee-739798f58a0d/scratchpad/';
const adm = JSON.parse(fs.readFileSync(S + 'admin.json', 'utf8'));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 260) : '')); } };

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html?prueba=1' });
    for (let i = 0; i < 90; i++) { try { if (await evaluar(cli, `typeof rRed==='function'`)) break; } catch (e) {} await pausa(250); }
    await pausa(700);
    console.log('\n== Ventas > RED ==');

    /* Le doy el volcado real y le pido TODO el año, que es el rango de la planilla. */
    await evaluar(cli, `window.D={stock:[],ventasExtra:[],pedidos:${JSON.stringify(adm.pedidos)}}; RED_PER='anio'; 1`);
    await evaluar(cli, `go('ventas'); vSwitchTab('red'); 1`);
    await pausa(900);

    const d = await evaluar(cli, `(function(){
      var x=_redDatos();
      var out={entregas:x.entregas, total:x.total, v:{}};
      Object.keys(x.porV).forEach(function(k){
        var e=x.porV[k];
        out.v[k.split(' ')[0]]={ped:e.ped, cli:Object.keys(e.cli).length, sub:Math.round(e.sub),
                                mal:Math.round(e.mal), env:e.env, bolsas:Object.keys(e.bolsas).length,
                                gano:Math.round((e.sub-e.mal)+e.env)};
      });
      return out;
    })()`);
    console.log('  ' + JSON.stringify(d.v));

    /* La planilla, al 14/9/2026. El ERP tiene pedidos posteriores, asi que los
       numeros del ERP tienen que ser MAYORES O IGUALES, nunca menores. */
    const PLAN = { Marcos: { ped: 69, cli: 25, sub: 6667100 }, Fini: { ped: 10, cli: 6, sub: 858700 }, Rufino: { ped: 21, cli: 13, sub: 1530300 } };
    Object.keys(PLAN).forEach(n => {
      const e = d.v[n], p = PLAN[n];
      chk(n + ': pedidos ≥ los ' + p.ped + ' de la planilla', !!e && e.ped >= p.ped, e);
      chk('   clientes ≥ ' + p.cli, !!e && e.cli >= p.cli, e);
      chk('   vendió ≥ $' + p.sub.toLocaleString('es-AR'), !!e && e.sub >= p.sub, e);
    });

    /* La cuenta que sostiene todo: lo que le queda a Maleu es el 83%. */
    const t = d.total;
    const esperado = Math.round(t.sub * 0.83);
    chk('lo que le queda a Maleu es el 83% de lo vendido', Math.abs(t.mal - esperado) / Math.max(1, esperado) < 0.02,
        { vendio: t.sub, maleu: t.mal, esperado: esperado });
    chk('las entregas (bolsas) son MENOS que los pedidos', d.entregas < t.ped, { entregas: d.entregas, pedidos: t.ped });

    const vista = await evaluar(cli, `(function(){
      var b=document.getElementById('vRed');
      return {txt:(b.innerText||'').slice(0,300),
              filas:b.querySelectorAll('.red-tabla tbody tr').length,
              lineas:b.querySelectorAll('.red-graf svg polyline').length,
              kpis:b.querySelectorAll('.cmp-kpis .cmp-k').length,
              det:b.querySelectorAll('.red-det').length};
    })()`);
    chk('una fila por vendedor', vista.filas === 3, vista);
    chk('el gráfico es de LÍNEAS, una por vendedor', vista.lineas === 3, { lineas: vista.lineas });
    chk('los 6 indicadores de arriba', vista.kpis === 6, { kpis: vista.kpis });
    chk('el detalle plegable de cada uno', vista.det === 3, { det: vista.det });

    await evaluar(cli, `redVer(0); 1`); await pausa(250);
    const ab = await evaluar(cli, `(document.getElementById('redv-0')||{style:{}}).style.display!=='none'`);
    chk('se abre el detalle al tocarlo', ab === true, { abierto: ab });

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
