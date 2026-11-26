// Mi Reparto y Descargar el auto: el motor de ahora contra el publicado, con los datos reales (5/11/2026, noche).
import fs from 'fs'; import vm from 'vm'; import { execSync } from 'child_process';
const { sql } = await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs');
const motor = (c, n) => { const ctx = { console, JSON, Math, Number, String, Object, Array, Date, RegExp, Error, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Intl, Symbol, Map, Set }; ctx.G = ctx; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(c, ctx); return ctx[n]; };
const adm = `SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true);`;
const f = { ahora: Date.parse('2026-11-05T23:00:00-03:00') };
for (const [n, arch, q, o] of [['PG_MOTOR', 'pg_motor.js', 'pendientes_guardar_pantalla()', {}], ['MR_MOTOR', 'mr_motor.js', `mi_reparto_pantalla('{"usuario":"tadeo","fecha":"2026-11-05"}'::jsonb)`, { p: { usuario: 'tadeo', fecha: '2026-11-05' } }]]) {
  let d; try { d = (await sql(`${adm} SELECT ${q} x`)).pop().x; } catch (e) { console.log(n, 'no pude leer los datos:', String(e.message).slice(0, 160)); continue; }
  const a = JSON.stringify(motor(execSync('git show HEAD:' + arch, { encoding: 'utf8', maxBuffer: 1e8 }), n).armar(d, Object.assign({}, f, o)));
  const b = JSON.stringify(motor(fs.readFileSync(arch, 'utf8'), n).armar(d, Object.assign({}, f, o)));
  console.log(n, 'iguales:', a === b ? 'SÍ' : 'NO', a.length, b.length, '·', b.slice(0, 120));
}
