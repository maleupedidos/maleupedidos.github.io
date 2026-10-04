/* CADA PEDIDO AL BACKEND DICE QUE VERSION DEL ERP LO MANDA (4/10/2026).

     node probar_version_viaja.js

   Lucas dijo que su ERP "no se actualiza como el de Tadeo" y no habia ningun
   dato de que version tenia su celular: solo se veia en el menu de usuario de
   ESE celular. Ahora el interceptor de sesion le agrega `cv` ("497|pc-web") a
   cada GET y a cada POST con sesion, y el backend lo anota en `Versiones App`.

   Se prueba sobre el app.html COMPILADO y con el interceptor de verdad (sin
   ?prueba=1, que justamente no lo instala). El backend se simula ANTES de que
   cargue la pagina: no sale nada a produccion. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 300) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));

/* Corre antes que cualquier script de la pagina: sesion falsa y un backend que
   contesta {ok:true} a todo y anota que le pidieron. */
const ANTES = `
  try{
    localStorage.setItem('maleu_token','tok-prueba');
    localStorage.setItem('maleu_panel_session', JSON.stringify({usuario:'prueba',nombre:'Prueba',rol:'admin',token:'tok-prueba',tabs:['inicio']}));
  }catch(e){}
  window.__pedidos=[];
  window.alert=function(){}; window.confirm=function(){return false};
  (function(){
    var real=window.fetch.bind(window);
    window.fetch=function(u,o){
      var url=String((u&&u.url)||u);
      if(url.indexOf('script.google')>=0){
        window.__pedidos.push({url:url, body:(o&&typeof o.body==='string')?o.body:''});
        return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));
      }
      return real(u,o);
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: ANTES });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    await pausa(9000);

    const peds = await evaluar(cli, `JSON.stringify(window.__pedidos||[])`).then(JSON.parse);
    const gets = peds.filter(p => !p.body);
    chk('la app hizo pedidos al backend (si no, no se miro nada)', gets.length > 0, { pedidos: peds.length });
    const conTok = gets.filter(p => /[?&]token=tok-prueba/.test(p.url));
    chk('   y llevan el token (el interceptor de verdad esta puesto)', conTok.length > 0 && conTok.length === gets.length,
      { gets: gets.length, conToken: conTok.length });
    const cvs = conTok.map(p => { const m = p.url.match(/[?&]cv=([^&]*)/); return m ? decodeURIComponent(m[1]) : null; });
    chk('TODOS los GET con sesion dicen su version', cvs.length > 0 && cvs.every(v => !!v), cvs.slice(0, 5));
    const cn = await evaluar(cli, `typeof _APP_CN_PAGINA==='string'?_APP_CN_PAGINA:''`);
    const num = String(cn).replace('maleu-panel-v', '');
    chk('   y es la version de ESTA pagina (' + num + ')', cvs.length > 0 && cvs.every(v => v && v.split('|')[0] === num), { cn, cvs: cvs.slice(0, 3) });
    chk('   y el aparato (pc-web en esta prueba)', cvs.length > 0 && cvs.every(v => v && v.split('|')[1] === 'pc-web'), cvs.slice(0, 3));

    /* Un POST con sesion tambien. */
    await evaluar(cli, `fetch(API,{method:'POST',body:JSON.stringify({action:'ver'})}); 1`);
    await pausa(800);
    const post = await evaluar(cli, `(function(){var p=window.__pedidos.filter(function(x){return x.body}).pop();return p?p.body:''})()`);
    let pb = {}; try { pb = JSON.parse(post); } catch (e) {}
    chk('un POST tambien la lleva', pb.cv && pb.cv.split('|')[0] === num && pb.token === 'tok-prueba', pb);

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
