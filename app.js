/* ══════════════════════════════════════════════════
   MALEU — PILAR GLOBAL
   Unifica Home + Delivery en una sola web
   ══════════════════════════════════════════════════ */

/* ── PRODUCTOS ── */
const PRODUCTOS = [
  { id:1,  cat:"Pizzas Premium",   nombre:"Pizza Margarita",              desc:"Tomate fresco, mozzarella y albahaca. La que nunca falla.",                        precio:11000, img:"pizza-margarita-cocida.jpg", emoji:"🍕", top:true, chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:2,  cat:"Pizzas Premium",   nombre:"Pizza Jamón y Queso",           desc:"Mucho jamón, mucho queso. Simple, efectiva y sin dramas.",                        precio:11000, img:"pizza-jamon-queso-cocida.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:3,  cat:"Pizzas Premium",   nombre:"Pizza Cebolla Caramelizada",    desc:"Cebolla bien dulce con queso cremoso. Para los que saben.",                       precio:11000, img:"pizza-cebolla-cocida.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:4,  cat:"Pizzas Premium",   nombre:"Pizza Jamón y Morrón",          desc:"Con jamón, morrón rojo y orégano. Completa y sabrosa.",                           precio:12000, img:"pizza-jamon-morron-cocida.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:19, cat:"Pizzas Premium",   nombre:"Pizza Muzzarella",              desc:"Puro queso derretido sobre salsa de tomate. La clásica que nunca sobra.",          precio:11000, img:"pizza-muzarella-cocida.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:5,  cat:"Pizzas Clásicas",  nombre:"Pack Muzarella x2",             desc:"Dos pizzas de muzzarella. Cena resuelta para toda la semana.",                   precio:16000, img:"pack-muzarella-cocida.jpg", emoji:"🍕", top:true, chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:6,  cat:"Pizzas Clásicas",  nombre:"Pack Jamón y Queso x2",         desc:"Dos pizzas de jamón y queso. Una para hoy, una para cuando querás.",             precio:16000, img:"pack-jamon-queso-cocida.jpg", emoji:"🍕", chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:7,  cat:"Pizzas Clásicas",  nombre:"Pack Cebolla y Queso x2",       desc:"Dos pizzas con cebolla caramelizada. Guardá una para mañana.",                   precio:16000, img:"pack-cebolla-queso-cocida.jpg", emoji:"🍕", chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:8,  cat:"Sorrentinos",      nombre:"Sorrentinos Cordero al Malbec", desc:"Cordero, zanahoria, apio, cebolla y especias. Distinto y muy rico.",             precio:17500, img:"sorrentinos-cordero-new.png", emoji:"🍝", chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:9,  cat:"Sorrentinos",      nombre:"Sorrentinos Jamón y Queso",     desc:"Relleno cremoso y generoso. El favorito de la familia.",                         precio:16300, img:"sorrentinos-jamon-new.png", emoji:"🍝", top:true, chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:10, cat:"Sorrentinos",      nombre:"Sorrentinos Calabaza y Queso",  desc:"Suave, dulce y sabroso. Relleno cremoso de calabaza y queso.",                   precio:14700, img:"sorrentinos-calabaza-new.png", emoji:"🍝", chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:20, cat:"Sorrentinos",      nombre:"Sorrentinos Queso Brie",        desc:"Queso brie cremoso y perfumado. Gourmet sin vueltas.",                          precio:19300, img:"sorrentinos-brie.png",      emoji:"🍝", zonas:["pilar"], chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:21, cat:"Sorrentinos",      nombre:"Sorrentinos Langostinos al Azafrán", desc:"Langostinos y azafrán en masa casera. Muy gourmet.",                      precio:19300, img:"sorrentinos-langostinos.png",emoji:"🍝", zonas:["pilar"], chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:22, cat:"Sorrentinos",      nombre:"Sorrentinos Pollo y Puerro",    desc:"Pollo tierno con puerro salteado. Suave, sabroso y muy rendidor.",              precio:16300, img:"sorrentinos-pollo-puerro.png",emoji:"🍝", zonas:["pilar"], chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:23, cat:"Sorrentinos",      nombre:"Sorrentinos Espinaca",          desc:"Espinaca con queso cremoso. Verde, suave, tradicional.",                         precio:15100, img:"sorrentinos-espinaca.png",   emoji:"🍝", zonas:["pilar"], chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:11, cat:"Empanadas",        nombre:"Empanadas Carne a Cuchillo x8", desc:"Carne cortada a cuchillo, jugosa y bien condimentada. Las que piden todos.",     precio:18800, img:"empanadas-carne-new.jpg", emoji:"🥟", top:true, chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:12, cat:"Empanadas",        nombre:"Empanadas Jamón y Queso x8",    desc:"Cremosas por dentro, doraditas por fuera. Para cualquier momento.",              precio:16000, img:"empanadas-jamon-new.png", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:17, cat:"Empanadas",        nombre:"Empanadas Cebolla y Queso Azul x8",  desc:"Cebolla caramelizada con queso azul. Intensas y cremosas.",               precio:16000, img:"empanadas-cebolla-new.jpg", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:18, cat:"Empanadas",        nombre:"Empanadas Verdura x8",          desc:"Relleno de verdura fresca y queso. Livianas y riquísimas.",                      precio:16000, img:"empanadas-verdura-new.png", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:13, cat:"Postres & Tortas", nombre:"Franui Leche",                  desc:"Frambuesas bañadas en chocolate con leche y blanco. El cierre perfecto.",        precio:8000,  img:"franui-new.jpg", emoji:"🍫", chips:["Para 2–3 personas","Listo para servir"] },
  { id:14, cat:"Postres & Tortas", nombre:"Torta Golosa",                  desc:"Masa de chocolate, dulce de leche, mousse de chocolate y almendras acarameladas.", precio:24000, img:"torta-golosa.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
  { id:15, cat:"Postres & Tortas", nombre:"Torta Lemon Crumble",           desc:"Base sablée, relleno de limón y crumble crocante espolvoreado.",                 precio:24000, img:"torta-lemon.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
  { id:16, cat:"Postres & Tortas", nombre:"Torta Coco",                    desc:"Base crocante, dulce de leche y relleno de coco. Generosa y sin vueltas.",       precio:24000, img:"torta-coco.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
];

const CATEGORIAS = [
  { nombre:"Pizzas Premium",   icono:"🍕", nota:"Pre-cocidas · Listas en minutos · Al horno directo desde el freezer" },
  { nombre:"Pizzas Clásicas",  icono:"🍕", nota:"Pack de 2 unidades · Perfectas para tener siempre a mano" },
  { nombre:"Sorrentinos",      icono:"🍝", nota:"600g · 16 unidades · Rinde 3 porciones · Solo 4 minutos de cocción", tip:"Hervir agua · Agregar sorrentinos · 4 min con olla destapada · Retirar con espumadera y servir" },
  { nombre:"Empanadas",        icono:"🥟", nota:"x8 unidades · Congeladas, listas para el horno · Cocinar hasta dorar" },
  { nombre:"Postres & Tortas", icono:"🎂", nota:"Para cerrar bien la noche" },
];

/* ── PRODUCTOS CLUBES (precios especiales, solo pizzas) ── */
const PRODUCTOS_CLUBES = [
  { id:'pmu', cat:"Pizzas Premium",  nombre:"Pizza Muzzarella",           desc:"Puro queso derretido sobre salsa de tomate. La clásica que nunca sobra.",   precio:7000,  img:"pizza-muzarella-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pjq', cat:"Pizzas Premium",  nombre:"Pizza Jamón y Queso",        desc:"Mucho jamón, mucho queso. Simple, efectiva y sin dramas.",                  precio:7000,  img:"pizza-jamon-queso-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pcc', cat:"Pizzas Premium",  nombre:"Pizza Cebolla Caramelizada", desc:"Cebolla bien dulce con queso cremoso. Para los que saben.",                 precio:7000,  img:"pizza-cebolla-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pma', cat:"Pizzas Premium",  nombre:"Pizza Margarita",            desc:"Tomate fresco, mozzarella y albahaca. La que nunca falla.",                  precio:7000,  img:"pizza-margarita-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pjm', cat:"Pizzas Premium",  nombre:"Pizza Jamón y Morrón",       desc:"Con jamón, morrón rojo y orégano. Completa y sabrosa.",                     precio:7800,  img:"pizza-jamon-morron-cocida.jpg", emoji:"🍕", chips:["1 pizza grande","Al horno en 12 min"] },
  { id:'pp1', cat:"Pizzas Clásicas", nombre:"Pack Muzarella x2",          desc:"Dos pizzas de muzzarella. Cena resuelta para todo el equipo.",              precio:11000, img:"pack-muzarella-cocida.jpg", emoji:"🍕", top:true, chips:["2 pizzas grandes","Al horno en 12 min"] },
  { id:'pp2', cat:"Pizzas Clásicas", nombre:"Pack Jamón y Queso x2",      desc:"Dos pizzas de jamón y queso. El clásico del tercer tiempo.",               precio:11000, img:"pack-jamon-queso-cocida.jpg", emoji:"🍕", chips:["2 pizzas grandes","Al horno en 12 min"] },
  { id:'pp3', cat:"Pizzas Clásicas", nombre:"Pack Cebolla y Queso x2",    desc:"Dos pizzas con cebolla caramelizada. Siempre piden más.",                  precio:11000, img:"pack-cebolla-queso-cocida.jpg", emoji:"🍕", chips:["2 pizzas grandes","Al horno en 12 min"] },
];
const CATEGORIAS_CLUBES = [
  { nombre:"Pizzas Premium",  icono:"🍕", nota:"Individuales · Pre-cocidas · Al horno directo desde el freezer" },
  { nombre:"Pizzas Clásicas", icono:"🍕", nota:"Pack de 2 unidades · Ideal para compartir en equipo" },
];
// Los productos de clubes se agregan a PROD_MAP después de su declaración (ver más abajo)

/* Productos y categorías activos según zona */
function getActiveProducts() {
  if (currentZone === 'clubes') return PRODUCTOS_CLUBES;
  return PRODUCTOS.filter(function(p) { return !p.zonas || p.zonas.indexOf(currentZone) >= 0; });
}
function getActiveCategories() { return currentZone === 'clubes' ? CATEGORIAS_CLUBES : CATEGORIAS; }

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
    envio: 3000,
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
const STOCK_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOq210U9LeSxvXbx_sdglHS0K9DZP8H_5pGXC-WwlMo8AE4UacIN0bpagQqAr79XeJNQ1Nm1eql271/pub?gid=792614962&single=true&output=csv';

/* ── AJUSTES ESPECIALES POR SEMANA ──
   Feriados que se BLOQUEAN del calendario (no hay entrega ese día).
   Entregas EXTRA agregadas puntualmente (días que normalmente no se
   entregan pero que esta semana sí, por ejemplo cuando un Vie es feriado
   y se reparte el Jue). Después de la fecha pasada se ignoran solas.

   Semana del 28/04 al 03/05/2026:
   - Vie 01/05: Día del Trabajador, feriado nacional → no se entrega en
     Estancias ni Pilar.
   - Jue 30/04: entrega Home extra 19-21hs (compensación por feriado). */
const FERIADOS_BLOQUEADOS = {
  estancias: ['2026-05-01'],
  pilar: ['2026-05-01']
};
const ENTREGAS_EXTRA = {
  estancias: [
    { iso: '2026-04-30', dayName: 'Jueves', timeRange: '19 a 21 hs' }
  ]
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

/* ── ESTADO ── */
let cart = {};
let currentZone = null; // 'estancias' | 'pilar' | 'clubes'
let stockMap = {};
let vendedoresRed = []; // {nombre, wa, barrios:[], partido, localidad}
let barrioToVendedor = {}; // { 'El Lucero': {nombre, wa, partido, localidad}, ... }
let _enviando = false;
let selectedDeliveryDate = null;     // ISO "YYYY-MM-DD"
let selectedDeliveryDayName = null;  // "Lunes" | "Miércoles" | etc.
let selectedDateIsFlexible = false;  // true cuando el cliente elige "Cualquier día"

/* Tope estricto de stock — depende de la fecha de entrega elegida.
   Solo aplica en zona Estancias (Pilar y Clubes nunca tienen tope).

   Regla: si la fecha elegida está a <24hs del horario más temprano de
   entrega de ese día, no hay tiempo de reponer vía OC al proveedor.
   Por lo tanto, el cliente solo puede pedir lo que hay en el freezer.

   Si la fecha es a más de 24hs → modo abierto con info (puede pedir
   cualquier cantidad porque hay margen de reposición).

   Si elige "Cualquier día" o no eligió fecha → modo abierto con info
   también (asumimos que es flexible). */
function isStockLimited() {
  // Pilar bajo restricción temporal: tope solo si la entrega es de ESTA
  // semana (Vie 1/5 con Marcos). Si pide para la semana siguiente o más
  // adelante, el flujo "a pedido" vuelve a estar disponible.
  if (isPilarRestricted()) {
    if (selectedDateIsFlexible) return true; // "Cualquier día" → próximo Vie (esta sem)
    if (!selectedDeliveryDate) return true;
    var pms = _deliveryStartMs(selectedDeliveryDate);
    if (pms && pms < PILAR_RESTRICCION_HASTA_MS) return true; // entrega dentro de la restricción
    return false; // semana siguiente en adelante → abierto
  }
  if (currentZone !== 'estancias') return false;
  if (selectedDateIsFlexible) return false;
  if (!selectedDeliveryDate) return false;
  var deliveryStartMs = _deliveryStartMs(selectedDeliveryDate);
  if (!deliveryStartMs) return false;
  var hoursUntil = (deliveryStartMs - Date.now()) / 3600000;
  return hoursUntil < 24;
}
/* Modo "abierto con info": Estancias con fecha lejana, "Cualquier día", o sin elegir. */
function isStockInfoMode() {
  if (currentZone !== 'estancias') return false;
  if (isStockLimited()) return false;
  return true;
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
  // Clubes (IDs string)
  'pmu':'PMu', 'pma':'PMa', 'pjq':'PJyQ', 'pcc':'PCC', 'pjm':'PJyM',
  'pp1':'PPM', 'pp2':'PPJyQ', 'pp3':'PPCyQ',
};

/* ── HELPERS ── */
function $id(id) { return document.getElementById(id); }
function ars(n) { return '$' + n.toLocaleString('es-AR'); }
function cartTotal() { return Object.entries(cart).reduce((s,[id,q]) => { const p=PROD_MAP[id]; return s+(p?p.precio*q:0); }, 0); }
function cartCount() { return Object.values(cart).reduce((a,b)=>a+b, 0); }
function getShipping() {
  if (!currentZone) return 0;
  const z = ZONAS[currentZone];
  // En Pilar: envío $0 por default y si hay vendedor (El Lucero, Los Tacos, etc).
  // Solo cobra envío cuando el cliente eligió "Otro barrio".
  if (currentZone === 'pilar') {
    var barrioEl = $id('f-pilar-barrio');
    var val = barrioEl ? barrioEl.value : '';
    return val === '__otro__' ? z.envio : 0;
  }
  return z.envio;
}
function pilarIsOtroBarrio() {
  if (currentZone !== 'pilar') return false;
  var el = $id('f-pilar-barrio');
  return !!(el && el.value === '__otro__');
}
function discountsActive() {
  if (currentZone === 'clubes') return false;
  // En Pilar solo hay descuentos cuando el cliente eligió "Otro barrio"
  if (currentZone === 'pilar' && !pilarIsOtroBarrio()) return false;
  return true;
}
function getCashDiscount() {
  if (!discountsActive()) return 0;
  const total = cartTotal();
  const sel = document.querySelector('input[name="pago"]:checked');
  const isCash = sel && sel.value === 'Efectivo';
  const isBulk = total >= 100000;
  if (isCash || isBulk) return Math.round(total * 0.10);
  return 0;
}
function getDiscountLabel() {
  if (!discountsActive()) return '';
  const sel = document.querySelector('input[name="pago"]:checked');
  const isCash = sel && sel.value === 'Efectivo';
  const isBulk = cartTotal() >= 100000;
  if (isCash) return '10% OFF Efectivo';
  if (isBulk) return '10% OFF (+$100K)';
  return '';
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
  var cur = sel.value;
  sel.innerHTML = '<option value="">Elegí tu barrio privado</option>';
  // Todos los barrios cubiertos por vendedores activos (ordenados)
  var all = [];
  vendedoresRed.forEach(v => (v.barrios || []).forEach(b => { if (all.indexOf(b) === -1) all.push(b); }));
  all.sort();
  all.forEach(b => {
    sel.innerHTML += '<option value="' + b + '">' + b + '</option>';
  });
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
  updatePilarVendedorLabel();
  updatePilarDiasEntrega();
  updatePromoBar();
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
  // Si ya tenía fecha guardada y aún es vigente, no volver a preguntar.
  // Si no, avanzar al paso 2 (fecha) en el mismo modal.
  if (!_loadSavedDate()) {
    welcomeShowDateStep();
  } else {
    _setOverlay(false);
    window.scrollTo(0, 0);
  }
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
function welcomeShowZoneStep() {
  $id('loc-step-zone').style.display = '';
  $id('loc-step-date').style.display = 'none';
}
function welcomeShowDateStep() {
  $id('loc-step-zone').style.display = 'none';
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
    return '<button type="button" class="loc-date-card' + (isNext ? ' next' : '') + '"'
         + ' onclick="setDeliveryDate(\'' + d.iso + '\',\'' + d.dayName + '\')"'
         + ' aria-label="' + d.dayName + ' ' + d.dayNum + ' de ' + d.monthShort + '">'
         + '<span class="dc-day">' + d.dayShort + '</span>'
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
  var feriados = FERIADOS_BLOQUEADOS[zone] || [];
  var extras = ENTREGAS_EXTRA[zone] || [];

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
    // Si la entrega ya empezó / faltan <2hs, saltar
    var startMs = _deliveryStartMs(iso);
    if (startMs && (startMs - Date.now()) < 2 * 3600 * 1000) continue;
    var inThisWeek = d.getTime() < nextMonday.getTime();
    // Filtro de restricción Pilar: solo Vie en thisWeek (las extras también pasan)
    if (pilarRestricted && inThisWeek && dayName !== 'Viernes' && !isExtra) continue;
    // timeRange: usar el de extra si aplica, sino el del horario normal
    var timeRange;
    if (isExtra) {
      var ex = extras.filter(function(e) { return e.iso === iso; })[0];
      timeRange = (ex && ex.timeRange) || '19 a 21 hs';
    } else {
      timeRange = (z.horarios[dayName] || '').replace(/\s*hs/g,'hs');
    }
    var item = {
      iso: iso,
      dayName: dayName,
      dayShort: DAY_NAMES_SHORT[d.getUTCDay()],
      dayNum: d.getUTCDate(),
      monthShort: MONTH_SHORT[d.getUTCMonth()],
      timeRange: timeRange,
      isExtra: isExtra
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
  // Si Pilar, re-render dropdown de barrios por si ya llegaron vendedores
  if (currentZone === 'pilar') renderPilarBarrios();
  // Días de entrega (calendario 14 días)
  $id('f-dia').value = '';
  if ($id('f-dia-fecha')) $id('f-dia-fecha').value = '';
  renderDayPicker();
  // Promo bar: ocultar si no hay descuentos activos (clubes, o pilar sin "Otro barrio")
  updatePromoBar();
  // Limpiar carrito al cambiar zona (productos/precios cambian)
  cart = {};
  // Ocultar último pedido (se re-evalúa con loadLastOrder)
  var repeatBlock = $id('repeat-block');
  if (repeatBlock) repeatBlock.style.display = 'none';
  // Re-render catálogo y nav con productos de la zona
  renderCatalog();
  renderCatNav();
  updateCatNavTop();
  updateUI();
  updateStockDisplay();
  loadLastOrder();
}

/* ── RENDER CATÁLOGO ── */
function renderCatalog() {
  const cats = getActiveCategories();
  const prods_all = getActiveProducts();
  $id('catalog-root').innerHTML = cats.map(cat => {
    const prods = prods_all.filter(p => p.cat === cat.nombre).sort((a,b) => (b.top?1:0) - (a.top?1:0));
    if (!prods.length) return '';
    return '<section class="cat-section"><div class="cat-header">' +
      '<div class="cat-title"><span>' + cat.icono + '</span>' + cat.nombre + '</div>' +
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
  }).join('');
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
  const limited = isStockLimited();
  const avail = stockMap[id];
  const sinStock = limited && avail !== undefined && avail === 0;
  const atLimit = limited && avail !== undefined && qty >= avail;
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
      (atLimit ? '<span style="display:block;text-align:center;font-size:.75rem;color:#c0392b;margin-top:4px;font-weight:600;">Máximo disponible: ' + avail + '</span>' : '');
  }
}

/* ── CARRITO ── */
function modifyCart(id, delta) {
  const current = cart[id] || 0;
  if (delta > 0 && isStockLimited()) {
    const avail = stockMap[id];
    if (avail !== undefined && current >= avail) {
      toast('⚠️ Stock limitado — solo hay ' + avail + ' disponible' + (avail !== 1 ? 's' : ''), 3000);
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

function updateUI() {
  const count = cartCount(), subtotal = cartTotal(), discount = getCashDiscount(), shipping = getShipping(), total = subtotal - discount + shipping;
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
    bodyEl.innerHTML = Object.entries(cart).map(([id,qty]) => {
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
    $id('cart-subtotal').textContent = ars(subtotal);
    const discRow = $id('cart-discount-row');
    if (discount > 0) { discRow.style.display = ''; discRow.querySelector('span').textContent = getDiscountLabel(); $id('cart-discount').textContent = '-' + ars(discount); }
    else { discRow.style.display = 'none'; }
    $id('cart-shipping').textContent = shipping === 0 ? 'Gratis' : ars(shipping);
    $id('cart-total').textContent = ars(total);

    // Incentivo inteligente
    var incentiveEl = $id('cart-incentive');
    if (incentiveEl && discountsActive()) {
      var falta = 100000 - subtotal;
      var sel = document.querySelector('input[name="pago"]:checked');
      var isCash = sel && sel.value === 'Efectivo';
      var yaDescuento = discount > 0;

      if (yaDescuento) {
        // Ya tiene descuento — felicitarlo
        incentiveEl.innerHTML = '<strong>🎉 ¡Descuento aplicado!</strong><br>Estás ahorrando <strong>' + ars(discount) + '</strong>';
        incentiveEl.style.display = '';
      } else if (falta > 0 && falta <= 40000 && subtotal >= 60000) {
        // Cerca de $100K — incentivar a llegar
        incentiveEl.innerHTML = '🔥 Estás a <strong>' + ars(falta) + '</strong> de tener <strong>10% OFF</strong> por superar los $100.000' +
          (!isCash ? '<div class="incentive-cash">💵 También podés pagar en efectivo y tener 10% OFF</div>' : '');
        incentiveEl.style.display = '';
      } else if (!isCash && subtotal > 0 && subtotal < 60000) {
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
  updateFormSummary();
  updatePagoHint();
}

function updateFormSummary() {
  const el = $id('form-summary'), count = cartCount();
  if (count === 0) { el.innerHTML = '<p class="summary-empty">Agregá productos para ver el resumen.</p>'; return; }
  const subtotal = cartTotal(), discount = getCashDiscount(), shipping = getShipping(), total = subtotal - discount + shipping;
  el.innerHTML = Object.entries(cart).map(([id,qty]) => {
    const p = PROD_MAP[id];
    if (!p) return '';
    return '<div class="summary-line"><span>' + p.nombre + ' <strong>×' + qty + '</strong></span><span>' + ars(p.precio*qty) + '</span></div>';
  }).join('') +
    (discount > 0 ? '<div class="summary-line discount-line"><span>' + getDiscountLabel() + '</span><span>-' + ars(discount) + '</span></div>' : '') +
    '<div class="summary-line shipping-line"><span>Envío</span><span>' + (shipping === 0 ? 'Gratis' : ars(shipping)) + '</span></div>' +
    '<div class="summary-line total-line"><span>Total</span><span>' + ars(total) + '</span></div>';
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

  // Corte Pilar: el Viernes de esta semana se bloquea si ya pasó el cutoff.
  //   - Barrio con vendedor Red asignado → cutoff Jueves 13:00 (el vendedor
  //     necesita margen para preparar y repartir).
  //   - Barrio "Otro" o sin vendedor Red → cutoff Jueves 21:00 (Tadeo reparte
  //     él mismo al día siguiente, tiene toda la tarde del Jue para coordinar).
  // En ambos casos, Viernes y Sábado completos también lo bloquean.
  var redCutoffFriday = null;
  if (currentZone === 'pilar') {
    var barrioEl = $id('f-pilar-barrio');
    var barrioVal = barrioEl ? barrioEl.value : '';
    var tieneVendedor = barrioVal && barrioVal !== '__otro__' && barrioToVendedor[barrioVal.toLowerCase()];
    // Solo aplica si el cliente ya eligió barrio (con o sin vendedor). Si no
    // eligió todavía, dejamos el picker como estaba para no confundir.
    if (barrioVal) {
      var cutoffHour = tieneVendedor ? 13 : 21;
      var nowAR = new Date(new Date().getTime() - 3 * 3600 * 1000);
      var arDow = nowAR.getUTCDay(); // 0=Dom..6=Sáb (hora Argentina)
      var arHour = nowAR.getUTCHours();
      var bloquear = (arDow === 4 && arHour >= cutoffHour) || arDow === 5 || arDow === 6;
      if (bloquear) {
        // Calcular el Viernes de esta semana (lunes=0 en 'monday', viernes = +4 días)
        var fri = new Date(monday);
        fri.setUTCDate(monday.getUTCDate() + 4);
        redCutoffFriday = fri.getTime();
      }
    }
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
  const subtotal = cartTotal(), discount = getCashDiscount(), shipping = getShipping(), total = subtotal - discount + shipping;

  const prodLines = Object.entries(cart).map(([id,qty]) => {
    const p = PROD_MAP[id]; if (!p) return null;
    return '  • ' + p.nombre + (qty > 1 ? ' ×' + qty : '') + '  —  ' + ars(p.precio * qty);
  }).filter(Boolean).join('\n');

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
  var msgLines = ['Hola! Quiero hacer un pedido:', '', prodLines, ''];
  // Solo desglosar Subtotal cuando hay descuento o envío. Si Total = Subtotal, mostrar solo Total.
  if (discount > 0 || shipping > 0) {
    msgLines.push('Subtotal: ' + ars(subtotal));
    if (discount > 0) msgLines.push(getDiscountLabel() + ': -' + ars(discount));
    if (shipping > 0) msgLines.push('Envio: ' + ars(shipping));
  }
  msgLines.push('*Total: ' + ars(total) + '*');
  var msg = msgLines.join('\n');

  const urlText = encodeURIComponent(msg);

  // Registrar en Google Sheets
  const items = Object.entries(cart).map(([id,qty]) => {
    const p = PROD_MAP[id]; return p ? {id:p.id, nombre:p.nombre, qty, precio:p.precio} : null;
  }).filter(Boolean);

  let postData;
  if (currentZone === 'clubes') {
    postData = {
      canal: 'Clubes',
      fecha: new Date().toLocaleString('es-AR'),
      nombre, telefono, club, deporte, grupo,
      dia: diaSheets, horario, fechaEntrega: fechaISO, pago: pagoEl.value,
      envio: shipping, items, total,
      subtotalSinDescuento: subtotal, descuento: discount
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
      subtotalSinDescuento: subtotal, descuento: discount
    };
  }
  _sendWithRetry(postData, 3);
  _track('purchase', { value: total, zone: currentZone, items: cartCount(), discount: discount, payment: pagoEl.value, vendedor: vendedorMatch ? vendedorMatch.nombre : '' });

  // Confirmación visual rápida → WhatsApp (al vendedor si aplica, sino a Maleu)
  _enviando = true;
  const waTarget = vendedorMatch ? vendedorMatch.wa : WA_NUMBER;
  const waBtn = document.querySelector('.whatsapp-btn');
  const waBtnOrig = waBtn ? waBtn.innerHTML : '';
  if (waBtn) { waBtn.disabled = true; waBtn.innerHTML = '✓ Pedido registrado'; waBtn.style.background = '#2e7d32'; }
  setTimeout(function() {
    window.location.href = 'https://wa.me/' + waTarget + '?text=' + urlText;
  }, 800);

  setTimeout(() => {
    cart = {}; updateUI();
    getActiveProducts().forEach(p => renderCardFooter(p.id));
    $id('f-dia').value = '';
    if ($id('f-dia-fecha')) $id('f-dia-fecha').value = '';
    onDiaChange();
    renderDayPicker();
    document.querySelectorAll('input[name="pago"]').forEach(r => r.checked = false);
    if (waBtn) { waBtn.disabled = false; waBtn.innerHTML = waBtnOrig; waBtn.style.background = ''; }
    _enviando = false;
    updateFormVisibility();
    // Volver al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 1800);
}

/* ── RETRY + BACKUP ── */
function _sendWithRetry(data, retries) {
  fetch(APPS_SCRIPT_URL, {
    method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'},
    body: JSON.stringify(data)
  }).catch(function() {
    if (retries > 1) {
      setTimeout(function() { _sendWithRetry(data, retries - 1); }, 2000);
    } else {
      try {
        var pending = JSON.parse(localStorage.getItem('maleu_pending_orders') || '[]');
        pending.push({ data: data, ts: Date.now() });
        localStorage.setItem('maleu_pending_orders', JSON.stringify(pending));
      } catch(e) {}
    }
  });
}
function _retryPendingOrders() {
  try {
    var pending = JSON.parse(localStorage.getItem('maleu_pending_orders') || '[]');
    if (pending.length === 0) return;
    var order = pending.shift();
    localStorage.setItem('maleu_pending_orders', JSON.stringify(pending));
    _sendWithRetry(order.data, 2);
  } catch(e) {}
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
  nav.innerHTML = '<div class="cat-nav-inner" id="cat-nav-inner">' +
    cats.map((cat,i) => {
      const slug = slugify(cat.nombre);
      return '<button class="cat-nav-btn' + (i===0?' active':'') + '" data-slug="' + slug + '" onclick="scrollToCat(\'' + slug + '\')">' +
        '<span>' + cat.icono + '</span> ' + cat.nombre + '</button>';
    }).join('') + '</div>';
  document.querySelectorAll('.cat-section').forEach((section,i) => {
    const cat = getActiveCategories()[i]; if (!cat) return;
    section.id = 'cat-' + slugify(cat.nombre);
  });
  const observer = new IntersectionObserver(entries => {
    if (_scrollingToCat) return;
    entries.forEach(entry => { if (entry.isIntersecting) setActiveNav(entry.target.id.replace('cat-','')); });
  }, { rootMargin:'-20% 0px -70% 0px', threshold:0 });
  document.querySelectorAll('.cat-section').forEach(s => observer.observe(s));
}
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
  const header = document.querySelector('header'), nav = $id('cat-nav'), promo = $id('promo-bar');
  if (header && nav) {
    nav.style.top = header.offsetHeight + 'px';
    const promoTop = header.offsetHeight + nav.offsetHeight;
    if (promo) promo.style.top = promoTop + 'px';
    const total = promoTop + (promo ? promo.offsetHeight : 0);
    document.querySelectorAll('.cat-section').forEach(s => { s.style.scrollMarginTop = total + 'px'; });
  }
}

/* ── STOCK ── */
async function fetchStock() {
  try {
    const bust = '?action=stock&_=' + Date.now();
    const res = await fetch(APPS_SCRIPT_URL + bust, { cache: 'no-store' });
    const abbrStock = await res.json();
    PRODUCTOS.forEach(p => { const abbr=PROD_ABBR[p.id]; if(abbr&&abbrStock[abbr]!==undefined) stockMap[p.id]=abbrStock[abbr]; });
    if (isStockLimited()) {
      let ajustado = false;
      Object.entries(cart).forEach(([id,qty]) => {
        const avail=stockMap[id];
        if(avail!==undefined&&qty>avail){if(avail===0)delete cart[id];else cart[id]=avail;ajustado=true;renderCardFooter(id);}
      });
      if(ajustado){updateUI();toast('⚠️ Tu carrito fue ajustado por stock disponible');}
    }
    updateStockDisplay();
    loadLastOrder();
  } catch(e) { console.warn('fetchStock:',e); }
}
function updateStockDisplay() {
  const limited = isStockLimited();
  const infoMode = isStockInfoMode();
  const showStock = limited || infoMode || (currentZone && ZONAS[currentZone] && ZONAS[currentZone].showStock);
  PRODUCTOS.forEach(p => {
    const el=$id('stock-'+p.id), avail=stockMap[p.id]; if(!el) return;
    if (!showStock || avail===undefined) { el.innerHTML=''; }
    else if(avail===0 && limited) el.innerHTML='<span class="stock-badge stock-out">Sin stock</span>';
    else if(avail===0 && infoMode) el.innerHTML='<span class="stock-badge stock-info">Hoy: 0 en stock · Pedís para fecha futura ✓</span>';
    else if(avail===0 && !limited) el.innerHTML='<span class="stock-badge stock-order">A pedido</span>';
    else if(avail<=3 && limited) el.innerHTML='<span class="stock-badge stock-low">Últimas '+avail+' unidades</span>';
    else if(avail<=5 && infoMode) el.innerHTML='<span class="stock-badge stock-info">Hoy hay '+avail+' en stock · Pedís más para fecha futura ✓</span>';
    else el.innerHTML='';
    renderCardFooter(p.id);
  });
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
  } else if (_loadSavedDate()) {
    // Tiene fecha vigente → todo listo.
    _setOverlay(false);
  } else {
    // Falta fecha → abrir el modal directamente en paso 2.
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
let _stockTimer = setInterval(fetchStock, 60000);
document.addEventListener('visibilitychange', () => {
  if(document.hidden){clearInterval(_stockTimer);_stockTimer=null;}
  else{fetchStock();_stockTimer=setInterval(fetchStock,60000);}
});

// Float cart visibility
const _formObs = new IntersectionObserver(([entry]) => { _formVisible = entry.isIntersecting; updateUI(); }, {threshold:0.3});
_formObs.observe(document.querySelector('.form-section'));

/* ══════════════════════════════════════════════════
   FEATURES FRIZATA-INSPIRED
   ══════════════════════════════════════════════════ */

/* ── BARRA ENVÍO GRATIS ── */
const FREE_SHIPPING_MIN = 25000; // envío gratis desde $25.000 (solo aplica para zona pilar)
function updatePromoBar() {
  var bar = $id('promo-bar');
  if (!bar) return;
  bar.style.display = discountsActive() ? '' : 'none';
}
function updatePagoHint() {
  var hint = $id('pago-hint');
  if (!hint) return;
  var sel = document.querySelector('input[name="pago"]:checked');
  var isCash = sel && sel.value === 'Efectivo';
  // Mostrar solo si hay descuentos activos Y no eligió efectivo todavía
  hint.style.display = (discountsActive() && !isCash) ? '' : 'none';
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
