/* LA FICHA DEL PEDIDO › COBRO Y LAS PROPINAS DEL REPARTIDOR (18/11/2026, 765). Como el dueño, solo lectura.
     SBSES=<ses.json de sesion_prueba.py crear … (tadeo/admin)> [ANCHO=390|1440] [SIM=<sim.json>] [OUT=<carpeta>]
       node _tools/pruebas/probar_ficha_cobro.js [base=http://localhost:8090]
   SIM = las respuestas de pedido_cobro_pantalla y equipo_propinas_pantalla mientras la 765 no esté aplicada
   ({"cobro":{…},"propinas":{…}}); sin SIM se prueba que la ficha ande igual sin la 765 (sin billete ni lista).
   El caso es el #2377 (Lola Prieto): total 54.298, pagó un billete de 60.000, propina 5.702, Santos Bullrich, 6/11 19:51.
     · El total de arriba y «Total a cobrar» dicen $54.298, no $60.000.
     · Margen bruto $10.221 · 19% (antes $15.923 · 27%: la propina adentro).
     · «Cobro»: total, pagó, (billete y vuelto con la 765), propina para Santos, entregó y cuándo; menos de 120 palabras.
     · Equipo › Santos Bullrich › «Propinas por pedido»: se abre con un TOQUE y lista el #2377 con $5.702 (con la 765). */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js'), prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8090';
