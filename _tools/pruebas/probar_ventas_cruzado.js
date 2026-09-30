#!/usr/bin/env node
/* LAS DOS LISTAS DE VENTAS TIENEN QUE DAR LO MISMO.
   (29/9/2026)

   ── Por que existe ──
   `_sbVentas` arma desde Supabase la misma lista que `action=ventas` arma
   leyendo seis hojas. Es una SEGUNDA implementacion de reglas que ya viven en
   `_doGetVentas`, y en este ERP eso siempre salio caro: cuando dos programas
   calculan lo mismo, tarde o temprano dicen numeros distintos y gana el que
   escribio ultimo.

   Se acepta la duplicacion por una sola razon —el atajo baja la tab Inicio de
   6,9 s a menos de uno— y con una sola condicion: que NO se encienda por
   confianza sino por comparacion. Esto es esa comparacion.

   ── Como se usa ──
     node probar_ventas_cruzado.js

   El token de sesion lo consigue solo, llamando a `token_sesion.py`, que lo
   saca de la hoja `Sesiones` y lo pasa por una tuberia. **No se imprime en
   ningun momento**: un token de sesion es una llave, y no tiene por que quedar
   en el historial de la terminal. Si hace falta uno a mano:
   `SESION=<token> node probar_ventas_cruzado.js`.

   ── Lo que NO prueba ──
   Que los dos sean CORRECTOS. Prueba que digan lo mismo. Si `_doGetVentas`
   tuviera un error, este test lo bendeciria: por eso el que manda sigue
   siendo Apps Script y el atajo solo adelanta.

   ── Cuando corre ──
   Despues de publicar el backend Y de que la replica se haya puesto al dia
   (~75 min: son ~1.320 ventas de a 90 cada 5 minutos). Antes de eso da rojos
   que no son del codigo sino de que la base todavia no tiene los datos: el
   test lo dice en vez de dejar que parezca un bug. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = process.env.APP || path.join(__dirname, '..', '..', 'app.html');
const src = fs.readFileSync(APP, 'utf8');

let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         -> ' + JSON.stringify(d).slice(0, 400) : '')); }
};

/* EL BLOQUE ENTERO, no una lista de funciones.

   Los tests que sacan funciones por nombre revientan con ReferenceError el dia
   que una gana un helper nuevo, y frenan el deploy por algo que no es un bug
   (paso el 14/9/2026 con dos tests a la vez). Sacando el bloque completo —de
   `_sbVenta$` hasta el final de `_sbVentas`— cualquier helper que se agregue
   adentro viene solo. */
const DESDE = 'function _sbVenta$(';
const HASTA = '/* ══ LAS ORDENES DE COMPRA';
const i = src.indexOf(DESDE), j = src.indexOf(HASTA, i);
if (i < 0 || j < 0) {
  console.error('No encontré el bloque de _sbVentas en ' + APP);
  console.error('Si lo renombraron, actualizá DESDE/HASTA en este archivo.');
  process.exit(1);
}
const bloque = src.slice(i, j);

const sandbox = { fetch: globalThis.fetch, console, Promise, Number, String, Array, Math, JSON };
vm.createContext(sandbox);
try { vm.runInContext(bloque, sandbox); }
catch (e) { console.error('el bloque no corre solo: ' + e.message); process.exit(1); }

const API = (/var API='([^']+)'/.exec(src) || [])[1];
const SESION = process.env.SESION || '';

/* Las credenciales de Supabase no se escriben acá: salen del mismo lugar que
   las usa todo lo demás, el archivo fuera del repo. Este repo es público. */
function sbCfg() {
  const B = String.fromCharCode(92);
  const env = 'C:' + B + 'Users' + B + 'tadeu' + B + '.maleu' + B + 'supabase.env';
  const cfg = {};
  fs.readFileSync(env, 'utf8').split(/\r?\n/).forEach((l) => {
    const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
    if (m) cfg[m[1]] = m[2];
  });
  return { url: cfg.SUPABASE_URL.replace(/\/$/, ''), key: cfg.SUPABASE_SECRET_KEY };
}

