/* ══════════════════════════════════════════════════
   MALEU — PILAR GLOBAL
   Unifica Home + Delivery en una sola web
   ══════════════════════════════════════════════════ */

/* ── PRODUCTOS ── */
const PRODUCTOS = [
  { id:1,  cat:"Pizzas Individuales",   nombre:"Pizza Margarita",              desc:"Tomate fresco, mozzarella y albahaca. La que nunca falla.",                        precio:11200, img:"pizza-margarita-cocida.jpg", emoji:"🍕", top:true, chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:2,  cat:"Pizzas Individuales",   nombre:"Pizza Jamón y Queso",           desc:"Mucho jamón, mucho queso. Simple, efectiva y sin dramas.",                        precio:11200, img:"pizza-jamon-queso-cocida.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:3,  cat:"Pizzas Individuales",   nombre:"Pizza Cebolla Caramelizada",    desc:"Cebolla bien dulce con queso cremoso. Para los que saben.",                       precio:11200, img:"pizza-cebolla-cocida.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:4,  cat:"Pizzas Individuales",   nombre:"Pizza Jamón y Morrón",          desc:"Con jamón, morrón rojo y orégano. Completa y sabrosa.",                           precio:12000, img:"pizza-jamon-morron-cocida.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:19, cat:"Pizzas Individuales",   nombre:"Pizza Muzzarella",              desc:"Puro queso derretido sobre salsa de tomate. La clásica que nunca sobra.",          precio:11000, img:"pizza-muzarella-cocida.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:5,  cat:"Pack Pizzas x2",  nombre:"Pack Muzarella x2",             desc:"Dos pizzas de muzzarella. Cena resuelta para toda la semana.",                   precio:17000, img:"pack-muzarella-cocida.jpg", emoji:"🍕", top:true, chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:6,  cat:"Pack Pizzas x2",  nombre:"Pack Jamón y Queso x2",         desc:"Dos pizzas de jamón y queso. Una para hoy, una para cuando querás.",             precio:17000, img:"pack-jamon-queso-cocida.jpg", emoji:"🍕", chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:7,  cat:"Pack Pizzas x2",  nombre:"Pack Cebolla y Queso x2",       desc:"Dos pizzas con cebolla caramelizada. Guardá una para mañana.",                   precio:17000, img:"pack-cebolla-queso-cocida.jpg", emoji:"🍕", chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:8,  cat:"Sorrentinos",      nombre:"Sorrentinos Cordero al Malbec", desc:"Cordero, zanahoria, apio, cebolla y especias. Distinto y muy rico.",             precio:19800, img:"sorrentinos-cordero-v2.jpg", emoji:"🍝", chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:9,  cat:"Sorrentinos",      nombre:"Sorrentinos Jamón y Queso",     desc:"Relleno cremoso y generoso. El favorito de la familia.",                         precio:18300, img:"sorrentinos-jamon-v2.jpg", emoji:"🍝", top:true, chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:10, cat:"Sorrentinos",      nombre:"Sorrentinos Calabaza y Queso",  desc:"Suave, dulce y sabroso. Relleno cremoso de calabaza y queso.",                   precio:16500, img:"sorrentinos-calabaza-v2.jpg", emoji:"🍝", chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:20, cat:"Sorrentinos",      nombre:"Sorrentinos Queso Brie",        desc:"Queso brie cremoso y perfumado. Gourmet sin vueltas.",                          precio:22100, img:"sorrentinos-brie.png",      emoji:"🍝", zonas:["pilar"], chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:21, cat:"Sorrentinos",      nombre:"Sorrentinos Langostinos al Azafrán", desc:"Langostinos y azafrán en masa casera. Muy gourmet.",                      precio:22100, img:"sorrentinos-langostinos.png",emoji:"🍝", zonas:["pilar"], chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:22, cat:"Sorrentinos",      nombre:"Sorrentinos Pollo y Puerro",    desc:"Pollo tierno con puerro salteado. Suave, sabroso y muy rendidor.",              precio:18300, img:"sorrentinos-pollo-puerro.png",emoji:"🍝", zonas:["pilar"], chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:23, cat:"Sorrentinos",      nombre:"Sorrentinos Espinaca",          desc:"Espinaca con queso cremoso. Verde, suave, tradicional.",                         precio:17000, img:"sorrentinos-espinaca.png",   emoji:"🍝", zonas:["pilar"], chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:11, cat:"Empanadas",        nombre:"Empanadas Carne a Cuchillo x8", desc:"Carne cortada a cuchillo, jugosa y bien condimentada. Las que piden todos.",     precio:19000, img:"empanadas-carne-v2.jpg", emoji:"🥟", top:true, chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:12, cat:"Empanadas",        nombre:"Empanadas Jamón y Queso x8",    desc:"Cremosas por dentro, doraditas por fuera. Para cualquier momento.",              precio:18000, img:"empanadas-jamon-v2.jpg", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:17, cat:"Empanadas",        nombre:"Empanadas Cebolla y Queso Azul x8",  desc:"Cebolla caramelizada con queso azul. Intensas y cremosas.",               precio:18000, img:"empanadas-cebolla-v2.jpg", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:18, cat:"Empanadas",        nombre:"Empanadas Verdura x8",          desc:"Relleno de verdura fresca y queso. Livianas y riquísimas.",                      precio:18000, img:"empanadas-verdura-v2.jpg", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:24, cat:"Tartas",   nombre:"Tarta Pollo y Verdeo",          desc:"Pollo y verdeo. Sustanciosa y bien rendidora.",                                                                  precio:12000, img:"tarta-pollo.jpg", emoji:"🥧", chips:["Para 1–2 personas","Tarta de 16 cm","Al horno en 10 min"] },
  { id:25, cat:"Tartas",   nombre:"Tarta Jamón y Queso",           desc:"El clásico. Mucho jamón, mucho queso. Hecha como en casa.",                                                                  precio:12000, img:"tarta-jamon-queso.jpg", emoji:"🥧", chips:["Para 1–2 personas","Tarta de 16 cm","Al horno en 10 min"] },
  { id:26, cat:"Tartas",   nombre:"Tarta Calabaza",                desc:"Calabaza con queso rallado y semillas de girasol arriba. Sabor a horno familiar.",                                                                  precio:12000, img:"tarta-calabaza.jpg", emoji:"🥧", chips:["Para 1–2 personas","Tarta de 16 cm","Al horno en 10 min"] },
  { id:27, cat:"Tartas",   nombre:"Tarta Verdura",                 desc:"Verdura con queso rallado. Liviana y rica.",                                                                  precio:12000, img:"tarta-verdura.jpg", emoji:"🥧", chips:["Para 1–2 personas","Tarta de 16 cm","Al horno en 10 min"] },
  { id:28, cat:"Wraps",    nombre:"Wrap Carne",                    desc:"Wrap relleno de carne. Bien condimentado, listo al horno.",                                                       precio:13000, img:"wrap-carne.jpg", emoji:"🌯", chips:["Para 1–2 personas","Listo al horno en 10 min"] },
  { id:29, cat:"Wraps",    nombre:"Wrap Pollo",                    desc:"Wrap relleno de pollo. Sabroso y rendidor.",                                                                      precio:13000, img:"wrap-pollo.jpg", emoji:"🌯", chips:["Para 1–2 personas","Listo al horno en 10 min"] },
  { id:13, cat:"Franuis", nombre:"Franui Leche",            desc:"Frambuesas bañadas en chocolate con leche y blanco. El cierre perfecto.",        precio:9000,  img:"franui-new.jpg", emoji:"🍫", chips:["Para 2–3 personas","Listo para servir"] },
  { id:14, cat:"Tortas", nombre:"Torta Golosa",                  desc:"Masa de chocolate, dulce de leche, mousse de chocolate y almendras acarameladas.", precio:24000, img:"torta-golosa.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
  { id:15, cat:"Tortas", nombre:"Torta Lemon Crumble",           desc:"Base sablée, relleno de limón y crumble crocante espolvoreado.",                 precio:24000, img:"torta-lemon.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
  { id:16, cat:"Tortas", nombre:"Torta Coco",                    desc:"Base crocante, dulce de leche y relleno de coco. Generosa y sin vueltas.",       precio:24000, img:"torta-coco.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
];

const CATEGORIAS = [
  { nombre:"Pack Pizzas x2",      icono:"🍕", nota:"Pack de 2 unidades · Perfectas para tener siempre a mano" },
  { nombre:"Pizzas Individuales", icono:"🍕", nota:"Pre-cocidas · Listas en minutos · Al horno directo desde el freezer" },
  { nombre:"Wraps",               icono:"🌯", nota:"Pre-cocidos · Listos al horno en pocos minutos" },
  { nombre:"Empanadas",           icono:"🥟", nota:"x8 unidades · Congeladas, listas para el horno · Cocinar hasta dorar" },
  { nombre:"Sorrentinos",         icono:"🍝", nota:"600g · 16 unidades · Rinde 3 porciones · Solo 4 minutos de cocción", tip:"Hervir agua · Agregar sorrentinos · 4 min con olla destapada · Retirar con espumadera y servir" },
  { nombre:"Tartas",              icono:"🥧", nota:"Pre-cocidas · 16cm · Listas al horno en 10 min", tip:"Precalentar horno al máximo 10 min · Hornear 10 min · Servir" },
  { nombre:"Franuis",             icono:"🍫", nota:"Frambuesas bañadas en chocolate · Listas para servir" },
  { nombre:"Tortas",              icono:"🎂", nota:"Tortas enteras · Listas para cortar y servir" },
];

/* ── PRODUCTOS CLUBES (precios especiales, solo pizzas) ── */
const PRODUCTOS_CLUBES = [
  { id:'pmu', cat:"Pizzas Individuales",  nombre:"Pizza Muzzarella",           desc:"Puro queso derretido sobre salsa de tomate. La clásica que nunca sobra.",   precio:7500,  img:"pizza-muzarella-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pjq', cat:"Pizzas Individuales",  nombre:"Pizza Jamón y Queso",        desc:"Mucho jamón, mucho queso. Simple, efectiva y sin dramas.",                  precio:7500,  img:"pizza-jamon-queso-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pcc', cat:"Pizzas Individuales",  nombre:"Pizza Cebolla Caramelizada", desc:"Cebolla bien dulce con queso cremoso. Para los que saben.",                 precio:7500,  img:"pizza-cebolla-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pma', cat:"Pizzas Individuales",  nombre:"Pizza Margarita",            desc:"Tomate fresco, mozzarella y albahaca. La que nunca falla.",                  precio:7500,  img:"pizza-margarita-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pjm', cat:"Pizzas Individuales",  nombre:"Pizza Jamón y Morrón",       desc:"Con jamón, morrón rojo y orégano. Completa y sabrosa.",                     precio:7800,  img:"pizza-jamon-morron-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pp1', cat:"Pack Pizzas x2", nombre:"Pack Muzarella x2",          desc:"Dos pizzas de muzzarella. Cena resuelta para todo el equipo.",              precio:12000, img:"pack-muzarella-cocida.jpg", emoji:"🍕", top:true, chips:["2 pizzas grandes","Al horno en 12 min"] },
  { id:'pp2', cat:"Pack Pizzas x2", nombre:"Pack Jamón y Queso x2",      desc:"Dos pizzas de jamón y queso. El clásico del tercer tiempo.",               precio:12000, img:"pack-jamon-queso-cocida.jpg", emoji:"🍕", chips:["2 pizzas grandes","Al horno en 12 min"] },
  { id:'pp3', cat:"Pack Pizzas x2", nombre:"Pack Cebolla y Queso x2",    desc:"Dos pizzas con cebolla caramelizada. Siempre piden más.",                  precio:12000, img:"pack-cebolla-queso-cocida.jpg", emoji:"🍕", chips:["2 pizzas grandes","Al horno en 12 min"] },
  { id:'ecac', cat:"Empanadas", nombre:"Empanadas Carne a Cuchillo x8", desc:"Carne cortada a cuchillo, jugosa y bien condimentada. Las que piden todos.", precio:18400, img:"empanadas-carne-v2.jpg", emoji:"🥟", chips:["8 empanadas","Al horno hasta dorar"] },
  { id:'ejyq', cat:"Empanadas", nombre:"Empanadas Jamón y Queso x8",    desc:"Cremosas por dentro, doraditas por fuera. Para cualquier momento.",          precio:16000, img:"empanadas-jamon-v2.jpg", emoji:"🥟", chips:["8 empanadas","Al horno hasta dorar"] },
  { id:'ecyq', cat:"Empanadas", nombre:"Empanadas Cebolla y Queso Azul x8", desc:"Cebolla caramelizada con queso azul. Intensas y cremosas.",              precio:16000, img:"empanadas-cebolla-v2.jpg", emoji:"🥟", chips:["8 empanadas","Al horno hasta dorar"] },
  { id:'evc',  cat:"Empanadas", nombre:"Empanadas Verdura x8",          desc:"Relleno de verdura fresca y queso. Livianas y riquísimas.",                  precio:16000, img:"empanadas-verdura-v2.jpg", emoji:"🥟", chips:["8 empanadas","Al horno hasta dorar"] },
];
const CATEGORIAS_CLUBES = [
  { nombre:"Pack Pizzas x2",      icono:"🍕", nota:"Pack de 2 unidades · Ideal para compartir en equipo" },
  { nombre:"Pizzas Individuales", icono:"🍕", nota:"Individuales · Pre-cocidas · Al horno directo desde el freezer" },
  { nombre:"Empanadas",           icono:"🥟", nota:"x8 unidades · Congeladas, listas para el horno · Cocinar hasta dorar" },
];
// Los productos de clubes se agregan a PROD_MAP después de su declaración (ver más abajo)

/* Productos y categorías activos según zona */
function getActiveProducts() {
  if (currentZone === 'clubes') return PRODUCTOS_CLUBES;
  return PRODUCTOS.filter(function(p) { return !p.zonas || p.zonas.indexOf(currentZone) >= 0; });
}
function getActiveCategories() { return currentZone === 'clubes' ? CATEGORIAS_CLUBES : CATEGORIAS; }

/* ══════════════════════════════════════════════════
   COMBOS — bundles configurables con precio fijo cerrado
   ──────────────────────────────────────────────────
   Un combo es una PLANTILLA con `slots` (ranuras). Cada slot es "elegí N de
   este conjunto de opciones válidas". El cliente arma el combo en un modal y
   recién entonces lo agrega; cada CONFIGURACIÓN distinta es una instancia
   distinta del carrito.
   - precio: fijo cerrado (NO suma de componentes). No apila 10%/promos/cupón.
   - slots[].options: { cat:'Tartas' }  (todas las de la zona) | { ids:[28,29] }.
   - slots[].pick: cuántas unidades elige (default 1).
   - Un slot con 1 sola opción válida = componente fijo (no muestra selector).
   - Un combo aparece en una zona solo si TODOS sus slots tienen >=1 opción.
   El combo se EXPANDE a productos reales al escribir al Sheet (stock/caja/
   abastecimiento/analytics intactos). El precio original "tachado" se calcula
   según la selección concreta.

   comboCart: { [signature]: { comboId, qty, comp:[{id,qty}], picks:[{label,prodId,nombre}] } }
   ══════════════════════════════════════════════════ */
// Placeholder común hasta tener artes definitivos de cada combo.
const COMBO_PLACEHOLDER_IMG = 'pack-muzarella-cocida.jpg';
const COMBOS = [
  // ── TEMPORALES (categoria definida → van primero, separados) ──
  {
    id: 'cmb_arg_16avos',
    nombre: 'Combo Argentina · 16avos',
    desc: 'Para alentar a la Selección.',
    precio: 39900,
    img: 'combo-arg-16avos.jpg', fullCard: true,
    emoji: '🇦🇷',
    flag: '🇦🇷',
    categoria: '🇦🇷 Mundial 2026',
    zonas: ['estancias'],
    slots: [
      { label: 'Pizza',     unidad: 'pack de pizzas clásicas x2', pick: 1, options: { cat: 'Pack Pizzas x2' } },
      { label: 'Empanadas', unidad: 'pack de empanadas x8',       pick: 1, options: { cat: 'Empanadas' } },
      { label: 'Postre',    unidad: 'Franui',                     pick: 1, options: { ids: [13] } },
    ],
  },
  // ── PERMANENTES ──
  {
    id: 'cmb_descubri_semana',
    nombre: 'Descubrí Maleu · Semana',
    desc: 'Conocé los productos ideales para el día a día.',
    precio: 46900,
    img: 'combo-semana.jpg', fullCard: true,
    emoji: '🎁',
    zonas: ['estancias'],
    slots: [
      { label: 'Tarta',       unidad: 'tarta',               pick: 1, options: { cat: 'Tartas' } },
      { label: 'Wrap',        unidad: 'wrap',                pick: 1, options: { cat: 'Wraps' } },
      { label: 'Sorrentinos', unidad: 'pack de sorrentinos', pick: 1, options: { ids: [10, 9, 8] } },  // Calabaza, J&Q, Cordero
      { label: 'Postre',      unidad: 'Franui',              pick: 1, options: { ids: [13] } },
    ],
  },
  {
    id: 'cmb_descubri_finde',
    nombre: 'Descubrí Maleu · Fin de Semana',
    desc: 'Probá los clásicos de Maleu para compartir.',
    precio: 34900,
    img: 'combo-finde.jpg', fullCard: true,
    emoji: '🎁',
    zonas: ['estancias'],
    slots: [
      { label: 'Pizza premium', unidad: 'pizza individual',   pick: 1, options: { cat: 'Pizzas Individuales' } },
      { label: 'Empanadas',     unidad: 'pack de empanadas',  pick: 1, options: { cat: 'Empanadas' } },
      { label: 'Postre',        unidad: 'Franui',             pick: 1, options: { ids: [13] } },
    ],
  },
  {
    id: 'cmb_noche_casa',
    nombre: 'Noche en Casa',
    desc: 'Una cena rica y lista en minutos para dos personas.',
    precio: 23900,
    img: 'combo-noche.jpg', fullCard: true,
    emoji: '🎁',
    zonas: ['estancias'],
    slots: [
      { label: 'Pizza',  unidad: 'pack de pizzas x2', pick: 1, options: { cat: 'Pack Pizzas x2' } },
      { label: 'Postre', unidad: 'Franui',            pick: 1, options: { ids: [13] } },
    ],
  },
  {
    id: 'cmb_mesa_familiar',
    nombre: 'Mesa Familiar',
    desc: 'Una solución práctica para una comida en familia.',
    precio: 45900,
    img: 'combo-mesa.jpg', fullCard: true,
    emoji: '🎁',
    zonas: ['estancias'],
    slots: [
      { label: 'Tarta',     unidad: 'tarta',              pick: 2, options: { cat: 'Tartas' } },      // dos iguales o distintas
      { label: 'Empanadas', unidad: 'pack de empanadas',  pick: 1, options: { cat: 'Empanadas' } },
      { label: 'Postre',    unidad: 'Franui',             pick: 1, options: { ids: [13] } },
    ],
  },
  {
    id: 'cmb_freezer_lleno',
    nombre: 'Freezer Lleno',
    desc: 'Resolvé varias comidas de la semana en un solo pedido.',
    precio: 84900,
    img: 'combo-freezer.jpg', fullCard: true,
    emoji: '🎁',
    zonas: ['estancias'],
    slots: [
      { label: 'Pizza',       unidad: 'pack de pizzas x2',   pick: 2, options: { cat: 'Pack Pizzas x2' } },  // dos iguales o distintas
      { label: 'Sorrentinos', unidad: 'pack de sorrentinos', pick: 1, options: { ids: [10, 9, 8] } },
      { label: 'Empanadas',   unidad: 'pack de empanadas',   pick: 1, options: { cat: 'Empanadas' } },
      { label: 'Tarta',       unidad: 'tarta',               pick: 2, options: { cat: 'Tartas' } },           // dos iguales o distintas
    ],
  },
];
const COMBO_MAP = {}; COMBOS.forEach(c => COMBO_MAP[c.id] = c);

/* Opciones válidas de un slot en la zona actual (array de productos). */
function slotOptions(slot) {
  let prods;
  if (slot.options && slot.options.ids) {
    prods = slot.options.ids.map(id => PROD_MAP[id]).filter(Boolean);
  } else if (slot.options && slot.options.cat) {
    prods = getActiveProducts().filter(p => p.cat === slot.options.cat);
  } else { prods = []; }
  return prods.filter(p => !p.zonas || p.zonas.indexOf(currentZone) >= 0);
}
/* ¿El combo tiene al menos un slot con opción a elegir (más de 1)? */
function comboHasChoices(c) { return (c.slots || []).some(s => slotOptions(s).length > 1); }
/* ¿El combo se puede mostrar en la zona? Todos los slots con >=1 opción. */
function comboAvailableInZone(c) {
  if (c.zonas && c.zonas.indexOf(currentZone) < 0) return false;
  if (!c.slots || !c.slots.length) return false;
  return c.slots.every(s => slotOptions(s).length >= 1);
}
function getActiveCombos() {
  if (currentZone === 'clubes') return [];
  return COMBOS.filter(comboAvailableInZone);
}
/* Saca el prefijo de categoría redundante del nombre de una opción según el
   label del slot. Ej: slot "Empanadas" + "Empanadas Carne x8" → "Carne x8". */
function _optLabel(nombre, slotLabel) {
  if (!nombre) return '';
  const l = (slotLabel || '').trim().toLowerCase();
  if (l && nombre.toLowerCase().indexOf(l + ' ') === 0) return nombre.slice(l.length + 1);
  return nombre;
}
/* Selección por defecto: primera opción de cada slot (repite si pick>1). */
function defaultSelection(c) {
  return (c.slots || []).map(slot => {
    const opts = slotOptions(slot);
    const pick = slot.pick || 1;
    const sel = [];
    for (let k = 0; k < pick; k++) { const p = opts[k % opts.length] || opts[0]; sel.push(p ? p.id : null); }
    return sel;
  });
}
/* Resuelve una selección (array alineado a slots, cada uno array de prodIds)
   en componentes mergeados {comp:[{id,qty}], picks:[{label,prodId,nombre}]}. */
function resolveComp(c, selections) {
  const compMap = {}; const picks = [];
  (c.slots || []).forEach((slot, i) => {
    (selections[i] || []).forEach(pid => {
      if (pid == null) return;
      const key = String(pid);
      compMap[key] = (compMap[key] || 0) + 1;
      const p = PROD_MAP[pid];
      picks.push({ label: slot.label, prodId: pid, nombre: p ? p.nombre : '' });
    });
  });
  const comp = Object.entries(compMap).map(([id, qty]) => ({ id: isNaN(id) ? id : +id, qty }));
  return { comp, picks };
}
/* Firma única de una configuración (combo + componentes elegidos). */
function comboSignature(comboId, comp) {
  return comboId + '|' + comp.map(ci => ci.id + 'x' + ci.qty).sort().join(',');
}
/* Valor individual (precio "tachado") de una lista de componentes. */
function comboNaturalSumComp(comp) {
  return comp.reduce((s, ci) => { const p = PROD_MAP[ci.id]; return s + (p ? p.precio * ci.qty : 0); }, 0);
}

/* Unidades de un producto ya comprometidas (productos sueltos + instancias de
   combo), opcionalmente excluyendo una firma (para evaluar cuántas más entran). */
function _unitsConsumed(prodId, excludeSig) {
  let n = cart[prodId] || 0;
  Object.keys(comboCart).forEach(sig => {
    if (sig === excludeSig) return;
    const inst = comboCart[sig]; if (!inst) return;
    inst.comp.forEach(ci => { if (String(ci.id) === String(prodId)) n += ci.qty * inst.qty; });
  });
  return n;
}
/* Máximo de instancias de esta configuración que entran dado el stock libre. */
function compMaxTotal(comp, excludeSig) {
  let cap = Infinity;
  comp.forEach(ci => {
    const sc = getStockCap(ci.id);                  // null/undefined = ilimitado
    if (sc === null || sc === undefined) return;
    const otros = _unitsConsumed(ci.id, excludeSig);
    cap = Math.min(cap, Math.floor((sc - otros) / ci.qty));
  });
  return cap;
}
/* Disponibilidad de una opción suelta (cuántas unidades libres quedan ahora). */
function optionAvailable(prodId) {
  const sc = getStockCap(prodId);
  if (sc === null || sc === undefined) return Infinity;
  return sc - _unitsConsumed(prodId, null);
}

/* Subtotales separados: productos sueltos vs combos (a precio cerrado). */
function productsSubtotal() {
  return Object.entries(cart).reduce(function(s, e) { const p = PROD_MAP[e[0]]; return s + (p ? p.precio * e[1] : 0); }, 0);
}
function combosSubtotal() {
  return Object.values(comboCart).reduce((s, inst) => { const c = COMBO_MAP[inst.comboId]; return s + (c ? c.precio * inst.qty : 0); }, 0);
}
/* ¿Hay al menos un combo en el carrito? Si hay, se inhabilitan TODOS los
   descuentos del pedido (10% efectivo, +$100K y cupones): el combo ya es
   precio cerrado promocional y no acumula con nada. */
function combosInCart() { return Object.keys(comboCart).length > 0; }

/* ── ZONAS ── */
const ZONAS = {
  estancias: {
    nombre: "Estancias del Pilar",
    envio: 0,
    canal: "Home",
    horarios: { "Lunes":"18 a 19 hs", "Miércoles":"19 a 21 hs", "Viernes":"19 a 21 hs", "Sábado":"19 a 21 hs", "Domingo":"11 a 13 hs" },
    deliveryText: "📅 Entregas: Lun · Mié · Vie · Sáb · Dom",
    schedule: "Lunes 18 a 19hs · Miércoles, Viernes y Sábado 19 a 21hs · Domingo 11 a 13hs",
    showStock: false
  },
  pilar: {
    nombre: "Pilar y Alrededores",
    envio: 5000,
    canal: "Pilar",
    horarios: { "Miércoles":"A coordinar", "Viernes":"A coordinar" },
    deliveryText: "📅 Entregas: Miércoles y Viernes · Horario a coordinar",
    showStock: false
  },
  clubes: {
    nombre: "Clubes Deportivos",
    envio: 0,
    canal: "Clubes",
    horarios: { "Viernes":"Horario a coordinar" },
    deliveryText: "📅 Entrega los viernes en la puerta del club",
    showStock: false
  }
};

const WA_NUMBER = "5491155038905";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxmrG5YVSshcYezk8lXFx_uxb7NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec";
// Meses del cumpleaños — definido arriba para que initCumpleBlock() (llamado en el init) lo tenga listo.
var CUMPLE_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const STOCK_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOq210U9LeSxvXbx_sdglHS0K9DZP8H_5pGXC-WwlMo8AE4UacIN0bpagQqAr79XeJNQ1Nm1eql271/pub?gid=792614962&single=true&output=csv';

/* ── AJUSTES ESPECIALES POR SEMANA ──
   Feriados que se BLOQUEAN del calendario (no hay entrega ese día).
   Entregas EXTRA agregadas puntualmente (días que normalmente no se
   entregan pero que esta semana sí). Después de la fecha pasada se
   ignoran solas.

   Semana del 28/04 al 03/05/2026:
   - Jue 30/04: entrega Home extra 19-21hs. Como Vie 01/05 es feriado
     (Día del Trabajador), la gente con casa de fin de semana llega el
     Jue y conviene tener delivery ese día. El Vie 01/05 SÍ se entrega
     normal — es feriado pero buen momento de ventas. */
const FERIADOS_BLOQUEADOS = {
  // Vacío — no hay días bloqueados esta semana
};
const ENTREGAS_EXTRA = {
  estancias: [
    { iso: '2026-04-30', dayName: 'Jueves', timeRange: '19 a 21 hs' }
  ]
};
/* Stock estricto extendido: entregas Home dentro de esta ventana topan
   al stock real aunque la fecha esté a >24hs. Pensado para semanas con
   feriado donde no se puede reponer al proveedor. Después del timestamp
   se desactiva sola. */
const STOCK_ESTRICTO_HASTA_MS = {
  estancias: Date.UTC(2026, 4, 4, 3, 0, 0) // Lun 04/05 00:00 AR = 03:00 UTC
};

/* ── RESTRICCIONES TEMPORALES ──
   Pilar y Alrededores: del 29/04 hasta el Domingo 03/05/2026 inclusive.
   Durante esa ventana, los pedidos de Pilar deben (a) topar al stock
   real del depósito y (b) solo aceptar barrios cubiertos por vendedores
   Red activos (hoy: Marcos Bottcher en El Lucero / Los Tacos). Vuelve
   automáticamente a la normalidad el Lunes 04/05 (en realidad la zona
   se reabre el Mié 06/05 que es el próximo día de entrega Pilar).
   Vencido el timestamp, la restricción se desactiva sola sin tocar nada. */
const PILAR_RESTRICCION_HASTA_MS = Date.UTC(2026, 4, 4, 2, 59, 59); // Dom 03/05 23:59:59 AR = Lun 04/05 02:59:59 UTC
function isPilarRestricted() {
  if (currentZone !== 'pilar') return false;
  return Date.now() < PILAR_RESTRICCION_HASTA_MS;
}

/* Cutoff del Viernes de esta semana para Pilar.
   - Marcos (barrio Red): Jue 13:00 → Marcos necesita el pedido el Jue tarde
     para repartirlo en Garín el Vie.
   - Otro barrio: Jue 21:00 → Tadeo va el Vie a la mañana al proveedor a
     buscar y reparte el Vie a la noche.
   Si no se eligió barrio aún (caso modal de bienvenida), usamos el cutoff
   más permisivo (Otro = Jue 21:00) para no ocultar de más. El day-picker
   del checkout, una vez elegido el barrio, vuelve a evaluar.

   Devuelve true si HOY ya pasó el cutoff aplicable y el Vie de esta semana
   debe quedar oculto. */
function _isPilarFridayCutoffPast() {
  // Desde 12/05/2026 ambos cutoffs (Red y no-Red) están alineados al cierre
  // de OC con proveedor: Jueves 12:00 hs AR. Después de ese momento, el Vie
  // de esta semana ya no es ofrecible.
  var nowAR = new Date(Date.now() - 3 * 3600 * 1000);
  var arDow = nowAR.getUTCDay(); // 0=Dom..6=Sáb
  var arHour = nowAR.getUTCHours();
  return (arDow === 4 && arHour >= 12) || arDow === 5 || arDow === 6;
}

/* ── ESTADO ── */
let cart = {};
let comboCart = {}; // { [signature]: { comboId, qty, comp, picks } } — instancias configuradas
let currentZone = null; // 'estancias' | 'pilar' | 'clubes'
let stockMap = {};            // stock físico actual (lo que hay en el depósito)
let stockProyectadoMap = {};  // físico + Σ cantidad OC "Pedido" pendientes
let vendedoresRed = []; // {nombre, wa, barrios:[], partido, localidad}
let barrioToVendedor = {}; // { 'El Lucero': {nombre, wa, partido, localidad}, ... }
let _enviando = false;
let selectedDeliveryDate = null;     // ISO "YYYY-MM-DD"
let selectedDeliveryDayName = null;  // "Lunes" | "Miércoles" | etc.
let selectedDateIsFlexible = false;  // true cuando el cliente elige "Cualquier día"
let selectedPilarBarrio = null;      // valor del dropdown Pilar (ej: 'Pilara', '__otro__')
let selectedPilarBarrioName = null;  // nombre display del barrio

/* Lista de barrios que se muestran en el paso 2 del modal de bienvenida
   cuando el cliente eligió Pilar y Alrededores. Los marcados isRed son
   los de vendedores Red (Marcos) y entran en flujo "a pedido". El resto
   se comporta como Home: tope al stock real si la fecha está cerca. */
const BARRIOS_PILAR_MODAL = [
  { val: 'Pilara',       nombre: 'Pilara',       isRed: false },
  { val: 'El Ocho',      nombre: 'El Ocho',      isRed: false },
  { val: 'El Lucero',    nombre: 'El Lucero',    isRed: true, badge: 'Marcos' },
  { val: 'Los Tacos',    nombre: 'Los Tacos',    isRed: true, badge: 'Marcos' },
  { val: 'Villa Bertha', nombre: 'Villa Bertha', isRed: true, badge: 'Marcos' },
  { val: '__otro__',     nombre: 'Otro barrio',  isRed: false, isOther: true }
];

/* Tope estricto de stock — depende de la fecha de entrega elegida.
   Solo aplica en zona Estancias (Pilar y Clubes nunca tienen tope).

   Regla: si la fecha elegida está a <24hs del horario más temprano de
   entrega de ese día, no hay tiempo de reponer vía OC al proveedor.
   Por lo tanto, el cliente solo puede pedir lo que hay en el freezer.

   Si la fecha es a más de 24hs → modo abierto con info (puede pedir
   cualquier cantidad porque hay margen de reposición).

   Si elige "Cualquier día" o no eligió fecha → modo abierto con info
   también (asumimos que es flexible). */
/* Devuelve el modo de stock a aplicar según zona, barrio y fecha de
   entrega elegida. Tres valores:
     - 'ilimitado': sin tope, cliente pide lo que quiera.
     - 'proyectado': tope = físico + lo que viene en camino (OC "Pedido").
     - 'real': tope = stock físico actual.
   Regla operativa: Tadeo cierra OC con proveedor Jue 12hs AR. Lo que el
   cliente pida para entregas posteriores al próximo Vie depende de si
   alcanzó esa OC (antes Jue 12hs → ilimitado) o ya no (después → proyectado). */
function getStockMode() {
  // Clubes y Pilar Red siempre ilimitado (el calendario los bloquea por
  // cutoff si la fecha no aplica; el stock en sí no tiene tope).
  if (currentZone === 'clubes') return 'ilimitado';
  if (currentZone === 'pilar' && _pilarBarrioIsRed()) return 'ilimitado';
  // Restricción Pilar temporal (29/4 - 3/5/2026, ya vencida). Compat.
  if (isPilarRestricted()) {
    if (selectedDateIsFlexible) return 'real';
    if (!selectedDeliveryDate) return 'real';
    var pms = _deliveryStartMs(selectedDeliveryDate);
    if (pms && pms < PILAR_RESTRICCION_HASTA_MS) return 'real';
    return 'ilimitado';
  }
  if (currentZone !== 'estancias' && currentZone !== 'pilar') return 'ilimitado';
  if (selectedDateIsFlexible && !selectedDeliveryDate) return 'ilimitado';
  if (!selectedDeliveryDate) return 'ilimitado';
  var deliveryDay = _isoToUTCMidnightMs(selectedDeliveryDate);
  if (deliveryDay == null) return 'ilimitado';
  var todayDay = _todayARMidnightMs();
  if (deliveryDay < todayDay) return 'real';
  var todayDow = new Date(todayDay).getUTCDay();
  var daysToFriday = (5 - todayDow + 7) % 7;
  var proximoVie = todayDay + daysToFriday * 86400000;
  var siguienteVie = proximoVie + 7 * 86400000;
  if (deliveryDay < proximoVie) return 'real';
  if (deliveryDay >= siguienteVie) return 'ilimitado';
  // Entrega entre próximo_vie y siguiente_vie: depende del cutoff_OC.
  // cutoff_OC = Jue anterior 12hs AR = Jue 00:00 UTC + 15hs.
  var cutoffOC = proximoVie - 86400000 + 15 * 3600 * 1000;
  return Date.now() < cutoffOC ? 'ilimitado' : 'proyectado';
}
function _todayARMidnightMs() {
  var nowAR = new Date(Date.now() - 3 * 3600 * 1000);
  return Date.UTC(nowAR.getUTCFullYear(), nowAR.getUTCMonth(), nowAR.getUTCDate());
}
function _isoToUTCMidnightMs(iso) {
  if (!iso) return null;
  var p = iso.split('-'); if (p.length !== 3) return null;
  return Date.UTC(+p[0], +p[1] - 1, +p[2]);
}
function isStockLimited() {
  var m = getStockMode();
  return m === 'real' || m === 'proyectado';
}
/* True si la fecha de entrega ISO cae ANTES del próximo Viernes
   (incluyendo hoy si aún no es Vie). Regla operativa: tope al stock real
   para entregas anteriores al próximo Vie; modo abierto desde el Vie en
   adelante. Cumple los casos de Home y Pilar no-Red:
     Hoy Mar 12 → Mié 13 = stock (antes del Vie 15), Vie 15 = ilimitado.
     Hoy Dom 9  → Lun 10 = stock (antes del Vie 14), Mié 12 = stock,
                  Vie 14 = ilimitado.
   Si hoy es Vie, el "próximo Vie" es hoy mismo → todas las entregas
   futuras (incl. la de hoy) caen como ilimitado.
   Si hoy es Sáb, el "próximo Vie" es +6 días → entregas Dom/Lun/Mar/Mié/Jue
   intermedios quedan como stock. */
function _isDeliveryBeforeNextFriday(iso) {
  if (!iso) return false;
  var parts = iso.split('-'); if (parts.length !== 3) return false;
  var nowAR = new Date(Date.now() - 3 * 3600 * 1000);
  var today = new Date(Date.UTC(nowAR.getUTCFullYear(), nowAR.getUTCMonth(), nowAR.getUTCDate()));
  var d = Date.UTC(+parts[0], +parts[1] - 1, +parts[2]);
  if (d < today.getTime()) return false;
  var todayDow = today.getUTCDay(); // 0=Dom..6=Sáb
  // Distancia al próximo Vie (5 = Vie). Si hoy es Vie, daysToFriday=0.
  var daysToFriday = (5 - todayDow + 7) % 7;
  var fridayMs = today.getTime() + daysToFriday * 86400000;
  return d < fridayMs;
}
/* Devuelve true si el barrio elegido en Pilar pertenece a un vendedor Red
   (hoy Marcos: El Lucero / Los Tacos / Villa Bertha). Si todavía no eligió
   barrio, devuelve false (no-Red por default → más estricto). */
function _pilarBarrioIsRed() {
  var sel = $id('f-pilar-barrio');
  // Priorizar selectedPilarBarrio (estado JS) sobre el dropdown — el dropdown
  // puede tener value='' si la option aún no fue cargada por renderPilarBarrios.
  var val = (sel && sel.value) || selectedPilarBarrio || '';
  if (!val || val === '__otro__') return false;
  // Defensa 1: barrioToVendedor cargado desde Sheets (puede no haber llegado todavía).
  if (barrioToVendedor[val.toLowerCase()]) return true;
  // Defensa 2: lista hardcodeada en BARRIOS_PILAR_MODAL (siempre disponible).
  for (var i = 0; i < BARRIOS_PILAR_MODAL.length; i++) {
    if (BARRIOS_PILAR_MODAL[i].val === val && BARRIOS_PILAR_MODAL[i].isRed) return true;
  }
  return false;
}
/* Modo "abierto con info": muestra cartel celeste "Hoy hay N en stock ·
   Pedís más para fecha futura". Aplica solo cuando el modo es 'ilimitado'
   en Estancias o Pilar no-Red, y el stock físico es bajo. */
function isStockInfoMode() {
  if (getStockMode() !== 'ilimitado') return false;
  if (currentZone === 'estancias') return true;
  if (currentZone === 'pilar' && !_pilarBarrioIsRed()) return true;
  return false;
}
/* Hora de inicio de entrega (UTC ms) para una fecha ISO dada.
   Lun 18hs · Mié/Vie/Sáb 19hs · Dom 11hs · Pilar 19hs · Clubes 19hs. */
function _deliveryStartMs(iso) {
  if (!iso || iso === 'any') return null;
  var parts = iso.split('-'); if (parts.length !== 3) return null;
  var y = +parts[0], m = +parts[1] - 1, d = +parts[2];
  var date = new Date(Date.UTC(y, m, d));
  var dow = date.getUTCDay(); // 0=Dom..6=Sáb
  var hourAR;
  if (dow === 1) hourAR = 18;        // Lunes 18hs
  else if (dow === 0) hourAR = 11;   // Domingo 11hs
  else hourAR = 19;                   // Mié/Vie/Sáb 19hs (y Pilar/Clubes)
  // AR (UTC-3) → UTC = AR + 3
  date.setUTCHours(hourAR + 3, 0, 0, 0);
  return date.getTime();
}
/* Fin del día calendario AR (00:00 del día siguiente) para una fecha ISO.
   Se usa para decidir si la fecha calendario ya pasó. Mantenemos la fecha
   disponible hasta las 23:59 hs AR de ese mismo día, aunque la ventana de
   entrega haya terminado a las 21hs. */
function _deliveryEndMs(iso) {
  if (!iso || iso === 'any') return null;
  var parts = iso.split('-'); if (parts.length !== 3) return null;
  // 00:00 AR del día siguiente = 03:00 UTC del día siguiente
  var date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2] + 1));
  date.setUTCHours(3, 0, 0, 0);
  return date.getTime();
}
let _formVisible = false;
const PROD_MAP = {}; PRODUCTOS.forEach(p => PROD_MAP[p.id] = p);
PRODUCTOS_CLUBES.forEach(p => PROD_MAP[p.id] = p);

const PROD_ABBR = {
  5:'PPM', 6:'PPJyQ', 7:'PPCyQ',
  8:'SCo', 9:'SJyQ', 10:'SCa',
  11:'ECaC', 12:'EJyQ', 17:'ECyQ', 18:'EV',
  14:'TG', 15:'TLC', 16:'TC', 13:'F',
  1:'PMa', 2:'PJyQ', 3:'PCC', 4:'PJyM', 19:'PMu',
  20:'SQB', 21:'SL', 22:'SPyP', 23:'SE',
  24:'TP', 25:'TJyQ', 26:'TCa', 27:'TV',
  28:'RC', 29:'RP',
  // Clubes (IDs string)
  'pmu':'PMu', 'pma':'PMa', 'pjq':'PJyQ', 'pcc':'PCC', 'pjm':'PJyM',
  'pp1':'PPM', 'pp2':'PPJyQ', 'pp3':'PPCyQ',
  'ecac':'ECaC', 'ejyq':'EJyQ', 'ecyq':'ECyQ', 'evc':'EV',
};

/* ── HELPERS ── */
function $id(id) { return document.getElementById(id); }
function ars(n) { return '$' + n.toLocaleString('es-AR'); }
function cartTotal() { return productsSubtotal() + combosSubtotal(); }
function cartCount() { return Object.values(cart).reduce((a,b)=>a+b, 0) + Object.values(comboCart).reduce((a,inst)=>a+(inst.qty||0), 0); }

/* ── SALDO A FAVOR DEL CLIENTE (auto-detección por teléfono) ──
   Cuando el cliente termina de escribir el teléfono en el checkout, consultamos
   al backend si tiene saldo a favor de compras anteriores. Si sí, mostramos un
   banner y aplicamos automáticamente como descuento al total.
   El monto aplicado se manda al backend en `saldoAplicado` del postData, y queda
   registrado en hoja Saldos Clientes como "Aplicación" + col BI/BL del pedido. */
var _saldoCliente = { tel: '', saldo: 0, ultimoFetch: 0 };
function getSaldoAFavor() {
  // Aplicar saldo solo si: tenemos saldo>0, hay teléfono válido y hay carrito.
  // No aplicar más que el subtotal (no puede dejar el pedido en negativo).
  if (!_saldoCliente.saldo || _saldoCliente.saldo <= 0) return 0;
  var sub = cartTotal();
  if (sub <= 0) return 0;
  return Math.min(_saldoCliente.saldo, sub);
}
function checkSaldoCliente() {
  try {
    var inp = $id('f-telefono');
    if (!inp) return;
    var tel = String(inp.value || '').replace(/\D/g, '');
    if (tel.length < 8) {
      // No es un teléfono válido todavía — limpiar banner
      _saldoCliente = { tel: '', saldo: 0, ultimoFetch: 0 };
      _toggleSaldoBanner();
      _updateCartTotals();
      return;
    }
    // Cache: no re-fetch si es el mismo número en los últimos 30s
    if (_saldoCliente.tel === tel && (Date.now() - _saldoCliente.ultimoFetch) < 30000) return;
    _saldoCliente.tel = tel;
    _saldoCliente.ultimoFetch = Date.now();
    fetch(APPS_SCRIPT_URL + '?action=saldoCliente&tel=' + encodeURIComponent(tel) + '&t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data && data.ok) {
          _saldoCliente.saldo = Number(data.saldo) || 0;
        } else {
          _saldoCliente.saldo = 0;
        }
        _toggleSaldoBanner();
        _updateCartTotals();
      })
      .catch(function(){ /* silencioso: si falla, simplemente no aplica saldo */ });
  } catch(e) {}
}
function _toggleSaldoBanner() {
  var banner = $id('saldoFavorBanner');
  var monto = $id('saldoFavorMonto');
  if (!banner || !monto) return;
  if (_saldoCliente.saldo > 0) {
    banner.style.display = '';
    monto.textContent = ars(_saldoCliente.saldo);
  } else {
    banner.style.display = 'none';
  }
}
function _updateCartTotals() {
  // Re-render todos los lugares que muestran el total (cart pop, resumen final).
  try { if (typeof updateUI === 'function') updateUI(); } catch(e){}
}
function getShipping() {
  if (!currentZone) return 0;
  // Cupón tipo ENVIO → envío gratis sin importar la zona/barrio.
  if (getCouponShippingOverride()) return 0;
  const z = ZONAS[currentZone];
  // En Pilar: envío gratis solo en barrios Red (Marcos los reparte sin cobrar
  // en El Lucero / Los Tacos / Villa Bertha). Cualquier otro barrio (Pilara,
  // El Ocho, Otro barrio, etc.) lo reparte Tadeo y cobra $5.000.
  if (currentZone === 'pilar') {
    return _pilarBarrioIsRed() ? 0 : z.envio;
  }
  return z.envio;
}
function pilarIsOtroBarrio() {
  if (currentZone !== 'pilar') return false;
  var el = $id('f-pilar-barrio');
  return !!(el && el.value === '__otro__');
}
// Descuentos separados por tipo (jun/26):
//   10% Efectivo  → solo Home (Estancias).
//   10% +$100K    → Home (Estancias) Y Pilar NO-Red (Pilara, El Ocho,
//                   Otro barrio). Pilar Red (Marcos) y Clubes nunca.
function cashDiscountActive() {
  return currentZone === 'estancias';
}
function bulkDiscountActive() {
  if (currentZone === 'estancias') return true;
  if (currentZone === 'pilar') return !_pilarBarrioIsRed();
  return false;
}
function discountsActive() {
  // Hay AL MENOS UN descuento activo en la zona — usado para mostrar la
  // promo bar y el incentivo del carrito en general.
  return cashDiscountActive() || bulkDiscountActive();
}

