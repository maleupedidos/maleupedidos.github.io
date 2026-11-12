# Pruebas que simulan Apps Script (archivadas el 12/11/2026)

Desde el corte a la base (8/11/2026, v990) Apps Script está apagado: el ERP lee y escribe por Supabase.
Estas 100 pruebas **solo simulan respuestas de Apps Script** (`?action=…`) y no tocan la base por ningún lado
(ni RPC, ni sesión real, ni Supabase), así que ya no prueban nada vivo. Ninguna la usa `deploy.sh`, el robot
ni otra pieza (`require`), y ninguna se tocó después del 4/11/2026.

**No se borraron:** se movieron acá para que no confundan. Para revivir una, migrá su simulación a la base
(como `probar_kit.js`, que entra con `SBSES` y corta los POST) y volvela a `_tools/pruebas/`.

Quedaron afuera a propósito, porque se tocaron después del 4/11 y pueden seguir vivas:
`probar_dia_entregado.js`, `probar_eerr_economico.js`, `probar_pagos_tab.js` y `probar_resumen_global.js`.
