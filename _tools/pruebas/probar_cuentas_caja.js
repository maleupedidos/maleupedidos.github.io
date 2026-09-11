/**
 * Los TRES MEDIOS DE COBRO en la tab Caja: Efectivo unificado + Mercado Pago
 * Tadeo + Brubank Lucas.
 *
 * Chrome de verdad, sesion real, POST interceptados (la planilla no se toca).
 *
 *   node probar_3medios.js <token> [ancho]
 *
 * El stub de POST NO contesta `{ok:true}` pelado: `_guardarMovPorCuenta` exige
 * que `rows` coincida con las cuentas mandadas, y el ajuste lee `porCuenta`.
 * Un stub que devuelve menos de lo que el backend devuelve hace fallar codigo
 * que anda — la leccion ya anotada tres veces.
 */
const path = require('path');
const PRU = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas';
const { abrir, evaluar } = require(path.join(PRU, 'cdp.js'));

const TOKEN = process.argv[2];
const ANCHO = Number(process.argv[3] || 390);
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

let ok = 0, mal = 0;
const chequear = (cond, txt, det) => {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { mal++; console.log('  MAL  ' + txt + (det ? '  → ' + det : '')); }
};

/* El PREP: sesion real + un stub de POST que imita al backend publicado. */
const PREP = 'try{'
  + 'localStorage.setItem("maleu_token","' + TOKEN + '");'
  + 'localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:"tadeo",rol:"admin",nombre:"Tadeo Ustariz",ts:Date.now()}));'
  + '}catch(e){}'
  + 'window.__err=[];window.__posts=[];'
  + 'window.addEventListener("error",function(e){window.__err.push(String(e.message));});'
  + 'window.addEventListener("unhandledrejection",function(e){window.__err.push("promise: "+String(e.reason));});'
  + '(function(){var ce=console.error;console.error=function(){window.__err.push([].slice.call(arguments).join(" ").slice(0,140));return ce.apply(this,arguments);};})();'
  + 'window.__confirmDevuelve=true;'
  + 'window.__confirms=[];'
  + 'window.confirm=function(m){window.__confirms.push(String(m));return window.__confirmDevuelve;};'
  + 'window.__avisos=[];window.alert=function(m){window.__avisos.push(String(m));};'
  + '(function(){var o=window.fetch;window.fetch=function(u,x){'
  + 'if(x&&String(x.method||"").toUpperCase()==="POST"){'
  + '  var b={};try{b=JSON.parse(x.body||"{}");}catch(e){}'
  + '  window.__posts.push(b);'
  + '  var res={ok:true};'
  + '  if(b.action==="gasto"||b.action==="ingreso"){'
  + '    var n=0;'
  + '    if(b.montos){for(var k in b.montos)if(Number(b.montos[k])>0)n++;}'
  + '    else if(Number(b.monto)>0&&b.metodo){n=1;}'
  + '    else{if(Number(b.montoEf)>0)n++;if(Number(b.montoMp)>0)n++;}'
  + '    res={ok:true,rows:n};'
  + '  }'
  + '  if(b.action==="ajusteSaldo"){'
  + '    var pc={efectivo:Number(b.efectivo)||0,mp:Number(b.mp)||0};'
  + '    for(var kk in b)if(kk.indexOf("cta_")===0)pc[kk.slice(4)]=Number(b[kk])||0;'
  + '    res={ok:true,ef:Number(b.efectivo)||0,mp:Number(b.mp)||0,bil:Number(b.billetera)||0,'
  + '         sob:Number(b.sobres)||0,inv:Number(b.inversiones)||0,porCuenta:pc};'
  + '  }'
  + '  return Promise.resolve(new Response(JSON.stringify(res),{status:200,headers:{"Content-Type":"application/json"}}));'
  + '}'
  + 'return o.apply(this,arguments);};})();';