/* ── CUPÓN aplicado ─────────────────────────────────────────
   Estado: appliedCoupon = {codigo, tipo, valor, scope, mensaje, stack}
   o null si no hay cupón.

   Regla por producto: gana el descuento más alto entre cupón y auto
   (efectivo/+$100K). El cupón aplica solo a su scope (todo, cat, prod),
   y los auto aplican solo a lo que NO está cubierto por el cupón. */
let appliedCoupon = null;

function _itemsInCart() {
  return Object.entries(cart).map(function(e) {
    const p = PROD_MAP[e[0]]; if (!p) return null;
    return { id: p.id, abbr: PROD_ABBR[p.id] || '', cat: p.cat, precio: p.precio, qty: e[1] };
  }).filter(Boolean);
}
function _subtotalForScope(scope) {
  if (!scope) return 0;
  const ix = scope.indexOf(':');
  const key = (ix >= 0 ? scope.substring(0, ix) : scope).trim().toUpperCase();
  const val = ix >= 0 ? scope.substring(ix + 1).trim() : '';
  return _itemsInCart().reduce(function(sum, it) {
    var match = false;
    if (key === 'TODO') match = true;
    else if (key === 'CATEGORIA' && it.cat === val) match = true;
    else if (key === 'PRODUCTO' && it.abbr === val) match = true;
    return sum + (match ? it.precio * it.qty : 0);
  }, 0);
}
function getCouponDiscount() {
  if (!appliedCoupon) return 0;
  const sub = _subtotalForScope(appliedCoupon.scope);
  if (sub <= 0) return 0;
  if (appliedCoupon.tipo === 'PCT')  return Math.round(sub * (appliedCoupon.valor / 100));
  if (appliedCoupon.tipo === 'ARS')  return Math.min(appliedCoupon.valor, sub);
  return 0;
}
function couponAppliesToAll() {
  // Cupón con scope=TODO cubre toda la base imponible para auto-descuentos
  return appliedCoupon && /^TODO\b/i.test(appliedCoupon.scope || 'TODO');
}

