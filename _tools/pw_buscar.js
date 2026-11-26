/* ¿Qué playwright-core sirve en esta compu? (15/11/2026) El que trae la revisión de WebKit que está instalada en
 * ms-playwright. Imprime su carpeta, o nada. Lo usa deploy.sh para el detector de pisadas. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
if (process.env.PW && fs.existsSync(process.env.PW)) { process.stdout.write(process.env.PW); process.exit(0); }
const inst = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.cache'), 'ms-playwright');
const hay = fs.existsSync(inst) ? fs.readdirSync(inst) : [];
const cands = [path.join(__dirname, '..', 'node_modules', 'playwright-core')];
const npx = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
if (fs.existsSync(npx)) fs.readdirSync(npx).forEach((d) => cands.push(path.join(npx, d, 'node_modules', 'playwright-core')));
for (const c of cands) {
  try {
    const b = JSON.parse(fs.readFileSync(path.join(c, 'browsers.json'), 'utf8')).browsers.find((x) => x.name === 'webkit');
    if (b && hay.indexOf('webkit-' + b.revision) >= 0) { process.stdout.write(c); process.exit(0); }
  } catch (e) {}
}
