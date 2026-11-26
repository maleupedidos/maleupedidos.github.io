/* MI PORTAL DICE LO MISMO QUE EQUIPO (18/11/2026, ronda 2). Para cada representante: lo que el portal muestra en «Te debemos»
   (las quincenas vencidas sin pagar) y en «En curso» tiene que ser lo que Equipo dice en «A pagar hoy» y «En curso».
   Las dos lecturas son de la base y nada se escribe:
     · el portal: `red_mi_liquidacion_pantalla` con la sesión de ESE representante, agrupada con la regla de `_liqBloques`
       (vencida = `q.vencida` o el día de pago ya pasó);
     · Equipo: `equipo_pantalla` con la sesión del dueño (persona.hoy y persona.enCurso).
   SES_ADMIN=<ses.json tadeo> SES_REPS=<fede=ses_fede.json,marcos=…> node _tools/pruebas/cruce_portal_equipo.js */
'use strict';
const fs = require('fs');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const rpc = async (ses, fn, body) => {
  const j = JSON.parse(fs.readFileSync(ses, 'utf8'));
  const r = await fetch(SB + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: PUB, Authorization: 'Bearer ' + j.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const t = await r.text(); if (!r.ok) throw new Error(fn + ' ' + r.status + ' ' + t.slice(0, 160)); return JSON.parse(t);
};
const ars = n => '$' + Math.round(n).toLocaleString('es-AR');
(async () => {
  const eq = await rpc(process.env.SES_ADMIN, 'equipo_pantalla', { p: {} });
  const pers = (eq.personas || eq.lista || []).filter(p => p.grupo === 'red');
  let ok = 0, mal = 0;
  for (const par of String(process.env.SES_REPS || '').split(',').filter(Boolean)) {
    const i = par.indexOf('='), u = par.slice(0, i), f = par.slice(i + 1);
    const L = await rpc(f, 'red_mi_liquidacion_pantalla', { p: {} });
    const hoy = Number(L.hoy) || 0;
    let v = 0, c = 0;
    (L.quincenas || []).forEach(q => { const num = Number(q.pagaNum) || 0, t = Number(q.total) || 0;
      if (q.vencida === true || (num > 0 && num <= hoy)) v += t; else c += t; });
    const nom = String((L.nombre || '')).trim();
    const e = pers.find(p => (u === 'fede' && /andrea/i.test(p.persona)) || (u === 'marcos' && /bottcher/i.test(p.persona)) || (u === 'lou' && /lourdes/i.test(p.persona))
      || (u === 'rufo' && /rufino/i.test(p.persona)) || (u === 'fini' && /fini/i.test(p.persona)));
    const eh = e ? Number(e.hoy) || 0 : null, ec = e ? Number(e.enCurso) || 0 : null;
    const bien = e && Math.abs(v - eh) < 1 && Math.abs(c - ec) < 1;
    bien ? ok++ : mal++;
    console.log((bien ? '  ok   ' : '  MAL  ') + (e ? e.persona : u).padEnd(20) + ' portal: Te debemos ' + ars(v).padEnd(10) + ' En curso ' + ars(c).padEnd(10)
      + ' · Equipo: A pagar hoy ' + (eh == null ? '—' : ars(eh)).padEnd(10) + ' En curso ' + (ec == null ? '—' : ars(ec)));
  }
  console.log('\n' + ok + ' ok, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})().catch(e => { console.log('error', e.message); process.exit(1); });