function getCashDiscount() {
  // Combos quedan FUERA del 10%: el descuento (efectivo / +$100K) aplica solo a
  // los productos sueltos. Base y umbral bulk se calculan sobre productsSubtotal
  // (el combo, a precio cerrado, no recibe descuento ni cuenta para el +$100K).
  const total = productsSubtotal();
  const sel = document.querySelector('input[name="pago"]:checked');
  const isCash = sel && sel.value === 'Efectivo';
  const isBulk = total >= 100000;
  if (!isCash && !isBulk) return 0;
  if (isCash && !cashDiscountActive() && (!isBulk || !bulkDiscountActive())) return 0;
  if (!isCash && isBulk && !bulkDiscountActive()) return 0;

  // Base = subtotal NO cubierto por el cupón (la parte del cupón ya tiene su descuento).
  // Excepción: si cupón=ENVIO, no afecta base. Si cupón con stack=true, base = subtotal completo.
  let base = total;
  if (appliedCoupon && appliedCoupon.tipo !== 'ENVIO' && !appliedCoupon.stack) {
    const cubierto = _subtotalForScope(appliedCoupon.scope);
    base = Math.max(0, total - cubierto);
  }
  if (base <= 0) return 0;

  const aplicaEfectivo = isCash && cashDiscountActive();
  const aplicaBulk     = isBulk && bulkDiscountActive();
  if (aplicaEfectivo || aplicaBulk) return Math.round(base * 0.10);
  return 0;
}
function getDiscountLabel() {
  const sel = document.querySelector('input[name="pago"]:checked');
  const isCash = sel && sel.value === 'Efectivo';
  const isBulk = productsSubtotal() >= 100000;
  // Hay cupón? Mostrar de qué tipo es el auto (el cupón se muestra en otra línea)
  if (isCash && cashDiscountActive()) return '10% OFF Efectivo';
  if (isBulk && bulkDiscountActive()) return '10% OFF (+$100K)';
  return '';
}
function getTotalDiscount() {
  // Total combinado de cupón + auto. Lo usa el shipping bar, el WhatsApp y el total final.
  return getCouponDiscount() + getCashDiscount();
}
function getCouponShippingOverride() {
  // Si cupón=ENVIO, devuelve true para anular el envío
  return appliedCoupon && appliedCoupon.tipo === 'ENVIO';
}

/* ── UI cupón ─────────────────────────────────────────────── */
function toggleCouponBox() {
  var btn = $id('coupon-toggle'), box = $id('coupon-box');
  var open = box.style.display === 'none';
  box.style.display = open ? '' : 'none';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) setTimeout(function() { var inp = $id('f-cupon'); if (inp) inp.focus(); }, 50);
}
function _showCouponMsg(txt, cls) {
  var el = $id('coupon-msg'); if (!el) return;
  el.textContent = txt || '';
  el.className = 'coupon-msg' + (cls ? ' ' + cls : '');
}
function applyCoupon() {
  var inp = $id('f-cupon');
  var btn = $id('coupon-apply-btn');
  var code = (inp.value || '').trim().toUpperCase();
  if (!code) { _showCouponMsg('Escribí el código del cupón', 'err'); return; }
  if (code.length < 3) { _showCouponMsg('Código muy corto', 'err'); return; }

  btn.disabled = true; btn.textContent = '...';
  _showCouponMsg('', '');

  var items = _itemsInCart();
  var url = APPS_SCRIPT_URL + '?action=validarCupon&codigo=' + encodeURIComponent(code)
          + '&itemsJson=' + encodeURIComponent(JSON.stringify(items))
          + '&t=' + Date.now();
  fetch(url, { cache: 'no-store' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      btn.disabled = false; btn.textContent = 'Aplicar';
      if (!d.ok) {
        _showCouponMsg(d.error || 'No pudimos validar el cupón', 'err');
        return;
      }
      appliedCoupon = {
        codigo:  d.codigo,
        tipo:    d.tipo,
        valor:   d.valor,
        scope:   d.scope,
        mensaje: d.mensaje,
        stack:   !!d.stack
      };
      // Cerrar el input y mostrar el card. _renderCouponApplied decide el copy según
      // si el descuento ya se está aplicando o si está pending (sin productos del scope).
      $id('coupon-box').style.display = 'none';
      $id('coupon-toggle').style.display = 'none';
      _renderCouponApplied();
      _track('coupon_applied', { code: d.codigo, scope: d.scope });
      updateUI();
    })
    .catch(function(err) {
      btn.disabled = false; btn.textContent = 'Aplicar';
      _showCouponMsg('Sin conexión. Probá de nuevo.', 'err');
    });
}
function removeCoupon() {
  // Cupones discontinuados (el bloque ya no existe en la tienda). Mantener
  // null-safe: removeCoupon() se sigue llamando en el reset post-envío.
  appliedCoupon = null;
  var ca = $id('coupon-applied'); if (ca) { ca.style.display = 'none'; ca.classList.remove('pending'); }
  var cb = $id('coupon-box'); if (cb) cb.style.display = 'none';
  var ct = $id('coupon-toggle'); if (ct) { ct.style.display = ''; ct.setAttribute('aria-expanded', 'false'); }
  var inp = $id('f-cupon'); if (inp) inp.value = '';
  _showCouponMsg('', '');
  updateUI();
}

/* Render del card del cupón aplicado.
   Estado ACTIVE: hay descuento aplicándose → card verde con monto.
   Estado PENDING: cupón válido pero todavía no agregaron productos del
   scope → card naranja/amarillo invitando a sumar (ej. "agregá un
   sorrentino y se activa el 20% off"). */
function _renderCouponApplied() {
  if (!appliedCoupon) return;
  var card = $id('coupon-applied');
  if (!card) return;
  var disc = getCouponDiscount();
  var codeEl = $id('coupon-applied-code');
  var msgEl  = $id('coupon-applied-msg');

  // Etiqueta linda del scope (ej "CATEGORIA:Sorrentinos" → "Sorrentinos")
  var scopeNice = '';
  if (appliedCoupon.scope) {
    var ix = appliedCoupon.scope.indexOf(':');
    if (ix >= 0) scopeNice = appliedCoupon.scope.substring(ix + 1).trim();
  }

  if (disc > 0) {
    // Activo: descuento aplicándose ahora
    card.classList.remove('pending');
    codeEl.textContent = '🎟️ ' + appliedCoupon.codigo + ' aplicado';
    msgEl.textContent  = appliedCoupon.mensaje || '';
  } else {
    // Pending: el cupón está cargado pero no hay productos del scope
    card.classList.add('pending');
    codeEl.textContent = '🎟️ ' + appliedCoupon.codigo + ' listo para usar';
    if (scopeNice) {
      msgEl.textContent = '¡Adelante! Sumá ' + scopeNice + ' al pedido y activá tu ' +
        (appliedCoupon.tipo === 'PCT' ? appliedCoupon.valor + '% OFF' : 'descuento') + '.';
    } else {
      msgEl.textContent = appliedCoupon.mensaje || '¡Adelante, usalo en tu pedido!';
    }
  }
  card.style.display = '';
}
function slugify(str) {
  return str.toLowerCase().replace(/[áäâà]/g,'a').replace(/[éëêè]/g,'e').replace(/[íïîì]/g,'i').replace(/[óöôò]/g,'o').replace(/[úüûù]/g,'u').replace(/ñ/g,'n').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
}

/* ── VENDEDORES RED (Pilar) ── */
function fetchVendedores() {
  fetch(APPS_SCRIPT_URL + '?action=vendedores', { cache: 'no-store' })
    .then(r => r.json())
    .then(d => {
      vendedoresRed = d.vendedores || [];
      barrioToVendedor = {};
      vendedoresRed.forEach(v => {
        (v.barrios || []).forEach(b => {
          barrioToVendedor[b.toLowerCase()] = { nombre: v.nombre, wa: v.wa, partido: v.partido, localidad: v.localidad, barrio: b };
        });
      });
      try { localStorage.setItem('maleu_vendedores', JSON.stringify({ ts: Date.now(), vendedores: vendedoresRed })); } catch(e) {}
      renderPilarBarrios();
    })
    .catch(function() {
      // Fallback: usar cache si hay
      try {
        var cached = JSON.parse(localStorage.getItem('maleu_vendedores') || 'null');
        if (cached && cached.vendedores) {
          vendedoresRed = cached.vendedores;
          barrioToVendedor = {};
          vendedoresRed.forEach(v => {
            (v.barrios || []).forEach(b => {
              barrioToVendedor[b.toLowerCase()] = { nombre: v.nombre, wa: v.wa, partido: v.partido, localidad: v.localidad, barrio: b };
            });
          });
          renderPilarBarrios();
        }
      } catch(e) {}
    });
}
function renderPilarBarrios() {
  var sel = $id('f-pilar-barrio');
  if (!sel) return;
  var restricted = isPilarRestricted();
  // Limpiar y re-armar
  var cur = sel.value || selectedPilarBarrio || '';
  sel.innerHTML = '<option value="">Elegí tu barrio privado</option>';
  // Lista canónica del modal (incluye no-Red como Pilara y El Ocho).
  // Agregamos primero los del modal, después los Red dinámicos del Sheets
  // que no estén ya, para no perder ninguno.
  var addedVals = {};
  BARRIOS_PILAR_MODAL.forEach(function(b) {
    if (b.isOther) return; // "Otro" se agrega al final
    sel.innerHTML += '<option value="' + b.val + '">' + b.nombre + '</option>';
    addedVals[b.val] = true;
  });
  vendedoresRed.forEach(v => (v.barrios || []).forEach(b => {
    if (!addedVals[b]) {
      sel.innerHTML += '<option value="' + b + '">' + b + '</option>';
      addedVals[b] = true;
    }
  }));
  // "Otro barrio" se oculta durante la restricción de esta semana
  if (!restricted) {
    sel.innerHTML += '<option value="__otro__">Otro barrio</option>';
  }
  // Si el cliente tenía elegido "Otro barrio" guardado, limpiarlo
  if (cur === '__otro__' && restricted) cur = '';
  if (cur) sel.value = cur;
  // Cartel info
  var info = $id('pilar-restriccion-info');
  if (info) info.style.display = restricted ? '' : 'none';
}
function onPilarBarrioChange() {
  var val = $id('f-pilar-barrio').value;
  var fieldOtro = $id('field-pilar-otro');
  if (fieldOtro) fieldOtro.style.display = val === '__otro__' ? '' : 'none';
  // Sincronizar con el barrio guardado del modal
  if (val) {
    var match = BARRIOS_PILAR_MODAL.filter(function(b) { return b.val === val; })[0];
    var nombre = match ? match.nombre : val;
    selectedPilarBarrio = val;
    selectedPilarBarrioName = nombre;
    try { localStorage.setItem('maleu_pilar_barrio', JSON.stringify({ val: val, nombre: nombre, ts: Date.now() })); } catch(e) {}
  }
  updatePilarVendedorLabel();
  updatePilarDiasEntrega();
  updatePromoBar();
  // Si cambió Red ↔ no-Red, el cap de stock puede cambiar — refrescar
  _ensureCartFitsDate();
  updateStockDisplay();
  updateUI();
  updateShippingBar();
}
// Si el barrio tiene vendedor Red asignado, limitar días de entrega a Viernes
function updatePilarDiasEntrega() {
  if (currentZone !== 'pilar') return;
  // Re-renderiza el calendario con los días habilitados según el vendedor asignado al barrio.
  renderDayPicker();
}
function updatePilarVendedorLabel() {
  var label = $id('pilar-vendedor-label');
  if (!label) return;
  var val = $id('f-pilar-barrio').value;
  var text = '';
  if (val === '__otro__') {
    var otro = ($id('f-direccion') && $id('f-direccion').value || '').trim();
    if (otro) text = 'El vendedor es Tadeo Ustariz';
  } else if (val) {
    var v = barrioToVendedor[val.toLowerCase()];
    if (v && v.nombre) text = 'El vendedor es ' + v.nombre;
  }
  if (text) { label.textContent = text; label.style.display = ''; }
  else { label.textContent = ''; label.style.display = 'none'; }
  // Si ya eligió método de pago, re-evaluar visibilidad del alias maleump
  if (typeof onPagoChange === 'function') onPagoChange();
}

/* ── ZONA + FECHA (modal de bienvenida) ── */
function _setOverlay(show) {
  var ov = $id('loc-overlay');
  if (!ov) return;
  if (show) {
    ov.classList.remove('hidden');
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  } else {
    ov.classList.add('hidden');
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }
}
function setZone(zone) {
  currentZone = zone;
  localStorage.setItem('maleu_zone', zone);
  _track('select_zone', { zone: zone });
  applyZone();
  // Clubes: la entrega es siempre Viernes "a coordinar" en la puerta del
  // club, no tiene sentido preguntar fecha. Se setea automáticamente.
  if (zone === 'clubes') {
    _setClubesDefaultDate();
    _setOverlay(false);
    window.scrollTo(0, 0);
    return;
  }
  // Pilar: cuando el cliente elige Pilar EXPLÍCITAMENTE desde el modal,
  // siempre mostrar el paso barrio (puede que quiera cambiarlo). El skip
  // del paso barrio solo aplica en el INIT cuando ya entra con zona+barrio
  // guardados y NO está pasando por el modal de zona.
  if (zone === 'pilar') {
    welcomeShowBarrioStep();
    return;
  }
  // Si ya tenía fecha guardada y aún es vigente, no volver a preguntar.
  // Si no, avanzar al paso de fecha.
  if (!_loadSavedDate()) {
    welcomeShowDateStep();
  } else {
    _setOverlay(false);
    window.scrollTo(0, 0);
  }
}
function welcomeShowBarrioStep() {
  _hideAllSteps();
  var step = $id('loc-step-barrio');
  if (step) step.style.display = '';
  renderWelcomeBarrioGrid();
}
function welcomeBackFromDate() {
  // Botón "← Volver" del paso fecha. Si zona = Pilar volver a paso barrio,
  // si no, al paso de zona.
  if (currentZone === 'pilar') welcomeShowBarrioStep();
  else welcomeShowZoneStep();
}
function renderWelcomeBarrioGrid() {
  var grid = $id('loc-barrios-grid');
  if (!grid) return;
  grid.innerHTML = BARRIOS_PILAR_MODAL.map(function(b) {
    var classes = ['loc-barrio-card'];
    if (b.isRed) classes.push('is-red');
    if (b.isOther) classes.push('is-other');
    var badge = b.badge ? '<span class="loc-barrio-badge">' + b.badge + '</span>' : '';
    return '<button type="button" class="' + classes.join(' ') + '"'
         + ' onclick="setPilarBarrio(\'' + b.val + '\',\'' + b.nombre + '\')">'
         + badge
         + '<span class="loc-barrio-name">' + b.nombre + '</span>'
         + '</button>';
  }).join('');
}
function setPilarBarrio(val, nombre) {
  selectedPilarBarrio = val;
  selectedPilarBarrioName = nombre;
  try {
    localStorage.setItem('maleu_pilar_barrio', JSON.stringify({
      val: val, nombre: nombre, ts: Date.now()
    }));
  } catch(e) {}
  // Pre-popular el dropdown del checkout
  var sel = $id('f-pilar-barrio');
  if (sel) {
    sel.value = val;
    if (typeof onPilarBarrioChange === 'function') onPilarBarrioChange();
  }
  // Avanzar al paso fecha
  if (!_loadSavedDate()) {
    welcomeShowDateStep();
  } else {
    _setOverlay(false);
    window.scrollTo(0, 0);
  }
}
function _loadSavedPilarBarrio() {
  try {
    var raw = JSON.parse(localStorage.getItem('maleu_pilar_barrio') || 'null');
    if (!raw || !raw.val) return false;
    selectedPilarBarrio = raw.val;
    selectedPilarBarrioName = raw.nombre || '';
    var sel = $id('f-pilar-barrio');
    if (sel) {
      sel.value = raw.val;
      if (typeof onPilarBarrioChange === 'function') onPilarBarrioChange();
    }
    return true;
  } catch(e) { return false; }
}
function _setClubesDefaultDate() {
  // Próximo Viernes (a coordinar). Marcamos como flexible para que no
  // muestre el chip "📅 Fecha" y para que el stock siempre sea abierto.
  var fri = _getNextDeliveryOf('clubes', 'Viernes');
  selectedDateIsFlexible = true;
  if (fri) {
    selectedDeliveryDate = fri.iso;
    selectedDeliveryDayName = fri.dayName;
  }
  try {
    localStorage.setItem('maleu_delivery_date', JSON.stringify({
      iso: selectedDeliveryDate, dayName: selectedDeliveryDayName,
      flexible: true, zone: 'clubes', ts: Date.now()
    }));
  } catch(e) {}
  _updateDateChip();
  _preselectDayPicker();
}
function showZoneModal() {
  // Reabrir desde el chip "📍 Zona"
  welcomeShowZoneStep();
  _setOverlay(true);
}
function showDateModal() {
  // Reabrir desde el chip "📅 Fecha". En Clubes no aplica (Vie en cancha).
  if (currentZone === 'clubes') return;
  welcomeShowDateStep();
  _setOverlay(true);
}
function welcomeBackToZone() {
  welcomeShowZoneStep();
}
function _hideAllSteps() {
  var ids = ['loc-step-zone', 'loc-step-barrio', 'loc-step-date'];
  ids.forEach(function(id) { var el = $id(id); if (el) el.style.display = 'none'; });
}
function welcomeShowZoneStep() {
  _hideAllSteps();
  $id('loc-step-zone').style.display = '';
}
function welcomeShowDateStep() {
  _hideAllSteps();
  var step = $id('loc-step-date');
  step.style.display = '';
  // Etiqueta con la zona elegida
  var z = ZONAS[currentZone];
  var label = step.querySelector('#loc-date-zone-label strong');
  if (label && z) label.textContent = z.nombre;
  // Render grilla
  renderWelcomeDateGrid();
}
function renderWelcomeDateGrid() {
  var grid = $id('loc-dates-grid');
  if (!grid || !currentZone) return;
  var groups = _getNextDeliveryDatesGrouped(currentZone);
  var html = '';

  // Card "Cualquier día" (flexible) — destacada arriba, ancho completo
  html += '<button type="button" class="loc-any-btn" onclick="setDeliveryDate(\'any\',\'\')" aria-label="Cualquier día">'
        + '<span class="any-icon">🤝</span>'
        + '<span class="any-text"><strong>Cualquier día</strong><small>Sin preferencia, lo coordinamos juntos</small></span>'
        + '</button>';

  function cardHTML(d, isNext) {
    var classes = ['loc-date-card'];
    if (isNext) classes.push('next');
    if (d.isToday) classes.push('is-today');
    else if (d.isTomorrow) classes.push('is-tomorrow');
    var dayClass = (d.isToday || d.isTomorrow) ? 'dc-day dc-day-flag' : 'dc-day';
    return '<button type="button" class="' + classes.join(' ') + '"'
         + ' onclick="setDeliveryDate(\'' + d.iso + '\',\'' + d.dayName + '\')"'
         + ' aria-label="' + d.dayName + ' ' + d.dayNum + ' de ' + d.monthShort + '">'
         + '<span class="' + dayClass + '">' + d.dayShort + '</span>'
         + '<span class="dc-num">' + d.dayNum + '</span>'
         + '<span class="dc-mon">' + d.monthShort + '</span>'
         + '<span class="dc-time">' + d.timeRange + '</span>'
         + '</button>';
  }

  // Sección: Semana actual
  if (groups.thisWeek.length) {
    html += '<div class="loc-date-section">';
    html += '<div class="loc-date-section-title">Semana actual</div>';
    html += '<div class="loc-date-section-grid">';
    groups.thisWeek.forEach(function(d, i) { html += cardHTML(d, i === 0); });
    html += '</div></div>';
  }

  // Sección: Semana siguiente
  if (groups.nextWeek.length) {
    var firstNext = groups.thisWeek.length === 0; // si no había nada esta semana, marcar la primera
    html += '<div class="loc-date-section">';
    html += '<div class="loc-date-section-title">Semana siguiente</div>';
    html += '<div class="loc-date-section-grid">';
    groups.nextWeek.forEach(function(d, i) { html += cardHTML(d, i === 0 && firstNext); });
    html += '</div></div>';
  }

  // Sección: Para más adelante (acordeón)
  if (groups.later.length) {
    html += '<div class="loc-date-section">';
    html += '<button type="button" class="loc-later-toggle" onclick="toggleLaterSection(this)" aria-expanded="false">';
    html += '<span>Para más adelante</span><span class="chev">▾</span>';
    html += '</button>';
    html += '<div class="loc-later-content" hidden>';
    html += '<div class="loc-date-section-grid">';
    groups.later.forEach(function(d) { html += cardHTML(d, false); });
    html += '</div></div></div>';
  }

  grid.innerHTML = html;
}

