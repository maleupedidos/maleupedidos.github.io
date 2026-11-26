// ¿El motor de Caja ve lo nacido en la base (fila negativa)? (5/11/2026, noche)
//   node _tools/pruebas/probar_caja_motor_nativos.mjs
// 1) Regresión: los datos reales de hoy, con el motor publicado (git HEAD) y con el de ahora → iguales, salvo filas negativas.
// 2) ROLLBACK: un pedido de la tienda entregado con un parcial y cobrado → el motor de ahora lo muestra; el de antes, no.
import fs from 'fs'; import vm from 'vm'; import { execSync } from 'child_process';
const { sql } = await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs');
const motor = (codigo) => { const ctx = { console, JSON, Math, Number, String, Object, Array, Date, RegExp, Error, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Intl, Symbol, Map, Set };
  ctx.G = ctx; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(codigo, ctx); return ctx.CA_MOTOR; };
const nuevo = motor(fs.readFileSync('ca_motor.js', 'utf8')), viejo = motor(execSync('git show HEAD:ca_motor.js', { encoding: 'utf8', maxBuffer: 1e8 }));
const fijo = { ahora: Date.parse('2026-11-05T23:00:00-03:00') };
const tadeo = `SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true);`;
const real = (await sql(`${tadeo} SELECT caja_resto_pantalla() x`)).pop().x;
const a = JSON.stringify(viejo.armar(real, fijo)), b = JSON.stringify(nuevo.armar(real, fijo));
console.log('regresión con los datos reales:', a === b ? 'IGUAL' : 'DISTINTO (' + a.length + ' vs ' + b.length + ')');
const r = (await sql(`BEGIN; SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
CREATE TEMP TABLE a ON COMMIT DROP AS SELECT pedido_alta_directo('{"canal":"Home","nombre":"PRUEBA CAJA MOTOR","telefono":"5491100000995","barrioPrivado":"Estancias del Pilar","subBarrio":"","lote":"995","pago":"Efectivo","envio":0,"dia":"Sábado","fechaEntrega":"2026-11-07","horario":"19 a 21 hs","items":[{"id":1,"qty":2}],"total":23000,"clientOrderId":"co_1762390000000_camotor"}'::jsonb) r;
${tadeo}
CREATE TEMP TABLE pp ON COMMIT DROP AS SELECT channel h, order_number n, source_row r FROM sales_order WHERE customer_name = 'PRUEBA CAJA MOTOR';
CREATE TEMP TABLE e ON COMMIT DROP AS SELECT pedido_entregar_directo(jsonb_build_object('action','marcarEntregado','hoja',h,'id',n,'row',r,'cobrado',false,'propina',0,'repartidor','tadeo','ts',1,'clientOpId','camotor-ent')) r FROM pp;
CREATE TEMP TABLE pa ON COMMIT DROP AS SELECT cobrar_parcial_directo(jsonb_build_object('action','cobrarParcial','quien','Tadeo Ustariz','fechaCobro','','hoja',h,'id',n,'row',r,'formaPago','Efectivo','cuenta','','monto',5000,'notas','Parcial','ts',1,'clientOpId','camotor-parc')) r FROM pp;
CREATE TEMP TABLE co ON COMMIT DROP AS SELECT pedido_cobrar_directo(jsonb_build_object('action','marcarCobrado','quien','Tadeo Ustariz','fechaCobro','','hoja',h,'id',n,'row',r,'formaPago','Efectivo','cuenta','','ef',18000,'tr',0,'propina',0,'aFavor',0,'cliente','PRUEBA CAJA MOTOR','recibidoEf',18000,'repartidor','tadeo','ts',1,'clientOpId','camotor-cob')) r FROM pp;
SELECT caja_resto_pantalla() x; ROLLBACK;`)).pop().x;
const ov = JSON.stringify(viejo.armar(r, fijo)), on = JSON.stringify(nuevo.armar(r, fijo));
const cuenta = (t) => (t.match(/PRUEBA CAJA MOTOR/g) || []).length;
console.log('PRUEBA CAJA MOTOR en Caja → motor de antes:', cuenta(ov), 'veces · motor nuevo:', cuenta(on), 'veces');
const m = on.match(/\{[^{}]*PRUEBA CAJA MOTOR[^{}]*\}/g) || []; m.slice(0, 3).forEach((x) => console.log('  ', x.slice(0, 260)));
console.log('¿en los datos de la base?', JSON.stringify(r).includes('PRUEBA CAJA MOTOR'), '· claves de los datos:', Object.keys(r).join(','));
console.log('claves del motor:', Object.keys(JSON.parse(on)).join(','));
const fila = (r.ped || []).find((x) => JSON.stringify(x).includes('PRUEBA CAJA MOTOR')); console.log('fila del pedido en los datos:', JSON.stringify(fila || null).slice(0, 200));
console.log("parciales en los datos:", JSON.stringify((r.parc || []).filter((x) => JSON.stringify(x).includes("2369")).concat((r.parc || []).filter((x) => JSON.stringify(x).includes("Jimena")))).slice(0, 700));
const OV = JSON.parse(ov), ON = JSON.parse(on);
const plano = (o, p = '', out = {}) => { if (o && typeof o === 'object') Object.keys(o).forEach((k) => plano(o[k], p ? p + '.' + k : k, out)); else if (typeof o === 'number') out[p] = o; return out; };
const pv = plano(OV), pn = plano(ON); const dif = Object.keys(Object.assign({}, pv, pn)).filter((k) => pv[k] !== pn[k] && !/^(ts|_ms)$/.test(k));
console.log('montos distintos entre el motor de antes y el nuevo:', dif.length); dif.slice(0, 12).forEach((k) => console.log('   ', k, pv[k], '→', pn[k]));
const cobFila = (r.cob || []).find((x) => JSON.stringify(x).includes('PRUEBA CAJA MOTOR')); console.log('fila en cob:', JSON.stringify(cobFila || null).slice(0, 160));
console.log('«2369» en la salida → antes:', (ov.match(/2369/g) || []).length, '· nuevo:', (on.match(/2369/g) || []).length, '· «Jimena Galarce» (parcial de planilla) → nuevo:', (on.match(/Jimena Galarce/g) || []).length);
for (const k of Object.keys(ON)) { const t = JSON.stringify(ON[k]); const n = (t.match(/Jimena Galarce/g) || []).length; if (n) console.log('  Jimena en', k, n, '→', (t.match(/\{[^{}]*Jimena Galarce[^{}]*\}/) || [''])[0].slice(0, 300)); }
// Sacando lo de la prueba, el resto tiene que quedar IGUAL que con el motor de antes.
const sinPrueba = (o) => JSON.parse(JSON.stringify(o), (k, v) => Array.isArray(v) ? v.filter((x) => !/PRUEBA CAJA MOTOR|"pedido":"2369"|2369 \(parcial\)/.test(JSON.stringify(x))) : v);
const SV = sinPrueba(OV), SN = sinPrueba(ON); delete SV.caja; delete SN.caja;
const ps = plano(SV), pq = plano(SN); const d2 = Object.keys(Object.assign({}, ps, pq)).filter((k) => ps[k] !== pq[k] && !/(^|\.)(ts|_ms)$/.test(k));
console.log('sin lo de la prueba (y sin los totales de caja), diferencias:', d2.length); d2.slice(0, 15).forEach((k) => console.log('   ', k, ps[k], '→', pq[k]));
if (process.env.VER) { console.log('VIEJO efMano', JSON.stringify(SV.efMano).slice(0, 700)); console.log('NUEVO efMano', JSON.stringify(SN.efMano).slice(0, 700)); console.log('NUEVO efMano con prueba', JSON.stringify(ON.efMano).slice(0, 900)); }