(async function () {
  console.log('\n== Las dos listas de ventas ==\n');

  let token = SESION;
  if (!token) {
    /* Se captura de la tuberia, no de la pantalla: el script lo escribe en
       stdout y todo lo legible en stderr, justamente para esto. */
    try {
      token = require('child_process').execFileSync(
        'python', [path.join(__dirname, 'token_sesion.py')],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
    } catch (e) { token = ''; }
  }
  if (!token) {
    console.log('  Sin token de sesión no puedo pedirle `ventas` al backend.');
    console.log('  Entrá al ERP con tu usuario y PIN, y volvé a correr esto.');
    process.exit(2);
  }

  // ── 1. La lista de Apps Script, que es la que manda ──────────────────────
  /* Por QUERY y no por header: el backend lo lee de `e.parameter.token`
     (`_chequearAuth(action, e.parameter.token, 'GET')`). Mandarlo en un header
     daria `authRequired` y se leeria como "el token vencio". */
  const t0 = Date.now();
  const rG = await fetch(API + '?action=ventas&token=' + encodeURIComponent(token)
    + '&t=' + Date.now());
  const dG = await rG.json();
  const msG = Date.now() - t0;
  if (!dG || !Array.isArray(dG.v)) {
    console.log('  MAL  Apps Script no devolvió ventas -> ' + JSON.stringify(dG).slice(0, 200));
    console.log('  (si dice authRequired, el token venció: sacá uno nuevo)');
    process.exit(1);
  }
  console.log('  Apps Script: ' + dG.v.length + ' ventas en ' + (msG / 1000).toFixed(1) + ' s');

  // ── 2. La lista del atajo ────────────────────────────────────────────────
  const cfg = sbCfg();
  sandbox._sbPermiso = () => Promise.resolve({ url: cfg.url, key: cfg.key, token: cfg.key });
  const t1 = Date.now();
  const vS = await sandbox._sbVentas();
  const msS = Date.now() - t1;
  if (!Array.isArray(vS)) {
    console.log('  MAL  el atajo devolvió null (¿Supabase caído, o el select pide una columna que no existe?)');
    process.exit(1);
  }
  console.log('  Supabase:    ' + vS.length + ' ventas en ' + (msS / 1000).toFixed(1) + ' s');
  console.log('  → ' + (msG / Math.max(msS, 1)).toFixed(1) + '× más rápido\n');

  // ── 3. Comparar ──────────────────────────────────────────────────────────
  chk('la misma cantidad de ventas', dG.v.length === vS.length,
    { appsScript: dG.v.length, supabase: vS.length });

  const suma = (l, c) => l.reduce((a, v) => a + (Number(v[c]) || 0), 0);
  ['$', 'costo', 'margen', 'ef', 'tr'].forEach((c) => {
    const a = Math.round(suma(dG.v, c)), b = Math.round(suma(vS, c));
    chk('el total de "' + c + '" coincide', a === b,
      { appsScript: a, supabase: b, difiere: a - b });
  });

  /* Por CANAL, porque un total que cierra puede esconder dos canales que se
     compensan — y la regla de Red es justo la que mas facil se rompe. */
  const porCanal = (l) => {
    const m = {};
    l.forEach((v) => {
      const k = (v.canal === 'Venta Directa' ? v.zona : v.canal) || '?';
      m[k] = m[k] || { n: 0, $: 0 };
      m[k].n++; m[k].$ += Number(v.$) || 0;
    });
    return m;
  };
  const cG = porCanal(dG.v), cS = porCanal(vS);
  Object.keys(cG).sort().forEach((k) => {
    const a = cG[k], b = cS[k] || { n: 0, $: 0 };
    chk('  ' + k + ': ' + a.n + ' ventas, $' + Math.round(a.$).toLocaleString('es-AR'),
      a.n === b.n && Math.round(a.$) === Math.round(b.$),
      { appsScript: { n: a.n, $: Math.round(a.$) }, supabase: { n: b.n, $: Math.round(b.$) } });
  });
  Object.keys(cS).forEach((k) => {
    if (!cG[k]) chk('  ' + k + ': el atajo lo trae y Apps Script no', false, cS[k]);
  });

  /* Venta por venta, por si los totales cierran de casualidad. */
  const clave = (v) => (v.canal || '') + '|' + (v.zona || '') + '|' + (v.n || '') + '|' + (v.cliente || '');
  const mG = {}; dG.v.forEach((v) => { mG[clave(v)] = v; });
  const CAMPOS = ['$', 'costo', 'margen', 'mes', 'sem', 'estado', 'fecha', 'fCob',
                  'ef', 'tr', 'pEf', 'pTr', 'fp', 'ep', 'dir', 'cta', 'he'];
  let distintas = [], faltantes = 0;
  vS.forEach((v) => {
    const g = mG[clave(v)];
    if (!g) { faltantes++; return; }
    const dif = CAMPOS.filter((c) => String(g[c] === undefined ? '' : g[c]) !== String(v[c] === undefined ? '' : v[c]));
    /* `campos` va COMPLETO —el recuento por campo de mas abajo lo necesita— y
       se recorta solo al mostrarlo. Cortarlo aca hacia que un campo roto a
       partir del septimo no apareciera nunca en el conteo. */
    if (dif.length) distintas.push({ venta: clave(v), campos: dif,
      ejemplo: dif[0] ? { campo: dif[0], appsScript: g[dif[0]], supabase: v[dif[0]] } : null });
  });
  /* UN CONTROL NO PUEDE DECIR QUE COINCIDE SOBRE LO QUE NO MIRO.

     Los dos asserts de abajo recorren la lista del ATAJO, asi que con el atajo
     vacio no encuentran ninguna venta distinta y dan verde — sobre cero
     comparaciones. Paso de verdad la primera vez que se corrio esto, antes de
     publicar el backend: 2 ok sobre una lista de 0 contra una de 1.294.
     Tienen TRES estados, no dos: coincide, difiere, y no pude mirar. */
  if (!vS.length) {
    chk('comparar venta por venta', false,
      'el atajo devolvió 0 ventas: no hay nada que comparar. ' +
      'Si el backend todavía no está publicado o la réplica no se puso al día, ' +
      'es esperable — pero NO es un verde.');
  } else {
    chk('toda venta del atajo existe en Apps Script (' + vS.length + ' miradas)',
      faltantes === 0, { sinPareja: faltantes });
    chk('y ninguna difiere campo por campo', distintas.length === 0,
      { cuantas: distintas.length, primeras: distintas.slice(0, 2).map(function(d){return {venta:d.venta,campos:d.campos.slice(0,6)};}) });
    /* EN QUE CAMPO difieren, y en cuantas ventas cada uno. "1295 distintas" no
       dice donde mirar; "estado: 1295 · sem: 412 · $: 3" apunta al mapeo que
       esta mal y separa lo sistematico (todas) de lo puntual (unas pocas). */
    if (distintas.length) {
      const porCampo = {}, muestra = {};
      distintas.forEach((d) => d.campos.forEach((c) => {
        porCampo[c] = (porCampo[c] || 0) + 1;
        if (!muestra[c]) { const g = mG[d.venta], v = vS.find((x) => clave(x) === d.venta);
          muestra[c] = { appsScript: g && g[c], supabase: v && v[c] }; }
      }));
      console.log('\n  en que campo difieren (de ' + vS.length + ' ventas):');
      Object.keys(porCampo).sort((a, b) => porCampo[b] - porCampo[a]).forEach((c) => {
        const m = muestra[c] || {};
        console.log('    ' + c.padEnd(7) + String(porCampo[c]).padStart(5) +
          '   ej: ' + JSON.stringify(m.appsScript) + ' vs ' + JSON.stringify(m.supabase));
      });
      console.log('\n  Un campo que difiere en TODAS es un mapeo mal traducido.');
      console.log('  Uno que difiere en pocas es un dato raro en esas filas.');
    }
  }

  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  if (mal) {
    console.log('\nSi recién publicaste el backend, esperá a que la réplica se ponga');
    console.log('al día (~75 min) antes de leer estos rojos como un bug del mapeo.');
  }
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('reventó: ' + (e && e.stack || e)); process.exit(1); });