function toggleLaterSection(btn) {
  if (!btn) return;
  var expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expanded));
  btn.classList.toggle('open', !expanded);
  var content = btn.nextElementSibling;
  if (content) {
    if (expanded) content.setAttribute('hidden', '');
    else content.removeAttribute('hidden');
  }
}

/* Devuelve las próximas fechas de entrega válidas para la zona dada,
   agrupadas por: thisWeek (hasta el Domingo de esta semana),
   nextWeek (Lun-Dom de la semana siguiente), later (todo lo posterior,
   hasta 5 semanas en total). */
function _getNextDeliveryDatesGrouped(zone) {
  var out = { thisWeek: [], nextWeek: [], later: [] };
  var z = ZONAS[zone]; if (!z || !z.horarios) return out;
  var validDays = Object.keys(z.horarios);
  var DAY_NAMES_LONG = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var DAY_NAMES_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  var MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Hoy en hora Argentina (medianoche UTC del día AR)
  var nowAR = new Date(Date.now() - 3 * 3600 * 1000);
  var today = new Date(Date.UTC(nowAR.getUTCFullYear(), nowAR.getUTCMonth(), nowAR.getUTCDate()));
  var todayMs = today.getTime();
  var tomorrowMs = todayMs + 86400000;

  // Lunes de la semana actual (en AR, semana arranca Lun)
  var dow = today.getUTCDay(); // 0=Dom..6=Sáb
  var diffToMonday = (dow + 6) % 7; // si Dom=0 → 6, Lun=1 → 0
  var thisMonday = new Date(today);
  thisMonday.setUTCDate(today.getUTCDate() - diffToMonday);
  var nextMonday = new Date(thisMonday);
  nextMonday.setUTCDate(thisMonday.getUTCDate() + 7);
  var laterStart = new Date(thisMonday);
  laterStart.setUTCDate(thisMonday.getUTCDate() + 14);

  // Durante la restricción Pilar de esta semana, en thisWeek solo se
  // acepta Viernes (Marcos entrega los Vie). El resto de la semana queda
  // fuera. La semana siguiente en adelante NO se filtra.
  var pilarRestricted = (zone === 'pilar' && isPilarRestricted());
  // Si el cliente eligió barrio Red (Marcos): solo Vie en TODAS las semanas
  // (Marcos reparte solamente los Viernes, no los Miércoles).
  var pilarRedOnly = (zone === 'pilar' && _pilarBarrioIsRed());
  var feriados = FERIADOS_BLOQUEADOS[zone] || [];
  var extras = ENTREGAS_EXTRA[zone] || [];
  // Cutoff Pilar Vie de esta semana: si ya pasó, bloquear el Vie en thisWeek
  var pilarFridayBloqueadoFlag = (zone === 'pilar' && _isPilarFridayCutoffPast());

  for (var i = 0; i < 35; i++) {
    var d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    var dayName = DAY_NAMES_LONG[d.getUTCDay()];
    var iso = d.toISOString().slice(0,10);
    // Es entrega extra puntual de esa fecha
    var isExtra = extras.some(function(e) { return e.iso === iso; });
    // ¿Día normalmente válido O entrega extra?
    if (validDays.indexOf(dayName) === -1 && !isExtra) continue;
    // Bloqueado por feriado
    if (feriados.indexOf(iso) !== -1) continue;
    // Si la entrega ya terminó (pasó el horario de cierre), saltar
    var endMs = _deliveryEndMs(iso);
    if (endMs && endMs <= Date.now()) continue;
    var inThisWeek = d.getTime() < nextMonday.getTime();
    // Filtro de restricción Pilar: solo Vie en thisWeek (las extras también pasan)
    if (pilarRestricted && inThisWeek && dayName !== 'Viernes' && !isExtra) continue;
    // Barrio Red (Marcos): solo Viernes, todas las semanas
    if (pilarRedOnly && dayName !== 'Viernes' && !isExtra) continue;
    // Cutoff Pilar Vie de esta semana ya vencido → no ofrecer ese Vie
    if (pilarFridayBloqueadoFlag && inThisWeek && dayName === 'Viernes') continue;
    // timeRange: usar el de extra si aplica, sino el del horario normal
    var timeRange;
    if (isExtra) {
      var ex = extras.filter(function(e) { return e.iso === iso; })[0];
      timeRange = (ex && ex.timeRange) || '19 a 21 hs';
    } else {
      timeRange = (z.horarios[dayName] || '').replace(/\s*hs/g,'hs');
    }
    var dms = d.getTime();
    var label;
    if (dms === todayMs) label = 'HOY';
    else if (dms === tomorrowMs) label = 'MAÑANA';
    else label = DAY_NAMES_SHORT[d.getUTCDay()];
    var item = {
      iso: iso,
      dayName: dayName,
      dayShort: label,
      dayNum: d.getUTCDate(),
      monthShort: MONTH_SHORT[d.getUTCMonth()],
      timeRange: timeRange,
      isExtra: isExtra,
      isToday: dms === todayMs,
      isTomorrow: dms === tomorrowMs
    };
    if (inThisWeek) out.thisWeek.push(item);
    else if (d.getTime() < laterStart.getTime()) out.nextWeek.push(item);
    else out.later.push(item);
  }
  return out;
}

/* Devuelve el próximo objeto de fecha de entrega de un día específico
   ("Viernes", etc.) para la zona dada. Usado para el fallback de
   "Cualquier día". */
function _getNextDeliveryOf(zone, targetDayName) {
  var groups = _getNextDeliveryDatesGrouped(zone);
  var all = groups.thisWeek.concat(groups.nextWeek, groups.later);
  for (var i = 0; i < all.length; i++) if (all[i].dayName === targetDayName) return all[i];
  return all[0] || null;
}
function setDeliveryDate(iso, dayName) {
  if (iso === 'any') {
    // "Cualquier día" → flexible. Para el day-picker del form usamos
    // por default el próximo Viernes (la fecha más común y disponible
    // en todas las zonas).
    selectedDateIsFlexible = true;
    var fri = _getNextDeliveryOf(currentZone, 'Viernes') || _getNextDeliveryOf(currentZone, 'Miércoles');
    if (fri) {
      selectedDeliveryDate = fri.iso;
      selectedDeliveryDayName = fri.dayName;
    } else {
      selectedDeliveryDate = null;
      selectedDeliveryDayName = '';
    }
  } else {
    selectedDateIsFlexible = false;
    selectedDeliveryDate = iso;
    selectedDeliveryDayName = dayName;
  }
  try {
    localStorage.setItem('maleu_delivery_date', JSON.stringify({
      iso: selectedDeliveryDate, dayName: selectedDeliveryDayName,
      flexible: selectedDateIsFlexible, zone: currentZone, ts: Date.now()
    }));
  } catch(e) {}
  _setOverlay(false);
  _updateDateChip();
  _ensureCartFitsDate();
  updateStockDisplay();
  // Pre-rellenar el day-picker del form si corresponde
  _preselectDayPicker();
  window.scrollTo(0, 0);
}
function _loadSavedDate() {
  try {
    var raw = JSON.parse(localStorage.getItem('maleu_delivery_date') || 'null');
    if (!raw || !raw.iso) return false;
    if (raw.zone && raw.zone !== currentZone) return false;
    var startMs = _deliveryStartMs(raw.iso);
    if (!startMs || startMs < Date.now()) return false; // ya pasó
    selectedDeliveryDate = raw.iso;
    selectedDeliveryDayName = raw.dayName || '';
    selectedDateIsFlexible = !!raw.flexible;
    _updateDateChip();
    return true;
  } catch(e) { return false; }
}
function _updateDateChip() {
  var chip = $id('date-chip'); if (!chip) return;
  // En Clubes no se muestra el chip de fecha (entrega siempre Vie en cancha)
  if (currentZone === 'clubes') { chip.style.display = 'none'; return; }
  if (!selectedDeliveryDate && !selectedDateIsFlexible) { chip.style.display = 'none'; return; }
  chip.style.display = '';
  if (selectedDateIsFlexible) {
    chip.textContent = '📅 Cualquier día';
    return;
  }
  var parts = selectedDeliveryDate.split('-');
  if (parts.length !== 3) { chip.textContent = '📅 Fecha'; return; }
  var DAY_NAMES_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  var d = new Date(Date.UTC(+parts[0], +parts[1]-1, +parts[2]));
  chip.textContent = '📅 ' + DAY_NAMES_SHORT[d.getUTCDay()] + ' ' + (+parts[2]) + '/' + (+parts[1]);
}
function _ensureCartFitsDate() {
  // Si la fecha elegida activa modo limitado, recortar carrito al stock real
  if (!isStockLimited()) return;
  var ajustado = false;
  Object.entries(cart).forEach(function(kv) {
    var id = kv[0], qty = kv[1];
    var avail = stockMap[id];
    if (avail !== undefined && qty > avail) {
      if (avail === 0) delete cart[id];
      else cart[id] = avail;
      ajustado = true;
      renderCardFooter(id);
    }
  });
  if (ajustado) { updateUI(); toast('⚠️ Tu carrito fue ajustado al stock disponible para esa fecha'); }
}
function _preselectDayPicker() {
  // Si el day-picker del form existe, marcar la fecha elegida
  if (!selectedDeliveryDate || selectedDeliveryDate === 'any') return;
  var hidden = $id('f-dia'), hiddenF = $id('f-dia-fecha');
  if (hidden) hidden.value = selectedDeliveryDayName || '';
  if (hiddenF) hiddenF.value = selectedDeliveryDate;
  if (typeof renderDayPicker === 'function') renderDayPicker();
}
function applyZone() {
  const z = ZONAS[currentZone];
  // Chip
  $id('zone-chip').textContent = '📍 ' + z.nombre;
  // Hero delivery text — si hay schedule detallado, mostrar solo eso
  const schedEl = $id('hero-schedule');
  if (z.schedule) {
    $id('hero-delivery').style.display = 'none';
    if (schedEl) { schedEl.innerHTML = '📅 ' + z.schedule; schedEl.style.display = ''; }
  } else {
    $id('hero-delivery').textContent = z.deliveryText;
    $id('hero-delivery').style.display = '';
    if (schedEl) schedEl.style.display = 'none';
  }
  // Form fields
  $id('fields-estancias').style.display = currentZone === 'estancias' ? '' : 'none';
  $id('fields-pilar').style.display = currentZone === 'pilar' ? '' : 'none';
  $id('fields-clubes').style.display = currentZone === 'clubes' ? '' : 'none';
  // Limpiar cartel del vendedor Red (solo aplica en Pilar con barrio Marcos).
  // Si el cliente venía de Pilar y vuelve a Home/Clubes, el cartel quedaba pegado.
  var _aliasNote = $id('mp-alias-vendedor-note');
  if (_aliasNote) _aliasNote.classList.add('hidden');
  if (typeof onPagoChange === 'function') onPagoChange();
  // Si Pilar, re-render dropdown de barrios por si ya llegaron vendedores
  if (currentZone === 'pilar') renderPilarBarrios();
  // Días de entrega (calendario 14 días)
  $id('f-dia').value = '';
  if ($id('f-dia-fecha')) $id('f-dia-fecha').value = '';
  renderDayPicker();
  // Promo bar: ocultar si no hay descuentos activos (clubes, o pilar sin "Otro barrio")
  updatePromoBar();
  // Limpiar carrito al cambiar zona (productos/precios cambian)
  cart = {}; comboCart = {};
  // Ocultar último pedido (se re-evalúa con loadLastOrder)
  var repeatBlock = $id('repeat-block');
  if (repeatBlock) repeatBlock.style.display = 'none';
  // Re-render catálogo y nav con productos de la zona
  renderCatalog();
  renderCatNav();
  updateCatNavTop();
  // Botón "Ver los combos" del hero: solo si la zona tiene combos (hoy, Estancias).
  var combosCta = $id('hero-combos-cta');
  if (combosCta) combosCta.style.display = getActiveCombos().length ? '' : 'none';
  updateUI();
  updateStockDisplay();
  loadLastOrder();
}

/* HTML de UNA card de combo (reutilizable en grupos temporales y permanentes).
   - fullCard: la imagen YA es una placa diseñada (trae nombre, descripción y
     composición). Se muestra entera y NO se repite el texto en HTML; debajo
     solo el precio (tachado dinámico + final) y el botón.
   - sin fullCard: layout de texto clásico (placeholder / combos sin arte). */
/* Composición condensada de un combo en una línea corta (para la card completa,
   donde la placa diseñada se lee difícil). Ej: "1 tarta · 1 wrap · 1 pack de
   sorrentinos · Franui". */
function _comboCompSummary(c) {
  return (c.slots || []).map(slot => {
    const pick = slot.pick || 1;
    const opts = slotOptions(slot);
    let noun = slot.unidad || ((opts.length <= 1 && opts[0]) ? opts[0].nombre : slot.label.toLowerCase());
    return (pick > 1 ? pick + '× ' : '') + noun;
  }).join(' · ');
}

function _comboCardHTML(c) {
  const tachado = comboNaturalSumComp(resolveComp(c, defaultSelection(c)).comp);
  const priceHtml = '<span class="product-price">' +
    (tachado > c.precio ? '<s class="combo-price-old">' + ars(tachado) + '</s> ' : '') + ars(c.precio) + '</span>';
  const choices = comboHasChoices(c);
  const btn = choices
    ? '<button class="add-btn" onclick="openComboConfig(\'' + c.id + '\')">Armar combo</button>'
    : '<button class="add-btn" onclick="addComboDefault(\'' + c.id + '\')">+ Agregar</button>';

  if (c.fullCard) {
    return '<article class="product-card combo-card combo-card-full" data-id="' + c.id + '">' +
      '<img class="combo-full-img" src="img/' + c.img + '" alt="' + c.nombre + '" loading="lazy">' +
      '<div class="combo-full-foot">' +
        '<p class="combo-full-comp"><strong>Incluye:</strong> ' + _comboCompSummary(c) + '</p>' +
        '<span class="stock-indicator" id="stock-' + c.id + '"></span>' +
        '<div class="product-footer">' + priceHtml + btn + '</div>' +
      '</div>' +
    '</article>';
  }

  const compList = (c.slots || []).map(slot => {
    const opts = slotOptions(slot);
    const pick = slot.pick || 1;
    const noun = slot.unidad || slot.label.toLowerCase();
    if (opts.length <= 1) {
      const p = opts[0];
      return p ? '<li class="fixed"><strong>' + pick + '×</strong> ' + p.nombre + '</li>' : '';
    }
    return '<li><strong>' + pick + '×</strong> ' + noun +
      ' <span class="combo-choose">· elegís ' + (pick > 1 ? 'los sabores' : 'el sabor') + '</span></li>';
  }).join('');
  return '<article class="product-card combo-card" data-id="' + c.id + '">' +
    '<div class="product-thumb">' +
      '<span class="combo-flag">' + (c.flag || '🎁') + '</span>' +
      '<img class="product-thumb-img" src="img/' + c.img + '" alt="' + c.nombre + '" loading="lazy" width="400" height="400" style="object-position:' + (c.imgPos||'center') + '" onerror="this.style.display=\'none\'">' +
    '</div>' +
    '<div class="product-body">' +
      (c.top ? '<span class="product-top-badge">⭐ Lo más pedido</span>' : '') +
      '<h3 class="product-name">' + c.nombre + '</h3>' +
      '<p class="product-desc">' + c.desc + '</p>' +
      '<ul class="combo-includes">' + compList + '</ul>' +
      (c.chips ? '<div class="product-chips">' + c.chips.map(x => '<span class="chip">' + x + '</span>').join('') + '</div>' : '') +
      '<span class="stock-indicator" id="stock-' + c.id + '"></span>' +
      '<div class="product-footer">' + priceHtml + btn + '</div>' +
    '</div>' +
  '</article>';
}

/* ── RENDER SECCIÓN COMBOS ──
   Dentro de la sección conviven CATEGORÍAS:
   - Temporales (combo.categoria definido): van PRIMERO, cada una con su
     encabezado y estilo destacado (ej. "🇦🇷 Mundial 2026").
   - Permanentes (sin categoria): van debajo.
   Para sumar otra categoría temporal (octavos, Día del Amigo, etc.) basta con
   poner `categoria` en cada combo nuevo; se agrupan solos. */
function renderCombosSectionHTML() {
  const combos = getActiveCombos();
  if (!combos.length) return '';
  const temporales = combos.filter(c => c.categoria);
  const permanentes = combos.filter(c => !c.categoria);

  // Agrupar temporales por nombre de categoría, en orden de aparición.
  const catOrder = []; const catMap = {};
  temporales.forEach(c => {
    if (!catMap[c.categoria]) { catMap[c.categoria] = []; catOrder.push(c.categoria); }
    catMap[c.categoria].push(c);
  });

  let groups = '';
  catOrder.forEach(cat => {
    groups += '<div class="combo-group combo-group-temporal">' +
      '<div class="combo-group-head">' + cat + '<span class="combo-group-tag">Por tiempo limitado</span></div>' +
      '<div class="products-grid">' + catMap[cat].map(_comboCardHTML).join('') + '</div>' +
    '</div>';
  });
  if (permanentes.length) {
    groups += '<div class="combo-group">' +
      (catOrder.length ? '<div class="combo-group-head combo-group-head-perma">Combos de siempre</div>' : '') +
      '<div class="products-grid">' + permanentes.map(_comboCardHTML).join('') + '</div>' +
    '</div>';
  }

  return '<section class="cat-section combos-section" id="combos-ancla"><div class="cat-header">' +
    '<div class="cat-title">🎁 Combos</div>' +
    '<div class="cat-nota">Propuestas ya armadas a precio cerrado · Elegí los sabores y listo</div>' +
    '</div>' + groups + '</section>';
}

