#!/usr/bin/env bash
set -euo pipefail

SRC="${FLOWPLAN_SRC:-/d/FlowPlan}"
MSYS="${MSYS2_ROOT:-/d/msys64}"
CARGO_BIN="${CARGO_BIN:-$HOME/.cargo/bin}"
TARGET="${FLOWPLAN_TARGET_DIR:-$SRC/src-tauri/target-gnu}"
MODE="${1:-build}"

fail() { echo "ERROR: $*" >&2; exit 1; }

[ -d "$SRC/src-tauri" ] || fail "source not found: $SRC (set FLOWPLAN_SRC)"
[ -x "$MSYS/mingw64/bin/x86_64-w64-mingw32-gcc.exe" ] || fail "MinGW not found in $MSYS (set MSYS2_ROOT)"
[ -x "$CARGO_BIN/cargo.exe" ] || fail "cargo not found in $CARGO_BIN"
[ -x "$CARGO_BIN/rustup.exe" ] || fail "rustup not found in $CARGO_BIN"
command -v node >/dev/null || fail "node is not on PATH"
command -v npm >/dev/null || fail "npm is not on PATH"

VERSION=$(node -e "const fs=require('fs');const p=process.argv[1];console.log(JSON.parse(fs.readFileSync(p,'utf8')).version)" "$SRC/src-tauri/tauri.conf.json")
echo "source: $SRC"
echo "version: $VERSION"
echo "target dir: $TARGET"

PATCH_MISSING=0
if ! grep -q 'custom-protocol' "$SRC/src-tauri/Cargo.toml"; then
  echo "PATCH NEEDED: add \"custom-protocol\" to the tauri features in src-tauri/Cargo.toml"
  PATCH_MISSING=1
fi
if ! head -5 "$SRC/src-tauri/src/main.rs" | grep -q 'windows_subsystem'; then
  echo "PATCH NEEDED: add #![cfg_attr(not(debug_assertions), windows_subsystem = \"windows\")] to src-tauri/src/main.rs"
  PATCH_MISSING=1
fi

if [ "$PATCH_MISSING" = "1" ] && [ "$MODE" != "--force" ]; then
  echo "Apply the two patches described in SKILL.md, then rerun. Use --force only if you know the build already has equivalents."
  exit 2
fi

export PATH="$MSYS/mingw64/bin:$CARGO_BIN:$PATH"
export RUSTUP_TOOLCHAIN="${FLOWPLAN_RUSTUP_TOOLCHAIN:-stable-x86_64-pc-windows-gnu}"

rustup target list --toolchain "$RUSTUP_TOOLCHAIN" --installed | grep -q x86_64-pc-windows-gnu \
  || fail "Rust GNU target missing. Run: rustup target add --toolchain $RUSTUP_TOOLCHAIN x86_64-pc-windows-gnu"

if [ "$MODE" = "--check" ]; then
  echo "CHECK OK (patches, toolchain, source)"
  exit 0
fi

echo "Installing npm dependencies and building the frontend..."
( cd "$SRC" && npm ci && npm run build )

echo "Building FlowPlan (Rust GNU release)..."
LOG="$SRC/build-gnu.log"
set +e
( cd "$SRC/src-tauri" && \
  CARGO_TARGET_DIR="$TARGET" \
  CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=x86_64-w64-mingw32-gcc \
  cargo build --release --target x86_64-pc-windows-gnu ) > "$LOG" 2>&1
STATUS=$?
set -e
if [ "$STATUS" -ne 0 ]; then
  echo "BUILD FAILED (cargo exit $STATUS). Last log lines:" >&2
  tail -n 40 "$LOG" >&2
  exit "$STATUS"
fi

EXE="$TARGET/x86_64-pc-windows-gnu/release/FlowPlan.exe"
[ -f "$EXE" ] || fail "expected exe not found: $EXE"

echo "EXE: $EXE"
echo "size: $(stat -c %s "$EXE") bytes"
if "$MSYS/mingw64/bin/objdump.exe" -p "$EXE" | grep -q "Windows GUI"; then
  echo "subsystem: Windows GUI"
else
  echo "WARNING: subsystem is not Windows GUI; check the windows_subsystem patch" >&2
fi

echo "BUILD OK"
