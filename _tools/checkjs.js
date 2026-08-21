// Extrae los <script> inline de un HTML y los valida con el parser de Node.
const fs=require('fs'),vm=require('vm');
const f=process.argv[2];
const src=fs.readFileSync(f,'utf8');
const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m,n=0,bad=0;
while((m=re.exec(src))){
  if(/\bsrc\s*=/.test(m[1]))continue;
  if(/type\s*=\s*["'](?!text\/javascript|application\/javascript)/.test(m[1]))continue;
  n++;
  const line=src.slice(0,m.index).split('\n').length;
  try{new vm.Script(m[2],{filename:f});}
  catch(e){bad++;console.log('  ERROR bloque #'+n+' (empieza linea '+line+'): '+e.message);}
}
console.log((bad?'FALLO':'OK')+' — '+f+': '+n+' bloques inline, '+bad+' con error');