/* ── RENDER CATÁLOGO ── */
function renderCatalog() {
  const cats = getActiveCategories();
  const prods_all = getActiveProducts();
  $id('catalog-root').innerHTML = '<span id="productos-ancla"></span>' + cats.map(cat => {
    const prods = prods_all.filter(p => p.cat === cat.nombre).sort((a,b) => (b.top?1:0) - (a.top?1:0));
    if (!prods.length) return '';
    return '<section class="cat-section"><div class="cat-header">' +
      '<div class="cat-title">' + cat.nombre + '</div>' +
      '<div class="cat-nota">' + cat.nota + '</div>' +
      (cat.tip ? '<div class="cat-tip">🍳 ' + cat.tip + '</div>' : '') +
      '</div><div class="products-grid">' +
      prods.map(p => '<article class="product-card" data-id="' + p.id + '">' +
        '<div class="product-thumb">' +
          '<img class="product-thumb-img" src="img/' + p.img + '" alt="' + p.nombre + '" loading="lazy" width="400" height="400" style="object-position:' + (p.imgPos||'center') + '" onerror="this.style.display=\'none\'">' +
        '</div>' +
        '<div class="product-body">' +
          (p.top ? '<span class="product-top-badge">⭐ Lo más pedido</span>' : '') +
          '<h3 class="product-name">' + p.nombre + '</h3>' +
          '<p class="product-desc">' + p.desc + '</p>' +
          (p.chips ? '<div class="product-chips">' + p.chips.map(c => '<span class="chip">' + c + '</span>').join('') + '</div>' : '') +
          '<span class="stock-indicator" id="stock-' + p.id + '"></span>' +
          '<div class="product-footer">' +
            '<span class="product-price">' + ars(p.precio) + '</span>' +
            '<button class="add-btn" onclick="addToCart(\'' + p.id + '\')">+ Agregar</button>' +
          '</div>' +
        '</div>' +
      '</article>').join('') +
      '</div></section>';
  }).join('') + renderCombosSectionHTML();  // combos al final, después de la última categoría (Tortas)
}

/* ── RENDER CARD FOOTER ── */
function renderCardFooter(id) {
  const card = document.querySelector('.product-card[data-id="' + id + '"]');
  if (!card) return;
  const footer = card.querySelector('.product-footer');
  if (!footer) return;
  const p = PROD_MAP[id];
  if (!p) return;
  const qty = cart[id] || 0;
  // Tope dinámico según modo: real (físico), proyectado (físico+OC), o null (ilimitado).
  const cap = getStockCap(id);
  const sinStock = cap !== null && cap !== undefined && cap === 0;
  const atLimit = cap !== null && cap !== undefined && qty >= cap;
  if (qty === 0) {
    footer.innerHTML = '<span class="product-price">' + ars(p.precio) + '</span>' +
      '<button class="add-btn" onclick="addToCart(\'' + p.id + '\')"' + (sinStock ? ' disabled' : '') + '>' +
      (sinStock ? 'Sin stock' : '+ Agregar') + '</button>';
  } else {
    footer.innerHTML = '<span class="product-price">' + ars(p.precio) + '</span>' +
      '<div class="card-qty-controls">' +
        '<button class="card-qty-btn remove" onclick="cardChangeQty(\'' + p.id + '\',-1)">−</button>' +
        '<span class="card-qty-val">' + qty + '</span>' +
        '<button class="card-qty-btn" onclick="cardChangeQty(\'' + p.id + '\',+1)"' + (atLimit ? ' disabled' : '') + '>+</button>' +
      '</div>' +
      (atLimit ? '<span style="display:block;text-align:center;font-size:.75rem;color:#c0392b;margin-top:4px;font-weight:600;">Máximo disponible: ' + cap + '</span>' : '');
  }
}

/* ── CARRITO ── */
function modifyCart(id, delta) {
  const current = cart[id] || 0;
  if (delta > 0) {
    const cap = getStockCap(id);
    if (cap !== null && cap !== undefined && current >= cap) {
      toast('⚠️ Stock limitado — solo hay ' + cap + ' disponible' + (cap !== 1 ? 's' : ''), 3000);
      return;
    }
  }
  const newQty = current + delta;
  if (newQty <= 0) delete cart[id];
  else cart[id] = newQty;
  updateUI();
  renderCardFooter(id);
  updateFormVisibility();
  updateShippingBar();
}
function _track(event, params) { if (typeof gtag === 'function') gtag('event', event, params || {}); }
function addToCart(id) {
  modifyCart(id, 1);
  const p = PROD_MAP[id];
  _track('add_to_cart', { item_name: p.nombre, price: p.precio, zone: currentZone });
  toast('✓ ' + p.nombre + ' agregado');
  const badge = $id('cart-badge');
  badge.classList.remove('bounce');
  void badge.offsetWidth;
  badge.classList.add('bounce');
}
function changeQty(id, delta) { modifyCart(id, delta); }
function cardChangeQty(id, delta) { modifyCart(id, delta); }

/* ── COMBOS: alta de instancias configuradas ── */
/* Agrega una instancia (comboId + componentes resueltos). Devuelve true si entró. */
function addComboInstance(comboId, comp, picks) {
  const c = COMBO_MAP[comboId]; if (!c) return false;
  const sig = comboSignature(comboId, comp);
  const existing = comboCart[sig] ? comboCart[sig].qty : 0;
  const max = compMaxTotal(comp, sig);                 // máx instancias de esta config
  if (existing >= max) {
    toast('⚠️ No hay stock para sumar otro ' + c.nombre, 3000);
    return false;
  }
  if (comboCart[sig]) comboCart[sig].qty = existing + 1;
  else comboCart[sig] = { comboId, qty: 1, comp, picks: picks || [] };
  _track('add_to_cart', { item_name: c.nombre, price: c.precio, zone: currentZone, combo: true });
  toast('✓ ' + c.nombre + ' agregado');
  const badge = $id('cart-badge');
  if (badge) { badge.classList.remove('bounce'); void badge.offsetWidth; badge.classList.add('bounce'); }
  _afterComboChange();
  return true;
}
/* Combo sin elecciones reales: arma la config por defecto y la agrega directo. */
function addComboDefault(comboId) {
  const c = COMBO_MAP[comboId]; if (!c) return;
  const r = resolveComp(c, defaultSelection(c));
  addComboInstance(comboId, r.comp, r.picks);
}
/* +/- y eliminar sobre una instancia puntual del carrito (por firma). */
function comboChangeQty(sig, delta) {
  const inst = comboCart[sig]; if (!inst) return;
  if (delta > 0) {
    const max = compMaxTotal(inst.comp, sig);
    if (inst.qty >= max) { toast('⚠️ No hay stock para sumar otro ' + (COMBO_MAP[inst.comboId] || {}).nombre, 3000); return; }
    inst.qty++;
  } else {
    inst.qty--;
    if (inst.qty <= 0) delete comboCart[sig];
  }
  _afterComboChange();
}
function removeComboInst(sig) { delete comboCart[sig]; _afterComboChange(); }
/* Refresca todo lo que depende del stock compartido tras tocar un combo. */
function _afterComboChange() {
  updateUI();
  getActiveProducts().forEach(p => renderCardFooter(p.id));
  getActiveCombos().forEach(c => renderComboFooter(c.id));
  updateStockBadgesCombos();
  updateFormVisibility();
  updateShippingBar();
}

/* Footer de la card de combo: combos con elecciones → "Armar combo" (abre el
   configurador). Combos sin elecciones → "+ Agregar" directo. */
function renderComboFooter(comboId) {
  const card = document.querySelector('.combo-card[data-id="' + comboId + '"]');
  if (!card) return;
  const footer = card.querySelector('.product-footer');
  if (!footer) return;
  const c = COMBO_MAP[comboId];
  if (!c) return;
  const tachado = comboNaturalSumComp(resolveComp(c, defaultSelection(c)).comp);
  const priceHtml = '<span class="product-price">' +
    (tachado > c.precio ? '<s class="combo-price-old">' + ars(tachado) + '</s> ' : '') +
    ars(c.precio) + '</span>';
  if (comboHasChoices(c)) {
    footer.innerHTML = priceHtml +
      '<button class="add-btn" onclick="openComboConfig(\'' + c.id + '\')">Armar combo</button>';
  } else {
    const max = compMaxTotal(resolveComp(c, defaultSelection(c)).comp, null);
    const sinStock = max !== Infinity && max <= 0;
    footer.innerHTML = priceHtml +
      '<button class="add-btn" onclick="addComboDefault(\'' + c.id + '\')"' + (sinStock ? ' disabled' : '') + '>' +
      (sinStock ? 'Sin stock' : '+ Agregar') + '</button>';
  }
}
/* Badge de stock de las cards de combo (mismo criterio que productos). */
function updateStockBadgesCombos() {
  const mode = (typeof getStockMode === 'function') ? getStockMode() : 'ilimitado';
  getActiveCombos().forEach(c => {
    const el = $id('stock-' + c.id);
    if (!el) return;
    const max = compMaxTotal(resolveComp(c, defaultSelection(c)).comp, null);
    if (mode === 'ilimitado' || max === Infinity) el.innerHTML = '';
    else if (max <= 0) el.innerHTML = '<span class="stock-badge stock-out">Sin stock</span>';
    else if (max <= 3) el.innerHTML = '<span class="stock-badge stock-low">Últimas ' + max + ' unidades</span>';
    else el.innerHTML = '';
  });
}

/* ══════════════════════════════════════════════════
   CONFIGURADOR DE COMBO (modal "Armar combo")
   ══════════════════════════════════════════════════ */
let _comboConfig = null;  // { comboId, sel:[[prodId,...], ...] }
function openComboConfig(comboId) {
  const c = COMBO_MAP[comboId]; if (!c) return;
  _comboConfig = { comboId, sel: defaultSelection(c) };
  _ensureComboModal();
  renderComboConfig();
  const ov = $id('combo-modal');
  ov.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeComboConfig() {
  const ov = $id('combo-modal');
  if (ov) ov.style.display = 'none';
  document.body.style.overflow = '';
  _comboConfig = null;
}
function _ensureComboModal() {
  if ($id('combo-modal')) return;
  const ov = document.createElement('div');
  ov.id = 'combo-modal';
  ov.className = 'combo-modal-overlay';
  ov.onclick = function(e) { if (e.target === ov) closeComboConfig(); };
  ov.innerHTML = '<div class="combo-modal" role="dialog" aria-modal="true">' +
    '<button class="combo-modal-close" onclick="closeComboConfig()" aria-label="Cerrar">×</button>' +
    '<div id="combo-modal-content"></div>' +
    '</div>';
  document.body.appendChild(ov);
}
/* Elige una opción en un slot (índice de slot, posición dentro del pick). */
function comboPick(slotIdx, pickIdx, prodId) {
  if (!_comboConfig) return;
  _comboConfig.sel[slotIdx][pickIdx] = isNaN(prodId) ? prodId : +prodId;
  renderComboConfig();
}
function renderComboConfig() {
  if (!_comboConfig) return;
  const c = COMBO_MAP[_comboConfig.comboId]; if (!c) return;
  const cont = $id('combo-modal-content'); if (!cont) return;
  const sel = _comboConfig.sel;

  const slotsHtml = (c.slots || []).map((slot, i) => {
    const opts = slotOptions(slot);
    const pick = slot.pick || 1;
    // Slot fijo (1 sola opción): se muestra como "incluido", sin selector.
    if (opts.length <= 1) {
      const p = opts[0];
      return p ? '<div class="cfg-slot cfg-slot-fixed"><div class="cfg-slot-label">' + slot.label +
        '</div><div class="cfg-fixed-item">✓ ' + _optLabel(p.nombre, slot.label) + '</div></div>' : '';
    }
    // Un bloque de opciones por cada unidad a elegir (pick).
    const pickBlocks = [];
    for (let k = 0; k < pick; k++) {
      const chosen = sel[i][k];
      const cards = opts.map(p => {
        const avail = optionAvailable(p.id);
        const out = avail !== Infinity && avail <= 0;
        const active = String(chosen) === String(p.id);
        return '<button class="cfg-opt' + (active ? ' active' : '') + (out ? ' out' : '') + '"' +
          (out ? ' disabled' : ' onclick="comboPick(' + i + ',' + k + ',\'' + p.id + '\')"') + '>' +
          '<span class="cfg-opt-name">' + _optLabel(p.nombre, slot.label) + '</span>' +
          (out ? '<span class="cfg-opt-out">Sin stock</span>' : '') +
          '</button>';
      }).join('');
      const blockHdr = pick > 1 ? '<div class="cfg-pick-idx">Elección ' + (k + 1) + '</div>' : '';
      pickBlocks.push('<div class="cfg-pickblock">' + blockHdr + '<div class="cfg-opts">' + cards + '</div></div>');
    }
    const lbl = slot.label + ' <span class="cfg-pick-n">· elegí ' + pick + '</span>';
    return '<div class="cfg-slot"><div class="cfg-slot-label">' + lbl + '</div>' + pickBlocks.join('') + '</div>';
  }).join('');

  // Resolver la selección actual para precio tachado + chequeo de stock.
  const r = resolveComp(c, sel);
  const tachado = comboNaturalSumComp(r.comp);
  const sig = comboSignature(c.id, r.comp);
  const existing = comboCart[sig] ? comboCart[sig].qty : 0;
  const max = compMaxTotal(r.comp, sig);
  const completo = (c.slots || []).every((slot, i) => (sel[i] || []).every(x => x != null));
  const sinStock = max !== Infinity && existing >= max;
  const canAdd = completo && !sinStock;

  cont.innerHTML =
    '<div class="combo-modal-head">' +
      (c.fullCard ? '' : '<img class="combo-modal-img" src="img/' + c.img + '" alt="" onerror="this.style.display=\'none\'">') +
      '<div><h3 class="combo-modal-title">' + c.nombre + '</h3>' +
      '<p class="combo-modal-desc">' + c.desc + '</p></div>' +
    '</div>' +
    '<div class="combo-modal-slots">' + slotsHtml + '</div>' +
    '<div class="combo-modal-foot">' +
      '<div class="combo-modal-price">' +
        (tachado > c.precio ? '<s class="combo-price-old">' + ars(tachado) + '</s> ' : '') +
        '<strong>' + ars(c.precio) + '</strong>' +
      '</div>' +
      '<button class="combo-modal-add" onclick="confirmComboConfig()"' + (canAdd ? '' : ' disabled') + '>' +
        (sinStock ? 'Sin stock para esta combinación' : 'Agregar al carrito') +
      '</button>' +
    '</div>';
}
function confirmComboConfig() {
  if (!_comboConfig) return;
  const c = COMBO_MAP[_comboConfig.comboId]; if (!c) return;
  const r = resolveComp(c, _comboConfig.sel);
  if (addComboInstance(c.id, r.comp, r.picks)) closeComboConfig();
}

function updateUI() {
  const count = cartCount(), subtotal = cartTotal(), discount = getTotalDiscount(), shipping = getShipping(), saldoAFavor = getSaldoAFavor(), total = subtotal - discount + shipping - saldoAFavor;
  const badge = $id('cart-badge');
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';

  const floatBtn = $id('float-cart-btn');
  if (floatBtn) {
    floatBtn.style.display = (count > 0 && !_formVisible) ? 'flex' : 'none';
    if (count > 0) floatBtn.textContent = '🛒 Ver pedido · ' + ars(total) + ' →';
  }

  const bodyEl = $id('cart-body'), footEl = $id('cart-foot');
  if (count === 0) {
    bodyEl.innerHTML = '<div class="cart-empty-msg"><span>🛒</span>Todavía no agregaste nada.</div>';
    footEl.style.display = 'none';
  } else {
    footEl.style.display = 'block';
    const comboLines = Object.entries(comboCart).map(([sig,inst]) => {
      const c = COMBO_MAP[inst.comboId];
      if (!c) return '';
      const comps = (inst.picks || []).map(pk =>
        '<li><span class="pk-label">' + pk.label + ':</span> ' + _optLabel(pk.nombre, pk.label) + '</li>'
      ).join('');
      const sigEsc = sig.replace(/'/g, "\\'");
      return '<div class="cart-item cart-item-combo">' +
        '<span class="cart-item-emoji">' + c.emoji + '</span>' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + c.nombre + '</div>' +
          '<div class="cart-item-sub">' + ars(c.precio) + ' c/u · <strong>' + ars(c.precio*inst.qty) + '</strong></div>' +
          '<ul class="cart-combo-includes">' + comps + '</ul>' +
        '</div>' +
        '<div class="qty-controls">' +
          '<button class="qty-btn" onclick="comboChangeQty(\'' + sigEsc + '\',-1)">−</button>' +
          '<span class="qty-val">' + inst.qty + '</span>' +
          '<button class="qty-btn" onclick="comboChangeQty(\'' + sigEsc + '\',+1)">+</button>' +
        '</div>' +
      '</div>';
    }).join('');
    const prodLinesHtml = Object.entries(cart).map(([id,qty]) => {
      const p = PROD_MAP[id];
      if (!p) return '';
      return '<div class="cart-item">' +
        '<span class="cart-item-emoji">' + p.emoji + '</span>' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + p.nombre + '</div>' +
          '<div class="cart-item-sub">' + ars(p.precio) + ' c/u · <strong>' + ars(p.precio*qty) + '</strong></div>' +
        '</div>' +
        '<div class="qty-controls">' +
          '<button class="qty-btn" onclick="changeQty(\'' + id + '\',-1)">−</button>' +
          '<span class="qty-val">' + qty + '</span>' +
          '<button class="qty-btn" onclick="changeQty(\'' + id + '\',+1)">+</button>' +
        '</div>' +
      '</div>';
    }).join('');
    bodyEl.innerHTML = comboLines + prodLinesHtml;
    $id('cart-subtotal').textContent = ars(subtotal);
    const discRow = $id('cart-discount-row');
    if (discount > 0) {
      discRow.style.display = '';
      // Label combinado: si hay cupón + auto, los junta con '+'.
      var partes = [];
      if (appliedCoupon) partes.push('🎟️ ' + appliedCoupon.codigo);
      var autoLbl = getDiscountLabel();
      if (autoLbl) partes.push(autoLbl);
      discRow.querySelector('span').textContent = partes.join(' + ') || '10% OFF';
      $id('cart-discount').textContent = '-' + ars(discount);
    }
    else { discRow.style.display = 'none'; }
    $id('cart-shipping').textContent = shipping === 0 ? 'Gratis' : ars(shipping);
    const saldoRow = $id('cart-saldo-row');
    if (saldoRow) {
      if (saldoAFavor > 0) { saldoRow.style.display = ''; $id('cart-saldo').textContent = '-' + ars(saldoAFavor); }
      else { saldoRow.style.display = 'none'; }
    }
    $id('cart-total').textContent = ars(total);

    // Incentivo inteligente — el 10% aplica solo a productos sueltos (no combos),
    // así que el umbral y los mensajes usan productsSubtotal. Si el carrito es
    // solo combos (pSub=0), no hay nada que descontar → se oculta.
    var incentiveEl = $id('cart-incentive');
    var pSub = productsSubtotal();
    if (incentiveEl && discountsActive() && pSub > 0) {
      var falta = 100000 - pSub;
      var sel = document.querySelector('input[name="pago"]:checked');
      var isCash = sel && sel.value === 'Efectivo';
      var yaDescuento = discount > 0;
      var cashOK = cashDiscountActive();
      var bulkOK = bulkDiscountActive();

      if (yaDescuento) {
        // Ya tiene descuento — felicitarlo
        incentiveEl.innerHTML = '<strong>🎉 ¡Descuento aplicado!</strong><br>Estás ahorrando <strong>' + ars(discount) + '</strong>';
        incentiveEl.style.display = '';
      } else if (bulkOK && falta > 0 && falta <= 40000 && pSub >= 60000) {
        // Cerca de $100K — incentivar a llegar (sin contar combos)
        incentiveEl.innerHTML = '🔥 Estás a <strong>' + ars(falta) + '</strong> de tener <strong>10% OFF</strong> por superar los $100.000' +
          (cashOK && !isCash ? '<div class="incentive-cash">💵 También podés pagar en efectivo y tener 10% OFF</div>' : '');
        incentiveEl.style.display = '';
      } else if (cashOK && !isCash && pSub > 0 && pSub < 60000) {
        // Pedido chico — solo recordar el efectivo
        incentiveEl.innerHTML = '<div class="incentive-cash" style="border:none;margin:0;padding:0;">💵 Pagando en efectivo tenés 10% OFF</div>';
        incentiveEl.style.display = '';
      } else {
        incentiveEl.style.display = 'none';
      }
    } else if (incentiveEl) {
      incentiveEl.style.display = 'none';
    }
  }
  // Barra de promo superior: visible normalmente (el 10% aplica a productos
  // sueltos aun con combos). Solo se oculta si el carrito es SOLO combos
  // (no hay nada descontable → el cartel mentiría).
  var promoBar = $id('promo-bar');
  if (promoBar && discountsActive()) {
    var soloCombos = combosInCart() && productsSubtotal() === 0;
    promoBar.style.display = soloCombos ? 'none' : '';
  }
  updateFormSummary();
  updatePagoHint();
  // Si hay cupón aplicado, refresco el card para que pase de pending → activo
  // (o viceversa) cuando el cliente agrega o saca productos del scope.
  if (appliedCoupon) _renderCouponApplied();
}

function updateFormSummary() {
  const el = $id('form-summary'), count = cartCount();
  if (count === 0) { el.innerHTML = '<p class="summary-empty">Agregá productos para ver el resumen.</p>'; return; }
  const subtotal = cartTotal();
  const cuponDesc = getCouponDiscount();
  const autoDesc  = getCashDiscount();
  const totalDesc = cuponDesc + autoDesc;
  const shipping  = getShipping();
  const saldoAFavor = getSaldoAFavor();
  const total     = subtotal - totalDesc + shipping - saldoAFavor;

  // Combos primero (cada instancia configurada), luego productos sueltos.
  let html = Object.values(comboCart).map(inst => {
    const c = COMBO_MAP[inst.comboId];
    if (!c) return '';
    const picks = (inst.picks || []).map(pk => _optLabel(pk.nombre, pk.label)).join(' · ');
    return '<div class="summary-line summary-line-combo"><span>' +
      '<span class="summary-combo-name">' + (c.emoji ? c.emoji + ' ' : '') + c.nombre +
        (inst.qty > 1 ? ' <strong>×' + inst.qty + '</strong>' : '') + '</span>' +
      (picks ? '<span class="summary-combo-picks">' + picks + '</span>' : '') +
      '</span><span>' + ars(c.precio*inst.qty) + '</span></div>';
  }).join('');
  html += Object.entries(cart).map(([id,qty]) => {
    const p = PROD_MAP[id];
    if (!p) return '';
    return '<div class="summary-line"><span>' + p.nombre + ' <strong>×' + qty + '</strong></span><span>' + ars(p.precio*qty) + '</span></div>';
  }).join('');

  // Sub Total: solo si hay descuentos (deja claro de qué monto sale el 10%/cupón).
  if (totalDesc > 0) {
    html += '<div class="summary-line subtotal-line"><span>Sub Total</span><span>' + ars(subtotal) + '</span></div>';
  }
  // Cupón en su propia línea (verde) — separado del auto para que el cliente entienda qué le aportó.
  if (cuponDesc > 0 && appliedCoupon) {
    html += '<div class="summary-line discount-line" style="color:#2e7d32"><span>🎟️ ' + appliedCoupon.codigo + ' · ' + (appliedCoupon.mensaje || '') + '</span><span>-' + ars(cuponDesc) + '</span></div>';
  }
  // Auto-descuento (efectivo / +$100K)
  if (autoDesc > 0) {
    html += '<div class="summary-line discount-line"><span>' + getDiscountLabel() + '</span><span>-' + ars(autoDesc) + '</span></div>';
  }
  html += '<div class="summary-line shipping-line"><span>Envío</span><span>' + (shipping === 0 ? 'Gratis' : ars(shipping)) + '</span></div>';
  if (saldoAFavor > 0) {
    html += '<div class="summary-line discount-line" style="color:#2e7d32"><span>🎁 Saldo a favor</span><span>-' + ars(saldoAFavor) + '</span></div>';
  }
  html += '<div class="summary-line total-line"><span>Total</span><span>' + ars(total) + '</span></div>';
  el.innerHTML = html;
}

/* ── TOGGLE CART ── */
function toggleCart() {
  const s=$id('cart-sidebar'), o=$id('cart-overlay');
  const open = s.classList.toggle('open');
  o.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
function goToForm() {
  toggleCart();
  _track('begin_checkout', { value: cartTotal(), zone: currentZone, items: cartCount() });
  const section = $id('form-section');
  if (section) section.classList.remove('collapsed');
  setTimeout(() => document.querySelector('.form-wrap').scrollIntoView({behavior:'smooth'}), 320);
}

/* ── DÍA / HORARIO ── */
function _getHorarioForFecha(zone, dayName, iso) {
  // Si la fecha es una entrega extra puntual (ej. Jue 30/4 por feriado),
  // devolver el horario de la entrega extra. Sino, el horario normal de la zona.
  var extras = ENTREGAS_EXTRA[zone] || [];
  var ex = extras.filter(function(e) { return e.iso === iso; })[0];
  if (ex) return ex.timeRange;
  var z = ZONAS[zone];
  return (z && z.horarios && z.horarios[dayName]) || '';
}
function onDiaChange() {
  const dia = $id('f-dia').value;
  const fecha = $id('f-dia-fecha') ? $id('f-dia-fecha').value : '';
  const hint = $id('horario-hint');
  const horario = _getHorarioForFecha(currentZone, dia, fecha);
  if (horario) {
    hint.textContent = 'Horario: ' + horario;
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}

/* ── CALENDARIO DE 14 DÍAS ── */
const DP_DAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DP_DAY_LABELS = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];

function _todayAR() {
  // Hora Argentina (UTC-3) — normalizado a medianoche UTC para comparar por día.
  var now = new Date();
  var ar = new Date(now.getTime() - 3 * 3600 * 1000);
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate()));
}

function _zoneHorariosForDayPicker() {
  if (!currentZone) return {};
  var z = ZONAS[currentZone];
  if (!z) return {};
  if (currentZone === 'pilar') {
    var el = $id('f-pilar-barrio');
    var val = el ? el.value : '';
    var vendedor = val && val !== '__otro__' ? barrioToVendedor[val.toLowerCase()] : null;
    if (vendedor) return { 'Viernes': 'A coordinar' };
  }
  return z.horarios || {};
}

function renderDayPicker() {
  var root = $id('day-picker');
  if (!root) return;
  if (!currentZone) { root.innerHTML = ''; return; }

  var horarios = _zoneHorariosForDayPicker();
  var today = _todayAR();
  var dow = today.getUTCDay(); // 0=Dom..6=Sáb
  var diffToMonday = (dow + 6) % 7;
  var monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - diffToMonday);
  var todayTs = today.getTime();
  var selectedFecha = $id('f-dia-fecha') ? $id('f-dia-fecha').value : '';

  // Cutoff Pilar Vie de esta semana — usa la misma función que el modal
  // de bienvenida para que ambos sean consistentes.
  // Si el cliente todavía no eligió barrio, asumimos "Otro" (más permisivo:
  // cutoff Jue 21hs). Cuando elige barrio en el checkout, se re-evalúa.
  var redCutoffFriday = null;
  if (currentZone === 'pilar' && _isPilarFridayCutoffPast()) {
    var fri = new Date(monday);
    fri.setUTCDate(monday.getUTCDate() + 4);
    redCutoffFriday = fri.getTime();
  }

  var html = '<div class="dp-dow">' + DP_DAY_LABELS.map(function(l){ return '<span>' + l + '</span>'; }).join('') + '</div>';
  html += '<div class="dp-grid">';

  var feriadosDP = FERIADOS_BLOQUEADOS[currentZone] || [];
  var extrasDP = ENTREGAS_EXTRA[currentZone] || [];

  for (var i = 0; i < 14; i++) {
    var d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    var dayName = DP_DAY_NAMES[d.getUTCDay()];
    var dayNum = d.getUTCDate();
    var iso = d.toISOString().slice(0, 10);
    var isPast = d.getTime() < todayTs;
    var isToday = d.getTime() === todayTs;
    var isExtraDP = extrasDP.some(function(e) { return e.iso === iso; });
    var available = (!!horarios[dayName]) || isExtraDP;
    if (feriadosDP.indexOf(iso) !== -1) available = false;
    var isRedCutoff = redCutoffFriday !== null && d.getTime() === redCutoffFriday;

    var cls = 'dp-cell';
    var disabled = false;
    if (isPast) { cls += ' past'; disabled = true; }
    else if (isRedCutoff) { cls += ' unavailable'; disabled = true; }
    else if (!available) { cls += ' unavailable'; disabled = true; }
    else { cls += ' available'; }
    if (isToday) cls += ' today';
    if (!disabled && iso === selectedFecha) cls += ' selected';
    // Si la fecha previamente elegida ya no está disponible (ej. cambió barrio), limpiarla
    if (disabled && iso === selectedFecha) {
      if ($id('f-dia')) $id('f-dia').value = '';
      if ($id('f-dia-fecha')) $id('f-dia-fecha').value = '';
      selectedFecha = '';
    }

    html += '<button type="button" class="' + cls + '"'
      + (disabled ? ' disabled aria-disabled="true" tabindex="-1"' : '')
      + ' data-fecha="' + iso + '"'
      + ' data-dia="' + dayName + '"'
      + ' aria-label="' + dayName + ' ' + dayNum + (disabled ? ' (no disponible)' : '') + '"'
      + ' onclick="selectDayPicker(this)">'
      + dayNum
      + '</button>';
  }

  html += '</div>';
  html += '<div class="dp-legend">'
    + '<span><i class="l-ok"></i>Disponible</span>'
    + '<span><i class="l-off"></i>Sin entrega</span>'
    + '</div>';
  root.innerHTML = html;
}

