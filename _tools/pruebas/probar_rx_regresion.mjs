// Reclamos de la bandeja de Red: el motor de ahora contra el publicado, con los datos reales (5/11/2026, noche).
import fs from 'fs'; import vm from 'vm'; import { execSync } from 'child_process';
const { sql } = await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs');
const motor = (c) => { const ctx = { console, JSON, Math, Number, String, Object, Array, Date, RegExp, Error, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Intl, Symbol, Map, Set }; ctx.G = ctx; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(c, ctx); return ctx.RX_MOTOR; };
const nuevo = motor(fs.readFileSync('rx_motor.js', 'utf8')), viejo = motor(execSync('git show HEAD:rx_motor.js', { encoding: 'utf8', maxBuffer: 1e8 }));
const d = (await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true); SELECT red_bandeja_extra_pantalla() x`)).pop().x;
const f = { ahora: Date.parse('2026-11-05T23:00:00-03:00') };
const a = JSON.stringify(viejo.armar(d, f)), b = JSON.stringify(nuevo.armar(d, f));
console.log('filas nativas de Red en los datos:', (d.red || []).filter((x) => x[0] < 0).length, '· reclamos iguales:', a === b ? 'SÍ' : 'NO', a.length, b.length);
if (a !== b) console.log(a.slice(0, 400), '\n', b.slice(0, 400));
