/* La carga de recorrido transforma notas de WhatsApp en una vista previa y no
   debe inventar visitas donde la línea sólo contiene un número. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

async function main(){
  const cli=await abrir();
  try{
    await cli.enviar('Page.enable');
    await cli.enviar('Page.navigate',{url:'http://127.0.0.1:8080/app.html'});
    for(let i=0;i<80;i++){
      if(await evaluar(cli,'typeof window.estFolAbrir').catch(()=>'' )==='function')break;
      await new Promise(r=>setTimeout(r,100));
    }
    const out=await evaluar(cli,`estFolAbrir();
      document.getElementById('folFecha').value='2026-09-15';
      document.getElementById('folRaw').value='151 nadie\\n1 vieja simpática. Entregado\\n2 Golda\\n3\\n6 casa cerrada casi abandonada\\nLote 13 nadie\\n16 entregado a una madre\\n21\\n55 no fuimos';
      estFolPreview();
      ({rows:document.querySelectorAll('.est-fol-row').length,txt:document.getElementById('folPreview').innerText,enabled:!document.getElementById('folGuardar').disabled})`);
    const ok=out.rows===7&&out.enabled&&/Lote 151/.test(out.txt)&&/Entregado en mano/.test(out.txt)&&/Toqué, no había nadie/.test(out.txt)&&/Visita pendiente/.test(out.txt)&&!/^Lote 3$/m.test(out.txt)&&!/^Lote 21$/m.test(out.txt);
    if(!ok)throw new Error(JSON.stringify(out));
    console.log('7 ok · recorrido: clasifica, previsualiza y no inventa líneas vacías');
  } finally { cli.matar(); }
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});