function selectDayPicker(el) {
  if (!el || el.disabled) return;
  var root = $id('day-picker');
  if (root) {
    var prev = root.querySelectorAll('.dp-cell.selected');
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove('selected');
  }
  el.classList.add('selected');
  var dia = el.getAttribute('data-dia');
  var fecha = el.getAttribute('data-fecha');
  var hidden = $id('f-dia');
  var hiddenF = $id('f-dia-fecha');
  if (hidden) hidden.value = dia;
  if (hiddenF) hiddenF.value = fecha;
  clearError('f-dia','err-dia');
  if (root) root.classList.remove('error');
  onDiaChange();
}

/* ── VALIDACIÓN ── */
function showError(fId, eId) { const f=$id(fId), e=$id(eId); if(f)f.classList.add('error'); if(e)e.classList.add('visible'); }
function clearError(fId, eId) { const f=$id(fId), e=$id(eId); if(f)f.classList.remove('error'); if(e)e.classList.remove('visible'); }
function validateOnBlur(campo) {
  if (campo==='nombre') { $id('f-nombre').value.trim() ? clearError('f-nombre','err-nombre') : showError('f-nombre','err-nombre'); }
  if (campo==='barrioPrivado') { $id('f-barrio-privado').value ? clearError('f-barrio-privado','err-barrio-privado') : showError('f-barrio-privado','err-barrio-privado'); }
  if (campo==='barrio') { $id('f-barrio').value ? clearError('f-barrio','err-barrio') : showError('f-barrio','err-barrio'); }
  if (campo==='lote') { $id('f-lote').value.trim() ? clearError('f-lote','err-lote') : showError('f-lote','err-lote'); }
  if (campo==='direccion') { $id('f-direccion').value.trim() ? clearError('f-direccion','err-direccion') : showError('f-direccion','err-direccion'); }
  if (campo==='lotePilar') { $id('f-lote-pilar').value.trim() ? clearError('f-lote-pilar','err-lote-pilar') : showError('f-lote-pilar','err-lote-pilar'); }
  if (campo==='club') { $id('f-club').value ? clearError('f-club','err-club') : showError('f-club','err-club'); }
  if (campo==='deporte') { $id('f-deporte').value ? clearError('f-deporte','err-deporte') : showError('f-deporte','err-deporte'); }
  if (campo==='grupo') { $id('f-grupo').value ? clearError('f-grupo','err-grupo') : showError('f-grupo','err-grupo'); }
  if (campo==='telefono') { $id('f-telefono').value.replace(/\D/g,'').length >= 8 ? clearError('f-telefono','err-telefono') : showError('f-telefono','err-telefono'); }
  if (campo==='dia') {
    var dpRoot = $id('day-picker');
    if ($id('f-dia').value) {
      clearError('f-dia','err-dia');
      if (dpRoot) dpRoot.classList.remove('error');
    } else {
      showError('f-dia','err-dia');
      if (dpRoot) dpRoot.classList.add('error');
    }
  }
}
function filtrarSubBarrios(keepValue) {
  const privado = $id('f-barrio-privado').value;
  const subField = $id('field-sub-barrio');
  const subSel = $id('f-barrio');
  if (!keepValue) subSel.value = '';
  clearError('f-barrio-privado','err-barrio-privado');
  clearError('f-barrio','err-barrio');
  if (privado === 'Estancias del Pilar') {
    Array.from(subSel.options).forEach(opt => { if (!opt.value) return; opt.hidden = opt.dataset.privado !== 'Estancias del Pilar'; });
    subField.style.display = '';
  } else {
    subField.style.display = 'none';
  }
}

/* ── LOADER OVERLAY DE ENVÍO ──
   Modal con spinner + barra de progreso indeterminada que cubre la pantalla
   mientras el POST al backend está en vuelo. Tiene 3 estados: default (enviando),
   .success (✓ verde), .error (! rojo). Se cierra automáticamente. */
