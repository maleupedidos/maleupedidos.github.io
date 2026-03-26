/* ══════════════════════════════════════════════════
   MALEU — PILAR GLOBAL
   Unifica Home + Delivery en una sola web
   ══════════════════════════════════════════════════ */

/* ── PRODUCTOS ── */
const PRODUCTOS = [
  { id:1,  cat:"Pizzas Premium",   nombre:"Pizza Margarita",              desc:"Tomate fresco, mozzarella y albahaca. La que nunca falla.",                        precio:11000, precioSuper:14500, img:"pizza-margarita-cocida.jpg", imgPack:"pizza-margarita.jpg", emoji:"🍕", top:true, chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:2,  cat:"Pizzas Premium",   nombre:"Pizza Jamón y Queso",           desc:"Mucho jamón, mucho queso. Simple, efectiva y sin dramas.",                        precio:11000, precioSuper:14500, img:"pizza-jamon-queso-cocida.jpg", imgPack:"pizza-jamon-queso-p.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:3,  cat:"Pizzas Premium",   nombre:"Pizza Cebolla Caramelizada",    desc:"Cebolla bien dulce con queso cremoso. Para los que saben.",                       precio:11000, precioSuper:14500, img:"pizza-cebolla-cocida.jpg", imgPack:"pizza-cebolla-p.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:4,  cat:"Pizzas Premium",   nombre:"Pizza Jamón y Morrón",          desc:"Con jamón, morrón rojo y orégano. Completa y sabrosa.",                           precio:12000, precioSuper:15500, img:"pizza-jamon-morron-cocida.jpg", imgPack:"pizza-jamon-morron.jpg", emoji:"🍕", chips:["Para 1–2 personas","1 pizza grande","Al horno en 12 min"] },
  { id:5,  cat:"Pizzas Clásicas",  nombre:"Pack Muzarella x2",             desc:"Dos pizzas de muzzarella. Cena resuelta para toda la semana.",                   precio:16000, precioSuper:22000, img:"pack-muzarella-cocida.jpg", imgPack:"pack-muzarella.jpg", emoji:"🍕", top:true, chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:6,  cat:"Pizzas Clásicas",  nombre:"Pack Jamón y Queso x2",         desc:"Dos pizzas de jamón y queso. Una para hoy, una para cuando querás.",             precio:16000, precioSuper:22000, img:"pack-jamon-queso-cocida.jpg", imgPack:"pack-jamon-queso.jpg", emoji:"🍕", chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:7,  cat:"Pizzas Clásicas",  nombre:"Pack Cebolla y Queso x2",       desc:"Dos pizzas con cebolla caramelizada. Guardá una para mañana.",                   precio:16000, precioSuper:22000, img:"pack-cebolla-queso-cocida.jpg", imgPack:"pack-cebolla-queso.jpg", emoji:"🍕", chips:["Para 3–4 personas","2 pizzas grandes","Al horno en 12 min"] },
  { id:8,  cat:"Sorrentinos",      nombre:"Sorrentinos Cordero al Malbec", desc:"Cordero, zanahoria, apio, cebolla y especias. Distinto y muy rico.",             precio:17500, precioSuper:23000, img:"sorrentinos-plato.jpg", imgPack:"sorrentinos-cordero.jpg", emoji:"🍝", chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:9,  cat:"Sorrentinos",      nombre:"Sorrentinos Jamón y Queso",     desc:"Relleno cremoso y generoso. El favorito de la familia.",                         precio:16300, precioSuper:21000, img:"sorrentinos-plato.jpg", imgPack:"sorrentinos-jamon.jpg", emoji:"🍝", top:true, chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:10, cat:"Sorrentinos",      nombre:"Sorrentinos Calabaza y Queso",  desc:"Suave, dulce y sabroso. Relleno cremoso de calabaza y queso.",                   precio:14700, precioSuper:19000, img:"sorrentinos-plato.jpg", imgPack:"sorrentinos-calabaza.jpg", emoji:"🍝", chips:["Para 2–3 personas","600g · 16 unidades","Listos en 4 min"] },
  { id:11, cat:"Empanadas",        nombre:"Empanadas Carne a Cuchillo x8", desc:"Carne cortada a cuchillo, jugosa y bien condimentada. Las que piden todos.",     precio:18800, precioSuper:24000, img:"empanadas-cocidas.jpg", imgPack:"empanadas-carne.jpg", emoji:"🥟", top:true, chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:12, cat:"Empanadas",        nombre:"Empanadas Jamón y Queso x8",    desc:"Cremosas por dentro, doraditas por fuera. Para cualquier momento.",              precio:16000, precioSuper:20000, img:"empanadas-cocidas.jpg", imgPack:"empanadas-jamon.jpg", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:17, cat:"Empanadas",        nombre:"Empanadas Cebolla y Queso x8",  desc:"Cebolla caramelizada con queso derretido. Sabor dulce y cremoso.",               precio:16000, precioSuper:20000, img:"empanadas-cocidas.jpg", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:18, cat:"Empanadas",        nombre:"Empanadas Verdura x8",          desc:"Relleno de verdura fresca y queso. Livianas y riquísimas.",                      precio:16000, precioSuper:20000, img:"empanadas-cocidas.jpg", emoji:"🥟", chips:["Para 2–4 personas","8 empanadas","Al horno hasta dorar"] },
  { id:13, cat:"Postres & Tortas", nombre:"Franui Leche",                  desc:"Frambuesas bañadas en chocolate con leche y blanco. El cierre perfecto.",        precio:8000,  precioSuper:11000, img:"franui.jpg", emoji:"🍫", chips:["Para 2–3 personas","Listo para servir"] },
  { id:14, cat:"Postres & Tortas", nombre:"Torta Golosa",                  desc:"Masa de chocolate, dulce de leche, mousse de chocolate y almendras acarameladas.", precio:24000, precioSuper:32000, img:"torta-golosa.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
  { id:15, cat:"Postres & Tortas", nombre:"Torta Lemon Crumble",           desc:"Base sablée, relleno de limón y crumble crocante espolvoreado.",                 precio:24000, precioSuper:32000, img:"torta-lemon.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
  { id:16, cat:"Postres & Tortas", nombre:"Torta Coco",                    desc:"Base crocante, dulce de leche y relleno de coco. Generosa y sin vueltas.",       precio:24000, precioSuper:32000, img:"torta-coco.jpg", emoji:"🎂", chips:["Para 8–10 personas","Torta entera","Lista para cortar y servir"] },
];

const CATEGORIAS = [
  { nombre:"Pizzas Premium",   icono:"🍕", nota:"Pre-cocidas · Listas en minutos · Al horno directo desde el freezer" },
  { nombre:"Pizzas Clásicas",  icono:"🍕", nota:"Pack de 2 unidades · Perfectas para tener siempre a mano" },
  { nombre:"Sorrentinos",      icono:"🍝", nota:"600g · 16 unidades · Rinde 3 porciones · Solo 4 minutos de cocción", tip:"Hervir agua · Agregar sorrentinos · 4 min con olla destapada · Retirar con espumadera y servir" },
  { nombre:"Empanadas",        icono:"🥟", nota:"x8 unidades · Congeladas, listas para el horno · Cocinar hasta dorar" },
  { nombre:"Postres & Tortas", icono:"🎂", nota:"Para cerrar bien la noche" },
];

/* ── ZONAS ── */
const ZONAS = {
  estancias: {
    nombre: "Estancias del Pilar",
    envio: 0,
    canal: "Home",
    horarios: { "Lunes":"19 a 21 hs", "Miércoles":"19 a 21 hs", "Viernes":"19 a 21 hs", "Sábado":"19 a 21 hs", "Domingo":"11 a 13 hs" },
    deliveryText: "📅 Entregas: Lun · Mié · Vie · Sáb 19–21 hs · Dom 11–13 hs"
  },
  pilar: {
    nombre: "Resto de Pilar",
    envio: 3000,
    canal: "Delivery",
    horarios: { "Miércoles":"A coordinar" },
    deliveryText: "📅 Entregas: Miércoles (pedí hasta el martes al mediodía)"
  }
};

const WA_NUMBER = "5491155038905";
// TODO: conectar con Sheets cuando Pilar Global esté en producción
const APPS_SCRIPT_URL = "";
const STOCK_CSV_URL = '';

/* ── ESTADO ── */
let cart = {};
let currentZone = null; // 'estancias' | 'pilar'
let stockMap = {};
let _enviando = false;
let _formVisible = false;
const PROD_MAP = {}; PRODUCTOS.forEach(p => PROD_MAP[p.id] = p);

const PROD_ABBR = {
  5:'PPM', 6:'PPJyQ', 7:'PPCyQ',
  8:'SCo', 9:'SJyQ', 10:'SCa',
  11:'ECaC', 12:'EJyQ', 17:'ECyQ', 18:'EV',
  14:'TG', 15:'TLC', 16:'TC', 13:'F',
  1:'PMa', 2:'PJyQ', 3:'PCC', 4:'PJyM',
};

/* ── HELPERS ── */
function $id(id) { return document.getElementById(id); }
function ars(n) { return '$' + n.toLocaleString('es-AR'); }
function cartTotal() { return Object.entries(cart).reduce((s,[id,q]) => { const p=PROD_MAP[+id]; return s+(p?p.precio*q:0); }, 0); }
function cartCount() { return Object.values(cart).reduce((a,b)=>a+b, 0); }
function getShipping() {
  if (!currentZone) return 0;
  if (currentZone === 'estancias') return 0;
  if (cartTotal() >= 25000) return 0; // envío gratis desde $25.000
  return ZONAS[currentZone].envio;
}
function slugify(str) {
  return str.toLowerCase().replace(/[áäâà]/g,'a').replace(/[éëêè]/g,'e').replace(/[íïîì]/g,'i').replace(/[óöôò]/g,'o').replace(/[úüûù]/g,'u').replace(/ñ/g,'n').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
}

/* ── ZONA ── */
function setZone(zone) {
  currentZone = zone;
  localStorage.setItem('maleu_zone', zone);
  $id('loc-overlay').classList.add('hidden');
  applyZone();
}
function showZoneModal() {
  $id('loc-overlay').classList.remove('hidden');
}
function applyZone() {
  const z = ZONAS[currentZone];
  // Chip
  $id('zone-chip').textContent = '📍 ' + z.nombre;
  // Hero delivery text
  $id('hero-delivery').textContent = z.deliveryText;
  // Form fields
  $id('fields-estancias').style.display = currentZone === 'estancias' ? '' : 'none';
  $id('fields-pilar').style.display = currentZone === 'pilar' ? '' : 'none';
  // Días de entrega
  const diaSelect = $id('f-dia');
  diaSelect.innerHTML = '<option value="">Elegí un día</option>';
  Object.keys(z.horarios).forEach(dia => {
    diaSelect.innerHTML += '<option value="' + dia + '">' + dia + '</option>';
  });
  updateUI();
}

/* ── RENDER CATÁLOGO ── */
function renderCatalog() {
  $id('catalog-root').innerHTML = CATEGORIAS.map(cat => {
    const prods = PRODUCTOS.filter(p => p.cat === cat.nombre).sort((a,b) => (b.top?1:0) - (a.top?1:0));
    if (!prods.length) return '';
    return '<section class="cat-section"><div class="cat-header">' +
      '<div class="cat-title"><span>' + cat.icono + '</span>' + cat.nombre + '</div>' +
      '<div class="cat-nota">' + cat.nota + '</div>' +
      (cat.tip ? '<div class="cat-tip">🍳 ' + cat.tip + '</div>' : '') +
      '</div><div class="products-grid">' +
      prods.map(p => '<article class="product-card" data-id="' + p.id + '">' +
        '<div class="product-thumb">' +
          '<img class="product-thumb-img" src="img/' + p.img + '" alt="' + p.nombre + '" loading="lazy" width="400" height="400" onerror="this.style.display=\'none\'">' +
        '</div>' +
        '<div class="product-body">' +
          (p.top ? '<span class="product-top-badge">⭐ Lo más pedido</span>' : '') +
          (p.precioSuper ? '<span class="savings-badge">Ahorrás ' + Math.round((1-p.precio/p.precioSuper)*100) + '% vs súper</span>' : '') +
          '<h3 class="product-name">' + p.nombre + '</h3>' +
          '<p class="product-desc">' + p.desc + '</p>' +
          (p.chips ? '<div class="product-chips">' + p.chips.map(c => '<span class="chip">' + c + '</span>').join('') + '</div>' : '') +
          '<span class="stock-indicator" id="stock-' + p.id + '"></span>' +
          '<div class="product-footer">' +
            '<span class="product-price">' + ars(p.precio) + '</span>' +
            '<button class="add-btn" onclick="addToCart(' + p.id + ')">+ Agregar</button>' +
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
  const p = PROD_MAP[+id];
  if (!p) return;
  const qty = cart[id] || 0;
  const avail = stockMap[+id];
  const sinStock = avail !== undefined && avail === 0;
  const atLimit = avail !== undefined && qty >= avail;
  if (qty === 0) {
    footer.innerHTML = '<span class="product-price">' + ars(p.precio) + '</span>' +
      '<button class="add-btn" onclick="addToCart(' + p.id + ')"' + (sinStock ? ' disabled' : '') + '>' +
      (sinStock ? 'Sin stock' : '+ Agregar') + '</button>';
  } else {
    footer.innerHTML = '<span class="product-price">' + ars(p.precio) + '</span>' +
      '<div class="card-qty-controls">' +
        '<button class="card-qty-btn remove" onclick="cardChangeQty(' + p.id + ',-1)">−</button>' +
        '<span class="card-qty-val">' + qty + '</span>' +
        '<button class="card-qty-btn" onclick="cardChangeQty(' + p.id + ',+1)"' + (atLimit ? ' disabled' : '') + '>+</button>' +
      '</div>';
  }
}

/* ── CARRITO ── */
function modifyCart(id, delta) {
  const current = cart[id] || 0;
  if (delta > 0) {
    const avail = stockMap[+id];
    if (avail !== undefined && current >= avail) { toast('⚠️ No hay más stock'); return; }
  }
  const newQty = current + delta;
  if (newQty <= 0) delete cart[id];
  else cart[id] = newQty;
  updateUI();
  renderCardFooter(id);
  updateFormVisibility();
}
function addToCart(id) {
  modifyCart(id, 1);
  const p = PROD_MAP[id];
  toast('✓ ' + p.nombre + ' agregado');
  const badge = $id('cart-badge');
  badge.classList.remove('bounce');
  void badge.offsetWidth;
  badge.classList.add('bounce');
}
function changeQty(id, delta) { modifyCart(id, delta); }
function cardChangeQty(id, delta) { modifyCart(id, delta); }

function updateUI() {
  const count = cartCount(), subtotal = cartTotal(), shipping = getShipping(), total = subtotal + shipping;
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
      const p = PROD_MAP[+id];
      if (!p) return '';
      return '<div class="cart-item">' +
        '<span class="cart-item-emoji">' + p.emoji + '</span>' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + p.nombre + '</div>' +
          '<div class="cart-item-sub">' + ars(p.precio) + ' c/u · <strong>' + ars(p.precio*qty) + '</strong></div>' +
        '</div>' +
        '<div class="qty-controls">' +
          '<button class="qty-btn" onclick="changeQty(' + id + ',-1)">−</button>' +
          '<span class="qty-val">' + qty + '</span>' +
          '<button class="qty-btn" onclick="changeQty(' + id + ',+1)">+</button>' +
        '</div>' +
      '</div>';
    }).join('');
    // Ahorro vs supermercado
    const ahorroTotal = Object.entries(cart).reduce((s,[id,qty]) => {
      const p = PROD_MAP[+id]; return s + (p && p.precioSuper ? (p.precioSuper - p.precio) * qty : 0);
    }, 0);
    const savingsEl = $id('cart-savings');
    if (ahorroTotal > 0) { savingsEl.textContent = '🏷 Ahorrás ' + ars(ahorroTotal) + ' vs supermercado'; savingsEl.classList.remove('hidden'); }
    else { savingsEl.classList.add('hidden'); }
    // Descuento cupón
    const disc = getDiscount(subtotal);
    const discRow = $id('cart-discount-row');
    if (disc > 0) { discRow.style.display = ''; $id('cart-discount').textContent = '-' + ars(disc); }
    else { discRow.style.display = 'none'; }
    $id('cart-subtotal').textContent = ars(subtotal);
    $id('cart-shipping').textContent = shipping === 0 ? 'Gratis' : ars(shipping);
    $id('cart-total').textContent = ars(subtotal - disc + shipping);
  }
  updateFormSummary();
}

function updateFormSummary() {
  const el = $id('form-summary'), count = cartCount();
  if (count === 0) { el.innerHTML = '<p class="summary-empty">Agregá productos para ver el resumen.</p>'; return; }
  const subtotal = cartTotal(), shipping = getShipping(), total = subtotal + shipping;
  const disc = getDiscount(subtotal);
  el.innerHTML = Object.entries(cart).map(([id,qty]) => {
    const p = PROD_MAP[+id];
    if (!p) return '';
    return '<div class="summary-line"><span>' + p.nombre + ' <strong>×' + qty + '</strong></span><span>' + ars(p.precio*qty) + '</span></div>';
  }).join('') +
    (disc > 0 ? '<div class="summary-line" style="color:#2E7D32"><span>Descuento</span><span>-' + ars(disc) + '</span></div>' : '') +
    '<div class="summary-line shipping-line"><span>Envío</span><span>' + (shipping === 0 ? 'Gratis' : ars(shipping)) + '</span></div>' +
    '<div class="summary-line total-line"><span>Total</span><span>' + ars(subtotal - disc + shipping) + '</span></div>';
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
  const section = $id('form-section');
  if (section) section.classList.remove('collapsed');
  setTimeout(() => document.querySelector('.form-wrap').scrollIntoView({behavior:'smooth'}), 320);
}

/* ── DÍA / HORARIO ── */
function onDiaChange() {
  const dia = $id('f-dia').value;
  const hint = $id('horario-hint');
  const z = ZONAS[currentZone];
  if (dia && z && z.horarios[dia]) {
    hint.textContent = 'Horario: ' + z.horarios[dia];
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
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
  if (campo==='telefono') { $id('f-telefono').value.replace(/\D/g,'').length >= 8 ? clearError('f-telefono','err-telefono') : showError('f-telefono','err-telefono'); }
  if (campo==='dia') { $id('f-dia').value ? clearError('f-dia','err-dia') : showError('f-dia','err-dia'); }
}
function filtrarSubBarrios() {
  const privado = $id('f-barrio-privado').value;
  const subField = $id('field-sub-barrio');
  const subSel = $id('f-barrio');
  subSel.value = '';
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
  const horario = z.horarios[dia] || '';
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
  } else {
    clearError('f-direccion','err-direccion');
  }

  // Validar stock
  let stockProblems = [];
  Object.entries(cart).forEach(([id, qty]) => {
    const avail = stockMap[+id];
    if (avail !== undefined) {
      if (avail === 0) { stockProblems.push(PROD_MAP[+id]?.nombre + ' (sin stock)'); delete cart[id]; }
      else if (qty > avail) { cart[id] = avail; stockProblems.push(PROD_MAP[+id]?.nombre + ' (solo quedan ' + avail + ')'); }
    }
  });
  if (stockProblems.length > 0) { updateUI(); toast('⚠️ Stock actualizado'); return; }

  if (cartCount() === 0) { toast('⚠️ Agregá al menos un producto'); return; }

  // Validar campos
  let primerInvalido = null;
  if (!nombre) { showError('f-nombre','err-nombre'); if(!primerInvalido) primerInvalido=$id('f-nombre'); }

  let barrioPrivado='', barrio='', lote='', direccion='';
  if (currentZone === 'estancias') {
    barrioPrivado = $id('f-barrio-privado').value;
    barrio = barrioPrivado === 'Estancias del Pilar' ? $id('f-barrio').value : barrioPrivado;
    lote = $id('f-lote').value.trim();
    if (!barrioPrivado) { showError('f-barrio-privado','err-barrio-privado'); if(!primerInvalido) primerInvalido=$id('f-barrio-privado'); }
    if (barrioPrivado === 'Estancias del Pilar' && !barrio) { showError('f-barrio','err-barrio'); if(!primerInvalido) primerInvalido=$id('f-barrio'); }
    if (!lote) { showError('f-lote','err-lote'); if(!primerInvalido) primerInvalido=$id('f-lote'); }
  } else {
    direccion = $id('f-direccion').value.trim();
    if (!direccion) { showError('f-direccion','err-direccion'); if(!primerInvalido) primerInvalido=$id('f-direccion'); }
  }

  if ($id('f-telefono').value.replace(/\D/g,'').length < 8) { showError('f-telefono','err-telefono'); if(!primerInvalido) primerInvalido=$id('f-telefono'); }
  if (!dia) { showError('f-dia','err-dia'); if(!primerInvalido) primerInvalido=$id('f-dia'); }
  if (!pagoEl) { $id('err-pago').classList.add('visible'); if(!primerInvalido) primerInvalido=$id('pago-group'); }
  if (primerInvalido) { primerInvalido.scrollIntoView({behavior:'smooth',block:'center'}); return; }

  // Guardar en localStorage
  try {
    const clientData = { nombre, telefono, dia, pago: pagoEl.value, zone: currentZone };
    if (currentZone === 'estancias') { clientData.barrioPrivado = barrioPrivado; clientData.barrio = barrio; clientData.lote = lote; }
    else { clientData.direccion = direccion; }
    localStorage.setItem('maleu_cliente_pg', JSON.stringify(clientData));
    localStorage.setItem('maleu_ultimo_pedido_pg', JSON.stringify(Object.entries(cart).map(([id,qty]) => ({id:+id, qty}))));
  } catch(e) {}

  // Construir mensaje WhatsApp
  const porCat = {};
  Object.entries(cart).forEach(([id,qty]) => {
    const p = PROD_MAP[+id]; if (!p) return;
    if (!porCat[p.cat]) porCat[p.cat] = [];
    porCat[p.cat].push({ nombre:p.nombre, qty, subtotal:p.precio*qty });
  });
  const lineas = Object.entries(porCat).map(([cat,items]) => {
    return '*' + cat + '*\n' + items.map(i => '  · ' + i.nombre + ' ×' + i.qty + ' — ' + ars(i.subtotal)).join('\n');
  }).join('\n\n');

  const subtotal = cartTotal(), disc = getDiscount(subtotal), shipping = getShipping(), total = subtotal - disc + shipping;
  const cantItems = Object.values(cart).reduce((a,b)=>a+b,0);
  const sep = '━━━━━━━━━━━━━━━';
  const plural = cantItems !== 1 ? 's' : '';

  let ubicacionStr;
  if (currentZone === 'estancias') {
    const barrioInfo = barrioPrivado === 'Estancias del Pilar' ? barrioPrivado + ' — ' + barrio : barrioPrivado;
    ubicacionStr = '🏘 *Barrio:* ' + barrioInfo + '\n📍 *Lote:* ' + lote;
  } else {
    ubicacionStr = '📍 *Dirección:* ' + direccion;
  }

  const msgLines = [
    '🧾 *NUEVO PEDIDO — MALEU*',
    '📦 *' + cantItems + ' producto' + plural + '*',
    '', lineas, '',
    sep,
    '*Subtotal: ' + ars(subtotal) + '*',
    (disc > 0 ? '*Descuento (' + activeCoupon + '): -' + ars(disc) + '*' : null),
    '*Envío: ' + (shipping === 0 ? 'Gratis' : ars(shipping)) + '*',
    '*TOTAL: ' + ars(total) + '*',
    sep, '',
    '👤 *Nombre:* ' + nombre,
    ubicacionStr,
    '📞 *Tel:* ' + telefono,
    '📅 *Entrega:* ' + dia + ' · ' + horario,
    '💳 *Pago:* ' + pagoEl.value,
    '', sep, '🧡 _¡Gracias por elegirnos!_',
  ];
  const urlText = encodeURIComponent(msgLines.filter(l => l !== null).join('\n'));

  // Registrar en Google Sheets
  const items = Object.entries(cart).map(([id,qty]) => {
    const p = PROD_MAP[+id]; return p ? {id:p.id, nombre:p.nombre, qty, precio:p.precio} : null;
  }).filter(Boolean);
  fetch(APPS_SCRIPT_URL, {
    method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'},
    body: JSON.stringify({
      canal: z.canal,
      fecha: new Date().toLocaleString('es-AR'),
      nombre, barrioPrivado,
      subBarrio: barrioPrivado === 'Estancias del Pilar' ? barrio : '',
      barrio: currentZone === 'estancias' ? barrio : direccion,
      lote: currentZone === 'estancias' ? lote : direccion,
      telefono, dia, horario,
      pago: pagoEl.value,
      cupon: activeCoupon || '',
      descuento: disc,
      items, total
    })
  }).catch(() => {});

  // Abrir WhatsApp
  _enviando = true;
  const waBtn = document.querySelector('.whatsapp-btn');
  const waBtnOrig = waBtn ? waBtn.innerHTML : '';
  if (waBtn) { waBtn.disabled = true; waBtn.innerHTML = '<span>✓</span> ¡Listo! Abrimos WhatsApp…'; }
  window.location.href = 'https://wa.me/' + WA_NUMBER + '?text=' + urlText;

  setTimeout(() => {
    cart = {}; updateUI();
    PRODUCTOS.forEach(p => renderCardFooter(p.id));
    $id('f-dia').value = ''; onDiaChange();
    document.querySelectorAll('input[name="pago"]').forEach(r => r.checked = false);
    if (waBtn) { waBtn.disabled = false; waBtn.innerHTML = waBtnOrig; }
    _enviando = false;
    updateFormVisibility();
  }, 1800);
}

/* ── TOAST ── */
let _tt;
function toast(msg) { const el=$id('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(_tt); _tt=setTimeout(()=>el.classList.remove('show'),1200); }

/* ── FORM VISIBILITY ── */
function updateFormVisibility() {
  const section = $id('form-section');
  if (!section) return;
  if (cartCount() > 0) section.classList.remove('collapsed');
}
function expandForm() {
  const section = $id('form-section');
  if (section) section.classList.remove('collapsed');
  setTimeout(() => document.querySelector('.form-wrap').scrollIntoView({behavior:'smooth'}), 50);
}

/* ── CAT NAV ── */
function renderCatNav() {
  const nav = $id('cat-nav');
  if (!nav) return;
  nav.innerHTML = '<div class="cat-nav-inner" id="cat-nav-inner">' +
    CATEGORIAS.map((cat,i) => {
      const slug = slugify(cat.nombre);
      return '<button class="cat-nav-btn' + (i===0?' active':'') + '" data-slug="' + slug + '" onclick="scrollToCat(\'' + slug + '\')">' +
        '<span>' + cat.icono + '</span> ' + cat.nombre + '</button>';
    }).join('') + '</div>';
  document.querySelectorAll('.cat-section').forEach((section,i) => {
    const cat = CATEGORIAS[i]; if (!cat) return;
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
  const header = document.querySelector('header'), nav = $id('cat-nav');
  if (header && nav) {
    nav.style.top = header.offsetHeight + 'px';
    const total = header.offsetHeight + nav.offsetHeight;
    document.querySelectorAll('.cat-section').forEach(s => { s.style.scrollMarginTop = total + 'px'; });
  }
}

/* ── STOCK ── */
async function fetchStock() {
  if (!STOCK_CSV_URL) return;
  try {
    const res = await fetch(STOCK_CSV_URL);
    const text = await res.text();
    const rows = text.trim().split('\n');
    const abbrStock = {};
    function parseCSVRow(row) {
      const cols=[]; let cur='',inQ=false;
      for(let i=0;i<row.length;i++){const ch=row[i]; if(ch==='"'){if(inQ&&row[i+1]==='"'){cur+='"';i++;continue;}inQ=!inQ;continue;} if(ch===','&&!inQ){cols.push(cur.trim());cur='';continue;} cur+=ch;}
      cols.push(cur.trim()); return cols;
    }
    rows.slice(1).forEach(row => { const cols=parseCSVRow(row); const abbr=cols[2]; const disp=parseInt(cols[7]); if(abbr&&!isNaN(disp)) abbrStock[abbr]=disp; });
    PRODUCTOS.forEach(p => { const abbr=PROD_ABBR[p.id]; if(abbr&&abbrStock[abbr]!==undefined) stockMap[p.id]=abbrStock[abbr]; });
    let ajustado = false;
    Object.entries(cart).forEach(([id,qty]) => {
      const avail=stockMap[+id];
      if(avail!==undefined&&qty>avail){if(avail===0)delete cart[id];else cart[id]=avail;ajustado=true;renderCardFooter(id);}
    });
    if(ajustado){updateUI();toast('⚠️ Tu carrito fue ajustado por cambios de stock');}
    updateStockDisplay();
    loadLastOrder();
  } catch(e) { console.warn('fetchStock:',e); }
}
function updateStockDisplay() {
  PRODUCTOS.forEach(p => {
    const el=$id('stock-'+p.id), avail=stockMap[p.id]; if(!el) return;
    if(avail===undefined) el.innerHTML='';
    else if(avail===0) el.innerHTML='<span class="stock-badge stock-out">🚫 Sin stock</span>';
    else if(avail<=5) el.innerHTML='<span class="stock-badge stock-low">⚡ Últimas '+avail+' unidades</span>';
    else el.innerHTML='<span class="stock-badge stock-ok">✓ '+avail+' disponibles</span>';
    renderCardFooter(p.id);
  });
}

/* ── PRECARGAR DATOS ── */
function loadClientData() {
  try {
    const saved = JSON.parse(localStorage.getItem('maleu_cliente_pg') || 'null'); if (!saved) return;
    if (saved.nombre) $id('f-nombre').value = saved.nombre;
    if (saved.telefono) $id('f-telefono').value = saved.telefono;
    if (saved.zone === 'estancias' && currentZone === 'estancias') {
      if (saved.barrioPrivado) { $id('f-barrio-privado').value = saved.barrioPrivado; filtrarSubBarrios(); }
      if (saved.barrio) $id('f-barrio').value = saved.barrio;
      if (saved.lote) $id('f-lote').value = saved.lote;
    }
    if (saved.zone === 'pilar' && currentZone === 'pilar') {
      if (saved.direccion) $id('f-direccion').value = saved.direccion;
    }
    if (saved.dia) { $id('f-dia').value = saved.dia; onDiaChange(); }
    if (saved.pago) { const r=document.querySelector('input[name="pago"][value="'+saved.pago+'"]'); if(r) r.checked=true; }
  } catch(e) {}
}
function loadLastOrder() {
  try {
    const items = JSON.parse(localStorage.getItem('maleu_ultimo_pedido_pg') || 'null');
    if (!items || !items.length) return;
    const block=$id('repeat-block'), list=$id('repeat-items'); if(!block||!list) return;
    const lines = items.map(({id,qty}) => {
      const p=PROD_MAP[id]; if(!p) return '';
      const sinStock = stockMap[id]!==undefined && stockMap[id]===0;
      return '<div class="repeat-item'+(sinStock?' repeat-item-nostock':'')+'"><span>'+p.nombre+(sinStock?' <small>(sin stock)</small>':'')+'</span><span>×'+qty+'</span></div>';
    }).filter(Boolean).join('');
    if(!lines) return;
    list.innerHTML = lines;
    const hayAlgo = items.some(({id}) => stockMap[id]===undefined || stockMap[id]>0);
    const btn = block.querySelector('.repeat-btn'); if(btn) btn.disabled = !hayAlgo;
    block.style.display = 'block';
  } catch(e) {}
}
function repeatLastOrder() {
  try {
    const items = JSON.parse(localStorage.getItem('maleu_ultimo_pedido_pg') || 'null');
    if (!items || !items.length) return;
    let agregados = 0;
    items.forEach(({id,qty}) => {
      const p=PROD_MAP[id]; if(!p) return;
      const avail=stockMap[id]; if(avail!==undefined&&avail===0) return;
      const maxQty = avail!==undefined ? Math.min(qty, avail-(cart[id]||0)) : qty;
      if(maxQty<=0) return;
      cart[id] = (cart[id]||0) + maxQty;
      agregados++; renderCardFooter(id);
    });
    updateUI();
    if(agregados>0) toast('✓ Productos agregados'); else toast('⚠️ No hay stock');
  } catch(e) {}
}

/* ── INIT ── */
renderCatalog();
renderCatNav();
updateCatNavTop();
window.addEventListener('resize', updateCatNavTop);

// Zona guardada
const savedZone = localStorage.getItem('maleu_zone');
if (savedZone && ZONAS[savedZone]) {
  currentZone = savedZone;
  $id('loc-overlay').classList.add('hidden');
  applyZone();
} else {
  // Mostrar modal
}

loadClientData();
$id('cart-badge').style.display = 'none';
fetchStock();
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
function updateShippingBar() {
  const bar = $id('shipping-bar');
  if (!currentZone || currentZone === 'estancias') { bar.classList.add('hidden'); return; }
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

/* ── BANNER PROMO ── */
function closePromo() {
  $id('promo-banner').style.display = 'none';
  sessionStorage.setItem('maleu_promo_closed', '1');
}
if (sessionStorage.getItem('maleu_promo_closed')) {
  $id('promo-banner').style.display = 'none';
}

/* ── CUPONES ── */
const CUPONES = {
  'BIENVENIDO': { tipo: 'porcentaje', valor: 10, desc: '10% OFF', minimo: 0 },
  'MALEU10':    { tipo: 'porcentaje', valor: 10, desc: '10% OFF', minimo: 0 },
  'AMIGO15':    { tipo: 'porcentaje', valor: 15, desc: '15% OFF', minimo: 20000 },
};
let activeCoupon = null;

function getDiscount(subtotal) {
  if (!activeCoupon) return 0;
  const c = CUPONES[activeCoupon];
  if (!c) return 0;
  if (subtotal < c.minimo) return 0;
  if (c.tipo === 'porcentaje') return Math.round(subtotal * c.valor / 100);
  return c.valor;
}

function applyCoupon() {
  const code = $id('f-coupon').value.trim().toUpperCase();
  const msg = $id('coupon-msg');
  if (!code) { msg.textContent = '⚠ Ingresá un código'; msg.className = 'coupon-msg error'; return; }
  const c = CUPONES[code];
  if (!c) { msg.textContent = '✗ Cupón inválido'; msg.className = 'coupon-msg error'; return; }
  if (cartTotal() < c.minimo) { msg.textContent = '⚠ Mínimo ' + ars(c.minimo) + ' para usar este cupón'; msg.className = 'coupon-msg error'; return; }
  activeCoupon = code;
  $id('coupon-input-area').classList.add('hidden');
  const applied = $id('coupon-applied');
  applied.classList.remove('hidden');
  $id('coupon-applied-text').textContent = '✓ ' + code + ' — ' + c.desc + ' aplicado';
  msg.textContent = '';
  updateUI();
  toast('✓ Cupón ' + code + ' aplicado');
}

function removeCoupon() {
  activeCoupon = null;
  $id('coupon-input-area').classList.remove('hidden');
  $id('coupon-applied').classList.add('hidden');
  $id('f-coupon').value = '';
  $id('coupon-msg').textContent = '';
  updateUI();
}

// Restore coupon from localStorage
try {
  const savedCoupon = localStorage.getItem('maleu_coupon');
  if (savedCoupon && CUPONES[savedCoupon]) {
    activeCoupon = savedCoupon;
    $id('coupon-input-area').classList.add('hidden');
    $id('coupon-applied').classList.remove('hidden');
    $id('coupon-applied-text').textContent = '✓ ' + savedCoupon + ' — ' + CUPONES[savedCoupon].desc + ' aplicado';
  }
} catch(ex) {}

/* ── NEWSLETTER POPUP ── */
function showNewsletter() {
  if (localStorage.getItem('maleu_nl_done')) return;
  $id('nl-overlay').classList.remove('hidden');
}
function closeNewsletter() {
  $id('nl-overlay').classList.add('hidden');
  localStorage.setItem('maleu_nl_done', '1');
}
function submitNewsletter() {
  const email = $id('nl-email').value.trim();
  if (!email || !email.includes('@')) { toast('⚠ Ingresá un email válido'); return; }
  fetch(APPS_SCRIPT_URL, {
    method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'},
    body: JSON.stringify({ canal:'Newsletter', fecha: new Date().toLocaleString('es-AR'), nombre: email, email: email })
  }).catch(function(){});
  closeNewsletter();
  activeCoupon = 'BIENVENIDO';
  $id('coupon-input-area').classList.add('hidden');
  $id('coupon-applied').classList.remove('hidden');
  $id('coupon-applied-text').textContent = '✓ BIENVENIDO — 10% OFF aplicado';
  localStorage.setItem('maleu_coupon', 'BIENVENIDO');
  updateUI();
  toast('🎉 ¡Cupón BIENVENIDO activado! 10% OFF');
}
if (!localStorage.getItem('maleu_nl_done')) {
  setTimeout(showNewsletter, 8000);
}

/* ── HOOK: actualizar barra envío en cada cambio ── */
const _origModifyCart = modifyCart;
window.modifyCart = function(id, delta) {
  _origModifyCart(id, delta);
  updateShippingBar();
};
updateShippingBar();
