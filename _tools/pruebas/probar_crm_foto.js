/* La foto del CRM no puede volver atras lo que ya se ve (4/10/2026).

   Con la foto REAL de `erp_screen_snapshot` (screen=crmClientes) y el ERP local:
     1. con una copia en el celular MAS NUEVA que la foto → no pinta («mas vieja»);
     2. con una edicion hecha aca despues de la foto → no pinta;
     3. sin copia → pinta, o Google llega antes; nunca otra cosa;
     4. el ↻ (crmCliReintentar) NUNCA pasa por la foto.
   Se lee `window.__fotoCrm`, que dice por que se uso o no.

     TOKEN=... BASE=http://localhost:8095 node probar_crm_foto.js */
'use strict';
const T = 'C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(T + 'cdp.js');
const prep = require(T + 'sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

async function abrirCrm(lsExtra) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(process.env.TOKEN) + ';' + (lsExtra || '') });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  await pausa(16000);   // el permiso de Supabase (en el uso real ya esta guardado)
  await evaluar(cli, 'go("estancias"); estSwitch("clientes"); 1');
  for (let i = 0; i < 100; i++) { if (await evaluar(cli, '!!window.__fotoCrm')) break; await pausa(200); }
  return cli;
}
const nota = cli => evaluar(cli, 'window.__fotoCrm||null');

(async () => {
  const futuro = Date.now() + 3600000;
  console.log('\n== La foto del CRM: cuando NO tiene que pintar ==\n');

  let cli = await abrirCrm(`try{localStorage.setItem('maleu_crm_clientes_ts','${futuro}');}catch(e){}`);
  let n = await nota(cli);
  chk('copia del celular más nueva que la foto: no pinta', !!n && n.estado === 'mas vieja', n);
  cli.matar();

  cli = await abrirCrm(`try{localStorage.removeItem('maleu_crm_clientes_ts');localStorage.setItem('maleu_crm_cambio_ts','${futuro}');}catch(e){}`);
  n = await nota(cli);
  chk('una edición hecha acá después de la foto: no pinta', !!n && n.estado === 'mas vieja', n);
  cli.matar();

  cli = await abrirCrm(`try{localStorage.removeItem('maleu_crm_clientes_v1');localStorage.removeItem('maleu_crm_clientes_ts');localStorage.removeItem('maleu_crm_cambio_ts');}catch(e){}`);
  n = await nota(cli);
  chk('sin copia: pinta la foto (o Google llegó antes)', !!n && (n.estado === 'ok' || n.estado === 'Google llego antes'), n);
  const hay = await evaluar(cli, '(window.estClientesSync()||[]).length');
  chk('y hay clientes en pantalla', hay > 100, hay);
  const antes = n && n.t;
  await evaluar(cli, 'crmCliReintentar(); 1'); await pausa(8000);
  const despues = (await nota(cli) || {}).t;
  chk('el ↻ no vuelve a pasar por la foto', antes === despues, { antes, despues });
  const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
  chk('sin errores de consola', err === '[]', err);
  cli.matar();

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
