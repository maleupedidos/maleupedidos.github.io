/* QUÉ PANTALLAS TOCA ESTE COMMIT (15/11/2026), para que deploy.sh corra el detector de pisadas solo ahí.
 *
 *   node _tools/pisadas_tabs.js            → «ventas,ajustes» (o «» si no se tocó ninguna pantalla)
 *
 * Mira el diff contra origin/main de las fuentes (panel, ruta, red, busqueda) y, por cada pedazo cambiado, el nombre de la
 * función o la regla CSS más cercana; el prefijo dice de qué pantalla es. Si cambió algo que no reconoce en el panel (el
 * kit, una regla común), devuelve las pantallas de siempre (inicio, ventas, pedidos, ajustes): mejor medir de más.
 */
'use strict';
const { execSync } = require('child_process');
const sh = (c) => { try { return execSync(c, { encoding: 'utf8', maxBuffer: 64 << 20 }); } catch (e) { return ''; } };
const PREF = [
  [/^_?(vt|v[A-Z]|vc|vl|vf|_v|venta|tend|_tend|rt[A-Z]|_rt)/, 'ventas'], [/^_?(aj|ap[A-Z]|pr[A-Z]|stFrz|_stFrz|frz|entregaCambiar|_entrega)/, 'ajustes'],
  [/^_?(st[A-Z]|stc|stm|_stm|_st[A-Z]|dep|_dep)/, 'stock'], [/^_?(eerr|_eerr|res[A-Z]|_res|proy|_proy|fin|_fin)/, 'resultados'],
  [/^_?(cj|caja|_caja|cob[A-Z]|_cob)/, 'caja'], [/^_?(ord|_ord|ped|_ped|np[A-Z]|_np)/, 'pedidos'], [/^_?(crm|_crm|est[A-Z]|_est|ficha|_ficha)/, 'estancias'],
  [/^_?(mr[A-Z]|_mr)/, 'mireparto'], [/^_?(mp[A-Z]|_mp|dv|_dv)/, 'miportal'], [/^_?(inicio|_inicio|hoy|_hoy|render)/, 'inicio'], [/^_?(cat[A-Z]|_cat|catering)/, 'catering'],
  [/^_?(egr|_egr)/, 'egresos'], [/^_?(evu|_evu|evol)/, 'evolucion'], [/^_?(plan|_plan)/, 'planificacion'], [/^_?(pv[A-Z]|_pv|prov)/, 'proveedores'],
];
const FUENTE = { 'ruta.html': ['ruta'], 'red.html': ['miportal', 'ventas'], 'busqueda.html': ['busqueda'] };
const tabs = new Set();
const files = sh('git diff --name-only origin/main -- _src/panel.src.html ruta.html red.html busqueda.html').split('\n').filter(Boolean);
for (const f of files) {
  if (FUENTE[f]) { FUENTE[f].forEach((t) => tabs.add(t)); continue; }
  const diff = sh('git diff -U0 origin/main -- ' + f);
  let comun = false;
  diff.split('\n').filter((l) => l.startsWith('@@')).forEach((h) => {
    const ctx = (h.split('@@')[2] || '').trim();
    const m = /function\s+([A-Za-z_$][\w$]*)|window\.([A-Za-z_$][\w$]*)\s*=|^\s*([.#][\w-]+)/.exec(ctx);
    const nom = m ? (m[1] || m[2] || (m[3] || '').replace(/^[.#]/, '')) : '';
    const p = PREF.find(([re]) => re.test(nom) || re.test(nom.replace(/-/g, '')));
    if (p) tabs.add(p[1]); else comun = true;
  });
  if (comun) ['inicio', 'ventas', 'pedidos', 'ajustes'].forEach((t) => tabs.add(t));
}
process.stdout.write(Array.from(tabs).join(','));
