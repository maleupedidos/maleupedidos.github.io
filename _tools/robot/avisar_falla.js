/* Si el robot de GitHub falla, UNA línea al Telegram «Maleu · Resúmenes» (11/11/2026, migración 654).
     ROBOT_USUARIO=… ROBOT_PIN=… FALLO="qué falló" RUN_ID=… RUN_URL=… VERSION=… node _tools/robot/avisar_falla.js
   Entra como el usuario robot por la base (login_pin → contraseña de Auth, lo mismo que el ERP) y llama a
   robot_falla_avisar. No lleva token de Telegram: el aviso lo manda la base. La URL y la clave pública son las de
   app.html (públicas). Si no puede avisar, no rompe nada: el run ya está en rojo igual. */
'use strict';
const URL_SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', KEY = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const H = (t) => ({ apikey: KEY, Authorization: 'Bearer ' + (t || KEY), 'Content-Type': 'application/json' });
(async () => {
  const u = process.env.ROBOT_USUARIO, pin = process.env.ROBOT_PIN;
  if (!u || !pin) { console.log('sin credenciales del robot: no aviso'); return; }
  const lp = await (await fetch(URL_SB + '/rest/v1/rpc/login_pin', { method: 'POST', headers: H(), body: JSON.stringify({ p_usuario: u, p_pin: pin }) })).json();
  if (!lp || !lp.ok || !lp.email) { console.log('no pude entrar como el robot: ' + JSON.stringify(lp && lp.err)); return; }
  const tk = await (await fetch(URL_SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: H(), body: JSON.stringify({ email: lp.email, password: lp.clave }) })).json();
  if (!tk || !tk.access_token) { console.log('no pude sacar el token del robot'); return; }
  const r = await fetch(URL_SB + '/rest/v1/rpc/robot_falla_avisar', { method: 'POST', headers: H(tk.access_token),
    body: JSON.stringify({ p: { que: process.env.FALLO || '', run: process.env.RUN_ID || '', url: process.env.RUN_URL || '', version: process.env.VERSION || '' } }) });
  console.log('aviso al Telegram: ' + r.status + ' ' + (await r.text()).slice(0, 200));
})().catch((e) => console.log('no pude avisar: ' + (e && e.message)));
