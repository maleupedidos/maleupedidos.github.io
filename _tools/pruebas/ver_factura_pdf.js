/* Arma el PDF de una factura o nota de credito con el ordFcPdf DEL ERP (no una
 * copia), en un Chrome headless, y lo guarda en disco. (21/10/2026)
 *
 *   npm run dev   (en otra terminal)
 *   node _tools/pruebas/ver_factura_pdf.js <facturas.json> <carpeta-salida> [emisor.json]
 *
 * facturas.json = las filas de la hoja Facturas como objetos (lo deja
 * estancias/_tools/probar_facturador_nc.js --vivo). Arma un PDF por fila Emitida.
 * emisor.json (opcional) = {titular, domicilio, iibb, inicio}, por CUIT.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp');
const BASE = process.env.BASE || 'http://localhost:8080';

(async () => {
  const [archivo, salida, archEm] = process.argv.slice(2);
  const facturas = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const emisores = archEm ? JSON.parse(fs.readFileSync(archEm, 'utf8')) : {};
  fs.mkdirSync(salida, { recursive: true });
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    for (let i = 0; i < 60; i++) {
      const listo = await evaluar(cli, 'typeof window.ordFcPdf==="function"&&!!window.jspdf');
      if (listo) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    /* doc.save descargaria: se intercepta y se devuelve el PDF en base64 */
    await evaluar(cli, 'window.jspdf.jsPDF.API.save=function(n){window.__pdfs=window.__pdfs||[];window.__pdfs.push({n:n,b:this.output("datauristring")});};true');
    const datos = { facturas, emisores, entorno: 'homo', prendido: false };
    let n = 0;
    for (const f of facturas) {
      if (f['Estado'] !== 'Emitida') continue;
      await evaluar(cli, 'window.ordFcPdf(' + JSON.stringify(f['Clave']) + ',' + JSON.stringify(datos) + ');true');
      n++;
    }
    let pdfs = [];
    for (let i = 0; i < 40 && pdfs.length < n; i++) {
      pdfs = (await evaluar(cli, 'JSON.stringify(window.__pdfs||[])').then(JSON.parse));
      await new Promise((r) => setTimeout(r, 250));
    }
    pdfs.forEach((p) => {
      const dest = path.join(salida, p.n);
      fs.writeFileSync(dest, Buffer.from(p.b.split(',')[1], 'base64'));
      console.log('PDF', dest, fs.statSync(dest).size, 'bytes');
    });
    if (pdfs.length !== n) { console.log('MAL: esperaba', n, 'PDF y salieron', pdfs.length); process.exitCode = 1; }
  } finally { cli.matar(); }
})();
