/* Tendencia › Casas nuevas (21/10/2026).

   node probar_tend_casas.js <ventas.json> [390|1440]     (BASE=http://127.0.0.1:<puerto>)

   <ventas.json> = la respuesta de ?action=ventas (al scratchpad: tiene nombres y
   telefonos). Corre el ERP con ?prueba=1, mete esas ventas en VD y dibuja la metrica.

   Lo que se sostiene, contra un conteo hecho APARTE en node con la regla escrita:
     · una casa = un telefono (los ultimos 10 digitos); sin telefono, el nombre;
     · en Red, un telefono con dos o mas nombres es del representante: va el nombre;
     · cada casa cuenta UNA vez, en el periodo de su primera compra, en toda la
       historia y todos los canales;
     · por mes con «Todos»: la tabla dice lo mismo que el conteo aparte, mes por mes;
     · filtrar Home cuenta solo las casas cuya primera compra fue en Home;
     · es un grafico de lineas, y no hay scroll horizontal. */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const VENTAS = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ANCHO = Number(process.argv[3]) || 390;
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + (process.env.APP || 'app.html') + '?prueba=1';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 600) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

/* El conteo aparte: la regla, escrita de nuevo y sin mirar el panel. */
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const tel = (t) => { const d = String(t || '').replace(/[^0-9]/g, ''); return d.length >= 8 ? d.slice(-10) : ''; };
const nom = (c) => String(c || '').toLowerCase().replace(/\s*\(.*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const fecha = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || '')); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
const vivas = VENTAS.v.filter((v) => v.ep !== 'Cancelado' && fecha(v.fecha));
const esRed = (v) => /red/i.test(String(v.h || v.canal || ''));
const nomsRed = {};
vivas.forEach((v) => { const t = tel(v.tel); if (t && esRed(v)) (nomsRed[t] = nomsRed[t] || new Set()).add(nom(v.cliente)); });
const clave = (v) => { const t = tel(v.tel); if (t && !(esRed(v) && nomsRed[t].size > 1)) return 't:' + t; const n = nom(v.cliente); return n ? 'n:' + n : ''; };
const primera = {};
vivas.map((v, i) => ({ v, i, t: fecha(v.fecha).getTime() })).sort((a, b) => a.t - b.t || a.i - b.i)
  .forEach(({ v }) => { const k = clave(v); if (k && !primera[k]) primera[k] = v; });
