/* La carne en Pedidos › «Editar productos»: se tocan PIEZAS, no se tipean kilos
   (8/10/2026).

   node probar_editor_carne.js <token> [390|1440]        BASE=http://localhost:8097

   Sesion REAL y datos reales (pedidos, stock y piezas de hoy). Todos los POST van
   interceptados y anotados: no escribe nada. Abre el editor de un pedido real de
   Home o Pilar sin entregar y mide:
   · la seccion Carne aparece, con un corte por cada producto por kilo;
   · al elegir un corte se ven sus piezas Disponibles: peso, proveedor y deposito;
   · tocar una pieza suma SUS kilos al pedido y mueve el total; soltarla lo deshace;
   · un corte sin piezas libres lo dice y no ofrece nada para tocar;
   · al guardar viaja `piezas:{agregar}` y la carne va SIN costo y sin kilos tipeados;
   · los pedidos Cobrados o Cancelados siguen sin editor;
   · piso tactil, sin desborde horizontal, sin errores de consola. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 500) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(400); }
  return false;
};
const EXTRA = `
  window.__posts=[]; window.confirm=function(){return true;};
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    if(x && String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    return o.apply(this,arguments);};})();
`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    const cargo = await esperar(cli, `typeof D!=='undefined'&&D&&Array.isArray(D.pedidos)&&D.pedidos.length>0`);
    chk('el ERP cargo los pedidos reales', cargo);
    if (!cargo) throw new Error('no cargo');
    chk('el login no quedo tapando', await evaluar(cli, `(function(){var l=document.getElementById('loginScreen');return !l||getComputedStyle(l).display==='none';})()`));
    if (ANCHO >= 1000) await evaluar(cli, `(function(){try{if(typeof drawerAbrir==='function')drawerAbrir();}catch(e){} return 1;})()`);
    await evaluar(cli, `go('pedidos')`);
    await esperar(cli, `document.querySelectorAll('#pList .pc').length>0`, 60000);
    /* El cuerpo de la tarjeta se arma recien al abrirla: se abren (con un click de
       verdad en el resumen) hasta dar con un pedido de Home/Pilar sin entregar. */
    const eleg = await evaluar(cli, `(function(){
      var out={tarjetas:0,abiertas:0,sin:null,bloqueados:0,bloqConEditor:0};
      var cs=[].slice.call(document.querySelectorAll('#pList .pc')); out.tarjetas=cs.length;
      var porUid={};
      D.pedidos.forEach(function(p){ porUid['ed-'+String(p.h).replace(/ /g,'')+p.n]=p; });
      for(var i=0;i<cs.length&&i<80;i++){
        var sm=cs[i].querySelector('.pc-summary'); if(!sm)continue;
        sm.click(); out.abiertas++;
        var p=null, box=cs[i].querySelector('div[id^="ed-"]');
        if(box)p=porUid[box.id];
        if(!box){ var t=cs[i].textContent; if(/Cobrado|Cancelado/.test(t)){out.bloqueados++; if(cs[i].querySelector('button[onclick*="abrirEditorPedido"]'))out.bloqConEditor++;} }
        if(p&&(p.h==='Home'||p.h==='Pilar')&&p.es!=='Entregado'&&!out.sin){ out.sin={h:p.h,n:p.n,uid:box.id}; }
        else sm.click();
        if(out.sin&&out.bloqueados>0)break;
      }
      return out;})()`);
    console.log('   tarjetas: ' + eleg.tarjetas + ' · abiertas: ' + eleg.abiertas + ' · cobradas/canceladas vistas: ' + eleg.bloqueados);
    chk('hay un pedido real de Home/Pilar sin entregar para editar', !!eleg.sin, eleg);
    chk('las tarjetas Cobradas o Canceladas no ofrecen el editor (sobre ' + eleg.bloqueados + ')', eleg.bloqConEditor === 0, eleg);
    const P = eleg.sin || eleg.con;
    const UID = P.uid;
    console.log('   pruebo con ' + P.h + ' #' + P.n);

    await evaluar(cli, `document.querySelector('button[onclick*="abrirEditorPedido"][onclick*="\\'${UID}\\'"]').click()`);
    const sinStock = await evaluar(cli, `!(D&&Array.isArray(D.stock)&&D.stock.length)`);
    console.log('   D.stock al tocar el boton: ' + (sinStock ? 'NO habia llegado (el editor lo tiene que esperar)' : 'ya estaba'));
    chk('el editor abre con precios (espera el stock si hace falta)', await esperar(cli, `window['_ed_${UID}']&&D.stock&&D.stock.length>0`, 90000));
    const precios = await evaluar(cli, `window['_ed_${UID}'].lineas.map(function(l){return l.precio;})`);
    chk('ninguna linea abre en $0 (' + precios.length + ' lineas)', precios.length > 0 && precios.every(x => x > 0), precios);
    const fresco = await esperar(cli, `window['_ed_${UID}']&&window['_ed_${UID}'].pzEst==='ok'`, 90000);
    chk('las piezas llegaron frescas del backend', fresco, await evaluar(cli, `window['_ed_${UID}']&&window['_ed_${UID}'].pzEst`));
    const sec = await evaluar(cli, `(function(){
      var c=document.getElementById('${UID}-carne'); if(!c)return null;
      var ops=[].slice.call(c.querySelectorAll('.edc-sel option')).map(function(o){return o.value;}).filter(Boolean);
      var kg=D.stock.filter(function(s){return String(s.u||'').toLowerCase()==='kg';}).map(function(s){return s.a;});
      var ed=window['_ed_${UID}'], libres={}, tot=0;
      kg.forEach(function(a){libres[a]=_edPzLibres(ed,a).length; tot+=libres[a];});
      var uni=[].slice.call(document.querySelectorAll('#${UID}-add option')).map(function(o){return o.value;}).filter(Boolean);
      return {ops:ops,kg:kg,libres:libres,tot:tot,uniConKg:uni.filter(function(a){return kg.indexOf(a)>=0;}).length,
              visible:c.getBoundingClientRect().height>0};})()`);
    chk('la seccion Carne esta a la vista', !!sec && sec.visible, sec);
    chk('ofrece los ' + (sec && sec.kg.length) + ' cortes por kilo, y el desplegable de unidades sigue sin carne', !!sec && sec.kg.length > 0 && sec.ops.length === sec.kg.length && sec.uniConKg === 0, sec);
    console.log('   piezas libres hoy por corte: ' + JSON.stringify(sec.libres));
    const conPz = sec.kg.find(a => sec.libres[a] > 0), sinPz = sec.kg.find(a => sec.libres[a] === 0);
    chk('hay al menos un corte con piezas libres para probar (total ' + sec.tot + ')', !!conPz, sec.libres);

    if (sinPz) {
      await evaluar(cli, `edCarneCorte('${UID}','${sinPz}')`);
      const s = await evaluar(cli, `(function(){var c=document.getElementById('${UID}-carne');return {txt:(c.querySelector('.edc-nota.sin')||{}).textContent||'',chips:c.querySelectorAll('.edc-pz.libre').length};})()`);
      chk('corte sin piezas (' + sinPz + '): lo dice y no deja agregar', /No hay piezas disponibles/.test(s.txt) && s.chips === 0, s);
    } else console.log('   (hoy todos los cortes tienen piezas: el caso "sin piezas" lo sostiene el backend)');

    if (conPz) {
      const antes = await evaluar(cli, `(function(){var ed=window['_ed_${UID}'];return {lin:ed.lineas.length,q0:(ed.lineas.filter(function(x){return x.a==='${conPz}';})[0]||{}).q||0,tot:document.getElementById('${UID}').querySelector('div[style*="linear-gradient(135deg,#FFF8F0"]').textContent};})()`);
      await evaluar(cli, `(function(){var s=document.querySelector('#${UID}-carne .edc-sel');s.value='${conPz}';s.dispatchEvent(new Event('change'));})()`);
      const ch = await evaluar(cli, `(function(){
        var c=document.getElementById('${UID}-carne'), bs=[].slice.call(c.querySelectorAll('.edc-pz.libre'));
        var ed=window['_ed_${UID}'], lib=_edPzLibres(ed,'${conPz}');
        return {n:bs.length,esperadas:lib.length,
          conPeso:bs.filter(function(b){return /\\d,\\d{3} kg|\\d kg/.test(b.textContent);}).length,
          conDep:bs.filter(function(b){return !!b.querySelector('.edc-dep');}).length,
          provs:c.querySelectorAll('.edc-add .stcar-pv').length,
          conColor:[].slice.call(c.querySelectorAll('.edc-add .stcar-pv')).filter(function(e){return /--pc/.test(e.getAttribute('style')||'')||e.classList.contains('sin');}).length,
          altoMin:Math.min.apply(null,bs.map(function(b){return Math.round(b.getBoundingClientRect().height);})),
          id:lib[0].id,peso:lib[0].peso,inputs:c.querySelectorAll('input').length};})()`);
      chk('se ven las ' + ch.esperadas + ' piezas disponibles de ' + conPz, ch.n === ch.esperadas && ch.n > 0, ch);
      chk('cada pieza dice su peso y su deposito', ch.conPeso === ch.n && ch.conDep === ch.n, ch);
      chk('el proveedor va con nombre y color (' + ch.provs + ' etiquetas)', ch.provs > 0 && ch.conColor === ch.provs, ch);
      chk('no hay ningun campo para tipear kilos', ch.inputs === 0, ch);
      chk('piso tactil de la pieza >= 38px', ch.altoMin >= 38, ch.altoMin);

      await evaluar(cli, `document.querySelector('#${UID}-carne .edc-pz.libre').click()`);
      const tras = await evaluar(cli, `(function(){
        var ed=window['_ed_${UID}'], l=ed.lineas.filter(function(x){return x.a==='${conPz}';})[0];
        var c=document.getElementById('${UID}-carne');
        return {q:l&&l.q,kg:l&&l.kg,costo:l&&l.costo,add:Object.keys(ed.pzAdd),mias:c.querySelectorAll('.edc-pz.mia').length,
          libres:c.querySelectorAll('.edc-pz.libre').length,
          tot:document.getElementById('${UID}').querySelector('div[style*="linear-gradient(135deg,#FFF8F0"]').textContent,
          doc:document.documentElement.scrollWidth,win:window.innerWidth};})()`);
      const tocada = tras.add[0];
      if (process.env.SHOT) {
        await evaluar(cli, `document.getElementById('${UID}-carne').scrollIntoView({block:'start'})`);
        await pausa(300);
        const sh = await cli.enviar('Page.captureScreenshot', { format: 'png' });
        require('fs').writeFileSync(process.env.SHOT, Buffer.from(sh.data, 'base64'));
      }
      const pzT = await evaluar(cli, `_carnePieza('${tocada}')`);
      chk('tocar una pieza suma SUS kilos (' + pzT.peso + ')', tras.kg === true && Math.abs(tras.q - (antes.q0 + pzT.peso)) < 0.0005 && tras.add.length === 1, tras);
      chk('la pieza pasa a la lista del pedido y sale de las libres', tras.mias >= 1 && tras.libres === ch.n - 1, tras);
      chk('el total del editor se movio', tras.tot !== antes.tot, [antes.tot, tras.tot]);
      chk('el costo de la linea es el de la pieza ($' + pzT.costo + '/kg)', !(pzT.costo > 0) || antes.q0 > 0 || Math.abs(tras.costo - pzT.costo) < 1, tras.costo);
      chk('sin desborde horizontal a ' + ANCHO, tras.doc <= tras.win + 1, [tras.doc, tras.win]);

      await evaluar(cli, `document.querySelector('#${UID}-carne .edc-pz.mia[onclick*="${tocada}"]').click()`);
      const vuelta = await evaluar(cli, `(function(){var ed=window['_ed_${UID}'];return {add:Object.keys(ed.pzAdd).length,
        tot:document.getElementById('${UID}').querySelector('div[style*="linear-gradient(135deg,#FFF8F0"]').textContent,
        q:(ed.lineas.filter(function(x){return x.a==='${conPz}';})[0]||{}).q||0};})()`);
      chk('soltarla deja el pedido como estaba', vuelta.add === 0 && vuelta.tot === antes.tot, vuelta);

      await evaluar(cli, `edCarneTomar('${UID}','${tocada}')`);
      await evaluar(cli, `window.__posts=[];guardarEditor('${UID}')`);
      await pausa(600);
      const post = (await evaluar(cli, `window.__posts.filter(function(b){return b.action==='editarPedido';})`))[0];
      chk('al guardar sale UN editarPedido con piezas.agregar = la pieza tocada', !!post && post.piezas && post.piezas.agregar.length === 1 && post.piezas.agregar[0] === tocada && post.piezas.soltar.length === 0, post && post.piezas);
      const lk = post && post.lineas.filter(l => l.a === conPz)[0];
      chk('la carne viaja SIN costo (lo pone el backend desde la pieza)', !!lk && !('costo' in lk), lk);
      chk('las unidades viajan como siempre (con su costo)', !!post && post.lineas.filter(l => l.a !== conPz && !sec.kg.includes(l.a)).every(l => 'costo' in l && l.q === Math.round(l.q)), post && post.lineas);
    }
    const errs = await evaluar(cli, `window.__err`);
    chk('sin errores de consola', errs.length === 0, errs);
  } catch (e) { mal++; console.log('  MAL  revento: ' + e.message); }
  cli.matar();
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal  (' + ANCHO + 'px)\n');
  process.exit(mal ? 1 : 0);
})();
