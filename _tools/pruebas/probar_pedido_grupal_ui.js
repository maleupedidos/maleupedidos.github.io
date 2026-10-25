/* EL PEDIDO GRUPAL EN LA PANTALLA. (25/10/2026)

     node probar_pedido_grupal_ui.js
     APP=app_viejo_tmp.html node probar_pedido_grupal_ui.js   <- la contraria

   Tadeo, desde el asado de rugby en Champagnat: *"podriamos armar algo asi en
   autopedido para que el ERP sepa que no es Inaki el que consume eso para su
   casa sino que es un pedido grupal"*. Lo que tiene que ser cierto:

     · la ficha de un pedido marcado lo dice (chapita y de que fue) y ofrece
       desmarcarlo; el POST lleva hoja, fila, N° y valor vacio;
     · uno sin marcar ofrece marcarlo con un "¿de que?"; vacio manda true;
     · un pedido de CLUBES no muestra nada: su `gr` es el grupo del plantel
       (ese choque se encontro al publicar: 93 pedidos con `gr`);
     · el autopedido tiene la casilla, y al tildarla aparece el "¿de que?".

   No escribe nada: el POST se atrapa en la pagina. Nombres inventados. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 320) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};
const PEDS = [
  { h: 'Home', n: '900', r: 120, c: 'Cliente Prueba', o: 'Deposito', es: 'Entregado', ep: 'No Cobrado', fp: 'Transferencia', f: '24/10/2026', t: 1000, grp: 'Asado de prueba' },
  { h: 'Home', n: '901', r: 121, c: 'Otro Prueba', o: 'Deposito', es: 'Pendiente', ep: 'No Cobrado', fp: 'Efectivo', f: '24/10/2026', t: 1000, grp: '' },
  { h: 'Clubes', n: '902', r: 122, c: 'Club Prueba', o: 'Deposito', es: 'Pendiente', ep: 'No Cobrado', fp: 'Efectivo', f: '24/10/2026', t: 1000, gr: 'Plantel Superior' }
];
/* La ficha abierta: su HTML, o null. */
const ficha = (cli, h, n, r) => evaluar(cli, `(function(){try{
  window.closeOrdDetail&&window.closeOrdDetail();
  window.openOrdDetail(${JSON.stringify(h)},${JSON.stringify(n)},${r});
  var m=document.querySelector('.ord-detail, #ordDetail, .ord-modal, [id^="ordDet"]');
  var t=[].slice.call(document.querySelectorAll('.ord-tags')).map(function(x){return x.closest('div[id],div[class]')}).filter(Boolean);
  var box=document.querySelector('.ord-tags'); box=box&&box.parentElement;
  while(box&&box.parentElement&&box.innerHTML.indexOf('ord-status')<0) box=box.parentElement;
  return box?box.innerHTML:null;}catch(e){return 'ERR '+e.message;}})()`);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    console.log('\n== El pedido grupal en la ficha y en el autopedido · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof window.openOrdDetail==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(800);
    await evaluar(cli, `window.D=window.D||{}; D.pedidos=${JSON.stringify(PEDS)}; D.oc=D.oc||{lista:[]};
      window.__posts=[]; var _f=window.fetch; window.fetch=function(u,o){ if(o&&o.method==='POST'){window.__posts.push(o.body);
        return Promise.resolve({json:function(){return Promise.resolve({ok:true,grupal:''});}});} return _f.apply(this,arguments); }; 1`);

    /* ── 1. Marcado ── */
    const h1 = await ficha(cli, 'Home', '900', 120);
    chk('la ficha abre', typeof h1 === 'string' && h1.indexOf('ERR') !== 0, h1 && h1.slice(0, 150));
    chk('   con la chapita 🎉 Grupal', !!h1 && h1.indexOf('🎉 Grupal') >= 0, h1 && h1.slice(0, 400));
    chk('   dice de qué fue', !!h1 && h1.indexOf('Asado de prueba') >= 0);
    chk('   y ofrece desmarcarlo', !!h1 && h1.indexOf('Ya no es grupal') >= 0);
    await evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('.ord-trajo-op')).filter(function(x){return x.textContent.indexOf('Ya no es grupal')>=0})[0]; b&&b.click(); return !!b;})()`);
    await pausa(400);
    const p1 = JSON.parse((await evaluar(cli, `JSON.stringify(window.__posts)`)) || '[]').map(x => JSON.parse(x));
    const q1 = p1.filter(x => x.action === 'pedidoGrupal')[0];
    chk('desmarcar manda pedidoGrupal con hoja, fila, N° y valor vacío',
        !!q1 && q1.hoja === 'Home' && q1.row === 120 && q1.id === '900' && q1.valor === '', q1);
    chk('   y la pantalla lo desmarca al instante',
        (await evaluar(cli, `(D.pedidos.filter(function(x){return x.n==='900'})[0]||{}).grp`)) === '');

    /* ── 2. Sin marcar ── */
    await evaluar(cli, `window.__posts=[]; 1`);
    const h2 = await ficha(cli, 'Home', '901', 121);
    chk('sin marcar: no hay chapita', !!h2 && h2.indexOf('🎉 Grupal<') < 0, h2 && h2.slice(0, 300));
    chk('   ofrece marcarlo con un "¿de qué?"', !!h2 && h2.indexOf('ordGrupalQue') >= 0 && h2.indexOf('>Marcar<') >= 0);
    await evaluar(cli, `(function(){var i=document.getElementById('ordGrupalQue'); i.value='Cumple de prueba';
      [].slice.call(document.querySelectorAll('.ord-trajo-op')).filter(function(x){return x.textContent==='Marcar'})[0].click(); return 1;})()`);
    await pausa(400);
    const q2 = JSON.parse((await evaluar(cli, `JSON.stringify(window.__posts)`)) || '[]').map(x => JSON.parse(x)).filter(x => x.action === 'pedidoGrupal')[0];
    chk('marcar manda lo que se escribió', !!q2 && q2.valor === 'Cumple de prueba' && q2.row === 121 && q2.id === '901', q2);

    /* ── 3. Clubes: su `gr` es otra cosa ── */
    const h3 = await ficha(cli, 'Clubes', '902', 122);
    chk('un pedido de Clubes (con su grupo en gr) NO dice grupal', !!h3 && h3.indexOf('🎉') < 0, h3 && h3.slice(0, 300));

    /* ── 4. El autopedido: la sub-app arranca recien al abrir su tab, asi que
       se abre sola (?standalone=1), con TODO fetch cortado en la pagina. ── */
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `
      (function(){ window.__fetches=[]; window.fetch=function(u,i){
        var post=!!(i&&String(i.method||'').toUpperCase()==='POST'), b=null;
        if(post){try{b=JSON.parse(i.body);}catch(e){b=String(i.body||'');}}
        window.__fetches.push({post:post,body:b});
        return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({ok:true,n:9999,row:2});},text:function(){return Promise.resolve('{"ok":true}');}});
      };})();
      try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Prueba',ts:Date.now()}));}catch(e){}` });
    await cli.enviar('Page.navigate', { url: BASE + '/ruta.html?standalone=1' });
    if (!await esperar(cli, `typeof npGuardar==='function' && !!document.getElementById('npGrupal')`, 40000)) {
      chk('el autopedido tiene la casilla y el campo', false, 'ruta.html no arranco o falta #npGrupal');
    } else {
      const a = await evaluar(cli, `(function(){var c=document.getElementById('npGrupal'),q=document.getElementById('npGrupalQue');
        var antes=q.hidden; c.checked=true; c.dispatchEvent(new Event('change'));
        var despues=q.hidden; c.checked=false; c.dispatchEvent(new Event('change'));
        return {antes:antes,despues:despues,vuelve:q.hidden};})()`);
      chk('el autopedido tiene la casilla y el campo', true);
      chk('   el "¿de qué?" aparece al tildar y se va al destildar', a.antes === true && a.despues === false && a.vuelve === true, a);
      /* El POST del pedido lleva lo que se escribio. */
      await evaluar(cli, `window.NP_STOCK={PMu:{f:9,p:9}}; NP_STOCK_TS=Date.now();
        var c=document.getElementById('npGrupal'); c.checked=true; c.dispatchEvent(new Event('change'));
        document.getElementById('npGrupalQue').value='Asado de prueba';
        document.getElementById('npNombre').value='Prueba Grupal';
        npCart={}; npCart[NP_CAT_FLAT.filter(function(x){return x.abbr==='PMu'})[0].id]=1;
        npFechaSel=(function(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})();
        npPreciosConfirmados=true; window.confirm=function(){return true}; npGuardar(); 1`);
      await esperar(cli, `(window.__fetches||[]).filter(function(f){return f.post}).length>0`, 8000);
      const post = await evaluar(cli, `(function(){var L=(window.__fetches||[]).filter(function(f){return f.post});return L.length?L[L.length-1].body:null;})()`);
      chk('el POST del pedido lleva grupal con lo que se escribió', !!post && post.grupal === 'Asado de prueba', post ? { grupal: post.grupal, nombre: post.nombre } : null);
      chk('   y al guardar la casilla vuelve a cero',
          (await evaluar(cli, `!document.getElementById('npGrupal').checked && document.getElementById('npGrupalQue').hidden`)) === true);
    }
  } catch (e) { console.log('reventó: ' + e.message); mal++; }
  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