const porMes = (filtro) => { const o = {}; Object.values(primera).filter(filtro || (() => true)).forEach((v) => { const d = fecha(v.fecha); const k = MESES[d.getMonth()] + ' ' + d.getFullYear(); o[k] = (o[k] || 0) + 1; }); return o; };
const total = Object.keys(primera).length;
const compartidos = Object.keys(nomsRed).filter((t) => nomsRed[t].size > 1).length;
console.log('  ventas vivas ' + vivas.length + ' · casas ' + total + ' · teléfonos de Red compartidos (representantes) ' + compartidos);

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 1000, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__maleuAuth=true;window.__errores=[];window.addEventListener("error",function(e){window.__errores.push(String(e.message));});' });
    await cli.enviar('Page.navigate', { url: BASE });
    for (let i = 0; i < 80 && !(await evaluar(cli, 'typeof rTendencia==="function"&&typeof vSwitchTab==="function"&&document.readyState==="complete"')); i++) await pausa(250);
    await evaluar(cli, `VD=${JSON.stringify(VENTAS.v)}; go('ventas'); vSwitchTab('tendencia'); true`);
    await pausa(600);
    const tabla = async (dow, sub) => evaluar(cli, `(function(){
      var m=document.getElementById('vtMetric');m.value='casas';
      document.getElementById('vtDow').value='${dow}';document.getElementById('vtWindow').value='0';
      var s=document.getElementById('vtSubcanal');s.value='${sub}';rTendencia();
      var h=[].map.call(document.querySelectorAll('#vtTable .row.h > div'),function(x){return x.textContent;});
      var f=[].map.call(document.querySelectorAll('#vtTable .row:not(.h)'),function(r){var c=r.children;return [c[0].textContent,Number(c[1].textContent)];});
      var svg=document.querySelector('#vtChart svg');
      return {h:h,f:f,lineas:svg?svg.querySelectorAll('path,polyline').length:0,barras:svg?svg.querySelectorAll('rect.bar,rect[data-bar]').length:0,pie:(document.querySelector('#vtChart .vt-pie')||{}).textContent||''};
    })()`);

    console.log('\n== Por mes, todos los canales ==');
    let t = await tabla('month', '__all');
    const esperado = porMes();
    const enTabla = Object.fromEntries(t.f.map(([k, n]) => [k.replace(/\s+/g, ' ').trim(), n]));
    const claves = Object.keys(esperado);
    const difs = claves.filter((k) => { const kk = Object.keys(enTabla).find((x) => x.toLowerCase().startsWith(k.toLowerCase().split(' ')[0].slice(0, 3)) && x.includes(k.split(' ')[1].slice(-2))) || Object.keys(enTabla).find((x) => x.toLowerCase().includes(k.split(' ')[0].toLowerCase())); return !kk || enTabla[kk] !== esperado[k]; });
    console.log('     tabla: ' + JSON.stringify(t.f));
    console.log('     aparte: ' + JSON.stringify(esperado));
    chk('la tabla dice «Casas nuevas»', t.h[1] === 'Casas nuevas', t.h);
    chk('mes por mes, lo mismo que el conteo aparte', difs.length === 0 && t.f.length === claves.length, difs);
    chk('la suma de todos los meses = todas las casas (' + total + '): cada casa cuenta una vez', t.f.reduce((a, [, n]) => a + n, 0) === total, t.f.reduce((a, [, n]) => a + n, 0));
    chk('es un gráfico de líneas', t.lineas > 0, t);
    chk('el pie explica la regla (teléfono, Red por el nombre)', /teléfono identifica la casa/.test(t.pie) && /Red/.test(t.pie), t.pie.slice(0, 200));

    console.log('\n== Solo Home ==');
    t = await tabla('month', 'Home');
    /* El canal lo dice la regla del panel (_tendSubcanal), la misma del filtro: lo
       que se prueba aca es que cuente las PRIMERAS compras, no que regla de canal usa. */
    const idxPrim = Object.values(primera).map((v) => VENTAS.v.indexOf(v));
    const espH = await evaluar(cli, `${JSON.stringify(idxPrim)}.filter(function(i){return _tendSubcanal(VD[i])==='Home';}).length`);
    console.log('     tabla Home: ' + JSON.stringify(t.f));
    chk('filtrando Home: las casas cuya primera compra fue en Home (' + espH + ')', t.f.reduce((a, [, n]) => a + n, 0) === espH, [t.f.reduce((a, [, n]) => a + n, 0), espH]);

    console.log('\n== Por semana ==');
    t = await tabla('week', '__all');
    chk('por semana suma lo mismo', t.f.reduce((a, [, n]) => a + n, 0) === total, t.f.length);
    console.log('     últimas 6 semanas: ' + JSON.stringify(t.f.slice(0, 6)));

    const errs = await evaluar(cli, 'window.__errores');
    chk('sin errores en la consola', errs.length === 0, errs);
    chk('sin scroll horizontal a ' + ANCHO + 'px', await evaluar(cli, 'document.documentElement.scrollWidth<=window.innerWidth'));
    await evaluar(cli, `document.getElementById('vtWindow').value='12';rTendencia();window.scrollTo(0,0);true`);
    await pausa(400);
    const shot = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(require('os').tmpdir() + '/tend_casas_' + ANCHO + '.png', Buffer.from(shot.data, 'base64'));
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('REVENTO', e.message); process.exit(2); });
