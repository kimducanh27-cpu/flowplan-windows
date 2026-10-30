#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SKILL_DIR=$(dirname "$SCRIPT_DIR")
ASSETS="$SKILL_DIR/assets"

SRC="${FLOWPLAN_SRC:-/d/FlowPlan}"
TARGET="${FLOWPLAN_TARGET_DIR:-$SRC/src-tauri/target-gnu}"
OUT="${FLOWPLAN_OUT:-$SRC/dist}"

fail() { echo "ERROR: $*" >&2; exit 1; }

command -v node >/dev/null || fail "node is not on PATH"
command -v sha256sum >/dev/null || fail "sha256sum is not on PATH"
command -v powershell.exe >/dev/null || fail "powershell.exe is not on PATH"
command -v cygpath >/dev/null || fail "cygpath is not on PATH (Git Bash required)"

VERSION="${FLOWPLAN_VERSION:-$(node -e "const fs=require('fs');const p=process.argv[1];console.log(JSON.parse(fs.readFileSync(p,'utf8')).version)" "$SRC/src-tauri/tauri.conf.json")}"
VERSION="${VERSION#v}"
TAG="${FLOWPLAN_TAG:-v${VERSION}-win64}"
EXE="$TARGET/x86_64-pc-windows-gnu/release/FlowPlan.exe"
STAGE="$OUT/FlowPlan-$VERSION-win64"
ZIP_NAME="FlowPlan-$VERSION-windows-x64.zip"
ZIP="$OUT/$ZIP_NAME"
SHA_FILE="$ZIP.sha256"
DATE=$(date +%F)

[ -f "$EXE" ] || fail "built exe not found: $EXE (run build-flowplan.sh first)"
DLL=$(find "$HOME/.cargo/registry/src" -path "*webview2-com-sys-*/x64/WebView2Loader.dll" 2>/dev/null | head -1)
[ -n "$DLL" ] || fail "WebView2Loader.dll not found in cargo registry"

rm -rf "$STAGE"
mkdir -p "$STAGE" "$OUT"
cp "$EXE" "$STAGE/FlowPlan.exe"
cp "$DLL" "$STAGE/WebView2Loader.dll"
cp "$ASSETS/LICENSE.txt" "$STAGE/LICENSE.txt"

sed \
  -e "s/{{VERSION}}/$VERSION/g" \
  -e "s/{{DATE}}/$DATE/g" \
  "$ASSETS/README.txt" > "$STAGE/README.txt"

rm -f "$ZIP" "$SHA_FILE"
STAGE_WIN=$(cygpath -w "$STAGE")
ZIP_WIN=$(cygpath -w "$ZIP")
powershell.exe -NoProfile -Command "Compress-Archive -Path '$STAGE_WIN' -DestinationPath '$ZIP_WIN' -CompressionLevel Optimal -Force"

[ -f "$ZIP" ] || fail "zip was not created: $ZIP"
( cd "$OUT" && sha256sum "$ZIP_NAME" > "$ZIP_NAME.sha256" )
SHA=$(cut -d' ' -f1 "$SHA_FILE")
[ -n "$SHA" ] || fail "could not read sha256"

cp "$ASSETS/LICENSE.txt" "$OUT/LICENSE"
sed \
  -e "s/{{VERSION}}/$VERSION/g" \
  -e "s/{{TAG}}/$TAG/g" \
  -e "s/{{ZIP_NAME}}/$ZIP_NAME/g" \
  -e "s/{{SHA256}}/$SHA/g" \
  "$ASSETS/README-repo.md" > "$OUT/README-repo.md"
sed \
  -e "s/{{VERSION}}/$VERSION/g" \
  -e "s/{{TAG}}/$TAG/g" \
  -e "s/{{ZIP_NAME}}/$ZIP_NAME/g" \
  -e "s/{{SHA256}}/$SHA/g" \
  "$ASSETS/release-body.md" > "$OUT/release-body.md"

echo "STAGE: $STAGE"
echo "ZIP: $ZIP"
echo "ZIP size: $(stat -c %s "$ZIP") bytes"
echo "SHA256: $SHA"
echo "REPO README: $OUT/README-repo.md"
echo "RELEASE BODY: $OUT/release-body.md"
echo "PACKAGE OK"
