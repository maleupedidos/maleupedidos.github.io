// Lado front listo (4/11/2026): bandeja de Red, cierre del día y CRM.
// Palanca apagada → Apps Script con el mismo cuerpo. Palanca prendida → /rest/v1/rpc/<fn> con {p:cuerpo}.
'use strict';
const cdp = require('./cdp.js');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const PUERTO = process.argv[2] || '8157';
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html?prueba=1&v=' + Date.now() });
  await pausa(7000);
  const r = await cdp.evaluar(cli, `(async function(){
    var log=[], of=window.fetch;
    window.fetch=function(u,i){ u=String(u);
      if(u.indexOf('script.google.com')>=0||u.indexOf('x.supabase.co')>=0){ var b=null; try{ b=JSON.parse(i&&i.body); }catch(e){}
        log.push({u:u.indexOf('x.supabase.co')>=0?u.split('/rpc/')[1]:'apps', a:b&&(b.action||(b.p&&b.p.action))});
        return Promise.resolve(new Response(JSON.stringify({ok:true,vendedor:'Fede X',avisoOk:true}),{status:200,headers:{'Content-Type':'application/json'}})); }
      return of.apply(this,arguments); };
    var PAL={};
    window._palancaVal=function(k){ return k==='directas'?PAL:null; };
    window._sbPermiso=function(){ return Promise.resolve({url:'https://x.supabase.co',key:'k',token:'t',pal:{}}); };
    window._pfAplicar=function(){ return Promise.resolve(); };
    async function correr(){
      var desde=log.length;
      /* 1) bandeja */
      window._rbDatos={pendientes:[{row:7,n:999,v:'Fede X'}],vendedores:[]};
      rbConfirmar(7);
      /* 2) cierre del día */
      ['mrCierreReal','mrCierreNotas','mrBtnCierreConf'].forEach(function(id){ if(!document.getElementById(id)){ var e=document.createElement(id==='mrBtnCierreConf'?'button':'input'); e.id=id; document.body.appendChild(e);} });
      document.getElementById('mrCierreReal').value='1000';
      _mrCajaCtx={usuario:'robot',fechaISO:'2026-11-04',bil:0,cobEf:0,pem:1000};
      try{ window.loadMiReparto=function(){}; window.mrCloseCierre=function(){}; }catch(e){}
      mrConfirmCierre();
      /* 3) CRM, por el interceptor */
      ['crmSetNotasTags','crmLogInteraccion'].forEach(function(ac){ var b={action:ac,tel:'5490000000001'}; var d=_ordenDirecta(b); if(d&&d.then)d.then(function(x){ if(!x)log.push({u:'apps',a:ac}); }); });
      await new Promise(function(r){setTimeout(r,1500);});
      return log.slice(desde);
    }
    var off=await correr();
    PAL={redConfirmar:true,cerrarDiaReparto:true,crmSetNotasTags:true,crmLogInteraccion:true};
    var on=await correr();
    var vistos=[], od=window._ordenDirecta; window._ordenDirecta=function(b){ vistos.push(b.action); return Promise.resolve({ok:true}); };
    try{ localStorage.removeItem('maleu_token'); }catch(e){}
    await of(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'crmSetNotasTags',tel:'5490000000001'})});
    window._ordenDirecta=od;
    return {off:off,on:on,interceptor:vistos}; })()`);
  console.log(JSON.stringify(r));
  const de = (l, a) => (l.find((x) => x.a === a) || {}).u;
  const esperado = { redConfirmar: 'red_confirmar_directo', cerrarDiaReparto: 'reparto_cierre_directo', crmSetNotasTags: 'crm_notas_tags_directo', crmLogInteraccion: 'crm_interaccion_directo' };
  let mal = 0;
  for (const a of Object.keys(esperado)) {
    const off = de(r.off, a), on = de(r.on, a);
    const ok1 = off === 'apps', ok2 = on === esperado[a];
    if (!ok1 || !ok2) mal++;
    console.log((ok1 && ok2 ? 'ok   ' : 'MAL  ') + a + ': apagada → ' + off + ' · prendida → ' + on);
  }
  const okI = (r.interceptor||[]).indexOf('crmSetNotasTags')>=0; if(!okI) mal++;
  console.log((okI?'ok   ':'MAL  ')+'el interceptor marca la orden del CRM sin token de Apps Script');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