function showSendLoader() {
  var ov = $id('send-overlay');
  if (!ov) return;
  var card = ov.querySelector('.send-card');
  if (card) card.classList.remove('success', 'error');
  var t = $id('send-title'), s = $id('send-sub');
  if (t) t.textContent = 'Enviando tu pedido…';
  if (s) s.textContent = 'Estamos confirmando con Maleu. En unos segundos te llevamos a WhatsApp.';
  ov.classList.add('active');
  ov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function setSendLoaderSuccess() {
  var ov = $id('send-overlay');
  if (!ov) return;
  var card = ov.querySelector('.send-card');
  if (card) card.classList.add('success');
  var t = $id('send-title'), s = $id('send-sub');
  if (t) t.textContent = '¡Pedido enviado!';
  if (s) s.textContent = 'Te abrimos WhatsApp para que confirmes con Maleu.';
}
function setSendLoaderError() {
  var ov = $id('send-overlay');
  if (!ov) return;
  var card = ov.querySelector('.send-card');
  if (card) card.classList.add('error');
  var t = $id('send-title'), s = $id('send-sub');
  if (t) t.textContent = 'No pudimos confirmarlo';
  if (s) s.textContent = 'Tocá "Pedir por WhatsApp" de nuevo. Tu carrito sigue intacto.';
}
function hideSendLoader() {
  var ov = $id('send-overlay');
  if (!ov) return;
  ov.classList.remove('active');
  ov.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ── ENVIAR PEDIDO ── */
function enviarPedido() {
  if (_enviando) return;
  if (!currentZone) { showZoneModal(); return; }

  const nombre = $id('f-nombre').value.trim();
  const telefono = $id('f-telefono').value.trim();
  const dia = $id('f-dia').value;
  const z = ZONAS[currentZone];
  const fechaISOEarly = $id('f-dia-fecha') ? $id('f-dia-fecha').value : '';
  const horario = _getHorarioForFecha(currentZone, dia, fechaISOEarly);
  const pagoEl = document.querySelector('input[name="pago"]:checked');

  // Limpiar errores
  ['f-nombre','err-nombre','f-telefono','err-telefono','f-dia','err-dia'].forEach((id,i) => {
    if (i%2===0) { const el=$id(id); if(el) el.classList.remove('error'); }
    else { const el=$id(id); if(el) el.classList.remove('visible'); }
  });
  clearError('f-nombre','err-nombre');
  clearError('f-telefono','err-telefono');
  clearError('f-dia','err-dia');
  $id('err-pago').classList.remove('visible');

  if (currentZone === 'estancias') {
    clearError('f-barrio-privado','err-barrio-privado');
    clearError('f-barrio','err-barrio');
    clearError('f-lote','err-lote');
  } else if (currentZone === 'clubes') {
    clearError('f-club','err-club');
    clearError('f-deporte','err-deporte');
    clearError('f-grupo','err-grupo');
  } else {
    clearError('f-pilar-barrio','err-pilar-barrio');
    clearError('f-direccion','err-direccion');
    clearError('f-lote-pilar','err-lote-pilar');
  }

  if (cartCount() === 0) { toast('⚠️ Agregá al menos un producto'); return; }

  // Validar campos
  let primerInvalido = null;
  if (!nombre) { showError('f-nombre','err-nombre'); if(!primerInvalido) primerInvalido=$id('f-nombre'); }

  let barrioPrivado='', barrio='', lote='', direccion='', club='', deporte='', grupo='';
  if (currentZone === 'estancias') {
    barrioPrivado = $id('f-barrio-privado').value;
    barrio = barrioPrivado === 'Estancias del Pilar' ? $id('f-barrio').value : barrioPrivado;
    lote = $id('f-lote').value.trim();
    if (!barrioPrivado) { showError('f-barrio-privado','err-barrio-privado'); if(!primerInvalido) primerInvalido=$id('f-barrio-privado'); }
    if (barrioPrivado === 'Estancias del Pilar' && !barrio) { showError('f-barrio','err-barrio'); if(!primerInvalido) primerInvalido=$id('f-barrio'); }
    if (!lote) { showError('f-lote','err-lote'); if(!primerInvalido) primerInvalido=$id('f-lote'); }
  } else if (currentZone === 'clubes') {
    club = $id('f-club').value;
    deporte = $id('f-deporte').value;
    grupo = $id('f-grupo').value;
    if (!club) { showError('f-club','err-club'); if(!primerInvalido) primerInvalido=$id('f-club'); }
    if (!deporte) { showError('f-deporte','err-deporte'); if(!primerInvalido) primerInvalido=$id('f-deporte'); }
    if (!grupo) { showError('f-grupo','err-grupo'); if(!primerInvalido) primerInvalido=$id('f-grupo'); }
  } else {
    // Pilar: dropdown barrio + opción "Otro" (input libre)
    var pilarSel = $id('f-pilar-barrio').value;
    lote = $id('f-lote-pilar').value.trim();
    if (!pilarSel) {
      showError('f-pilar-barrio','err-pilar-barrio'); if(!primerInvalido) primerInvalido=$id('f-pilar-barrio');
    } else if (pilarSel === '__otro__') {
      direccion = $id('f-direccion').value.trim();
      if (!direccion) { showError('f-direccion','err-direccion'); if(!primerInvalido) primerInvalido=$id('f-direccion'); }
    } else {
      direccion = pilarSel;
    }
    if (!lote) { showError('f-lote-pilar','err-lote-pilar'); if(!primerInvalido) primerInvalido=$id('f-lote-pilar'); }
  }

  if ($id('f-telefono').value.replace(/\D/g,'').length < 8) { showError('f-telefono','err-telefono'); if(!primerInvalido) primerInvalido=$id('f-telefono'); }
  if (!dia) {
    showError('f-dia','err-dia');
    var _dpRoot = $id('day-picker');
    if (_dpRoot) _dpRoot.classList.add('error');
    if(!primerInvalido) primerInvalido=_dpRoot || $id('f-dia');
  }
  if (!pagoEl) { $id('err-pago').classList.add('visible'); if(!primerInvalido) primerInvalido=$id('pago-group'); }
  if (primerInvalido) { primerInvalido.scrollIntoView({behavior:'smooth',block:'center'}); return; }

  // Guardar en localStorage
  try {
    const clientData = { nombre, telefono, dia, pago: pagoEl.value, zone: currentZone };
    if (currentZone === 'estancias') { clientData.barrioPrivado = barrioPrivado; clientData.barrio = barrio; clientData.lote = lote; }
    else if (currentZone === 'clubes') { clientData.club = club; clientData.deporte = deporte; clientData.grupo = grupo; }
    else if (currentZone === 'pilar') { clientData.direccion = direccion; clientData.lote = lote; }
    localStorage.setItem('maleu_cliente_pg', JSON.stringify(clientData));
    localStorage.setItem('maleu_cliente_' + currentZone, JSON.stringify(clientData));
    localStorage.setItem('maleu_ultimo_pedido_pg', JSON.stringify(Object.entries(cart).map(([id,qty]) => ({id: isNaN(id) ? id : +id, qty}))));
    localStorage.setItem('maleu_last_order_zone', currentZone);
  } catch(e) {}

  // Construir mensaje WhatsApp
  const subtotal = cartTotal(), discount = getTotalDiscount(), shipping = getShipping(), saldoAFavor = getSaldoAFavor(), total = subtotal - discount + shipping - saldoAFavor;
  // Combos: el precio cerrado se traduce en un descuento sobre el valor
  // individual de los componentes, para que el Sheet vea productos reales a
  // precio de lista y el ahorro del combo quede como descuento (total intacto).
  const comboSavingsTotal = Object.values(comboCart).reduce((s,inst) => {
    const c = COMBO_MAP[inst.comboId]; if (!c) return s;
    return s + Math.max(0, comboNaturalSumComp(inst.comp) - c.precio) * inst.qty;
  }, 0);
  const naturalSubtotal = subtotal + comboSavingsTotal;     // productos + componentes a precio lista
  const descuentoSheet  = discount + comboSavingsTotal;     // descuentos vigentes + ahorro de combos

  const comboLinesWA = Object.values(comboCart).map((inst) => {
    const c = COMBO_MAP[inst.comboId]; if (!c) return null;
    const head = '  ' + (c.emoji || '🎁') + ' ' + c.nombre + (inst.qty > 1 ? ' ×' + inst.qty : '') + '  —  ' + ars(c.precio * inst.qty);
    const comps = (inst.picks || []).map(pk => '       ◦ ' + pk.label + ': ' + _optLabel(pk.nombre, pk.label)).join('\n');
    return head + (comps ? '\n' + comps : '');
  }).filter(Boolean).join('\n');
  const prodLinesProductos = Object.entries(cart).map(([id,qty]) => {
    const p = PROD_MAP[id]; if (!p) return null;
    return '  • ' + p.nombre + (qty > 1 ? ' ×' + qty : '') + '  —  ' + ars(p.precio * qty);
  }).filter(Boolean).join('\n');
  const prodLines = [comboLinesWA, prodLinesProductos].filter(Boolean).join('\n');

  let direccionStr;
  if (currentZone === 'estancias') {
    const barrioInfo = barrioPrivado === 'Estancias del Pilar' ? barrioPrivado + ' — ' + barrio : barrioPrivado;
    direccionStr = barrioInfo + ', Lote ' + lote;
  } else if (currentZone === 'clubes') {
    direccionStr = club + ' — ' + deporte + ' — ' + grupo;
  } else {
    direccionStr = direccion + ', ' + lote;
  }

  const z2 = ZONAS[currentZone];
  const fechaISO = $id('f-dia-fecha') ? $id('f-dia-fecha').value : '';
  const horarioStr = _getHorarioForFecha(currentZone, dia, fechaISO);
  // fechaFull  = "22/04/2026" → va al Sheets (col "Día de entrega")
  // diaMensaje = "Miércoles 22/04" → va al WhatsApp del cliente
  let fechaFull = '';
  let diaMensaje = dia;
  if (fechaISO) {
    const _fp = fechaISO.split('-');
    fechaFull = _fp[2] + '/' + _fp[1] + '/' + _fp[0];
    diaMensaje = dia + ' ' + _fp[2] + '/' + _fp[1];
  }
  const diaSheets = fechaFull || dia;
  const entregaStr = diaMensaje + (horarioStr && horarioStr !== 'A coordinar' ? ' de ' + horarioStr : '');
  const pagoStr = pagoEl.value === 'Efectivo' ? 'Efectivo' : 'Mercado Pago';

  // Detectar si barrio tiene vendedor asignado (Pilar + barrio match)
  let vendedorMatch = null;
  if (currentZone === 'pilar' && direccion) {
    vendedorMatch = barrioToVendedor[direccion.toLowerCase()] || null;
  }

  // Mensaje unificado: mínimo imprescindible para el cliente.
  // Los datos del cliente (nombre, tel, dirección, entrega, pago) los ve Maleu
  // en Panel/Búsqueda/Ruta/Red — no se repiten en el WhatsApp.
  const cuponDescW = getCouponDiscount();
  const autoDescW  = getCashDiscount();
  var msgLines = ['Hola! Quiero hacer un pedido:', '', prodLines, ''];
  // Solo desglosar Subtotal cuando hay descuento, envío o saldo a favor.
  if (discount > 0 || shipping > 0 || saldoAFavor > 0) {
    msgLines.push('Subtotal: ' + ars(subtotal));
    if (cuponDescW > 0 && appliedCoupon) msgLines.push('🎟️ ' + appliedCoupon.codigo + ': -' + ars(cuponDescW));
    if (autoDescW > 0) msgLines.push(getDiscountLabel() + ': -' + ars(autoDescW));
    if (shipping > 0) msgLines.push('Envio: ' + ars(shipping));
    if (saldoAFavor > 0) msgLines.push('🎁 Saldo a favor: -' + ars(saldoAFavor));
  }
  msgLines.push('*Total: ' + ars(total) + '*');
  var msg = msgLines.join('\n');

  const urlText = encodeURIComponent(msg);

  // Registrar en Google Sheets — los combos se EXPANDEN a sus productos reales
  // y se fusionan con los productos sueltos por id (qty sumada). Así el stock se
  // descuenta bien, abastecimiento ve los productos y analytics no se rompe.
  const expanded = {};
  Object.entries(cart).forEach(([id,qty]) => { const p = PROD_MAP[id]; if (!p) return; expanded[p.id] = (expanded[p.id] || 0) + qty; });
  Object.values(comboCart).forEach((inst) => {
    inst.comp.forEach(ci => { const p = PROD_MAP[ci.id]; if (!p) return; expanded[ci.id] = (expanded[ci.id] || 0) + ci.qty * inst.qty; });
  });
  const items = Object.entries(expanded).map(([id,qty]) => {
    const p = PROD_MAP[id]; return p ? {id:p.id, nombre:p.nombre, qty, precio:p.precio} : null;
  }).filter(Boolean);
  // Trazabilidad del combo (receta + sabores elegidos) para uso futuro del backend / Panel.
  const combosPayload = Object.values(comboCart).map((inst) => {
    const c = COMBO_MAP[inst.comboId]; if (!c) return null;
    return { id:c.id, nombre:c.nombre, precio:c.precio, qty:inst.qty,
      picks: (inst.picks || []).map(pk => ({ label:pk.label, id:pk.prodId, nombre:pk.nombre })),
      items: inst.comp.map(ci => ({ id:ci.id, qty:ci.qty, precio:(PROD_MAP[ci.id]||{}).precio || 0 })) };
  }).filter(Boolean);

  let postData;
  if (currentZone === 'clubes') {
    postData = {
      canal: 'Clubes',
      fecha: new Date().toLocaleString('es-AR'),
      nombre, telefono, club, deporte, grupo,
      dia: diaSheets, horario, fechaEntrega: fechaISO, pago: pagoEl.value,
      envio: shipping, items, total,
      subtotalSinDescuento: naturalSubtotal, descuento: descuentoSheet
    };
  } else if (vendedorMatch) {
    // Pilar con barrio cubierto por vendedor → va al canal Red
    postData = {
      canal: 'Red',
      fecha: new Date().toLocaleString('es-AR'),
      vendedor: vendedorMatch.nombre,
      nombre, telefono,
      barrioPrivado: vendedorMatch.barrio,
      lote: lote,
      dia: diaSheets, horario, fechaEntrega: fechaISO, pago: pagoEl.value,
      envio: shipping, items, total
    };
  } else {
    postData = {
      canal: z.canal,
      fecha: new Date().toLocaleString('es-AR'),
      nombre, barrioPrivado,
      subBarrio: barrioPrivado === 'Estancias del Pilar' ? barrio : '',
      barrio: currentZone === 'estancias' ? barrio : direccion,
      lote, telefono, dia: diaSheets, horario, fechaEntrega: fechaISO,
      pago: pagoEl.value,
      envio: shipping, items, total,
      subtotalSinDescuento: naturalSubtotal, descuento: descuentoSheet,
      saldoAplicado: saldoAFavor  // backend lo escribe negativo en col BI/BL del pedido
    };
  }
  // Metadata de combos (trazabilidad). El backend ignora campos que no conoce;
  // queda listo para cuando el Panel desglose el combo desde la receta.
  if (combosPayload.length) {
    postData.combos = combosPayload;
    postData.comboDetalle = JSON.stringify(combosPayload);
    // CLAVE: con combos el descuento que mando (= ahorro del combo) es la
    // autoridad. Sin este flag el backend RECALCULA el descuento (10%/0%) y
    // pisaría el precio cerrado del combo, cobrando mal (ej. el subtotal a
    // precio de lista). El backend respeta descuento+total tal cual (línea
    // ~4182 de apps-script.gs) → total = subtotalSinDescuento - ahorro combo.
    postData.descuentoManualEsAutoridad = true;
  }
  // ID único para idempotencia: si el cliente reintenta por mala señal y el POST
  // anterior ya había llegado al server, el backend lo descarta (CacheService 6h).
  postData.clientOrderId = 'co_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
  // Cumpleaños del cliente (si lo cargó en el form) → backend lo guarda en Clientes Meta.
  var _cumple = getCumpleValue();
  if (_cumple) postData.cumple = _cumple;
  // Cupón aplicado: lo mando al backend para tracking futuro y best-effort sumo uso al cerrar.
  if (appliedCoupon) {
    postData.cupon = appliedCoupon.codigo;
    postData.cuponDescuento = cuponDescW;
  }
  _track('purchase', { value: total, zone: currentZone, items: cartCount(), discount: discount, payment: pagoEl.value, cupon: appliedCoupon ? appliedCoupon.codigo : '', vendedor: vendedorMatch ? vendedorMatch.nombre : '' });

  // Esperar confirmación del server ANTES de redirigir a WhatsApp.
  // Antes redirigíamos 800ms después del POST sin esperar respuesta → si el POST
  // fallaba (iOS + señal floja en Estancias), el cliente mandaba el WhatsApp
  // pero el Sheets quedaba vacío. Caso real: Magdalena Garcia Espil 30/05/2026.
  //
  // Ahora: timeout 3s. En buena señal la respuesta llega <1s y el redirect es
  // tan rápido (o más) que antes. En señal mala el cliente ve "Sin señal" y
  // puede tocar de nuevo en vez de creer que se envió. El retry en background
  // sigue corriendo aunque haya error visible — si la respuesta llega tarde,
  // se limpia el pendiente.
  _enviando = true;
  const waTarget = vendedorMatch ? vendedorMatch.wa : WA_NUMBER;
  const waBtn = document.querySelector('.whatsapp-btn');
  const waBtnOrig = waBtn ? waBtn.innerHTML : '';
  if (waBtn) { waBtn.disabled = true; waBtn.innerHTML = 'Enviando…'; waBtn.style.background = '#2e7d32'; }
  // Mostrar overlay loader (animado, branded)
  showSendLoader();

  function _afterSuccess() {
    if (waBtn) waBtn.innerHTML = '✓ Pedido registrado';
    setSendLoaderSuccess();
    // Best-effort: sumar uso al cupón. No bloqueamos el flujo si falla.
    if (appliedCoupon) {
      try {
        var blob = new Blob([JSON.stringify({ action: 'usarCupon', codigo: appliedCoupon.codigo })], { type: 'text/plain;charset=utf-8' });
        if (navigator.sendBeacon) navigator.sendBeacon(APPS_SCRIPT_URL, blob);
        else fetch(APPS_SCRIPT_URL, { method:'POST', body: blob, mode:'no-cors', keepalive: true }).catch(function(){});
      } catch(_e) {}
    }
    // Redirect a WhatsApp con un breve respiro para que se vea el check verde
    setTimeout(function() {
      window.location.href = 'https://wa.me/' + waTarget + '?text=' + urlText;
    }, 800);
    setTimeout(() => {
      cart = {}; comboCart = {}; updateUI();
      getActiveProducts().forEach(p => renderCardFooter(p.id));
      getActiveCombos().forEach(c => renderComboFooter(c.id));
      $id('f-dia').value = '';
      if ($id('f-dia-fecha')) $id('f-dia-fecha').value = '';
      onDiaChange();
      renderDayPicker();
      document.querySelectorAll('input[name="pago"]').forEach(r => r.checked = false);
      removeCoupon();
      if (waBtn) { waBtn.disabled = false; waBtn.innerHTML = waBtnOrig; waBtn.style.background = ''; }
      _enviando = false;
      hideSendLoader();
      updateFormVisibility();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1800);
  }
  function _afterFail() {
    if (waBtn) { waBtn.disabled = false; waBtn.innerHTML = waBtnOrig; waBtn.style.background = ''; }
    setSendLoaderError();
    setTimeout(hideSendLoader, 2400);
    _enviando = false;
  }

  // Timeout subido de 3s a 12s el 02/06/2026: Apps Script empezó a tardar
  // 6-9s en responder POSTs de pedidos nuevos (antes <1s). El timeout corto
  // hacía aparecer "Sin señal" aunque el pedido sí entrara al Sheets, y el
  // cliente reintentaba generando duplicados.
  var TIMEOUT_MS = 12000;
  var timeoutTriggered = false;
  var settled = false;
  var sendPromise = _sendWithRetry(postData);
  var timeoutId = setTimeout(function(){
    if (settled) return;
    timeoutTriggered = true; settled = true;
    _afterFail();
  }, TIMEOUT_MS);
  sendPromise.then(function() {
    if (timeoutTriggered || settled) return;
    settled = true;
    clearTimeout(timeoutId);
    _afterSuccess();
  }).catch(function() {
    if (timeoutTriggered || settled) return;
    settled = true;
    clearTimeout(timeoutId);
    _afterFail();
  });
}

/* ── RETRY + BACKUP — robustecido 17/05/2026 ──
   Diseñado para clientes con mala señal en Estancias del Pilar.
   1. Persiste el pedido en localStorage ANTES de mandarlo (sobrevive a cerrar la tienda).
   2. AbortController con timeout 12s por intento (no se queda colgado en fetch zombie).
   3. Backoff exponencial: 5s, 15s, 45s, 2min, 5min, 15min.
   4. Reintenta automático cuando el navegador recupera señal (evento 'online') o
      cuando el cliente vuelve a la tienda (visibilitychange).
   5. Backend dedupea por clientOrderId (CacheService 6h) — si un POST llegó pero
      la respuesta se perdió, el reintento no crea duplicado.

   Estructura en localStorage: { [clientOrderId]: { data, ts, tries } }
   Se borra al recibir confirmación (resolve), o cuando se hayan agotado retries.
*/
var MALEU_RETRY_DELAYS = [5000, 15000, 45000, 120000, 300000, 900000]; // ms
var MALEU_MAX_TRIES = MALEU_RETRY_DELAYS.length + 1; // 7 intentos totales

function _pendingMap() {
  try { return JSON.parse(localStorage.getItem('maleu_pending_orders') || '{}'); }
  catch(e) { return {}; }
}
function _pendingSave(map) {
  try { localStorage.setItem('maleu_pending_orders', JSON.stringify(map)); } catch(e) {}
}
function _persistPending(data) {
  var key = data.clientOrderId;
  if (!key) return;
  var map = _pendingMap();
  var prev = map[key];
  map[key] = { data: data, ts: (prev && prev.ts) || Date.now(), tries: (prev && prev.tries || 0) };
  _pendingSave(map);
}
function _removePending(key) {
  if (!key) return;
  var map = _pendingMap();
  if (map[key]) { delete map[key]; _pendingSave(map); }
}

function _sendWithRetry(data) {
  // Persistir SIEMPRE antes de intentar. Si el navegador se cierra a la mitad,
  // queda guardado para el próximo retry oportuno.
  _persistPending(data);
  var key = data.clientOrderId;
  var body = JSON.stringify(data);

  // ── DEFENSA #1: sendBeacon ──────────────────────────────────────────────
  // sendBeacon GARANTIZA que el navegador entregue el POST aún si la página
  // se cierra o navega (redirect a wa.me a los 800ms). No devuelve respuesta,
  // pero asegura el delivery — clave en iOS Safari, que aborta fetch agresivo
  // al cambiar de página. El server tiene idempotencia por clientOrderId.
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      var blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      navigator.sendBeacon(APPS_SCRIPT_URL, blob);
    }
  } catch(e) {}

  // ── DEFENSA #2: fetch CORS ──────────────────────────────────────────────
  // En paralelo, fetch normal (CORS) para LEER la respuesta del server. Si
  // confirma {ok:true}, borramos el pendiente. Si falla o el server devuelve
  // {ok:false}, queda en pendientes → retry (con dedup en el server).
  // Antes era mode:'no-cors' (opaque) → no se podía detectar errores → pedidos
  // perdidos silenciosamente. Bug que costó un pedido de un cliente real.
  var ctrl;
  var timeoutId;
  try {
    ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    if (ctrl) timeoutId = setTimeout(function(){ try { ctrl.abort(); } catch(e){} }, 12000);
  } catch(e) {}

  var fetchOpts = {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // text/plain evita preflight CORS (request "simple")
    body: body
  };
  if (ctrl) fetchOpts.signal = ctrl.signal;

  // Devolvemos la Promise del intento actual para que enviarPedido() pueda
  // esperar la confirmación antes de redirigir a WhatsApp. La cadena de retry
  // en background sigue corriendo igual aunque el caller ignore la promesa.
  return fetch(APPS_SCRIPT_URL, fetchOpts).then(function(r) {
    if (timeoutId) clearTimeout(timeoutId);
    if (!r.ok) throw new Error('http ' + r.status);
    return r.text();
  }).then(function(txt) {
    var resp = null;
    try { resp = JSON.parse(txt); } catch(e) {}
    if (resp && resp.ok) {
      _removePending(key);
      return resp;
    } else {
      throw new Error('server-not-ok: ' + (resp && (resp.err || resp.error) || 'unknown'));
    }
  }).catch(function(err) {
    if (timeoutId) clearTimeout(timeoutId);
    var map = _pendingMap();
    if (map[key]) {
      map[key].tries = (map[key].tries || 0) + 1;
      map[key].lastError = String(err && err.message || err);
      _pendingSave(map);
      if (map[key].tries < MALEU_MAX_TRIES) {
        var delay = MALEU_RETRY_DELAYS[Math.min(map[key].tries - 1, MALEU_RETRY_DELAYS.length - 1)];
        setTimeout(function() { _sendWithRetry(data); }, delay);
      }
      // Si superó MAX_TRIES queda en cola; _retryPendingOrders lo agarra en el próximo
      // ciclo (online / visible / interval).
    }
    throw err; // re-lanzar para que el caller (enviarPedido) sepa que falló
  });
}

function _retryPendingOrders() {
  var map = _pendingMap();
  var keys = Object.keys(map);
  if (keys.length === 0) return;
  // Si el navegador está offline, no perder tiempo
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  // Descartar pedidos pendientes > 4 horas (probablemente tests viejos o intentos
  // de sesiones anteriores que no queremos reprocesar de la nada).
  var now = Date.now(), maxAge = 4*3600*1000, descartados = 0;
  keys.forEach(function(k) {
    var entry = map[k];
    if (!entry || !entry.data) { delete map[k]; descartados++; return; }
    var ts = Number(entry.ts) || 0;
    if (ts > 0 && (now - ts) > maxAge) {
      delete map[k]; descartados++;
      return;
    }
    entry.tries = 0;
    _sendWithRetry(entry.data);
  });
  if (descartados > 0) { _pendingSave(map); }
}

// Reintentos oportunos: recuperar señal, volver a la tienda, o cada 30s mientras esté abierta.
if (typeof window !== 'undefined') {
  window.addEventListener('online', _retryPendingOrders);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') _retryPendingOrders();
  });
}
setInterval(_retryPendingOrders, 30000);

