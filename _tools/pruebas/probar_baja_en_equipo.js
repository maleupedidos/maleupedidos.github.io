/* LA BAJA EN EMPRESA › EQUIPO, NO EN LIQUIDACIONES (26/11/2026, Tadeo).

   SBSES=<sesión admin de solo lectura> ANCHO=390|1440 PER="Rufino Ardanaz" node _tools/pruebas/probar_baja_en_equipo.js [base]

   Abre la ficha de la persona en Empresa › Equipo: tiene que estar «Dar de baja», y al tocarlo, el cuadro con lo pendiente
   (equipo_baja_pantalla, solo lectura). No se confirma nada (y la guarda corta cualquier escritura). Después abre la misma
   persona en Plata › Liquidaciones: ahí NO tiene que estar el botón, y el renglón a Equipo dice «la baja». */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8157';
const W = Number(process.env.ANCHO || 390), H = W > 800 ? 900 : 844, PER = process.env.PER || 'Rufino Ardanaz';
const pausa = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const cli = await abrir(); const ev = e => evaluar(cli, e); const out = {};
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W > 800 ? 1 : 2, mobile: W <= 800 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, 'tadeo') + ';window.confirm=function(){return false;};window.alert=function(){};' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 150; i++) { try { if (await ev(`typeof go==='function'&&typeof SESSION!=='undefined'&&!!SESSION`)) break; } catch (e) {} await pausa(200); }
    await pausa(2500);
    await ev(`orgPersonaIr(${JSON.stringify(PER)}); 1`);
    for (let i = 0; i < 40; i++) { try { if (await ev(`!!document.querySelector('#eqfIn .orgf-ps, #eqfIn .orgf-vacio')`)) break; } catch (e) {} await pausa(500); }
    await pausa(800);
    out.estado = await ev(`({org:!!(window.ORG&&ORG.d), pers:(window.ORG&&ORG.d&&ORG.d.personas||[]).length, eq:!!(window.EQ&&EQ.d), abierto:(window.EQ&&EQ.abierto)||null, modo:(window.EQ&&EQ.modo)||null, ficha:!!document.getElementById('eqFicha'), esDueno:(typeof _esDueno==='function'&&_esDueno()), usu:(window.SESSION||{}).usuario, eqf:((document.getElementById('eqfIn')||{}).innerText||'').slice(0,120)})`);
    out.equipo_boton = await ev(`[].some.call(document.querySelectorAll('#eqfIn .eqf-baja-b'),function(b){return b.offsetParent&&/Dar de baja/.test(b.textContent);})`);
    await ev(`(function(){var b=document.querySelector('#eqfIn .eqf-baja-b');if(b)b.click();return 1;})()`);
    for (let i = 0; i < 30; i++) { try { if (await ev(`!!document.querySelector('#eqfIn .eqf-pie .eqp')&&!document.querySelector('#eqfIn .eqf-pie .eq-sk')`)) break; } catch (e) {} await pausa(500); }
    out.equipo_cuadro = await ev(`((document.querySelector('#eqfIn .eqf-pie')||{}).innerText||'').replace(/\\s+/g,' ').slice(0,220)`);
    out.desborde_equipo = await ev(`document.documentElement.scrollWidth > window.innerWidth + 1`);
    await ev(`eqBajaCerrar(); eqCerrar(); 1`); await pausa(500);
    await ev(`eqIr(${JSON.stringify(PER)}); 1`);
    for (let i = 0; i < 40; i++) { try { if (await ev(`!!document.querySelector('#eqfIn .eqf-lnk-per')`)) break; } catch (e) {} await pausa(500); }
    await pausa(800);
    out.liq_boton = await ev(`!!document.querySelector('#eqfIn .eqf-baja-b')`);
    out.liq_renglon = await ev(`((document.querySelector('#eqfIn .eqf-lnk-per')||{}).innerText||'').replace(/\\s+/g,' ')`);
    out.bloqueados = await ev('(window.__bloqueados||[]).length');
    out.errores = await ev('(window.__err||[]).slice(0,5)');
    console.log(JSON.stringify(out, null, 1));
  } finally { cli.matar ? cli.matar() : cli.cerrar(); }
})().catch(e => { console.error(e); process.exit(1); });
