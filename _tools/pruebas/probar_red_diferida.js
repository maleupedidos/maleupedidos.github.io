/* Las bolsas de Red y el pase como órdenes, del lado de la pantalla (18/10/2026).

     node probar_red_diferida.js            (BASE=http://localhost:<puerto>)

   Lo que tiene que ser cierto en el panel (app.html?prueba=1, backend simulado):
   · `_pdPost` (Por decidir, el pase) empuja al aplicador cuando la respuesta
     viene diferida, ANTES de devolverla; sin diferida, no empuja;
   · entregar en Red y devolver la bolsa mandan un id (sin id no son órdenes);
   · el aviso del pase sin número de Red dice «a Red» (no «Red #undefined»). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 300) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const BACKEND = `(function(resp){
  window.__posts=[];
  window.fetch=function(u,o){
    var body={}; try{body=JSON.parse((o&&o.body)||'{}')}catch(e){}
    if(o&&o.method==='POST'){ window.__posts.push(body); }
    var r=body.action==='pedidosFuenteAplicar'?{ok:true,hechas:1}:resp;
    return Promise.resolve(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}}));
  };
  return 1;
})`;
const ACC = `JSON.stringify(window.__posts.map(function(p){return p.action}))`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    const t0 = Date.now();
    while (Date.now() - t0 < 60000 && !(await evaluar(cli, `typeof _pdPost==='function'&&typeof _pfAplicar==='function'`).catch(() => false))) await pausa(300);

    console.log('\n== _pdPost ==\n');
    await evaluar(cli, BACKEND + `({ok:true,diferida:true,red:{n:''},vendedor:'Marcos Bottcher'})`);
    let r = await evaluar(cli, `_pdPost({action:'pasarAVendedor',clientOpId:'x'}).then(function(d){return JSON.stringify({d:d,orden:window.__posts.map(function(p){return p.action})});})`);
    r = JSON.parse(r);
    chk('con diferida: empuja al aplicador antes de devolver la respuesta', JSON.stringify(r.orden) === '["pasarAVendedor","pedidosFuenteAplicar"]' && r.d.diferida === true, r);
    await evaluar(cli, BACKEND + `({ok:true,red:{n:130}})`);
    await evaluar(cli, `_pdPost({action:'pasarAVendedor',clientOpId:'y'})`);
    await pausa(200);
    chk('sin diferida: NO empuja', await evaluar(cli, ACC) === '["pasarAVendedor"]', await evaluar(cli, ACC));

    console.log('\n== las fuentes ==\n');
    const src = await evaluar(cli, `[].slice.call(document.scripts).map(function(x){return x.textContent}).join('\\n')`);
    chk('entregar en Red manda un id', /action:'marcarEntregadoRed',row:row,clientOpId:_pfId\(\)/.test(src));
    chk('devolver la bolsa manda un id', /action:'devolucionVendedorRed',row:row,clientOpId:_pfId\(\)/.test(src));
    chk('el aviso del pase sin número dice «a Red»', /r\.red&&r\.red\.n\?' \(Red #'\+r\.red\.n\+'\)':' \(a Red\)'/.test(src) && !/\(Red #'\+r\.red\.n\+'\)'\+\(r\.piezasMovidas/.test(src));
  } catch (e) { console.log('  MAL  revento: ' + (e && e.message)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
