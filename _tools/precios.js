#!/usr/bin/env node
/*
 * precios.js — cruza los precios de arranque de ruta.html contra la hoja Productos.
 *
 *   node _tools/precios.js              → chequea. Sale 1 si alguno se despego.
 *   node _tools/precios.js --escribir   → los actualiza en ruta.html.
 *
 * Por que existe. La tab AUTOPEDIDO decide el precio del pedido con la tabla
 * `NP_PRECIOS` que esta escrita adentro de ruta.html, y el backend guarda el total
 * que le manda el celular: no lo recalcula. Esa tabla se refresca por
 * `action=precios`, pero eso viaja 3-7 s y puede fallar — mientras tanto, y si
 * falla, lo que vale es lo escrito en el archivo.
 *
 * El 3/9/2026 Tadeo iba a cargar un autopedido y la Margarita decia $11.200 cuando
 * la hoja dice $11.500. La tabla no se tocaba desde el 5/8: un mes desfasada, sin
 * un solo error en ninguna consola. Ninguna de las otras redes lo agarra — el JS
 * parsea, el ERP arranca, no hay boton muerto y la pantalla no se desborda. Un
 * numero viejo es sintacticamente perfecto.
 *
 * Que NO prueba: que los precios de la hoja sean los correctos. Prueba que el
 * archivo diga lo mismo que la hoja. Si la hoja esta mal, esto no lo sabe.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const RUTA = path.join(RAIZ, 'ruta.html');
const ESCRIBIR = process.argv.includes('--escribir');

const RED = '\x1b[31m', VER = '\x1b[32m', AMA = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';

/* La URL del Apps Script sale del propio archivo: si algun dia cambia, esto la
   sigue sola en vez de quedar apuntando a un backend viejo. */
function urlDelBackend(src) {
  const m = src.match(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/);
  if (!m) throw new Error('no encontre la URL del Apps Script en ruta.html');
  return m[0];
}

/* Saca el objeto NP_PRECIOS contando llaves. Un regex no sirve: el objeto tiene
   llaves adentro y cortaria en la primera. */
function bloqueNpPrecios(src) {
  const i = src.indexOf('var NP_PRECIOS=');
  if (i < 0) throw new Error('no encontre NP_PRECIOS en ruta.html');
  const desde = src.indexOf('{', i);
  let n = 0, j = desde;
  for (; j < src.length; j++) {
    if (src[j] === '{') n++;
    else if (src[j] === '}') { n--; if (!n) { j++; break; } }
  }
  const texto = src.slice(desde, j);
  return { desde, hasta: j, texto, obj: JSON.parse(texto.replace(/([A-Za-z_$][\w$]*)\s*:/g, '"$1":')) };
}

/* Reescribe la tabla respetando su formato: una linea por grupo, como estaba.
   Se reconstruye entera desde la hoja para que no queden mezclados valores de
   dos epocas. */
function armarTabla(vivo, orden) {
  const linea = (abbrs) => '  ' + abbrs.map((a) => {
    const v = vivo[a];
    const partes = ['p:' + v.p, 'c:' + v.c];
    if (v.pc) partes.push('pc:' + v.pc);
    return a + ':{' + partes.join(',') + '}';
  }).join(',');
  return '{\n' + orden.map(linea).join(',\n') + '\n}';
}

