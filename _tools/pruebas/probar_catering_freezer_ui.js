/* LA SECCION DEL FREEZER EN LA FICHA DEL EVENTO. (28/9/2026)

   El backend ya mueve el stock contra un evento (`probar_catering_freezer.js`,
   30 ok). Esto prueba la pantalla, y sobre todo que **no rompa la ficha**: se
   dibuja en el medio de `catPintarDetalle`, asi que un error ahi se lleva
   puesto el menu, el presupuesto, los cobros y las tareas.

   Lo que tiene que ser cierto:
     · con mercaderia afuera, la lista la muestra y ofrece devolverla;
     · la equivalencia sale del nombre ("Pack Muzzarella x2" -> 4 = 8 u) y
       cuando el nombre no la dice, NO se inventa;
     · sin stock traido, no ofrece un formulario que no puede funcionar;
     · y la ficha entera sigue en pie en todos los casos. */
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 280) : '')); } };

const EVENTO = JSON.stringify({
  ok: true,
  event: { id: 'ev-1', event_code: 'CAT-001', event_name: 'Cumple Laura', client_name: 'Laura Aguirre',
           event_date: '2026-09-25', status: 'completed', guests_expected: 24, notes: '' },
  menu: [], lines: [], payments: [], crew: [], tasks: [],
  freezer: [{ a: 'PPM', n: 'Pack Muzzarella x2', q: 4 }, { a: 'CVa', n: 'Carne Vacío', q: 2.5 }],
});
const STOCK = JSON.stringify([
  { n: 'Pack Muzzarella x2', a: 'PPM', f: 11, r: 0, d: 11, u: 'u' },
  { n: 'Pack Jamón y Queso x2', a: 'PPJyQ', f: 10, r: 0, d: 10, u: 'u' },
  { n: 'Sorrentinos Queso Brie', a: 'SQB', f: 0, r: 0, d: 0, u: 'u' },
  { n: 'Carne Vacío', a: 'CVa', f: 14.256, r: 0, d: 14.256, u: 'kg' },
]);

const LEER = `(function(){
  var app=document.getElementById('catApp');
  var secs=app?app.querySelectorAll('section.card'):[];
  var fz=null;
  for(var i=0;i<secs.length;i++){ if((secs[i].innerText||'').indexOf('Del freezer')>=0){ fz=secs[i]; break; } }
  return { secciones:secs.length,
           hay:!!fz,
           txt:fz?(fz.innerText||''):'',
           opciones:fz?fz.querySelectorAll('select[name=a] option').length:-1,
           devolver:fz?fz.querySelectorAll('.cat-fz-dev').length:-1,
           form:fz?fz.querySelectorAll('form').length:-1,
           fichaEntera:(app?(app.innerText||''):'') };
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html?prueba=1' });
    for (let i = 0; i < 90; i++) { try { if (await evaluar(cli, `typeof catPintarDetalle==='function'`)) break; } catch (e) {} await pausa(250); }
    await pausa(700);

    /* ── 1. CON MERCADERIA AFUERA ── */
    console.log('\n== La ficha del evento, con mercaderia afuera ==');
    await evaluar(cli, `window.D={stock:${STOCK}}; _catDetalle=${EVENTO}; go('catering'); catPintarDetalle(); 1`);
    await pausa(400);
    const v = await evaluar(cli, LEER);

    chk('la seccion del freezer esta', v.hay === true, v);
    chk('y la ficha NO se rompio: siguen las otras secciones', v.secciones >= 5, { secciones: v.secciones });
    chk('con el menu, el presupuesto, los cobros y las tareas',
        ['Menú', 'Presupuesto', 'Cobros', 'Tareas'].every(x => v.fichaEntera.indexOf(x) >= 0), v.fichaEntera.slice(0, 200));

    chk('dice lo que ya salio', v.txt.indexOf('Pack Muzzarella') >= 0 && v.txt.indexOf('4') >= 0, v.txt.slice(0, 200));
    chk('y ofrece devolver cada cosa', v.devolver === 2, { botones: v.devolver });
    /* La unidad del evento contra la del freezer: 4 packs son 8 pizzas. */
    chk('la equivalencia sale del nombre: 4 packs x2 = 8 u', v.txt.indexOf('8 u') >= 0, v.txt.slice(0, 260));
    chk('y para la carne, que no es un pack, NO se inventa ninguna',
        v.txt.indexOf('Carne') >= 0 && v.txt.indexOf('2.5 u') < 0, v.txt.slice(0, 300));

    /* Un producto en cero no se puede sacar: no se ofrece. */
    chk('el selector ofrece solo lo que tiene stock (3 + el vacio)', v.opciones === 4, { opciones: v.opciones });
    chk('y deja claro que esto NO es una venta', v.txt.indexOf('No crea un pedido') >= 0, v.txt.slice(-200));

    /* ── 2. SIN NADA AFUERA ── */
    console.log('\n== Sin nada afuera todavia ==');
    await evaluar(cli, `_catDetalle.freezer=[]; catPintarDetalle(); 1`);
    await pausa(300);
    const v2 = await evaluar(cli, LEER);
    chk('lo dice en vez de mostrar una lista vacia', v2.txt.indexOf('Todav') >= 0, v2.txt.slice(0, 160));
    chk('pero igual deja sacar', v2.form === 1, { form: v2.form });
    chk('y no ofrece devolver nada', v2.devolver === 0, { botones: v2.devolver });

    /* ── 3. SIN STOCK TRAIDO (el caso frio) ── */
    console.log('\n== Sin el stock traido ==');
    await evaluar(cli, `D.stock=[]; catPintarDetalle(); 1`);
    await pausa(300);
    const v3 = await evaluar(cli, LEER);
    chk('no dibuja un formulario que no podria funcionar', v3.form === 0, { form: v3.form });
    chk('y dice como destrabarlo', v3.txt.indexOf('Productos') >= 0, v3.txt.slice(0, 200));
    chk('la ficha sigue entera', v3.secciones >= 5, { secciones: v3.secciones });

    /* ── 4. UN BACKEND VIEJO NO MANDA `freezer` ── */
    await evaluar(cli, `D.stock=${STOCK}; delete _catDetalle.freezer; catPintarDetalle(); 1`);
    await pausa(300);
    const v4 = await evaluar(cli, LEER);
    chk('sin el campo del backend tampoco rompe', v4.hay === true && v4.secciones >= 5, v4);

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