/* ── TOAST ── */
let _tt;
function toast(msg, duration) { const el=$id('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(_tt); _tt=setTimeout(()=>el.classList.remove('show'), duration || 800); }

/* ── FORM VISIBILITY ── */
function updateFormVisibility() {
  const section = $id('form-section');
  if (!section) return;
  if (cartCount() > 0) {
    section.classList.remove('collapsed');
    // Mostrar hint de descuento si no eligió pago aún
    updatePagoHint();
  }
  updateWhatsappCta();
}

/* Detecta si el form está completo y resalta el botón WhatsApp con
   hint "Último paso" + pulse + glow para que el cliente lo encuentre.
   Bug común: el cliente completa todo y deja la pantalla ahí sin tocar
   el botón final, perdiéndose el pedido. */
function updateWhatsappCta() {
  const wrap = $id('whatsapp-cta-wrap');
  if (!wrap) return;
  // Necesita carrito con items
  if (cartCount() === 0) { wrap.classList.remove('ready'); return; }
  // Campos comunes: nombre, teléfono, fecha de entrega, método de pago
  const nombre = ($id('f-nombre') && $id('f-nombre').value || '').trim();
  const telDigits = ($id('f-telefono') && $id('f-telefono').value || '').replace(/\D/g,'');
  const fechaIso = $id('f-dia-fecha') ? $id('f-dia-fecha').value : '';
  const dia = $id('f-dia') ? $id('f-dia').value : '';
  const pagoSel = document.querySelector('input[name="pago"]:checked');
  if (!nombre || telDigits.length < 8 || !(fechaIso || dia) || !pagoSel) {
    wrap.classList.remove('ready'); return;
  }
  // Campos específicos por zona
  if (currentZone === 'estancias') {
    const bp = ($id('f-barrio-privado') && $id('f-barrio-privado').value || '').trim();
    const lote = ($id('f-lote') && $id('f-lote').value || '').trim();
    if (!bp || !lote) { wrap.classList.remove('ready'); return; }
  } else if (currentZone === 'pilar') {
    const pb = ($id('f-pilar-barrio') && $id('f-pilar-barrio').value || '').trim();
    const lotep = ($id('f-lote-pilar') && $id('f-lote-pilar').value || '').trim();
    if (!pb || !lotep) { wrap.classList.remove('ready'); return; }
    // Si eligió "Otro barrio" también necesita el input libre
    if (pb === '__otro__') {
      const dir = ($id('f-direccion') && $id('f-direccion').value || '').trim();
      if (!dir) { wrap.classList.remove('ready'); return; }
    }
  } else if (currentZone === 'clubes') {
    const club = ($id('f-club') && $id('f-club').value || '').trim();
    const dep = ($id('f-deporte') && $id('f-deporte').value || '').trim();
    const gr = ($id('f-grupo') && $id('f-grupo').value || '').trim();
    if (!club || !dep || !gr) { wrap.classList.remove('ready'); return; }
  }
  wrap.classList.add('ready');
}
function expandForm() {
  const section = $id('form-section');
  if (section) section.classList.remove('collapsed');
  updatePagoHint();
  setTimeout(() => document.querySelector('.form-wrap').scrollIntoView({behavior:'smooth'}), 50);
}

/* ── CAT NAV ── */
function renderCatNav() {
  const nav = $id('cat-nav');
  if (!nav) return;
  const cats = getActiveCategories();
  nav.innerHTML =
    '<button class="cat-nav-home" type="button" aria-label="Volver al inicio" onclick="window.scrollTo({top:0,behavior:\'smooth\'})">' +
      '<img src="img/logo-icono.png" alt="Maleu">' +
    '</button>' +
    '<div class="cat-nav-wrap" id="cat-nav-wrap"><div class="cat-nav-inner" id="cat-nav-inner">' +
    cats.map((cat,i) => {
      const slug = slugify(cat.nombre);
      return '<button class="cat-nav-btn' + (i===0?' active':'') + '" data-slug="' + slug + '" onclick="scrollToCat(\'' + slug + '\')">' +
        cat.nombre + '</button>';
    }).join('') +
    // Chip "Combos" al final, color propio. data-slug = id de la sección para que
    // el IntersectionObserver lo resalte al scrollear hasta los combos.
    (getActiveCombos().length ? '<button class="cat-nav-btn cat-nav-combos" data-slug="combos-ancla" onclick="scrollToCombos()">🎁 Combos</button>' : '') +
    '</div></div>';
  document.querySelectorAll('.cat-section').forEach((section,i) => {
    const cat = getActiveCategories()[i]; if (!cat) return;
    section.id = 'cat-' + slugify(cat.nombre);
  });
  const observer = new IntersectionObserver(entries => {
    if (_scrollingToCat) return;
    entries.forEach(entry => { if (entry.isIntersecting) setActiveNav(entry.target.id.replace('cat-','')); });
  }, { rootMargin:'-20% 0px -70% 0px', threshold:0 });
  document.querySelectorAll('.cat-section').forEach(s => observer.observe(s));
  // Hint de scroll: si el inner ya está al final, sacar el fade
  var inner = $id('cat-nav-inner'), wrap = $id('cat-nav-wrap');
  function updateFade() {
    if (!inner || !wrap) return;
    var atEnd = (inner.scrollLeft + inner.clientWidth) >= (inner.scrollWidth - 4);
    wrap.classList.toggle('at-end', atEnd);
  }
  if (inner) {
    inner.addEventListener('scroll', updateFade);
    setTimeout(updateFade, 100);
  }
  // Pulse inicial para llamar la atención (solo una vez por sesión)
  try {
    if (!sessionStorage.getItem('maleu_cat_pulse_done')) {
      setTimeout(function() {
        document.querySelectorAll('.cat-nav-btn').forEach(function(b) { b.classList.add('cat-nav-pulse'); });
        setTimeout(function() {
          document.querySelectorAll('.cat-nav-btn').forEach(function(b) { b.classList.remove('cat-nav-pulse'); });
        }, 1400);
      }, 1200);
      sessionStorage.setItem('maleu_cat_pulse_done', '1');
    }
  } catch(e) {}
}
/* Scroll suave a un ancla. Usa scrollIntoView (imperativo, no depende del
   hash) + scroll-margin-top en CSS para compensar el header sticky. */
function _smoothScrollToEl(el) {
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}
function scrollToCombos() {
  // Buscar por id; si no está, por clase (más estable ante re-render).
  const el = $id('combos-ancla') || document.querySelector('.combos-section');
  if (!_smoothScrollToEl(el)) {
    // Último recurso: si la sección no existe aún, re-render y reintentar.
    if (typeof renderCatalog === 'function') { renderCatalog(); updateStockDisplay(); }
    _smoothScrollToEl($id('combos-ancla') || document.querySelector('.combos-section'));
  }
}
function scrollToProductos() { _smoothScrollToEl($id('productos-ancla') || $id('catalogo')); }

let _scrollingToCat = false;
function scrollToCat(slug) {
  const section = $id('cat-' + slug); if (!section) return;
  _scrollingToCat = true;
  setActiveNav(slug);
  section.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(() => { _scrollingToCat = false; }, 800);
}
function setActiveNav(slug) {
  const container = $id('cat-nav-inner');
  document.querySelectorAll('.cat-nav-btn').forEach(btn => {
    const isActive = btn.dataset.slug === slug;
    btn.classList.toggle('active', isActive);
    if (isActive && container) {
      const nR = container.getBoundingClientRect(), bR = btn.getBoundingClientRect();
      container.scrollTo({left: container.scrollLeft + (bR.left - nR.left) - (nR.width/2) + (bR.width/2), behavior:'smooth'});
    }
  });
}
function updateCatNavTop() {
  const nav = $id('cat-nav'), promo = $id('promo-bar');
  if (nav) {
    // Header NO es sticky → cat-nav va al top:0 cuando scrolleás
    nav.style.top = '0px';
    if (promo) promo.style.top = nav.offsetHeight + 'px';
    const total = nav.offsetHeight + (promo ? promo.offsetHeight : 0);
    document.querySelectorAll('.cat-section').forEach(s => { s.style.scrollMarginTop = total + 'px'; });
  }
}

/* ── STOCK ── */
/* stockMap[id]            = stock físico (lo que hay en el depósito ahora)
   stockProyectadoMap[id]  = físico + Σ cantidad de OCs en estado "Pedido"
                             (lo que está en camino al depósito)            */
async function fetchStock() {
  try {
    const bust = '?action=stock_full&_=' + Date.now();
    const res = await fetch(APPS_SCRIPT_URL + bust, { cache: 'no-store' });
    const full = await res.json();
    PRODUCTOS.forEach(p => {
      const abbr = PROD_ABBR[p.id];
      if (!abbr || !full[abbr]) return;
      stockMap[p.id] = full[abbr].f;
      stockProyectadoMap[p.id] = full[abbr].p;
    });
    // Ajustar carrito si excede el tope vigente según el modo actual
    const mode = getStockMode();
    if (mode === 'real' || mode === 'proyectado') {
      const capMap = mode === 'real' ? stockMap : stockProyectadoMap;
      let ajustado = false;
      Object.entries(cart).forEach(([id, qty]) => {
        const cap = capMap[id];
        if (cap !== undefined && qty > cap) {
          if (cap === 0) delete cart[id];
          else cart[id] = cap;
          ajustado = true;
          renderCardFooter(id);
        }
      });
      if (ajustado) { updateUI(); toast('⚠️ Tu carrito fue ajustado al stock disponible'); }
    }
    updateStockDisplay();
    loadLastOrder();
  } catch (e) { console.warn('fetchStock:', e); }
}
/* Devuelve el tope a usar para un producto según el modo de stock actual.
   Si es 'ilimitado', devuelve null (sin tope). */
function getStockCap(id) {
  const m = getStockMode();
  if (m === 'ilimitado') return null;
  if (m === 'proyectado') return stockProyectadoMap[id];
  return stockMap[id];
}
function updateStockDisplay() {
  const mode = getStockMode();
  const showStock = mode !== 'ilimitado' || isStockInfoMode() || (currentZone && ZONAS[currentZone] && ZONAS[currentZone].showStock);
  PRODUCTOS.forEach(p => {
    const el = $id('stock-' + p.id);
    if (!el) return;
    const fis = stockMap[p.id];
    const proy = stockProyectadoMap[p.id];
    if (!showStock || fis === undefined) { el.innerHTML = ''; renderCardFooter(p.id); return; }
    if (mode === 'real') {
      if (fis === 0) el.innerHTML = '<span class="stock-badge stock-out">Sin stock</span>';
      else if (fis <= 3) el.innerHTML = '<span class="stock-badge stock-low">Últimas ' + fis + ' unidades</span>';
      else el.innerHTML = '';
    } else if (mode === 'proyectado') {
      // Mismo tratamiento visual que modo real: el cliente no ve "lo que
      // viene en camino" explícito; solo ve "Sin stock" o "Últimas N" si
      // queda poco. Cuando intente superar el tope verá "Máximo disponible: N".
      if (proy === 0) el.innerHTML = '<span class="stock-badge stock-out">Sin stock</span>';
      else if (proy <= 3) el.innerHTML = '<span class="stock-badge stock-low">Últimas ' + proy + ' unidades</span>';
      else el.innerHTML = '';
    } else {
      // Modo ilimitado: el cliente puede pedir cualquier cantidad. NO mostrar
      // info de stock físico — solo distrae. El cartel "A pedido" se mantiene
      // únicamente en Pilar/Clubes cuando stock=0 (zonas que siempre son a pedido).
      if (fis === 0 && currentZone !== 'estancias' && !(currentZone === 'pilar' && !_pilarBarrioIsRed())) {
        el.innerHTML = '<span class="stock-badge stock-order">A pedido</span>';
      } else {
        el.innerHTML = '';
      }
    }
    renderCardFooter(p.id);
  });
  // Combos: badge de stock (mismo criterio que productos) + footer.
  updateStockBadgesCombos();
  getActiveCombos().forEach(c => renderComboFooter(c.id));
}

/* ── PRECARGAR DATOS ── */
function loadClientData() {
  try {
    // Datos específicos de la zona actual (prioridad) o legacy global
    var saved = JSON.parse(localStorage.getItem('maleu_cliente_' + currentZone) || 'null');
    var global = JSON.parse(localStorage.getItem('maleu_cliente_pg') || 'null');
    if (!saved && global && global.zone === currentZone) saved = global;
    if (!saved) {
      // Al menos cargar nombre y teléfono del global si existe
      if (global) {
        if (global.nombre) $id('f-nombre').value = global.nombre;
        if (global.telefono) $id('f-telefono').value = global.telefono;
      }
      return;
    }
    if (saved.nombre) $id('f-nombre').value = saved.nombre;
    if (saved.telefono) $id('f-telefono').value = saved.telefono;
    if (currentZone === 'estancias') {
      if (saved.barrioPrivado) { $id('f-barrio-privado').value = saved.barrioPrivado; filtrarSubBarrios(true); }
      if (saved.barrio) $id('f-barrio').value = saved.barrio;
      if (saved.lote) $id('f-lote').value = saved.lote;
    }
    if (currentZone === 'pilar') {
      if (saved.direccion) {
        var sel = $id('f-pilar-barrio');
        // Buscar si el barrio guardado está en el dropdown
        var found = false;
        if (sel) {
          for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === saved.direccion) { sel.value = saved.direccion; found = true; break; }
          }
        }
        if (!found && sel) {
          sel.value = '__otro__';
          $id('f-direccion').value = saved.direccion;
        }
        onPilarBarrioChange();
      }
      if (saved.lote) $id('f-lote-pilar').value = saved.lote;
    }
    if (currentZone === 'clubes') {
      if (saved.club) $id('f-club').value = saved.club;
      if (saved.deporte) $id('f-deporte').value = saved.deporte;
      if (saved.grupo) $id('f-grupo').value = saved.grupo;
    }
    // Día y método de pago NO se precargan — el cliente los elige cada vez
  } catch(e) {}
}
function loadLastOrder() {
  try {
    const items = JSON.parse(localStorage.getItem('maleu_ultimo_pedido_pg') || 'null');
    if (!items || !items.length) return;
    // Solo mostrar si la zona coincide exactamente
    var savedZoneOrder = localStorage.getItem('maleu_last_order_zone') || '';
    if (savedZoneOrder !== currentZone) return;
    const block=$id('repeat-block'), list=$id('repeat-items'); if(!block||!list) return;
    const lines = items.map(({id,qty}) => {
      const p=PROD_MAP[id]; if(!p) return '';
      return '<div class="repeat-item"><span>'+p.nombre+'</span><span>×'+qty+'</span></div>';
    }).filter(Boolean).join('');
    if(!lines) return;
    list.innerHTML = lines;
    const btn = block.querySelector('.repeat-btn'); if(btn) btn.disabled = false;
    block.style.display = 'block';
  } catch(e) {}
}
function repeatLastOrder() {
  try {
    const items = JSON.parse(localStorage.getItem('maleu_ultimo_pedido_pg') || 'null');
    if (!items || !items.length) return;
    let agregados = 0;
    var limited = isStockLimited();
    items.forEach(({id,qty}) => {
      const p=PROD_MAP[id]; if(!p) return;
      if (limited) { const avail=stockMap[id]; if(avail!==undefined&&avail===0) return; qty = avail!==undefined ? Math.min(qty, avail-(cart[id]||0)) : qty; if(qty<=0) return; }
      cart[id] = (cart[id]||0) + qty;
      agregados++; renderCardFooter(id);
    });
    updateUI();
    updateFormVisibility();
    if(agregados>0) { toast('✓ Productos agregados'); $id('repeat-block').style.display='none'; }
    else toast('⚠️ No hay stock');
  } catch(e) {}
}

/* ── INIT ── */
renderCatalog();
renderCatNav();
updateCatNavTop();
window.addEventListener('resize', updateCatNavTop);

// Zona guardada
let savedZone = localStorage.getItem('maleu_zone');
if (savedZone === 'capital') { savedZone = 'pilar'; localStorage.setItem('maleu_zone', 'pilar'); }
if (savedZone && ZONAS[savedZone]) {
  // Cliente recurrente: tiene zona. NO mostrar paso 1 (zona).
  currentZone = savedZone;
  applyZone();
  if (savedZone === 'clubes') {
    // Clubes: nunca se pregunta fecha (Vie en cancha). Setear default.
    if (!_loadSavedDate()) _setClubesDefaultDate();
    _setOverlay(false);
  } else if (savedZone === 'pilar' && !_loadSavedPilarBarrio()) {
    // Pilar sin barrio guardado → preguntar barrio.
    welcomeShowBarrioStep();
    _setOverlay(true);
  } else if (_loadSavedDate()) {
    // Tiene fecha vigente → todo listo.
    _setOverlay(false);
  } else {
    // Falta fecha → abrir el modal directamente en paso fecha.
    welcomeShowDateStep();
    _setOverlay(true);
  }
} else {
  // Cliente nuevo: paso 1 (zona) primero
  welcomeShowZoneStep();
  _setOverlay(true);
}

loadClientData();
$id('cart-badge').style.display = 'none';
fetchStock();
fetchVendedores();
_retryPendingOrders();
initCumpleBlock();
// Listener delegado: cualquier cambio en el form recalcula el CTA del botón WA
(function(){
  var formSec = $id('form-section');
  if (!formSec) return;
  ['input','change'].forEach(function(ev){
    formSec.addEventListener(ev, updateWhatsappCta);
  });
})();
let _stockTimer = setInterval(fetchStock, 60000);
document.addEventListener('visibilitychange', () => {
  if(document.hidden){clearInterval(_stockTimer);_stockTimer=null;}
  else{fetchStock();_stockTimer=setInterval(fetchStock,60000);}
});

// Float cart visibility
const _formObs = new IntersectionObserver(([entry]) => { _formVisible = entry.isIntersecting; updateUI(); }, {threshold:0.3});
_formObs.observe(document.querySelector('.form-section'));

/* ══════════════════════════════════════════════════
   CUMPLEAÑOS DEL CLIENTE
   Bloque en el form (arriba del botón WhatsApp). Se guarda en
   localStorage al completar y viaja en el payload del pedido
   (postData.cumple) → el backend lo escribe en "Clientes Meta"
   atado al teléfono normalizado (filtro 🎂 Cumple del Panel).
   Formato guardado: "DD/MM/AAAA". (CUMPLE_MESES se define arriba con las constantes.)
   ══════════════════════════════════════════════════ */
function getCumpleValue() {
  try { return localStorage.getItem('maleu_cumple') || ''; } catch(e) { return ''; }
}

function initCumpleBlock() {
  var selDia = $id('f-cumple-dia'), selMes = $id('f-cumple-mes'), selAnio = $id('f-cumple-anio');
  if (!selDia || !selMes || !selAnio) return;

  // Poblar días 1–31
  for (var d = 1; d <= 31; d++) {
    var o = document.createElement('option'); o.value = String(d); o.textContent = String(d); selDia.appendChild(o);
  }
  // Poblar meses
  for (var m = 0; m < 12; m++) {
    var om = document.createElement('option'); om.value = String(m + 1); om.textContent = CUMPLE_MESES[m]; selMes.appendChild(om);
  }
  // Poblar años 2012 → 1956 (más jóvenes primero)
  for (var y = 2012; y >= 1956; y--) {
    var oy = document.createElement('option'); oy.value = String(y); oy.textContent = String(y); selAnio.appendChild(oy);
  }

  [selDia, selMes, selAnio].forEach(function(s) { s.addEventListener('change', cumpleOnChange); });

  // Si ya lo completó en una visita anterior → no volver a mostrar NADA (ni el "¡Listo!").
  // El estado "¡Listo!" solo se ve en el momento en que lo carga (cumpleOnChange).
  var saved = getCumpleValue();
  if (saved) {
    var block = $id('cumple-block');
    if (block) block.style.display = 'none';
  } else {
    _cumpleShowAsk();
  }
}

function cumpleOnChange() {
  var dia = $id('f-cumple-dia').value, mes = $id('f-cumple-mes').value, anio = $id('f-cumple-anio').value;
  if (!dia || !mes || !anio) return; // todavía incompleto
  var dd = ('0' + dia).slice(-2), mm = ('0' + mes).slice(-2);
  var valor = dd + '/' + mm + '/' + anio;
  try { localStorage.setItem('maleu_cumple', valor); } catch(e) {}
  // Si ya conocemos el teléfono del cliente (recurrente), lo guardamos al toque.
  _cumpleSaveBackend(valor);
  _cumpleShowDone(valor);
  try { toast('🎂 ¡Gracias! Guardamos tu cumple'); } catch(e) {}
}

function _cumpleShowDone(valor) {
  var ask = $id('cumple-ask'), done = $id('cumple-done'), fechaEl = $id('cumple-done-fecha');
  if (fechaEl) {
    var p = valor.split('/');
    fechaEl.textContent = (p.length === 3) ? (parseInt(p[0],10) + ' de ' + (CUMPLE_MESES[parseInt(p[1],10)-1] || '')) : valor;
  }
  if (ask) ask.style.display = 'none';
  if (done) done.style.display = '';
}

function _cumpleShowAsk() {
  var ask = $id('cumple-ask'), done = $id('cumple-done');
  if (ask) ask.style.display = '';
  if (done) done.style.display = 'none';
}

// Permite corregir un cumple ya cargado.
function cumpleEditar() { _cumpleShowAsk(); }

// Guarda el cumple en el backend si ya tenemos un teléfono (cliente recurrente o
// número ya tipeado en el form). Fire-and-forget, no bloquea nada. El pedido igual
// lleva postData.cumple como vía principal.
function _cumpleSaveBackend(valor) {
  var tel = '';
  var telEl = $id('f-telefono');
  if (telEl && telEl.value) tel = telEl.value;
  if (!tel) {
    try {
      var saved = JSON.parse(localStorage.getItem('maleu_cliente_pg') || 'null');
      if (saved && saved.telefono) tel = saved.telefono;
    } catch(e) {}
  }
  if (!tel || tel.replace(/\D/g, '').length < 8) return; // sin teléfono → se guarda al hacer el pedido
  try {
    fetch(APPS_SCRIPT_URL, {
      method: 'POST', mode: 'cors', keepalive: true,
      headers: { 'Content-Type': 'text/plain' }, // evita preflight CORS (igual que el pedido)
      body: JSON.stringify({ action: 'guardarCumpleCliente', tel: tel, cumple: valor })
    }).catch(function(){});
  } catch(e) {}
}

/* ══════════════════════════════════════════════════
   FEATURES FRIZATA-INSPIRED
   ══════════════════════════════════════════════════ */

/* ── BARRA ENVÍO GRATIS ── */
const FREE_SHIPPING_MIN = 25000; // envío gratis desde $25.000 (solo aplica para zona pilar)
function updatePromoBar() {
  var bar = $id('promo-bar');
  if (!bar) return;
  if (!discountsActive()) { bar.style.display = 'none'; return; }
  // Carrito solo-combos: no hay nada descontable → ocultar (no mentir con el 10%).
  if (combosInCart() && productsSubtotal() === 0) { bar.style.display = 'none'; return; }
  // Construir el ticker dinámicamente según qué descuentos aplican en la zona
  // (en Pilar NO-Red solo aplica el +$100K, no el efectivo).
  var msgEl = bar.querySelector('.promo-msg');
  if (msgEl) {
    var chips = [];
    if (cashDiscountActive()) chips.push('💵 10% OFF en efectivo');
    if (bulkDiscountActive()) chips.push('🔥 10% OFF superando $100.000');
    // Duplicar la secuencia para el efecto marquee continuo
    var seq = chips.concat(chips).join(' &nbsp;·&nbsp; ') + ' &nbsp;·&nbsp;';
    msgEl.innerHTML = seq;
  }
  bar.style.display = '';
}
function updatePagoHint() {
  var hint = $id('pago-hint');
  if (!hint) return;
  var sel = document.querySelector('input[name="pago"]:checked');
  var isCash = sel && sel.value === 'Efectivo';
  // El 10% aplica solo a productos sueltos (no combos): el umbral $100K y el
  // "hay algo que descontar" se miden sobre productsSubtotal. Si el carrito es
  // solo combos (pSub=0), no mostrar el cartel.
  var pSub = productsSubtotal();
  var yaBulk = pSub >= 100000;
  hint.style.display = (cashDiscountActive() && !isCash && !yaBulk && pSub > 0) ? '' : 'none';
}
function updateShippingBar() {
  const bar = $id('shipping-bar');
  // En Pilar nunca mostrar la barra de envío gratis (el usuario lo pidió así)
  if (currentZone === 'pilar') { bar.classList.add('hidden'); return; }
  // En el resto: mostrar solo si la zona cobra envío AHORA
  if (!currentZone || getShipping() === 0) { bar.classList.add('hidden'); return; }
  const subtotal = cartTotal();
  if (cartCount() === 0) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const fill = $id('shipping-bar-fill');
  const text = $id('shipping-bar-text');
  if (subtotal >= FREE_SHIPPING_MIN) {
    bar.classList.add('free');
    text.textContent = '🎉 ¡Envío gratis! Tu pedido supera ' + ars(FREE_SHIPPING_MIN);
    fill.style.width = '100%';
    // Override shipping to 0
  } else {
    bar.classList.remove('free');
    const falta = FREE_SHIPPING_MIN - subtotal;
    text.textContent = '🚚 Sumá ' + ars(falta) + ' más para envío gratis';
    fill.style.width = Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100) + '%';
  }
}
// getShipping ya maneja FREE_SHIPPING_MIN internamente

/* ── MERCADO PAGO ALIAS ── */
// El alias maleump es de Maleu central. Si el barrio (Pilar) tiene vendedor Red
// asignado (ej: Marcos Bottcher en El Lucero/Los Tacos), el cobro va al vendedor
// y el alias de Maleu no aplica — el vendedor le pasa el suyo al confirmar.
function _barrioPilarTieneVendedor() {
  if (currentZone !== 'pilar') return null;
  var sel = $id('f-pilar-barrio');
  if (!sel) return null;
  var val = sel.value;
  if (!val || val === '__otro__') return null;
  return barrioToVendedor[val.toLowerCase()] || null;
}
function onPagoChange() {
  const sel = document.querySelector('input[name="pago"]:checked');
  const alias = $id('mp-alias');
  const aliasNote = $id('mp-alias-vendedor-note');
  const esTransfer = sel && sel.value === 'Transferencia';
  const vendedor = _barrioPilarTieneVendedor();
  if (esTransfer && !vendedor) { alias.classList.remove('hidden'); }
  else { alias.classList.add('hidden'); }
  if (aliasNote) {
    if (esTransfer && vendedor) {
      aliasNote.textContent = vendedor.nombre + ' te va a pasar el alias al confirmar tu pedido.';
      aliasNote.classList.remove('hidden');
    } else {
      aliasNote.classList.add('hidden');
    }
  }
  // Hint de descuento: mostrar solo cuando NO eligió efectivo
  updatePagoHint();
  updateUI();
  updateFormSummary();
}
function copyAlias() {
  navigator.clipboard.writeText('maleump').then(function() { toast('✓ Alias copiado: maleump'); });
}

updateShippingBar();
