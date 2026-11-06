// (6/11/2026) ARMADO EN VIVO: un aparato escucha erp:pedidos y otro marca el armado de un pedido PRUEBA. Necesita la policy temporal de prueba.
// Realtime aislado (5/11/2026): UN socket, UN canal (el del representante de prueba), sin navegador. ¿Llega el aviso de la base?
//   node _tools/pruebas/probar_socket_un_canal.mjs [canal]   (por defecto erp:red:pruebarobot; dispara un autopedido PRUEBA y lo cancela)
import fs from 'fs'; import path from 'path'; import os from 'os';
const { sql } = await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs');
const URL = 'https://xhaxmyvhygxynwjqrarm.supabase.co', KEY = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const j = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const USU = j.repUsuario || 'pruebarobot', PIN = String(j.pinRep || '');
const CANALES = (process.argv[2] || 'erp:red:' + USU).split(',');
const H = (t) => ({ apikey: KEY, Authorization: 'Bearer ' + (t || KEY), 'Content-Type': 'application/json' });
const lp = await (await fetch(URL + '/rest/v1/rpc/login_pin', { method: 'POST', headers: H(), body: JSON.stringify({ p_usuario: USU, p_pin: PIN }) })).json();
if (!lp || !lp.ok) { console.log('no entró', lp && lp.err); process.exit(2); }
const tk = await (await fetch(URL + '/auth/v1/token?grant_type=password', { method: 'POST', headers: H(), body: JSON.stringify({ email: lp.email, password: lp.clave }) })).json();
const token = tk.access_token;
const ws = new WebSocket(URL.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(KEY) + '&vsn=1.0.0');
const t0 = Date.now(), log = (...a) => console.log(String(Date.now() - t0).padStart(6), ...a);
let unido = false, llego = null, n = null, fila = null;
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.event === 'phx_reply' && /^\d+$/.test(String(m.ref))) { if (m.ref === '1') unido = m.payload.status === 'ok'; log('union', m.topic, m.payload.status, JSON.stringify(m.payload.response).slice(0, 100)); }
  else if (m.event === 'broadcast') { if (m.topic === 'realtime:' + CANALES[0] && !llego) llego = Date.now(); log('AVISO', m.topic, JSON.stringify(m.payload.payload).slice(0, 100)); } else if (m.event !== 'phx_reply') log('otro', m.event, JSON.stringify(m.payload).slice(0, 120)); };
ws.onclose = (e) => log('cerrado', e.code, e.reason);
await new Promise((r) => { ws.onopen = r; });
CANALES.forEach((c, i) => ws.send(JSON.stringify({ topic: 'realtime:' + c, event: 'phx_join', payload: { config: { broadcast: { ack: false, self: false }, presence: { key: '' }, postgres_changes: [], private: true }, access_token: token }, ref: String(i + 1), join_ref: String(i + 1) })));
const latido = setInterval(() => { try { ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'h' + Date.now() })); } catch (e) {} }, 20000);
for (let i = 0; i < 40 && !unido; i++) await new Promise((r) => setTimeout(r, 250));
await new Promise((r) => setTimeout(r, 1500));
const tD = Date.now(); log('disparo: armado de', process.env.PEDIDO);
const [h, num] = String(process.env.PEDIDO).split('|');
const r = await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true),
  ruta_armado_directo(jsonb_build_object('action','marcarArmado','armado',${process.env.ARMADO || 'true'},'pedidos',jsonb_build_array(jsonb_build_object('h','${h}','id','${num}','c','PRUEBA Robot','r',-${num})),'usuario','Tadeo Ustariz','ts',1,'clientOpId','arm-vivo-'||floor(extract(epoch from clock_timestamp())*1000)::text)) r`);
log('respuesta', JSON.stringify(r[r.length - 1].r).slice(0, 160));
for (let i = 0; i < 100 && !llego; i++) await new Promise((r) => setTimeout(r, 200));
console.log(llego ? `OK: el aviso del armado llegó en ${llego - tD} ms` : 'MAL: el aviso NO llegó en 20 s');
clearInterval(latido); ws.close(); process.exit(llego ? 0 : 1);