async function main() {
  const src = fr(RUTA);
  const { desde, hasta, obj: duro } = bloqueNpPrecios(src);
  const url = urlDelBackend(src);

  console.log('\n== PRECIOS: ruta.html contra la hoja Productos ==');
  console.log(DIM + '  ' + url.slice(0, 52) + '...' + RST);

  let vivo;
  try {
    const r = await fetch(url + '?action=precios&t=' + Date.now(), { redirect: 'follow' });
    vivo = await r.json();
  } catch (e) {
    // Sin internet no se puede chequear. Eso NO es motivo para frenar un deploy:
    // seria cambiar un riesgo por otro (no poder publicar un arreglo urgente).
    console.log(AMA + '  ! No pude leer la hoja (' + e.message + '). Salteo el chequeo.' + RST + '\n');
    return 0;
  }
  if (!vivo || !Object.keys(vivo).length) {
    console.log(AMA + '  ! El backend contesto vacio. Salteo el chequeo.' + RST + '\n');
    return 0;
  }

  const difs = [];
  const faltan = [];
  Object.keys(duro).forEach((k) => {
    const d = duro[k], v = vivo[k];
    if (!v) { faltan.push(k); return; }
    ['p', 'c', 'pc'].forEach((campo) => {
      const x = d[campo] === undefined ? null : Number(d[campo]);
      const y = v[campo] === undefined ? null : Number(v[campo]);
      if (x === null && y === null) return;
      if (x !== y) difs.push({ abbr: k, campo, archivo: x, hoja: y });
    });
  });
  /* Un producto que esta en la hoja y no en la tabla NO es un error: la tabla es
     lo que se puede vender desde AUTOPEDIDO, y hay productos (los sorrentinos
     premium, por ejemplo) que se venden por otros canales. */

  if (faltan.length) {
    console.log(AMA + '  ! en el archivo y no en la hoja: ' + faltan.join(', ') + RST);
  }

  if (!difs.length) {
    console.log(VER + '  OK  los ' + Object.keys(duro).length + ' productos coinciden con la hoja.' + RST + '\n');
    return 0;
  }

  const CAMPO = { p: 'precio', c: 'costo', pc: 'precio Clubes' };
  console.log(RED + '\n  X ' + difs.length + ' valor(es) desfasado(s):' + RST);
  difs.forEach((d) => {
    console.log('    ' + d.abbr.padEnd(6) + CAMPO[d.campo].padEnd(14) +
                'archivo ' + String(d.archivo).padStart(7) + '   →   hoja ' + String(d.hoja).padStart(7));
  });

  if (!ESCRIBIR) {
    console.log('\n  La tab AUTOPEDIDO arranca con los del archivo, asi que un pedido');
    console.log('  cargado en los primeros segundos sale con el precio viejo.');
    console.log('  Para alinearlos:  ' + VER + 'node _tools/precios.js --escribir' + RST + '\n');
    return 1;
  }

  // Reconstruir la tabla manteniendo el agrupado por lineas del original.
  const orden = [
    ['PPM', 'PPJyQ', 'PPCyQ'],
    ['SQB', 'SL', 'SCo', 'SPyP'],
    ['SJyQ', 'SE', 'SCa'],
    ['ECaC', 'EJyQ', 'ECyQ', 'EV'],
    ['TG', 'TLC', 'TC', 'F'],
    ['PMu', 'PMa', 'PJyQ'],
    ['PCC', 'PJyM'],
    ['TP', 'TJyQ', 'TCa', 'TV'],
    ['RC', 'RP']
  ];
  const enOrden = orden.flat();
  const sobran = Object.keys(duro).filter((k) => enOrden.indexOf(k) < 0);
  if (sobran.length) {
    // Un producto nuevo en la tabla sin lugar en el agrupado: no lo pierdo en
    // silencio, lo agrego como una linea propia al final.
    orden.push(sobran);
  }
  const fusion = {};
  enOrden.concat(sobran).forEach((k) => { fusion[k] = vivo[k] || duro[k]; });

  const nuevo = src.slice(0, desde) + armarTabla(fusion, orden) + src.slice(hasta);
  const tmp = RUTA + '.tmp';
  fs.writeFileSync(tmp, nuevo, 'utf8');
  fs.renameSync(tmp, RUTA);
  console.log(VER + '\n  OK  ruta.html actualizado. Acordate del build y del CACHE_NAME.' + RST + '\n');
  return 0;
}

function fr(p) { return fs.readFileSync(p, 'utf8'); }

main().then((c) => process.exit(c)).catch((e) => {
  console.error(RED + '\n  X ' + e.message + RST + '\n');
  process.exit(1);
});
