#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  deploy.sh — publica las PWAs (GitHub Pages) con los chequeos que faltaban.
#
#  Uso:  ./deploy.sh "que cambiaste"
#
#  El ERP se publica en /app.html — lo genera _tools/build.js a partir de
#  _src/panel.src.html + ruta.html + red.html + busqueda.html.
#
#  Existe porque este repo NO tenia red de contencion, a diferencia de
#  estancias/. Dos formas de romperlo en silencio, ambas ya pasadas:
#    · Otra sesion de Claude pushea y esta trabaja sobre una copia vieja.
#    · Se toca un .html y no se sube el CACHE_NAME del service worker: el push
#      sale "OK" y el celular sigue mostrando la version anterior. (20/08/2026)
#  El push a GitHub ES la publicacion: si algo sale mal, sale mal en produccion.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

MSG="${1:-}"
if [ -z "$MSG" ]; then echo "Falta el mensaje.  Uso: ./deploy.sh \"que cambiaste\"" >&2; exit 1; fi

RED=$'\e[31m'; GRN=$'\e[32m'; YEL=$'\e[33m'; RST=$'\e[0m'
fallar(){ echo "${RED}✖ $1${RST}" >&2; exit 1; }

# ── 0. Generar panel.html ────────────────────────────────────────────────────
#  app.html NO se edita: se arma con _tools/build.js a partir de
#  _src/panel.src.html + ruta.html + red.html + busqueda.html. Se regenera
#  SIEMPRE, asi es imposible publicar un ERP viejo despues de tocar una sub-app.
echo "→ [0/8] Armando app.html…"
[ -d node_modules ] || { echo "    faltan dependencias, instalando…"; npm install --no-audit --no-fund >/dev/null; }
node _tools/build.js | sed 's/^/    /' || fallar "El build no compilo — no se publica nada."

# ── 1. Rama y sincronia con origin ───────────────────────────────────────────
echo "→ [1/8] Sincronia con origin…"
BR="$(git rev-parse --abbrev-ref HEAD)"
[ "$BR" = "main" ] || fallar "Estas en la rama '$BR', no en main."
git fetch -q origin main
DETRAS="$(git rev-list --count HEAD..origin/main)"
if [ "$DETRAS" -gt 0 ]; then
  echo "${YEL}Tu copia esta $DETRAS commit(s) DETRAS de origin/main:${RST}"
  git log --oneline HEAD..origin/main | sed 's/^/    /'
  echo "  Otra sesion publico y vos no lo tenes. Traelo antes de seguir:"
  echo "     git pull --rebase origin main"
  fallar "Publicar ahora seria trabajar sobre una base vieja."
fi
echo "  OK: al dia con origin/main."

# ── 2. Que haya algo que publicar ────────────────────────────────────────────
echo "→ [2/8] Cambios a publicar…"
CAMBIOS="$(git status --porcelain -- '*.html' '*.js' '*.json' '*.css' | awk '{print $NF}' | sort -u)"
if [ -z "$CAMBIOS" ] && [ "$(git rev-list --count origin/main..HEAD)" -eq 0 ]; then
  fallar "No hay nada modificado ni ningun commit pendiente de push."
fi
[ -n "$CAMBIOS" ] && echo "$CAMBIOS" | sed 's/^/    /' || echo "    (solo commits ya hechos, pendientes de push)"

# ── 3. Sintaxis de los HTML tocados ──────────────────────────────────────────
echo "→ [3/8] Sintaxis…"
HTMLS="$(echo "${CAMBIOS:-}" | grep -E '\.html$' || true)"
if [ -n "$HTMLS" ]; then
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    OUT="$(node _tools/checkjs.js "$f")"
    echo "    $OUT"
    case "$OUT" in FALLO*) fallar "JS roto en $f — no se publica.";; esac
  done <<< "$HTMLS"
else
  echo "    (ningun .html modificado)"
fi

# ── 3b. Botones muertos ──────────────────────────────────────────────────────
#  La sintaxis puede estar perfecta y el boton no hacer NADA: un onclick que
#  llama a una funcion que el fusionador renombro. No tira error, no aparece en
#  la consola. Fueron 311 botones y me entere semanas despues. (25/08/2026)
echo "→ [3b/8] Botones muertos…"
if [ -n "$HTMLS" ]; then
  node _tools/verificar.js | sed 's/^/    /' || fallar "Hay botones que no hacen nada — no se publica."
else
  echo "    (ningun .html modificado)"
fi

