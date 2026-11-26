/* LOS MOTORES EN UN HILO APARTE (29/10/2026): `_motorHilo` tiene que dar EXACTAMENTE lo mismo que el camino de
   siempre, y sin trabar la pantalla.
     BASE_URL=http://localhost:8080/app.html node _tools/pruebas/probar_motor_hilo.js <token>
   Sesión real (solo lecturas: las RPC *_pantalla pasan sesion_prep). Por cada motor (Caja, Abastecimiento, Cobros de
   Ruta): pide sus datos reales a la base UNA vez, los arma en el Worker y en el hilo de la pantalla, compara el JSON
   (sin `ts`) y mide las tareas largas de cada camino. CPU x4. Y al revés: con el Worker roto (`_MH.roto`) tiene que
   usar el camino de siempre y dar lo mismo. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL_APP = process.env.BASE_URL || 'http://localhost:8080/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
const MOTORES = [
  ['CA_MOTOR', 'ca_motor.js', 'caja_resto_pantalla', `function(d){return _motorArmar('CA_MOTOR','ca_motor.js',d,{})}`, `function(d){return _motorArmarAca('CA_MOTOR','ca_motor.js',d,{})}`],
  ['BQ_MOTOR', 'bq_motor.js', 'busqueda_pantalla', `_bqMotorArmar`, `_bqMotorArmarAca`],
  ['CP_MOTOR', 'cp_motor.js', 'cobros_pendientes_pantalla', `_cpMotorArmar`, `_cpMotorArmarAca`]
];
(async () => {
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;window.__lt=[];try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){__lt.push({s:e.startTime,d:e.duration})})}).observe({type:'longtask'})}catch(e){}` });
    await cli.enviar('Page.enable', {});
    cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await cli.enviar('Page.navigate', { url: URL_APP });
    for (let i = 0; i < 160 && !(await cdp.evaluar(cli, `typeof _motorHilo==='function'&&!!window._sbPerm&&typeof _sbPermiso==='function'`).catch(() => false)); i++) await pausa(500);
    await pausa(3000);
    await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
    for (const [glob, arch, rpc, hilo, aca] of MOTORES) {
      const r = await cdp.evaluar(cli, `(function(){
        /* Fuera lo que mide el reloj (ts, _ms, pagosMs): cambia entre dos corridas en el MISMO hilo. */
        var limpiar=function(o){return JSON.stringify(o,function(k,v){return (k==='ts'||k==='_ms'||k==='pagosMs')?undefined:v})};
        var bloq=function(t0){return Math.round(__lt.filter(function(x){return x.s>=t0}).reduce(function(a,x){return a+x.d},0))};
        return Promise.resolve(_sbPermiso(true)).then(function(sb){
          return fetch(sb.url+'/rest/v1/rpc/${rpc}',{method:'POST',headers:{apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'},body:'{}'}).then(function(x){return x.json()});
        }).then(function(datos){
          var copia=function(){return JSON.parse(JSON.stringify(datos))};
          var t1=performance.now();
          return (${hilo})(copia()).then(function(a){
            var b1=bloq(t1); var t2=performance.now();
            return new Promise(function(r){setTimeout(r,800)}).then(function(){ t2=performance.now(); return (${aca})(copia()); }).then(function(b){
              return new Promise(function(r){setTimeout(r,800)}).then(function(){
                return {iguales:limpiar(a)===limpiar(b),largo:limpiar(a).length,hiloBloq:b1,acaBloq:bloq(t2),enHilo:!_MH.roto&&!!_MH.w};
              });
            });
          });
        }).catch(function(e){return {error:String(e&&e.message||e)}});
      })()`);
      if (r.error) { chk(glob + ': ' + r.error, false, r); continue; }
      chk(`${glob}: el Worker da lo mismo que el camino de siempre (${r.largo} bytes)`, r.iguales, r);
      chk(`${glob}: corrió en el Worker`, r.enHilo, r);
      chk(`${glob}: la pantalla queda trabada ${r.hiloBloq} ms con el Worker contra ${r.acaBloq} ms sin él`, r.hiloBloq < r.acaBloq, r);
    }
    /* Al revés: con el Worker roto, el camino de siempre (y lo mismo). */
    const v = await cdp.evaluar(cli, `(function(){_MH.roto=true;return Promise.resolve(_sbPermiso(true)).then(function(sb){
        return fetch(sb.url+'/rest/v1/rpc/cobros_pendientes_pantalla',{method:'POST',headers:{apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'},body:'{}'}).then(function(x){return x.json()});
      }).then(function(d){return _cpMotorArmar(d)}).then(function(o){_MH.roto=false;return {ok:!!o}},function(e){_MH.roto=false;return {error:String(e)}})})()`);
    chk('con el Worker roto, cae al camino de siempre', v.ok === true, v);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
