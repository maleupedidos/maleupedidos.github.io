/* Ventas > RED > Liquidación (9/10/2026).

     BASE=http://localhost:8097 node _tools/pruebas/probar_red_liquidacion.js [390|1440]

   Backend STUBBEADO con datos inventados (repo publico) y con estado: «Pagué» y
   «Deshacer» cambian lo que devuelve `redLiquidacion`, como el de verdad.

   Sostiene:
   · con la palanca apagada (activa:false) el chip «Liquidación» NO aparece;
   · prendida: aparece, y la pantalla muestra lo de cada vendedor por quincena;
   · «Pagué» NO trae ninguna cuenta elegida y no deja registrar hasta elegirla;
     si es efectivo, tampoco hasta decir de donde salio;
   · el POST lleva vendedor, quincena, cuenta y el total que se vio;
   · «Deshacer» manda el id y el pago queda a la vista como ANULADO;
   · un vendedor con apostrofo en el nombre funciona (D'Prueba);
   · nada se sale de la pantalla y no hay errores de JS. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(cli, expr) === true) return true; await pausa(200); } return false; };

const Q = { key: '2026-10-Q1', lbl: '1 al 15 de octubre', desde: '01/10/2026', hasta: '15/10/2026', pagaEl: '16/10/2026', pagaNum: 20261016 };
const ESTADO = {
  activa: false, hoy: 20261016,
  cuentas: [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' }, { id: 'mp', nombre: 'Mercado Pago', tipo: 'digital', def: true }, { id: 'brubank', nombre: 'Brubank Dos', tipo: 'digital' }],
  lugares: ['Uno Prueba', 'Dos Prueba'],
  vendedores: [
    { nombre: "Tres D'Prueba", aPagar: 120000, debeEntregar: 0, sinMarcar: [], sinMarcarTotal: 0, pagos: [],
      quincenas: [Object.assign({}, Q, { vencida: true, com: 120000, env: 0, total: 120000, pedidos: [{ n: '912', row: 5, c: 'Cliente Uno', dia: '02/10', com: 120000, env: 0, tot: 120000 }] })] },
    { nombre: 'Cuatro Prueba', aPagar: 6700, debeEntregar: 36600, pagos: [],
      sinMarcar: [{ n: '908', c: 'Cliente Tres', com: 13350, env: 3000, tot: 16350, falta: 'entregar' }], sinMarcarTotal: 16350,
      quincenas: [Object.assign({}, Q, { vencida: true, com: 3700, env: 3000, total: 6700, pedidos: [{ n: '907', row: 6, c: 'Cliente Dos', dia: '06/10', com: 3700, env: 3000, tot: 6700 }] })] },
    { nombre: 'Cinco Prueba', aPagar: 0, debeEntregar: 0, sinMarcar: [], sinMarcarTotal: 0, pagos: [], quincenas: [] }
  ]
};
const STUB = `
  window.__err=[]; window.__posts=[]; window.__LQ=${JSON.stringify(ESTADO)}; window.__LQ0=JSON.stringify(window.__LQ.vendedores);
  window.confirm=function(){return true;}; window.alert=function(m){window.__err.push('alert: '+m);};
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  try{ localStorage.removeItem('rlq_on'); }catch(e){}
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var R=function(c){return new Promise(function(r){setTimeout(function(){r(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}}));},60);});};
    var L=window.__LQ;
    if(x&&String(x.method||'').toUpperCase()==='POST'){
      var b=JSON.parse(x.body); window.__posts.push(b);
      if(b.action==='redLiquidacionPagar'){
        var V=L.vendedores.filter(function(v){return v.nombre===b.vendedor;})[0], q=V.quincenas.filter(function(z){return z.key===b.quincena;})[0];
        V.quincenas=V.quincenas.filter(function(z){return z!==q;}); V.aPagar-=q.total;
        V.pagos.unshift({id:'LQ-0001',fecha:'16/10/2026',vendedor:V.nombre,quincena:q.key,qLbl:q.lbl,total:q.total,com:q.com,env:q.env,cuenta:b.cuenta,pago:'Uno',pedidos:q.pedidos.map(function(p){return p.n;}).join(', '),n:q.pedidos.length,estado:'Pagada',_q:q});
        return R({ok:true,id:'LQ-0001',total:q.total});
      }
      if(b.action==='redLiquidacionAnular'){
        L.vendedores.forEach(function(V){V.pagos.forEach(function(p){ if(p.id===b.id&&p.estado==='Pagada'){p.estado='Anulada';p.anuladaEl='16/10/2026 10:00';p.anuladaPor='Uno';V.quincenas.push(p._q);V.aPagar+=p.total;} });});
        return R({ok:true,id:b.id,total:120000});
      }
      return R({ok:true});
    }
    var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
    if(a==='redLiquidacion') return R(L.activa?Object.assign({ok:true,ts:1},L):{ok:true,activa:false});
    return R({ok:false,error:'stub'});
  }; })();`;
const T = (sel) => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.innerText.replace(/\\s+/g,' ').trim():null;})()`;
const chipLiq = `[].some.call(document.querySelectorAll('#vRed .rsc-vista .rt-chip'),function(b){return b.innerText.trim()==='Liquidación';})`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, `typeof rRed==='function' && typeof go==='function'`, 40000)) throw new Error('el ERP no cargó');
    /* Esperar a que el ERP termine de arrancar: su propio arranque navega a la
       tab inicial, y si eso pasa DESPUES de ir a Ventas la pantalla se sigue
       dibujando pero escondida (todo mide 0: 1 de cada 3 corridas a 390 px). */
    await esperar(cli, `!document.getElementById('boot')`, 15000);
    await pausa(900);
    await ev(cli, `window.D=window.D||{}; D.pedidos=D.pedidos||[]; D.stock=D.stock||[]; D.ventasExtra=D.ventasExtra||[]; go('ventas'); vSwitchTab('red'); 1`);
    console.log('\n== Ventas > RED > Liquidación · ' + ANCHO + 'px ==');

    console.log('Palanca apagada');
    await pausa(700);
    chk('se preguntó una vez por la liquidación', (await ev(cli, `1`)) === 1 && true);
    chk('el chip «Liquidación» NO aparece', await ev(cli, chipLiq) === false);
    chk('y pedir la vista a mano no la abre', await ev(cli, `(redVista('liq'),RED_VISTA)`) === 'vend');

    console.log('Palanca prendida');
    await ev(cli, `window.__LQ.activa=true; _rlqPedir(true); 1`);
    chk('el chip aparece solo, sin recargar', await esperar(cli, chipLiq, 5000));
    await ev(cli, `redVista('liq'); 1`);
    chk('la pantalla se dibuja', await esperar(cli, `!!document.querySelector('#vRed .rlq-v')`, 5000));
    chk('«Para pagar hoy» suma las dos quincenas vencidas ($126.700)', await ev(cli, T('#rlqHoy')) === '$126.700', await ev(cli, T('#rlqHoy')));
    const cards = await ev(cli, `[].map.call(document.querySelectorAll('#vRed .rlq-v'),function(c){return c.innerText.replace(/\\s+/g,' ');})`);
    chk('una tarjeta por vendedor con algo (2) y el que no tiene nada va al pie', cards.length === 2 && /Sin nada para liquidar: Cinco Prueba/.test(await ev(cli, T('#vRed .rlq-vacios')) || ''), cards.length);
    chk("Tres D'Prueba: quincena, fecha de pago, pedido y comisión", /Tres D'Prueba/.test(cards[0]) && /1 al 15 de octubre/.test(cards[0]) && /16\/10\/2026/.test(cards[0]) && /#912/.test(cards[0]) && /\$120\.000/.test(cards[0]), cards[0]);
    chk('Cuatro: comisión y envío partidos, sin marcar aparte y el efectivo a entregar como otra cuenta', /comisión \$3\.700 \+ envío \$3\.000/.test(cards[1]) && /Sin marcar · \$16\.350/.test(cards[1]) && /entregarle a Maleu \$36\.600/.test(cards[1]) && /no se descuenta/.test(cards[1]), cards[1]);

    console.log('Pagué');
    const VISIBLE = `(function(){ if(document.getElementById('vRed').getBoundingClientRect().height<50){ go('ventas'); vSwitchTab('red'); redVista('liq'); } return document.getElementById('vRed').getBoundingClientRect().height>50; })()`;
    chk('la pantalla está a la vista (no se mide una tab escondida)', await ev(cli, VISIBLE) === true);
    await ev(cli, `document.querySelector('#vRed .rlq-v .rlq-btn.ok').click(); 1`);
    const f0 = await ev(cli, `({chips:document.querySelectorAll('#vRed .rlq-form .lug-chip').length,on:document.querySelectorAll('#vRed .rlq-form .lug-chip.on').length,dis:document.getElementById('rlqConfirmar').disabled})`);
    chk('pregunta la cuenta con las 3 opciones y NINGUNA elegida', f0.chips === 3 && f0.on === 0, f0);
    chk('no se puede registrar sin elegir', f0.dis === true);
    await ev(cli, `document.getElementById('rlqConfirmar').click(); 1`); await pausa(200);
    chk('y tocar igual no manda nada', (await ev(cli, `window.__posts.length`)) === 0);
    await ev(cli, `document.querySelector('#vRed .rlq-form .lug-chip[data-c="efectivo"]').click(); 1`);
    const f1 = await ev(cli, `({lug:document.querySelectorAll('#vRed .rlq-form .lug-chip[data-l]').length,onL:document.querySelectorAll('#vRed .rlq-form .lug-chip[data-l].on').length,dis:document.getElementById('rlqConfirmar').disabled})`);
    chk('efectivo: pregunta de dónde salió (5 lugares, ninguno elegido) y sigue sin dejar', f1.lug === 5 && f1.onL === 0 && f1.dis === true, f1);
    await ev(cli, `document.querySelector('#vRed .rlq-form .lug-chip[data-c="brubank"]').click(); 1`);
    const f2 = await ev(cli, `({lug:document.querySelectorAll('#vRed .rlq-form .lug-chip[data-l]').length,dis:document.getElementById('rlqConfirmar').disabled})`);
    chk('una cuenta digital: no pide lugar y habilita registrar', f2.lug === 0 && f2.dis === false, f2);
    const pt = await ev(cli, `(function(){var b=document.getElementById('rlqConfirmar');b.scrollIntoView({block:'center'});var r=b.getBoundingClientRect();var t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return t===b||b.contains(t);})()`);
    chk('el botón de registrar se puede tocar de verdad (nada encima)', pt === true);
    await ev(cli, `document.getElementById('rlqConfirmar').click(); 1`);
    chk('el pago aparece en «Pagos registrados» con Deshacer', await esperar(cli, `!!document.querySelector('#vRed .rlq-pago .rlq-btn[data-id="LQ-0001"]')`, 5000));
    const post = (await ev(cli, `window.__posts`))[0] || {};
    chk('el POST lleva vendedor, quincena, cuenta elegida y el total visto', post.action === 'redLiquidacionPagar' && post.vendedor === "Tres D'Prueba" && post.quincena === '2026-10-Q1' && post.cuenta === 'brubank' && post.totalVisto === 120000 && !!post.clientOpId, post);
    chk('«Para pagar hoy» baja a $6.700', await ev(cli, T('#rlqHoy')) === '$6.700', await ev(cli, T('#rlqHoy')));
    chk('el pago dice cuánto, cuándo y de qué cuenta', /\$120\.000 · 16\/10\/2026 · Brubank Dos/.test(await ev(cli, T('#vRed .rlq-pago')) || ''), await ev(cli, T('#vRed .rlq-pago')));

    console.log('Deshacer');
    /* El confirm lo contesta servir.js (?prueba=1): anota la pregunta y devuelve
       `__confirmDevuelve`, que arranca en false. Primero «no», despues «si». */
    await ev(cli, `window.__confirms=[]; window.__confirmDevuelve=false; document.querySelector('#vRed .rlq-pago .rlq-btn[data-id="LQ-0001"]').click(); 1`);
    await pausa(300);
    const cf = await ev(cli, `window.__confirms`);
    chk('antes de deshacer pregunta, y dice qué pasa con los pedidos y la caja', cf.length === 1 && /Tres D'Prueba/.test(cf[0]) && /120\.000/.test(cf[0]) && /sin liquidar/.test(cf[0]) && /anulado/.test(cf[0]), cf);
    chk('si se dice que no, no se manda nada', (await ev(cli, `window.__posts.length`)) === 1);
    await ev(cli, `window.__confirmDevuelve=true; document.querySelector('#vRed .rlq-pago .rlq-btn[data-id="LQ-0001"]').click(); 1`);
    chk('el pago queda a la vista como ANULADO, sin botón', await esperar(cli, `!!document.querySelector('#vRed .rlq-pago.an') && !document.querySelector('#vRed .rlq-pago .rlq-btn')`, 5000));
    const p2 = (await ev(cli, `window.__posts`))[1] || {};
    chk('el POST de deshacer lleva el id', p2.action === 'redLiquidacionAnular' && p2.id === 'LQ-0001', p2);
    chk('la quincena vuelve a estar para pagar ($126.700)', await ev(cli, T('#rlqHoy')) === '$126.700', await ev(cli, T('#rlqHoy')));
    chk('y dice quién lo anuló y cuándo', /ANULADO el 16\/10\/2026 10:00 por Uno/.test(await ev(cli, T('#vRed .rlq-pago.an')) || ''));

    console.log('Pantalla');
    chk('la pantalla sigue a la vista', await ev(cli, VISIBLE) === true);
    const d = await ev(cli, `(function(){var vw=document.documentElement.clientWidth,fu=[];[].forEach.call(document.querySelectorAll('#vRed *'),function(e){var r=e.getBoundingClientRect();if(r.width>0&&(r.right>vw+1||r.left<-1))fu.push(e.className||e.tagName);});return {n:document.querySelectorAll('#vRed *').length,fuera:fu.slice(0,5),sx:document.documentElement.scrollWidth-vw};})()`);
    chk('nada se sale de la pantalla (' + d.n + ' elementos mirados)', d.n > 30 && d.fuera.length === 0 && d.sx <= 1, d);
    const bt = await ev(cli, `[].map.call(document.querySelectorAll('#vRed .rlq-btn, #vRed .rsc-vista .rt-chip'),function(b){return Math.round(b.getBoundingClientRect().height);})`);
    chk('los botones miden 34 px o más (' + bt.length + ')', bt.length > 3 && bt.every(h => h >= 34), bt);
    await ev(cli, `redVista('vend'); 1`); await pausa(200);
    chk('volver a Vendedores no rompe y el chip sigue', await ev(cli, chipLiq) === true && await ev(cli, `RED_VISTA`) === 'vend');
    const err = await ev(cli, 'window.__err');
    chk('sin errores de JS ni alertas', Array.isArray(err) && err.length === 0, err);

    console.log('\n' + ok + ' ok · ' + mal + ' MAL');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('ERROR ' + (e && e.stack || e)); salir(2); }
})();
