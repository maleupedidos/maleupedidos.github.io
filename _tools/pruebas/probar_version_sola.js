/* La version nueva se aplica sola SOLO cuando nadie mira (6/11/2026).

   node probar_version_sola.js            (servidor local: node _tools/servir.js --port 8173)

   Se simula la visibilidad (document.visibilityState) y se reemplaza `_verActualizar` por un registro:
   la prueba NO recarga nada, mira si la app HUBIERA recargado. Casos:
   1. a la vista y en uso            → NO (solo el cartel)
   2. oculta, nada sin guardar       → SI
   3. oculta, un campo tipeado       → NO (el cartel espera el toque)
   4. vuelve tras 11 min, sin tocar  → SI
   5. vuelve tras 11 min y toca algo antes de que llegue el chequeo → NO
   6. vuelve tras 2 min              → NO */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8173';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const PREP = `
  window.__vis='visible';
  Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){return window.__vis;}});
  Object.defineProperty(document,'hidden',{configurable:true,get:function(){return window.__vis==='hidden';}});
  window.__ponerVis=function(v){ window.__vis=v; document.dispatchEvent(new Event('visibilitychange')); };
`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) { try { if (await evaluar(cli, `typeof _verSola==='function'&&typeof _aplicarVersionNueva==='function'`)) break; } catch (e) {} await pausa(200); }
    if (!await evaluar(cli, `typeof _verSola==='function'`)) { console.log('  el ERP no arranco o no tiene _verSola'); process.exit(1); }
    await evaluar(cli, `window.__recargas=[]; _verActualizar=function(v){ window.__recargas.push(v); }; 1`);
    const caso = async (nombre, js, espera) => {
      await evaluar(cli, `window.__recargas=[]; var b=document.getElementById('versionNueva'); if(b)b.remove(); _verVolvioHasta=0; _verOcultaDesde=0; window.__ponerVis('visible'); 1`);
      await evaluar(cli, js + '; 1');
      await pausa(150);
      const r = await evaluar(cli, `window.__recargas.length`);
      chk(nombre, (r > 0) === espera, { recargas: r });
    };
    const nueva = `_aplicarVersionNueva([{k:'panel',v:'maleu-panel-v999'}])`;
    await caso('1. a la vista y en uso: solo el cartel', nueva, false);
    chk('   el cartel aparecio', await evaluar(cli, `!!document.getElementById('versionNueva')`));
    await caso('2. oculta y sin nada sin guardar: se aplica sola', `window.__ponerVis('hidden'); ${nueva}`, true);
    await caso('2b. ya habia cartel y se va a otra app: se aplica sola', `${nueva}; window.__ponerVis('hidden')`, true);
    await caso('3. oculta con un campo tipeado: NO', `
      var f=document.createElement('div'); f.setAttribute('data-borrador','prueba'); f.id='__form';
      f.innerHTML='<input id="__campo" value=""><button>Guardar</button>'; document.body.appendChild(f);
      var i=document.getElementById('__campo'); i.focus(); i.dispatchEvent(new Event('focus')); i.value='algo tipeado'; i.dispatchEvent(new Event('input',{bubbles:true}));
      window.__ponerVis('hidden'); ${nueva}`, false);
    await evaluar(cli, `var f=document.getElementById('__form'); if(f)f.remove(); if(typeof _camposTocados!=='undefined')_camposTocados.length=0; document.activeElement&&document.activeElement.blur&&document.activeElement.blur(); 1`);
    chk('   sin el campo, ya no hay nada sin guardar', await evaluar(cli, `!_hayCambiosSinGuardar()`));
    await caso('4. vuelve tras 11 min y llega la version: se aplica sola', `window.__ponerVis('hidden'); window.__recargas=[]; _verOcultaDesde=Date.now()-11*60000; window.__ponerVis('visible'); ${nueva}`, true);
    await caso('5. vuelve tras 11 min pero toca antes: NO', `window.__ponerVis('hidden'); _verOcultaDesde=Date.now()-11*60000; window.__ponerVis('visible'); document.dispatchEvent(new Event('pointerdown')); ${nueva}`, false);
    await caso('7. en Ruta, oculta: NO (en reparto decide el cartel)', `var __c=cur; cur='ruta'; window.__ponerVis('hidden'); ${nueva}; cur=__c`, false);
    await caso('8. repartidor, vuelve tras 11 min: NO', `var __s=SESSION; SESSION={usuario:'x',rol:'repartidor'}; window.__ponerVis('hidden'); _verOcultaDesde=Date.now()-11*60000; window.__ponerVis('visible'); ${nueva}; SESSION=__s`, false);
    await caso('6. vuelve tras 2 min: NO', `window.__ponerVis('hidden'); _verOcultaDesde=Date.now()-2*60000; window.__ponerVis('visible'); window.__recargas=[]; ${nueva}`, false);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