const W = Number(process.env.ANCHO || 390), H = W > 800 ? 900 : 844, OUT = process.env.OUT || '';
const SIM = process.env.SIM ? JSON.parse(fs.readFileSync(process.env.SIM, 'utf8')) : null;
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c || d === undefined ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
(async () => {
  if (!process.env.SBSES) { console.log('Falta SBSES'); process.exit(2); }
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  const foto = async n => { if (!OUT) return; fs.mkdirSync(OUT, { recursive: true }); const a = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, W + '-' + n + '.png'), Buffer.from(a.data, 'base64')); };
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W > 800 ? 1 : 2, mobile: W <= 800 });
    if (W <= 800) await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const sim = SIM ? `;(function(){var S=${JSON.stringify(JSON.stringify(SIM))};S=JSON.parse(S);var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u);
        if(/\\/rpc\\/pedido_cobro_pantalla/.test(s))return Promise.resolve(new Response(JSON.stringify(S.cobro),{status:200,headers:{'Content-Type':'application/json'}}));
        if(/\\/rpc\\/equipo_propinas_pantalla/.test(s))return Promise.resolve(new Response(JSON.stringify(S.propinas),{status:200,headers:{'Content-Type':'application/json'}}));
        return f.apply(this,arguments);};})();` : '';
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, 'tadeo') + sim + ';window.alert=function(){};window.confirm=function(){return false;};window.prompt=function(){return null;};' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 200; i++) { try { if (await ev(`typeof D!=='undefined'&&D&&Array.isArray(D.pedidos)&&D.pedidos.some(function(p){return String(p.n)==='2377';})&&typeof openOrdDetail==='function'`)) break; } catch (e) {} await pausa(300); }
    const r = await ev(`(function(){var p=D.pedidos.find(function(p){return String(p.n)==='2377'&&p.h!=='Red';});return p?{h:p.h,r:Number(p.r)||0,$:p.$,pef:p.pef,mg:p.mg}:null;})()`);
    chk('el #2377 está en los pedidos', !!r, r);
    if (!r) throw new Error('sin #2377');
    await ev(`openOrdDetail(${JSON.stringify(r.h)},'2377',${r.r});1`); await pausa(2500);
    const f = await ev(`(function(){var o=document.querySelector('.ofx-tot b'),t=Array.from(document.querySelectorAll('.ord-money-row.total b')).map(function(x){return x.textContent;}),
        m=(document.querySelector('.ofx-mg')||{}).innerText||'',c=document.getElementById('ofxCobro');
        return {hero:o&&o.textContent,total:t[0],mg:m.replace(/\\s+/g,' '),cobro:c?c.innerText.replace(/\\s+/g,' '):null,
                pal:c?c.innerText.split(/\\s+/).filter(Boolean).length:0};})()`);
    console.log('   ficha: ' + JSON.stringify(f));
    chk('el total de arriba es $54.298 (sin la propina)', f.hero === '$54.298', f.hero);
    chk('«Total a cobrar» es $54.298', f.total === '$54.298', f.total);
    chk('margen bruto $10.221 · 19%', /10\.221/.test(f.mg) && /19%/.test(f.mg), f.mg);
    chk('hay bloque Cobro', !!f.cobro, f.cobro);
    chk('Cobro: pagó en efectivo $60.000', /Pagó en efectivo \$60\.000/.test(f.cobro || ''), f.cobro);
    chk('Cobro: propina para Santos $5.702', /Propina para Santos \$5\.702/.test(f.cobro || ''), f.cobro);
    chk('Cobro: entregó Santos Bullrich el 6/11', /Entregó Santos Bullrich (06\/11\/2026 19:51|6\/11 19:51)/.test(f.cobro || ''), f.cobro);
    if (SIM) chk('Cobro: billete $60.000 y vuelto $0 (765)', /Billete \$60\.000/.test(f.cobro || '') && /Vuelto \$0/.test(f.cobro || ''), f.cobro);
    else chk('sin la 765: no inventa billete ni vuelto', !/Billete|Vuelto/.test(f.cobro || ''), f.cobro);
    chk('Cobro con menos de 120 palabras (' + f.pal + ')', f.pal > 0 && f.pal < 120, f.pal);
    await ev(`(function(){var c=document.getElementById('ofxCobro');if(c)c.scrollIntoView({block:'center'});})();1`); await pausa(500);
    await foto('ficha-2377');
    /* Equipo › Santos Bullrich */
    await ev(`(function(){var o=document.querySelector('.ord-ov,.ord-overlay,#ordOverlay');if(typeof closeOrdDetail==='function')closeOrdDetail();})();go('equipo');1`);
    for (let i = 0; i < 80; i++) { if (await ev(`!!(window.EQ&&EQ.d&&_eqPersonas().length)`)) break; await pausa(500); }
    await ev(`(function(){var e=document.getElementById('p-equipo');if(e)e.classList.remove('role-hidden');})();1`);
    const per = await ev(`(_eqPersonas().find(function(p){return /santos bullrich/i.test(p.persona);})||{}).persona||null`);
    chk('Santos Bullrich está en Equipo', !!per, per);
    if (per) {
      await ev(`eqAbrir(${JSON.stringify(per)});1`); await pausa(3000);
      /* Las propinas ya están en Equipo › ficha › Quincenas › «Propinas» (_sueldos_personas, la regla con la que se paga):
         se despliega con un toque, lista cada pedido, y tocar uno abre su ficha con el bloque Cobro. */
      const toque = async (sel) => {
        const q = await ev(`(function(){var e=${sel};if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return {x:r.left+Math.min(r.width/2,60),y:r.top+r.height/2};})()`);
        if (!q) return false; await pausa(300);
        const q2 = await ev(`(function(){var e=${sel};var r=e.getBoundingClientRect();return {x:r.left+Math.min(r.width/2,60),y:r.top+r.height/2};})()`);
        if (W <= 800) { await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q2.x, y: q2.y }] }); await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
        else { await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: q2.x, y: q2.y, button: 'left', clickCount: 1 }); await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: q2.x, y: q2.y, button: 'left', clickCount: 1 }); }
        return true;
      };
      const PROP = `Array.from(document.querySelectorAll('#eqFicha details.eqf-l')).find(function(d){return (d.querySelector('.eqf-c')||{}).textContent==='Propinas'&&/Lola Prieto/.test(d.querySelector('.eqf-det').textContent);})`;
      const hay = await toque(PROP + `&&${PROP}.querySelector('summary')`);
      chk('Equipo › Santos › Quincenas tiene «Propinas» con el #2377', hay);
      if (hay) {
        await pausa(700);
        const s2 = await ev(`(function(){var d=${PROP};return {open:d.open,t:d.innerText.replace(/\\s+/g,' ').slice(0,500)};})()`);
        chk('se despliega con un ' + (W <= 800 ? 'toque' : 'clic'), s2.open, s2);
        chk('lista a Lola Prieto con $5.702', /Lola Prieto/.test(s2.t) && /5\.702/.test(s2.t), s2.t);
        await foto('equipo-santos');
        const fue = await toque(`Array.from(${PROP}.querySelectorAll('[onclick*="eqVerPedido"]')).find(function(x){return /Lola Prieto/.test(x.textContent);})`);
        await pausa(2500);
        const fc = await ev(`(function(){var c=document.getElementById('ofxCobro');return c?c.innerText.replace(/\\s+/g,' '):null;})()`);
        chk('tocar la propina abre el pedido con el bloque Cobro', fue && /Propina para Santos \$5\.702/.test(fc || ''), fc);
      }
    }
    const err = await ev('window.__err||[]'); chk('consola sin errores', !err.length, err.slice(0, 4));
  } catch (e) { mal++; console.log('  MAL  ' + e.message); }
  finally { cli.matar ? cli.matar() : cli.cerrar(); }
  console.log('\n' + ok + ' ok, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
