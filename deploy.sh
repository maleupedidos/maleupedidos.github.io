#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  deploy.sh — publica las PWAs (GitHub Pages) con los chequeos que faltaban.
#
#  Uso:  ./deploy.sh "que cambiaste"
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

# ── 1. Rama y sincronia con origin ───────────────────────────────────────────
echo "→ [1/5] Sincronia con origin…"
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
echo "→ [2/5] Cambios a publicar…"
CAMBIOS="$(git status --porcelain -- '*.html' '*.js' '*.json' '*.css' | awk '{print $NF}' | sort -u)"
if [ -z "$CAMBIOS" ] && [ "$(git rev-list --count origin/main..HEAD)" -eq 0 ]; then
  fallar "No hay nada modificado ni ningun commit pendiente de push."
fi
[ -n "$CAMBIOS" ] && echo "$CAMBIOS" | sed 's/^/    /' || echo "    (solo commits ya hechos, pendientes de push)"

# ── 3. Sintaxis de los HTML tocados ──────────────────────────────────────────
echo "→ [3/5] Sintaxis…"
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

# ── 4. Service worker al dia ─────────────────────────────────────────────────
#  Si cambio el HTML de una PWA, su CACHE_NAME tiene que cambiar tambien, o el
#  celular que ya tiene ese nombre cacheado no invalida nada.
echo "→ [4/5] Service workers…"
sw_de(){ case "$1" in panel.html) echo sw-panel.js;; ruta.html) echo sw-ruta.js;;
                       busqueda.html) echo sw-busqueda.js;; *) echo "";; esac; }
if [ -n "$HTMLS" ]; then
  while IFS= read -r f; do
    SW="$(sw_de "$f")"; [ -n "$SW" ] || continue
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
echo "→ [5/5] Publicando…"
git add -A
git diff --cached --quiet || git -c commit.gpgsign=false commit -q -m "$MSG

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
# El helper es Git Credential Manager y la identidad la decide la carpeta via
# includeIf en ~/.gitconfig (Trabajo\ -> maleupedidos). No hace falta forzar
# token ni correr `gh auth switch`: un push que falla NO es por la cuenta activa.
# Diagnostico completo en C:\Tadeo Ustariz\CLAUDE.md, "Dos cuentas de GitHub".
git push -q origin main
echo "${GRN}✅ Publicado — $MSG${RST}"
echo "   GitHub Pages tarda ~1 min. Verificá contra la URL real antes de cantar victoria:"
echo "   curl -s https://maleupedidos.github.io/panel.html | grep -c 'algo-de-tu-cambio'"
