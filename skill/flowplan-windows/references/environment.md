# FlowPlan Windows environment

## Repos and versions

- Upstream: `https://github.com/Bariskau/flowplan` (default branch `master`, MIT per README; no LICENSE file upstream).
- Distribution: `https://github.com/kimducanh27-cpu/flowplan-windows` (public, default `main`).
- Last known upstream build: **v1.3.2**, commit `25a6cf2` (“undo redo bug fix”).
- Last known release: tag `v1.3.2-win64`, zip `FlowPlan-1.3.2-windows-x64.zip`, SHA256 `6b2b7f5a493e028289699da6efe63b9abe61578aee6767259bd15ef00df0d981`.
- Release URL: `https://github.com/kimducanh27-cpu/flowplan-windows/releases/tag/v1.3.2-win64`.

Verify the latest upstream version before rebuilding:
`https://api.github.com/repos/Bariskau/flowplan/releases/latest` or `git -C /d/FlowPlan fetch --tags origin`.

## Local paths

| Purpose | Path |
|---|---|
| Source clone | `D:\FlowPlan` (git remote must stay upstream) |
| Build target | `D:\FlowPlan\src-tauri\target-gnu` |
| Built exe | `D:\FlowPlan\src-tauri\target-gnu\x86_64-pc-windows-gnu\release\FlowPlan.exe` |
| Installed app | `C:\Users\ducti\AppData\Local\Programs\FlowPlan` |
| App data | `C:\Users\ducti\.plan-visual-planner` (`state.json`, `history/`) |
| Desktop shortcut | `C:\Users\ducti\OneDrive\Desktop\FlowPlan.lnk` |
| Start Menu | `C:\Users\ducti\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\FlowPlan.lnk` |
| MSYS2 | `D:\msys64` |
| Rust/cargo | `C:\Users\ducti\.cargo\bin` |

The app is portable: `FlowPlan.exe` + `WebView2Loader.dll` must stay in the same folder. Do not move the exe alone.

## Toolchain

- Node `24.21.0`, npm `11.19.0`; `npm ci` may warn that sharp/workerd/esbuild install scripts were blocked, but the Vite build worked.
- Rust `1.99.1`; two toolchains installed:
  - `stable-x86_64-pc-windows-msvc` (default; do not use for this build)
  - `stable-x86_64-pc-windows-gnu` (use for build scripts and the target)
- MSYS2 MinGW: gcc `16.2.0`, windres `2.47`.
- WebView2 Runtime `156.0.4314.56` installed system-wide (Windows 11).

If MSYS2 is missing on a replacement machine (no admin required):

```bash
mkdir -p /d/msys64_download
curl -L -o /d/msys64_download/msys2-base.tar.xz \
  https://github.com/msys2/msys2-installer/releases/download/nightly-x86_64/msys2-base-x86_64-latest.tar.xz
tar -xf /d/msys64_download/msys2-base.tar.xz -C /d
MSYSTEM=MINGW64 /d/msys64/usr/bin/bash.exe -lc \
  "pacman -Sy --noconfirm; pacman -S --needed --noconfirm mingw-w64-x86_64-gcc"
```

If Rust is missing:

```bash
curl -sSfL https://win.rustup.rs/x86_64 -o /tmp/rustup-init.exe
/tmp/rustup-init.exe -y --default-host x86_64-pc-windows-msvc --profile minimal --no-modify-path
export PATH="$HOME/.cargo/bin:$PATH"
rustup toolchain install stable-x86_64-pc-windows-gnu --profile minimal
```

## Required local patches

The source clone may already have these; reapply after upstream changes.

1. `src-tauri/Cargo.toml`:
   `tauri = { version = "2", features = ["custom-protocol"] }`
   (add `custom-protocol` to the existing feature list, don't remove upstream features).
2. `src-tauri/src/main.rs`, first line:
   `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`

Why: direct `cargo build` (not the Tauri CLI) needs `custom-protocol` to embed the frontend; otherwise the window tries `localhost:5173` and shows “can't reach this page”. The subsystem attribute hides the console window.

## Qoder MCP connector

- Name: `flowplan`; type `http` (Streamable HTTP); URL `http://127.0.0.1:3100/mcp`.
- Added user-scoped; it survives app rebuilds. Verify with the Qoder settings MCP `list_tools` action; 12 tools should be listed.
- The current chat may not see a newly added server; open a new chat or restart Qoder.
- Server only runs while FlowPlan is open; port `3100`; one instance at a time.

## Data and distribution

- All plans are local in `%USERPROFILE%\.plan-visual-planner\`; copy the folder to back up.
- Release assets are built from `D:\FlowPlan\dist` (zip + `.sha256`); the repo README/LICENSE are generated from `assets/` templates.
- The zip contains `FlowPlan.exe`, `WebView2Loader.dll`, `README.txt`, `LICENSE.txt`.
- The build is unsigned; SmartScreen may warn. State this in every release/README.
