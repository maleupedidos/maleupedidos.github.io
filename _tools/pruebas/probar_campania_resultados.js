/* CRM › Segmentos › Resultados (4/10/2026): cada campaña contra su control.

   Datos REALES (la bitacora y los clientes del CRM). Lo que la pantalla dice se
   compara contra una cuenta hecha ACA, por separado, con los mismos datos
   crudos: agrupar por dia + nombre, pasar cada persona a su casa, y mirar si
   alguien de la casa hizo un pedido en los 14 dias siguientes (`fp`).
   La casa la define el CRM (`crmCasaDe`) — es la definicion, no se reescribe.

   Ademas se meten tres filas de mentira en la bitacora local (no en la planilla):
   una campaña cerrada con su control, una 'lista' y una 'descartada'. Las dos
   ultimas NO pueden aparecer; la primera tiene que dar los numeros a mano.

     TOKEN=... ANCHO=390 BASE=http://localhost:8095 node probar_campania_resultados.js */
'use strict';
const T = 'C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(T + 'cdp.js');
const prep = require(T + 'sesion_prep.js');
const TOKEN = process.env.TOKEN;
const ANCHO = Number(process.env.ANCHO || 390);
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 150000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(400); }
  return false;
};
const ymd = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, "typeof go==='function'", 60000)) { console.log('  el ERP no arranco'); process.exit(1); }
    for (let i = 0; i < 20; i++) {
      await evaluar(cli, 'go("estancias")'); await pausa(1500);
      await evaluar(cli, 'estSwitch("segmentos")'); await pausa(400);
      if (await evaluar(cli, "!!(document.getElementById('segList')||{}).offsetParent")) break;
    }
    if (!await esperar(cli, "(window.estClientesSync()||[]).length>50 && (window.estClientesSync()||[]).some(function(c){return c.fp&&c.fp.length;})")) {
      console.log('  los clientes no trajeron fp (¿backend viejo?)'); process.exit(1);
    }
    await evaluar(cli, "segSwitchVista('enviadas')");
    if (!await esperar(cli, "!!document.querySelector('#segList .seg-env, #segList .hoy-empty')", 60000)) { console.log('  Resultados no pinto'); process.exit(1); }
    console.log('\n== Resultados de campaña · ' + ANCHO + ' px · datos reales ==\n');

    // Tres campañas de mentira, en la bitacora LOCAL: hace 20 dias (cerrada).
    // Se eligen casas reales: 3 que compraron en la ventana y 3 que no, por fp.
    const hace = new Date(); hace.setHours(0, 0, 0, 0); hace.setDate(hace.getDate() - 20);
    const desde = ymd(hace), hasta = ymd(new Date(hace.getTime() + 14 * 86400000));
    const elegidos = await evaluar(cli, `(function(desde, hasta){
      var cs=window.estClientesSync(), porCasa={};
      cs.forEach(function(c){ var k=window.crmCasaDe(c); (porCasa[k]||(porCasa[k]=[])).push(c); });
      var si=[], no=[];
      Object.keys(porCasa).forEach(function(k){
        var m=porCasa[k], c=m[0]; if(!c.tel) return;
        var compro=m.some(function(x){ return (x.fp||[]).some(function(f){ return f>=desde && f<=hasta; }); });
        (compro?si:no).push({key:c.key, tel:c.tel, nombre:c.nombre});
      });
      return {si:si.slice(0,3), no:no.slice(0,3)};
    })(${JSON.stringify(desde)}, ${JSON.stringify(hasta)})`);
    chk('hay casas reales para armar la prueba', elegidos.si.length === 3 && elegidos.no.length === 3, elegidos);
    // Recibieron: 2 que compraron + 2 que no → 50%. Control: 1 que compro + 1 que no → 50%.
    const fila = (id, it, origen, nombre) => ({ id, fecha: dmy(hace) + ' 18:00', key: it.key, tel: it.tel, nombre: it.nombre,
      resultado: '', prox: '', nota: 'Campaña: ' + nombre, origen, usuario: 'Test' });
    const falsas = [
      fila('E1700000000001-0', elegidos.si[0], 'campaña', 'zz-prueba'), fila('E1700000000001-1', elegidos.si[1], 'campaña', 'zz-prueba'),
      fila('E1700000000001-2', elegidos.no[0], 'campaña', 'zz-prueba'), fila('E1700000000001-3', elegidos.no[1], 'campaña', 'zz-prueba'),
      fila('K1700000000001-0', elegidos.si[2], 'control', 'zz-prueba'), fila('K1700000000001-1', elegidos.no[2], 'control', 'zz-prueba'),
      fila('E1700000000002-0', elegidos.si[0], 'lista', 'zz-lista'), fila('E1700000000003-0', elegidos.si[0], 'descartada', 'zz-descartada')
    ];
    await evaluar(cli, `window.crmInterAgregar(${JSON.stringify(falsas)}); segSwitchVista('enviadas'); 1`);
    await pausa(500);

    const pant = await evaluar(cli, `window.crmCampResultados()`);
    const zz = (pant.lista || []).find(e => e.nombre === 'zz-prueba');
    chk('la campaña de prueba aparece', !!zz, (pant.lista || []).map(e => e.nombre).slice(0, 8));
    if (zz) {
      chk('recibieron: 2 de 4 casas compraron', zz.nE === 4 && zz.compE.length === 2, { nE: zz.nE, c: zz.compE.length });
      chk('control: 1 de 2', zz.nK === 2 && zz.compK.length === 1, { nK: zz.nK, c: zz.compK.length });
      chk('y está cerrada (pasaron más de 14 días)', zz.abierta === false);
    }
    chk('una lista que nadie confirmó NO aparece', !(pant.lista || []).some(e => e.nombre === 'zz-lista'));
    chk('una lista descartada NO aparece', !(pant.lista || []).some(e => e.nombre === 'zz-descartada'));
    const txt = await evaluar(cli, "document.getElementById('segList').innerText");
    chk('la pantalla muestra la de prueba con sus porcentajes', /zz-prueba/.test(txt) && /50%/.test(txt), txt.slice(0, 300));

    // La cuenta independiente, sobre TODA la bitacora real.
    const crudo = await evaluar(cli, `(function(){
      var cs=window.estClientesSync(); var casa={}, fp={};
      cs.forEach(function(c){ casa[c.key]=window.crmCasaDe(c); fp[c.key]=c.fp||[]; });
      var porTel={}; cs.forEach(function(c){ var t=String(c.tel||'').replace(/\\D/g,'').slice(-10); if(t) porTel[t]=c.key; });
      return {casa:casa, fp:fp, porTel:porTel, inter:JSON.parse(localStorage.getItem('maleu_crm_inter_v1')||'[]')};
    })()`);
    const miembros = {};
    Object.keys(crudo.casa).forEach(k => { (miembros[crudo.casa[k]] = miembros[crudo.casa[k]] || []).push(k); });
    const g = {};
    crudo.inter.forEach(it => {
      let o = String(it.origen || '');
      if (!o && /campa/i.test(String(it.resultado || ''))) o = 'campaña';
      if (o !== 'campaña' && o !== 'control') return;
      const dia = String(it.fecha || '').split(' ')[0]; if (!dia) return;
      const nom = ((String(it.nota || '').match(/(?:Campa[nñ]a|Control \(no recibi[oó]\)):\s*(.+)$/) || [])[1] || '(sin nombre)').trim();
      const t10 = String(it.tel || '').replace(/\D/g, '').slice(-10);
      const key = crudo.casa[it.key] ? it.key : crudo.porTel[t10];
      const ck = key ? crudo.casa[key] : 'tel|' + t10;
      const e = g[dia + '|' + nom] || (g[dia + '|' + nom] = { env: new Set(), ctl: new Set(), dia, nom });
      (o === 'campaña' ? e.env : e.ctl).add(ck);
    });
    let iguales = 0, distintas = [];
    Object.values(g).forEach(e => {
      e.ctl.forEach(x => { if (e.env.has(x)) e.ctl.delete(x); });
      if (!e.env.size) return;
      const [d, m, y] = e.dia.split('/').map(Number), d0 = new Date(y, m - 1, d);
      const de = ymd(d0), ha = ymd(new Date(d0.getTime() + 14 * 86400000));
      const compro = ck => (miembros[ck] || []).some(k => (crudo.fp[k] || []).some(f => f >= de && f <= ha));
      const cE = [...e.env].filter(compro).length, cK = [...e.ctl].filter(compro).length;
      const p = (pant.lista || []).find(x => x.dia === e.dia && x.nombre === e.nom);
      if (p && p.nE === e.env.size && p.nK === e.ctl.size && p.compE.length === cE && p.compK.length === cK) iguales++;
      else distintas.push({ c: e.dia + ' ' + e.nom, yo: [e.env.size, cE, e.ctl.size, cK], pant: p ? [p.nE, p.compE.length, p.nK, p.compK.length] : null });
    });
    console.log('       campañas medidas: ' + iguales + ' (de las reales y la de prueba)');
    chk('cada campaña da lo mismo que la cuenta independiente', distintas.length === 0 && iguales > 1, distintas.slice(0, 4));

    const anchoPag = await evaluar(cli, 'document.documentElement.scrollWidth - document.documentElement.clientWidth');
    chk('sin scroll horizontal de la pagina', anchoPag <= 1, anchoPag);
    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