/* Un esperar() cuyo retorno no se chequea se agota EN SILENCIO y el test sigue
   como si la condicion se hubiera cumplido. Todos los usos de abajo lo miran. */
const esperar = async (cli, expr, ms = 60000, cada = 500) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evaluar(cli, expr)) return true; } catch (e) {}
    await new Promise(r2 => setTimeout(r2, cada));
  }
  return false;
};

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride',
      { width: ANCHO, height: ANCHO < 560 ? 844 : 950, deviceScaleFactor: 1, mobile: ANCHO < 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
    if (!await esperar(cli, 'typeof D!=="undefined" && !!D', 60000))
      throw new Error('el ERP no arranco');

    /* Con la clave de sesion equivocada el ERP carga los datos igual pero deja
       el login encima con z-index 9999, y .click() ignora el hit-testing: la
       prueba dice verde sobre una pantalla tapada. */
    const login = await evaluar(cli, `(function(){var e=document.getElementById('loginScreen');
      if(!e)return 'no existe';var s=getComputedStyle(e);
      return (s.display==='none'||s.visibility==='hidden'||e.classList.contains('hidden'))?'oculto':'VISIBLE';})()`);
    if (login === 'VISIBLE') throw new Error('el login quedo encima: la sesion no entro');

    console.log('\n== esperando el volcado de la caja (10-15 s) ==');
    const llego = await esperar(cli,
      `!!(window.D&&D.caja&&D.caja.cuentas&&D.caja.cuentas.length)`, 90000);
    if (!llego) throw new Error('no llegaron las cuentas — cajaLight no contesto');

    await evaluar(cli, `go('caja')`);
    await esperar(cli, `!!document.querySelector('#cBal .bal-card')`, 20000);
    await new Promise(r => setTimeout(r, 1200));

    console.log(`\n── LAS TARJETAS (${ANCHO}px) ──`);
    const t = await evaluar(cli, `(function(){
      var out=[];
      document.querySelectorAll('#cBal .bal-card').forEach(function(c){
        var lb=c.querySelector('.bal-label'),vl=c.querySelector('.bal-val');
        var r=c.getBoundingClientRect();
        out.push({label:lb?lb.textContent.trim():'',val:vl?vl.textContent.trim():'',
          total:c.classList.contains('total'),solo:c.classList.contains('solo'),
          txt:c.textContent.replace(/\\s+/g,' ').trim(),
          w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.left),y:Math.round(r.top)});
      });
      return JSON.stringify(out);
    })()`);
    const cards = JSON.parse(t);
    cards.forEach(c => console.log(`     ${c.total ? '[TOTAL]' : '       '} ${c.label.padEnd(22)} ${c.val.padStart(14)}  ${c.w}x${c.h}${c.solo ? ' (ancho completo)' : ''}`));

    const cuentas = cards.filter(c => !c.total);
    chequear(cuentas.length === 3, 'hay 3 tarjetas de cuenta', 'hay ' + cuentas.length);
    chequear(cuentas.some(c => /Efectivo/i.test(c.label)), 'una dice Efectivo');
    chequear(cuentas.some(c => /Mercado Pago Tadeo/i.test(c.label)),
      'una dice "Mercado Pago Tadeo"  (el nombre de la hoja Cuentas)',
      cuentas.map(c => c.label).join(' | '));
    chequear(cuentas.some(c => /Brubank Lucas/i.test(c.label)),
      'una dice "Brubank Lucas"  ← lo que Tadeo no veia',
      cuentas.map(c => c.label).join(' | '));
    chequear(cards.filter(c => c.total).length === 1, 'y una sola Posición total');

    console.log('\n── LOS NUMEROS, contra lo que calcula el backend ──');
    const nums = await evaluar(cli, `(function(){
      var sb=D.saldoBase||{},cj=D.caja||{};
      var pc=sb.porCuenta||{},cob=cj.cobradoPorCuenta||{},gas=cj.gastosPorCuenta||{},ing=cj.ingresosPorCuenta||{};
      var o={},tot=0;
      (cj.cuentas||[]).forEach(function(c){
        var s=(pc[c.id]||0)+(cob[c.id]||0)+(ing[c.id]||0)-(gas[c.id]||0);
        o[c.id]=s;tot+=s;
      });
      return JSON.stringify({porCta:o,total:tot+(Number(sb.inv)||0),inv:Number(sb.inv)||0});
    })()`);
    const N = JSON.parse(nums);
    const money = v => '$' + Math.round(v).toLocaleString('es-AR');
    console.log('     esperado:', JSON.stringify(N.porCta), '| inv', money(N.inv), '| total', money(N.total));

    const numDe = txt => Number(String(txt).replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.'));
    const cEf = cuentas.find(c => /Efectivo/i.test(c.label));
    const cMp = cuentas.find(c => /Mercado Pago/i.test(c.label));
    const cBr = cuentas.find(c => /Brubank/i.test(c.label));
    const tot = cards.find(c => c.total);
    // El separador de miles es "." y el decimal ",": $5.714.892,1
    const leer = s => Number(String(s).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.'));
    chequear(Math.abs(leer(cEf.val) - N.porCta.efectivo) < 1,
      'Efectivo dibuja ' + cEf.val + ' = ' + money(N.porCta.efectivo));
    chequear(Math.abs(leer(cMp.val) - N.porCta.mp) < 1,
      'Mercado Pago dibuja ' + cMp.val + ' = ' + money(N.porCta.mp));
    chequear(Math.abs(leer(cBr.val) - N.porCta.brubank) < 1,
      'Brubank dibuja ' + cBr.val + ' = ' + money(N.porCta.brubank));
    chequear(Math.abs(leer(tot.val) - N.total) < 1,
      'Posición total dibuja ' + tot.val + ' = suma de las 3 + inversiones',
      'esperaba ' + money(N.total));

    console.log('\n── DONDE CUELGA CADA COSA ──');
    chequear(/Caja fuerte/.test(cEf.txt) && /Billetera/.test(cEf.txt) && /Sobres/.test(cEf.txt),
      'el desglose caja fuerte / billetera / sobres va en la de EFECTIVO');
    chequear(/Inversiones/.test(cMp.txt),
      'las Inversiones van en Mercado Pago (la cuenta marcada `inv`)');
    chequear(!/Inversiones/.test(cBr.txt),
      'y NO se le pasan al Brubank', cBr.txt.slice(0, 90));
    chequear(!/Caja fuerte/.test(cBr.txt) && !/Caja fuerte/.test(cMp.txt),
      'ni el desglose del efectivo');
    /* Depende del DATO: el aviso sale solo si la celda del conteo esta vacia.
       Desde el 10/9/2026 16:13 el Brubank esta contado, asi que se chequea en
       la direccion que corresponda a lo que dice la planilla hoy. */
    const _sinContarBr = await evaluar(cli, `((D.saldoBase||{}).sinContar||[]).indexOf('brubank')>-1`);
    if (_sinContarBr)
      chequear(/no la contaste/i.test(cBr.txt),
        'el Brubank dice que todavia no se conto (su $0 no es un saldo)', cBr.txt.slice(0, 110));
    else
      chequear(!/no la contaste/i.test(cBr.txt),
        'el Brubank esta contado y NO dice que falta contarlo', cBr.txt.slice(0, 110));

    console.log('\n── LAYOUT ──');
    const desb = await evaluar(cli, `(function(){
      var d=document.documentElement;
      return JSON.stringify({sw:d.scrollWidth,cw:d.clientWidth});
    })()`);
    const L = JSON.parse(desb);
    chequear(L.sw <= L.cw + 2, 'la pagina no scrollea a lo ancho', L.sw + ' vs ' + L.cw);
    const cortado = cards.filter(c => c.w > 0 && c.x + c.w > L.cw + 2);
    chequear(cortado.length === 0, 'ninguna tarjeta se sale del ancho',
      cortado.map(c => c.label).join(', '));
    /* La grilla se mide por las COLUMNAS QUE EL NAVEGADOR RESOLVIO, no por el
       ancho de una tarjeta. Una regla `repeat(3,1fr)` que ya existia y venia
       DESPUES le ganaba a la nueva por orden, y el sintoma era solo que las 4
       tarjetas median lo mismo que en dos columnas: ningun chequeo lo miraba. */
    const grid = await evaluar(cli, `(function(){
      var g=document.getElementById('cBal');
      var cs=getComputedStyle(g);
      return JSON.stringify({cols:cs.gridTemplateColumns.split(' ').length,
        decl:cs.gridTemplateColumns, balN:g.style.getPropertyValue('--balN'),
        w:Math.round(g.getBoundingClientRect().width)});
    })()`);
    const G = JSON.parse(grid);
    console.log('     grilla: ' + G.cols + ' columnas (' + G.decl + ') · --balN=' + G.balN + ' · contenedor ' + G.w + 'px');
    chequear(G.balN === '4', '--balN dice 4 (3 cuentas + el total)', G.balN);
    if (ANCHO >= 1100) {
      chequear(G.cols === 4,
        'a ' + ANCHO + 'px la grilla resuelve 4 columnas — una por tarjeta',
        G.cols + ' columnas: ' + G.decl);
      chequear(cBr.solo !== true || cBr.w < L.cw * 0.6,
        'y el Brubank NO ocupa el ancho completo', cBr.w + 'px');
      const filas = new Set(cards.map(c => c.y));
      chequear(filas.size === 1, 'las 4 en una sola hilera',
        filas.size + ' filas: ' + JSON.stringify([...filas]));
    } else if (ANCHO <= 560) {
      /* En el celular la grilla es de UNA columna, y es deliberado desde antes
         de este cambio: con dos, la tarjeta de Mercado Pago necesita ~196px y el
         grid le da 145 — los grid items traen `min-width:auto`, no se encogen
         bajo su contenido y desbordan la pantalla. Con "Mercado Pago Tadeo" el
         nombre es aun mas largo, asi que la regla vale mas que antes. */
      chequear(G.cols === 1, 'en el celular queda 1 columna (regla deliberada)',
        G.cols + ': ' + G.decl);
      chequear(cards.every(c => c.w > L.cw * 0.8),
        'y las 4 tarjetas ocupan el ancho, apiladas',
        JSON.stringify(cards.map(c => c.w)));
      const fil = new Set(cards.map(c => c.y));
      chequear(fil.size === 4, 'una debajo de la otra', fil.size + ' filas');
    } else {
      chequear(G.cols === 2, 'entre 561 y 1099px quedan 2 columnas',
        G.cols + ': ' + G.decl);
      chequear(cBr.solo === true,
        'y el Brubank (la 3ra, sin par) va a ancho completo');
      chequear(cBr.w > L.cw * 0.7, 'y de verdad lo ocupa', cBr.w + 'px de ' + L.cw);
    }
    /* Que la tarjeta de Efectivo siga pudiendo con sus tres botones: es la razon
       por la que el escalon esta en 1100 y no en 768. */
    const bots = await evaluar(cli, `(function(){
      var o=[];document.querySelectorAll('#cBal .bal-card').forEach(function(c){
        var lb=c.querySelector('.bal-label');
        if(!lb||!/Efectivo/i.test(lb.textContent))return;
        c.querySelectorAll('button').forEach(function(b){
          var r=b.getBoundingClientRect();
          o.push({t:b.textContent.trim().slice(0,12),w:Math.round(r.width),h:Math.round(r.height)});
        });
      });return JSON.stringify(o);})()`);
    const B = JSON.parse(bots);
    console.log('     botones del efectivo: ' + B.map(b => b.t + ' ' + b.w + 'x' + b.h).join(' · '));
    chequear(B.length === 3, 'la tarjeta de Efectivo tiene sus 3 botones', String(B.length));
    chequear(B.every(b => b.w >= 60), 'y ninguno queda por debajo de 60px de ancho',
      JSON.stringify(B.filter(b => b.w < 60)));

    console.log('\n── EL AJUSTE: un campo por cuenta ──');
    /* A partir de aca se mide la ACTUALIZACION OPTIMISTA: que la tarjeta se
       mueva sin esperar al servidor. Despues de cada POST el ERP llama a
       `_recargarCaja()`, que trae el dato real de la planilla — donde el POST
       nunca llego, porque el test lo intercepto. O sea que el ERP se corrige y
       hace BIEN: pisa la marca optimista con la verdad del servidor. Para que
       la medicion sea determinista se neutraliza ese refresco.
       Sin esto el resultado dependia de cual llegaba primero: la misma version
       daba 54 ok a 1440px y 52 ok a 390px. Un test que cambia de color por el
       timing no prueba nada. */
    await evaluar(cli, `window._recargarCaja=function(){};`);

    await evaluar(cli, `toggleAjuste()`);
    await new Promise(r => setTimeout(r, 400));
    const aj = await evaluar(cli, `(function(){
      var f=document.getElementById('ajusteForm');
      var inp=[];
      f.querySelectorAll('input').forEach(function(i){
        var lb=i.parentElement.querySelector('label');
        var r=i.getBoundingClientRect();
        inp.push({id:i.id,label:lb?lb.textContent.trim():'',h:Math.round(r.height)});
      });
      var hints=[];
      f.querySelectorAll('.aj-hint').forEach(function(h){
        if(h.textContent.trim())hints.push({id:h.id,txt:h.textContent.trim()});
      });
      return JSON.stringify({abierto:!f.classList.contains('hidden'),inputs:inp,hints:hints});
    })()`);
    const AJ = JSON.parse(aj);
    chequear(AJ.abierto, 'el formulario abre');
    AJ.inputs.forEach(i => console.log(`     ${i.id.padEnd(16)} "${i.label}"`));
    chequear(AJ.inputs.some(i => i.id === 'ajCta_brubank'),
      'existe el campo del Brubank (ajCta_brubank)',
      AJ.inputs.map(i => i.id).join(', '));
    const brInp = AJ.inputs.find(i => i.id === 'ajCta_brubank');
    chequear(brInp && /Brubank Lucas/.test(brInp.label),
      'y su label sale del Nombre de la hoja', brInp && brInp.label);
    const mpInp = AJ.inputs.find(i => i.id === 'ajMP');
    chequear(mpInp && /Mercado Pago Tadeo/.test(mpInp.label),
      'el campo de siempre pasa a decir "Mercado Pago Tadeo", no "MP liquido"',
      mpInp && mpInp.label);
    chequear(AJ.hints.some(h => h.id === 'ajCtaHint_brubank'),
      'el Brubank tiene su hint "Panel calcula"',
      AJ.hints.map(h => h.id).join(', '));

    console.log('\n── Contar SOLO el Brubank no puede poner los otros en cero ──');
    /* Es el bug del 4/9/2026: el panel mandaba los cuatro campos siempre y un
       input vacio parsea a 0, asi que ajustar el efectivo le ponia Mercado Pago
       e Inversiones en CERO. Con una cuenta mas, el riesgo se multiplica. */
    await evaluar(cli, `(function(){
      document.getElementById('ajCF').value='';
      document.getElementById('ajBil').value='';
      document.getElementById('ajMP').value='';
      document.getElementById('ajInv').value='';
      document.getElementById('ajCta_brubank').value='150000';
      window.__posts=[];
      guardarAjuste();
    })()`);
    await esperar(cli, `window.__posts.length>0`, 15000);
    await new Promise(r => setTimeout(r, 900));
    const pj = await evaluar(cli, `JSON.stringify((window.__posts||[]).filter(function(p){return p.action==='ajusteSaldo';})[0]||null)`);
    const P = JSON.parse(pj);
    console.log('     body: ' + JSON.stringify(P));
    chequear(!!P, 'salio el POST de ajuste');
    if (P) {
      chequear(Number(P.cta_brubank) === 150000, 'manda cta_brubank = 150000', String(P.cta_brubank));
      chequear(Math.abs(Number(P.mp) - N.porCta.mp) < 1,
        'y Mercado Pago va con el CALCULADO, no en cero',
        P.mp + ' (esperaba ' + Math.round(N.porCta.mp) + ')');
      chequear(Math.abs(Number(P.efectivo) - N.porCta.efectivo) < 1,
        'y el Efectivo tampoco en cero', String(P.efectivo));
      chequear(Math.abs(Number(P.inversiones) - N.inv) < 1,
        'ni las Inversiones', String(P.inversiones));
    }
    const av = await evaluar(cli, `JSON.stringify(window.__ultimoToast||'')`);
    const tst = await evaluar(cli, `(function(){var t=document.getElementById('toast');return t?t.textContent.trim():'';})()`);
    console.log('     toast: "' + tst + '"');
    chequear(/Brubank/i.test(tst), 'el aviso nombra la cuenta que se toco', tst);
    chequear(/resto qued/i.test(tst), 'y aclara que el resto quedo como estaba', tst);
    /* Y la tarjeta tiene que moverse ya: la actualizacion optimista. */
    await new Promise(r => setTimeout(r, 600));
    const brDesp = await evaluar(cli, `(function(){
      var o='';document.querySelectorAll('#cBal .bal-card').forEach(function(c){
        var lb=c.querySelector('.bal-label');
        if(lb&&/Brubank/i.test(lb.textContent)){var v=c.querySelector('.bal-val');o=v?v.textContent.trim():'';}
      });return o;})()`);
    chequear(leer(brDesp) === 150000,
      'la tarjeta del Brubank ya dice $150.000 sin esperar al volcado', brDesp);
    const sigue3 = await evaluar(cli, `document.querySelectorAll('#cBal .bal-card').length`);
    chequear(sigue3 === 4,
      'y siguen las 4 tarjetas (no se perdio `cuentas` al resetear D.caja)', String(sigue3));
    /* Con el Brubank en $150.000, la Posicion total tiene que subir esos
       $150.000. Es el chequeo que agarra "el total suma solo efectivo + la
       digital por defecto": con la cuenta en cero los dos criterios dan igual,
       asi que sin plata adentro el bug es invisible. Y el total es el primer
       numero que Tadeo mira. */
    const totDesp = await evaluar(cli, `(function(){
      var o='';document.querySelectorAll('#cBal .bal-card.total').forEach(function(c){
        var v=c.querySelector('.bal-val');o=v?v.textContent.trim():'';});return o;})()`);
    console.log('     posición total ahora: ' + totDesp + '  (antes ' + tot.val + ')');
    /* El total cambia en (lo nuevo - lo que habia). Hasta que el Brubank se
       conto eso era +150.000; con $559.131 contados es -409.131. Escrito asi
       vale para cualquier dato. */
    const _espTot = N.total - (N.porCta.brubank || 0) + 150000;
    chequear(Math.abs(leer(totDesp) - _espTot) < 1,
      'la Posición total se mueve exactamente lo que cambió el Brubank',
      totDesp + ' — esperaba ' + money(_espTot));

    console.log('\n── EL GASTO: se puede pagar desde el Brubank ──');
    await evaluar(cli, `toggleCajaForm('gasto')`);
    await new Promise(r => setTimeout(r, 400));
    const gf = await evaluar(cli, `(function(){
      var f=document.getElementById('formGasto'),inp=[];
      f.querySelectorAll('input').forEach(function(i){
        var lb=i.parentElement.querySelector('label');
        var r=i.getBoundingClientRect();
        inp.push({id:i.id,label:lb?lb.textContent.trim():'',h:Math.round(r.height)});
      });
      return JSON.stringify({abierto:!f.classList.contains('hidden'),inputs:inp});
    })()`);
    const GF = JSON.parse(gf);
    chequear(GF.abierto, 'el formulario de gasto abre');
    chequear(GF.inputs.some(i => i.id === 'gCta_brubank'),
      'existe el campo del Brubank en el gasto',
      GF.inputs.map(i => i.id).join(', '));
    const gmp = GF.inputs.find(i => i.id === 'gMP');
    chequear(gmp && /Mercado Pago Tadeo/.test(gmp.label),
      'y el de siempre dice el nombre real de la cuenta', gmp && gmp.label);
    const chicos = GF.inputs.filter(i => i.h > 0 && i.h < 34);
    chequear(chicos.length === 0, 'ningun campo por debajo de 34px',
      chicos.map(i => i.id + ' ' + i.h).join(', '));

    console.log('\n── Un gasto pagado con Brubank manda `montos`, no el formato viejo ──');
    await evaluar(cli, `(function(){
      document.getElementById('gCat').value=document.getElementById('gCat').options[1]?document.getElementById('gCat').options[1].value:'Otro';
      document.getElementById('gCon').value='prueba brubank';
      document.getElementById('gEf').value='';
      document.getElementById('gMP').value='';
      document.getElementById('gCta_brubank').value='7500';
      window.__posts=[];
      guardarGasto({preventDefault:function(){}});
    })()`);
    await esperar(cli, `(window.__posts||[]).length>0`, 15000);
    await new Promise(r => setTimeout(r, 900));
    const gpj = await evaluar(cli, `JSON.stringify((window.__posts||[]).filter(function(p){return p.action==='gasto';}))`);
    const GP = JSON.parse(gpj);
    console.log('     ' + GP.length + ' POST: ' + JSON.stringify(GP));
    chequear(GP.length === 1, 'un solo POST (no uno por cuenta)', 'salieron ' + GP.length);
    if (GP.length) {
      const g = GP[0];
      chequear(!!g.montos && Number(g.montos.brubank) === 7500,
        'manda montos.brubank = 7500', JSON.stringify(g.montos));
      chequear(g.montoEf === undefined && g.montoMp === undefined,
        'y NO manda montoEf/montoMp — un backend viejo tiene que fallar ruidoso, no guardar de menos',
        'montoEf=' + g.montoEf + ' montoMp=' + g.montoMp);
      chequear(g.metodo === undefined && g.monto === undefined,
        'ni el formato legacy');
    }
    const gtst = await evaluar(cli, `(function(){var t=document.getElementById('toast');return t?t.textContent.trim():'';})()`);
    console.log('     toast: "' + gtst + '"');
    chequear(/Brubank/i.test(gtst), 'el aviso nombra el Brubank', gtst);
    const brG = await evaluar(cli, `(function(){
      var o='';document.querySelectorAll('#cBal .bal-card').forEach(function(c){
        var lb=c.querySelector('.bal-label');
        if(lb&&/Brubank/i.test(lb.textContent)){var v=c.querySelector('.bal-val');o=v?v.textContent.trim():'';}
      });return o;})()`);
    chequear(leer(brG) === 150000 - 7500,
      'y la tarjeta del Brubank baja a $142.500 al instante', brG);

    console.log('\n── COMPATIBILIDAD: un gasto solo en efectivo sigue con el formato de siempre ──');
    await evaluar(cli, `(function(){
      document.getElementById('gCat').value=document.getElementById('gCat').options[1]?document.getElementById('gCat').options[1].value:'Otro';
      document.getElementById('gCon').value='prueba efectivo';
      document.getElementById('gEf').value='1000';
      document.getElementById('gMP').value='';
      var b=document.getElementById('gCta_brubank');if(b)b.value='';
      window.__posts=[];
      guardarGasto({preventDefault:function(){}});
    })()`);
    await esperar(cli, `(window.__posts||[]).length>0`, 15000);
    await new Promise(r => setTimeout(r, 700));
    const g2j = await evaluar(cli, `JSON.stringify((window.__posts||[]).filter(function(p){return p.action==='gasto';})[0]||null)`);
    const G2 = JSON.parse(g2j);
    console.log('     body: ' + JSON.stringify(G2));
    chequear(!!G2 && G2.montos === undefined,
      'sin cuentas extra NO manda `montos`', JSON.stringify(G2 && G2.montos));
    chequear(!!G2 && Number(G2.montoEf) === 1000 && G2.metodo === 'Efectivo',
      'manda montoEf + metodo, igual que antes del 10/9',
      G2 && ('montoEf=' + G2.montoEf + ' metodo=' + G2.metodo));

    console.log('\n── EL INGRESO tambien ──');
    await evaluar(cli, `toggleCajaForm('ingreso')`);
    await new Promise(r => setTimeout(r, 400));
    const inTiene = await evaluar(cli, `!!document.getElementById('iCta_brubank')`);
    chequear(inTiene === true, 'existe el campo del Brubank en el ingreso');
    await evaluar(cli, `(function(){
      var c=document.getElementById('iCat');c.value=c.options[1]?c.options[1].value:'Otro';
      document.getElementById('iCon').value='prueba ing brubank';
      document.getElementById('iEf').value='';
      document.getElementById('iMP').value='';
      document.getElementById('iCta_brubank').value='3000';
      window.__posts=[];
      guardarIngreso({preventDefault:function(){}});
    })()`);
    await esperar(cli, `(window.__posts||[]).length>0`, 15000);
    await new Promise(r => setTimeout(r, 900));
    const ipj = await evaluar(cli, `JSON.stringify((window.__posts||[]).filter(function(p){return p.action==='ingreso';})[0]||null)`);
    const IP = JSON.parse(ipj);
    console.log('     body: ' + JSON.stringify(IP));
    chequear(!!IP && !!IP.montos && Number(IP.montos.brubank) === 3000,
      'el ingreso manda montos.brubank = 3000', JSON.stringify(IP && IP.montos));
    const brI = await evaluar(cli, `(function(){
      var o='';document.querySelectorAll('#cBal .bal-card').forEach(function(c){
        var lb=c.querySelector('.bal-label');
        if(lb&&/Brubank/i.test(lb.textContent)){var v=c.querySelector('.bal-val');o=v?v.textContent.trim():'';}
      });return o;})()`);
    chequear(leer(brI) === 150000 - 7500 + 3000,
      'y la tarjeta SUBE a $145.500 (un ingreso suma)', brI);

    console.log('\n── El libro diario dice de que cuenta salio ──');
    const mv = await evaluar(cli, `JSON.stringify((D.movimientos||[]).slice(0,4).map(function(m){return {t:m.tipo,c:m.con,met:m.met,$:m.$};}))`);
    console.log('     ' + mv);
    chequear(/Brubank Lucas/.test(mv),
      'el movimiento nuevo dice "Brubank Lucas" en Metodo', mv);

    console.log('\n── ERRORES DE CONSOLA ──');
    const errs = await evaluar(cli, `JSON.stringify(window.__err||[])`);
    const E = JSON.parse(errs);
    const propios = E.filter(e => !/favicon|manifest|sw-panel|Failed to load resource/i.test(e));
    chequear(propios.length === 0, 'ninguno propio', propios.slice(0, 3).join(' | '));

    console.log(`\n=== ${ANCHO}px: ${ok} ok · ${mal} mal ===`);
  } catch (e) {
    mal++;
    console.log('\n  EXPLOTO: ' + e.message);
  } finally {
    cli.matar();
  }
  process.exit(mal ? 1 : 0);
})();
