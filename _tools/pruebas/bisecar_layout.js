/* QUÉ BLOQUE HACE CARO EL LAYOUT de una página (29/10/2026). Complemento de trace_tab.js.
     node _tools/pruebas/bisecar_layout.js <token> <pagina: caja|pedidos|ruta|busqueda> [--hondo]
   Sesión real (POST cortados), 390 px, CPU x4. Abre la página y mide cuánto tarda el navegador en reacomodarla
   entera (la esconde, la muestra y fuerza el layout con offsetHeight; mediana de 5). Después repite escondiendo
   UN hijo directo por vez (con --hondo, también los nietos del más caro): lo que más baja es lo que cuesta. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN, PAG] = process.argv.slice(2), HONDO = process.argv.includes('--hondo');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.enable', {});
    cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cli.enviar('Page.navigate', { url: process.env.BASE_URL || 'https://app.maleu.com.ar/app.html' });
    for (let i = 0; i < 160 && !(await cdp.evaluar(cli, `typeof go==='function'&&!!window._sbPerm&&window.D&&(D.pedidos||[]).length>0&&document.documentElement.classList.contains('listo')`).catch(() => false)); i++) await pausa(500);
    await pausa(4000);
    await cdp.evaluar(cli, `go(${JSON.stringify(PAG)});1`); await pausa(9000);
    await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
    const medir = `(function(sel){var pg=document.getElementById('p-'+${JSON.stringify(PAG)});var t=[];for(var k=0;k<5;k++){pg.style.display='none';void document.body.offsetHeight;pg.style.display='';var a=performance.now();void pg.offsetHeight;void document.body.scrollHeight;t.push(performance.now()-a);}t.sort(function(x,y){return x-y});return Math.round(t[2]);})`;
    const base = await cdp.evaluar(cli, medir + '()');
    console.log('página ' + PAG + ' entera: ' + base + ' ms de layout (mediana de 5, CPU x4) · elementos: ' + await cdp.evaluar(cli, `document.getElementById('p-${PAG}').getElementsByTagName('*').length`));
    const filas = await cdp.evaluar(cli, `(function(){var pg=document.getElementById('p-'+${JSON.stringify(PAG)});var out=[];var hijos=[].slice.call(pg.children);
      hijos.forEach(function(h,i){if(getComputedStyle(h).display==='none')return;var prev=h.style.display;h.style.display='none';var m=(${medir})();h.style.display=prev;
        out.push({i:i,quien:(h.id?'#'+h.id:'')+(h.className&&typeof h.className==='string'?'.'+h.className.split(' ').slice(0,2).join('.'):'')+' <'+h.tagName.toLowerCase()+'>',elementos:h.getElementsByTagName('*').length,sinEl:m});});
      return out;})()`);
    filas.sort((a, b) => a.sinEl - b.sinEl).forEach((f) => console.log('  sin ' + f.quien.padEnd(48) + String(f.elementos).padStart(5) + ' el. → ' + f.sinEl + ' ms (baja ' + (base - f.sinEl) + ')'));
    if (HONDO && filas.length) {
      const peor = filas[0];
      console.log('\nadentro de ' + peor.quien + ':');
      const n = await cdp.evaluar(cli, `(function(){var pg=document.getElementById('p-'+${JSON.stringify(PAG)});var h=pg.children[${peor.i}];var out=[];
        [].slice.call(h.querySelectorAll(':scope > *, :scope > * > *')).forEach(function(x){if(getComputedStyle(x).display==='none'||x.getElementsByTagName('*').length<5)return;var prev=x.style.display;x.style.display='none';var m=(${medir})();x.style.display=prev;
          out.push({quien:(x.id?'#'+x.id:'')+(typeof x.className==='string'&&x.className?'.'+x.className.split(' ').slice(0,2).join('.'):'')+' <'+x.tagName.toLowerCase()+'>',el:x.getElementsByTagName('*').length,sinEl:m});});
        return out.sort(function(a,b){return a.sinEl-b.sinEl}).slice(0,12);})()`);
      n.forEach((f) => console.log('  sin ' + f.quien.padEnd(48) + String(f.el).padStart(5) + ' el. → ' + f.sinEl + ' ms'));
    }
  } finally { cli.matar(); }
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