# ── 3c. Que arranque de verdad ───────────────────────────────────────────────
#  `node --check` dice que el JS parsea, no que la app arranca. Ya rompi Ruta y
#  Abastecimiento pasando el chequeo de sintaxis. (19/08/2026)
#  Abre el ERP en un Chrome headless y prueba las tres sub-apps. Tarda ~1 min.
#  Si alguna vez hay que saltarlo por una urgencia:  SIN_HUMO=1 ./deploy.sh "…"
echo "→ [3c/8] Arranca en un navegador de verdad…"
if [ -n "${SIN_HUMO:-}" ]; then
  echo "${YEL}    SALTEADO a mano (SIN_HUMO=1). Abri el ERP y miralo vos.${RST}"
elif [ -n "$HTMLS" ]; then
  node _tools/humo.js | sed 's/^/    /' || fallar "El ERP no arranca limpio — no se publica."
else
  echo "    (ningun .html modificado)"
fi

# ── 4. Service worker al dia ─────────────────────────────────────────────────
#  Si cambio el HTML de una PWA, su CACHE_NAME tiene que cambiar tambien, o el
#  celular que ya tiene ese nombre cacheado no invalida nada.
echo "→ [4/8] Service workers…"
# Ruta, Mi Portal y Abastecimiento ya no son PWAs aparte: se compilan adentro
# de panel.html. Entonces tocar CUALQUIERA de las cuatro fuentes obliga a subir
# el CACHE_NAME de sw-panel.js — es el unico service worker que queda vivo.
sw_de(){ case "$1" in app.html|_src/panel.src.html|ruta.html|red.html|busqueda.html) echo sw-panel.js;;
                       *) echo "";; esac; }
if [ -n "$HTMLS" ]; then
  VISTOS=""
  while IFS= read -r f; do
    SW="$(sw_de "$f")"; [ -n "$SW" ] || continue
    case " $VISTOS " in *" $SW "*) continue;; esac
    VISTOS="$VISTOS $SW"
    ACT="$(grep -oE "maleu-[a-z]+-v[0-9]+" "$SW" | head -1)"
    PUB="$(git show "origin/main:$SW" 2>/dev/null | grep -oE "maleu-[a-z]+-v[0-9]+" | head -1 || echo "")"
    if [ "$ACT" = "$PUB" ]; then
      fallar "Tocaste $f pero $SW sigue en $ACT (igual que lo publicado).
    Subile la version, si no el celular sirve la copia vieja:
       sed -i 's/$ACT/maleu-XXX-vNN/' $SW"
    fi
    echo "    $f → $SW: $PUB → ${GRN}$ACT${RST}"
  done <<< "$HTMLS"
else
  echo "    (nada que revisar)"
fi

# ── 5. Commit + push ─────────────────────────────────────────────────────────
echo "→ [5/8] Publicando…"
git add -A
git diff --cached --quiet || git -c commit.gpgsign=false commit -q -m "$MSG

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
# El helper es Git Credential Manager y la identidad la decide la carpeta via
# includeIf en ~/.gitconfig (Trabajo\ -> maleupedidos). No hace falta forzar
# token ni correr `gh auth switch`: un push que falla NO es por la cuenta activa.
# Diagnostico completo en C:\Tadeo Ustariz\CLAUDE.md, "Dos cuentas de GitHub".
git push -q origin main
echo "${GRN}✅ Publicado — $MSG${RST}"
echo "   GitHub Pages tarda ~1 min. Publicar y verificar son dos cosas distintas."
echo ""
# OJO: el curl a app.maleu.com.ar NO devuelve el ERP. Desde el 25/08/2026 esta
# detras de Cloudflare Access y contesta 302 a la pantalla de login. El comando
# que estaba aca antes no podia funcionar y daba una falsa sensacion de chequeo.
if [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
  echo "   Verificando contra lo PUBLICADO…"
  sleep 60
  node _tools/verificar.js --vivo | sed 's/^/   /' || true
else
  echo "   ${YEL}Para verificar el ERP publicado desde la terminal falta un service token${RST}"
  echo "   de Cloudflare Access (se crea una vez):"
  echo "     Zero Trust → Access → Service Auth → Create Service Token"
  echo "     y agregarlo a la politica de la app de app.maleu.com.ar"
  echo "   Despues:  export CF_ACCESS_CLIENT_ID=…  CF_ACCESS_CLIENT_SECRET=…"
  echo "   Mientras tanto: abri app.maleu.com.ar/app.html y mira la consola."
fi
