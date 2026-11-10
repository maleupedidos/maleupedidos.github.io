/* LA SESIÓN DE LA BASE PARA UNA PRUEBA, CON GUARDA DE SOLO LECTURA (7/11/2026).
   Desde el corte (5/11) el ERP lee de la base con la sesión propia (`mc_sbses`). Una prueba que solo
   siembra el token de la hoja Sesiones deja vacías Inicio, Caja, Productos y Evolución: no es el ERP,
   es que la prueba no tiene sesión de la base.
     const sbses = require('./sbses_guarda.js');
     const extra = sbses(process.env.SBSES, 'tadeo');   // '' si no hay SBSES
   SBSES = archivo .json con {access_token, refresh_token} de un usuario TEMPORAL de Auth (lo arma
   estancias/scripts/migraciones/sesion_prueba.py, que lo borra al terminar). El archivo no se versiona.
   La guarda deja pasar solo las RPC *_pantalla, *_datos y permiso_base (nunca una «directo») y la
   renovación de la sesión; todo otro POST/PATCH/PUT/DELETE a cualquier lado se corta y se anota en
   window.__bloqueados. `verificarGuarda(cli, evaluar)` comprueba que corte antes de recorrer. */
'use strict';
const SB_URL = 'https://xhaxmyvhygxynwjqrarm.supabase.co';
const SB_PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';

function sbses(archivo, usuario) {
  if (!archivo) return '';
  const j = JSON.parse(require('fs').readFileSync(archivo, 'utf8'));
  const g = { u: usuario || j.usuario || '', url: j.url || SB_URL, key: j.key || SB_PUB,
    access: j.access_token || j.access, refresh: j.refresh_token || j.refresh,
    hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true };
  return `;try{localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify(g))});}catch(e){}`
    + `;(function(){var f=window.fetch;window.__bloqueados=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
      if(m!=='GET'&&m!=='HEAD'){var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
        var lee=(r&&(/_(pantalla|datos)$/.test(r[1])||r[1]==="permiso_base"||r[1]==="tienda_vendedores"||r[1]==="conteo_ultimo_base"||r[1]==="carne_remito_avance"||r[1]==="prov_costos_previa")&&!/directo/.test(r[1]))||/\\/auth\\/v1\\/token\\?grant_type=refresh_token/.test(s);
        if(!lee){window.__bloqueados.push(m+' '+(r?r[1]:s.slice(0,60))+' '+String((x&&x.body)||'').replace(/("token":")[^"]*/g,'$1***').slice(0,90));return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba (solo lectura)'}),{status:200,headers:{'Content-Type':'application/json'}}));}}
      return f.apply(this,arguments);};})();`;
}

/* Antes de recorrer: una directa y una RPC cualquiera tienen que salir cortadas. Si no, no se sigue. */
async function verificarGuarda(cli, evaluar) {
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
  let g = null;
  for (let i = 0; i < 30 && !g; i++) {
    await pausa(1000);
    try {
      g = await evaluar(cli, `(async function(){
        var a=await (await fetch('${SB_URL}/rest/v1/rpc/pedido_alta_directo',{method:'POST',body:'{}'})).text();
        var b=await (await fetch('${SB_URL}/rest/v1/rpc/ficha_base',{method:'POST',body:'{}'})).text();
        return {directa:/cortado por la prueba/.test(a), base:/cortado por la prueba/.test(b), sesion:!!localStorage.getItem('mc_sbses')}; })()`);
    } catch (e) { g = null; }
  }
  return !!(g && g.directa && g.base && g.sesion);
}

module.exports = sbses;
module.exports.verificarGuarda = verificarGuarda;
