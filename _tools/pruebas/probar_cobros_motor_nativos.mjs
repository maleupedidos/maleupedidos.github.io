// ¿El motor de Cobros ve los pedidos NACIDOS EN LA BASE (fila negativa)? (5/11/2026, noche)
//   node _tools/pruebas/probar_cobros_motor_nativos.mjs
// En la base (ROLLBACK): un pedido de la tienda entregado y sin cobrar. Se toman los datos que la base le da al motor
// (`cobros_pendientes_datos`) y se corre el motor real (_src/cp_motor_shim.js + el común) como en el navegador.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const { sql } = await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG = process.env.SIN_557 ? '' : fs.readFileSync('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/database/migrations/557_cobros_escala_red_nativos.sql', 'utf8').replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');
const r = await sql(`BEGIN;
${MIG}
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
CREATE TEMP TABLE a ON COMMIT DROP AS SELECT pedido_alta_directo('{"canal":"Home","nombre":"PRUEBA COBROS MOTOR","telefono":"5491100000997","barrioPrivado":"Estancias del Pilar","subBarrio":"","lote":"997","pago":"Efectivo","envio":0,"dia":"Sábado","fechaEntrega":"2026-11-07","horario":"19 a 21 hs","items":[{"id":1,"qty":1}],"total":11500,"clientOrderId":"co_1762390000000_cpmotor"}'::jsonb) r;
SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true);
CREATE TEMP TABLE e ON COMMIT DROP AS SELECT pedido_entregar_directo(jsonb_build_object('action','marcarEntregado','hoja','Home','id',order_number,'row',source_row,'cobrado',false,'propina',0,'repartidor','tadeo','ts',1,'clientOpId','cpmotor-ent')) r
  FROM sales_order WHERE customer_name = 'PRUEBA COBROS MOTOR' AND deleted_at IS NULL;
CREATE TEMP TABLE b ON COMMIT DROP AS SELECT red_bolsa_directo('{"action":"marcarEntregadoAVendedor","rows":[-2366,-2367],"vendedor":"Lourdes Thomas","ts":1,"clientOpId":"cpmotor-bolsa"}'::jsonb) r;
SELECT jsonb_build_object('pedido', (SELECT order_number || ' fila ' || source_row FROM sales_order WHERE customer_name = 'PRUEBA COBROS MOTOR'),
  'datos', cobros_pendientes_datos(), 'red_nativos', (SELECT jsonb_agg(order_key) FROM sales_order WHERE channel = 'Red' AND raw_cells IS NULL AND deleted_at IS NULL AND order_state NOT IN ('Cancelado'))) x;
ROLLBACK;`);
const x = r[r.length - 1].x; const datos = x.datos;
console.log('pedido de prueba:', x.pedido, '· en los datos de la base:', JSON.stringify(datos).includes('PRUEBA COBROS MOTOR'));
const ctx = { console, JSON, Math, Number, String, Object, Array, Date, RegExp, Error, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Intl, Symbol, Map, Set };
ctx.G = ctx; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RAIZ, 'cp_motor.js'), 'utf8'), ctx, { filename: 'cp_motor.js' });
const o = ctx.CP_MOTOR.armar(datos, {});
const txt = JSON.stringify(o);
console.log('el motor devolvió', Object.keys(o).join(','));
console.log('PRUEBA COBROS MOTOR en lo que muestra Cobros:', txt.includes('PRUEBA COBROS MOTOR') ? 'SÍ' : 'NO');
for (const k of x.red_nativos || []) { const n = k.split('|')[1]; const ent = JSON.stringify(o).match(new RegExp('\{[^{}]*"(id|n)":"' + n + '"[^{}]*\}')); console.log('Red nativo', k, 'en Cobros:', ent ? ent[0].slice(0, 160) : 'NO'); }
const cp = (o.cobros || []).find((c) => c.c === 'PRUEBA COBROS MOTOR'); console.log('el cobro de prueba:', cp ? JSON.stringify({ key: cp.key, r: cp.r, $: cp.$, es: cp.es }) : 'NO');
if (process.env.VER) { console.log('cobro de ejemplo:', JSON.stringify((o.cobros || [])[0]).slice(0, 600)); console.log('sinCerrar ejemplo:', JSON.stringify((o.sinCerrar || [])[0] || null).slice(0, 400)); }

console.log('Lou en sinCerrar (rendición pendiente):', JSON.stringify((o.sinCerrar || []).filter((v) => /Lourdes/.test(JSON.stringify(v)))).slice(0, 400));
