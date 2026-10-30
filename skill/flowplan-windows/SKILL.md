---
name: flowplan-windows
description: Build, update, package, and publish the portable Windows FlowPlan app from the Bariskau/flowplan upstream. Use when upstream releases a new FlowPlan version, when asked to rebuild/update FlowPlan on this Windows machine, to fix the Tauri/WebView2 portable build, or to publish a new Windows ZIP to kimducanh27-cpu/flowplan-windows. Vietnamese triggers: cập nhật/build lại FlowPlan Windows, đóng gói ZIP, upload bản mới.
---

# FlowPlan Windows portable build

## Overview

Rebuild the Windows x64 portable FlowPlan app from upstream and (when asked) publish it to the community repo. This machine cannot install MSVC because UAC prompts are blocked from agent sessions, so the working recipe is **Rust GNU host toolchain + MSYS2/MinGW**, not MSVC.

Read `references/environment.md` for exact paths/versions and `references/troubleshooting.md` for known failures.

## Hard constraints

- Do **not** try to install Visual Studio Build Tools; UAC from the agent returns `1602` immediately. Use the GNU toolchain.
- Use the **GNU host toolchain** (`RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu`), not the MSVC toolchain with an added GNU target. The latter compiles host build scripts for MSVC and invokes Git Bash's `link.exe` (GNU coreutils), failing with `link: extra operand`.
- Keep the source clone's git remote pointing at upstream (`Bariskau/flowplan`). Do **not** repoint it to the distribution repo and do **not** `git push` binaries; publish through the GitHub REST API.
- Close FlowPlan before replacing `FlowPlan.exe`; only one instance may own port `3100`.
- Do not publish a new public release unless the user explicitly asks to update the published version. Building/installing locally is not permission to publish.
- Never print the GitHub token. Read it from the OS credential store inside a single command/script.

## Environment quick reference

| Item | Value |
|---|---|
| Upstream source | `/d/FlowPlan` (default branch `master`) |
| Build target dir | `/d/FlowPlan/src-tauri/target-gnu` |
| EXE output | `src-tauri/target-gnu/x86_64-pc-windows-gnu/release/FlowPlan.exe` |
| MinGW | `/d/msys64/mingw64/bin` (gcc 16.2.0, windres 2.47) |
| Rust | `$HOME/.cargo/bin`, stable 1.99.1, GNU toolchain 1.99.1 |
| Installed app | `%LOCALAPPDATA%\Programs\FlowPlan` (`FlowPlan.exe` + `WebView2Loader.dll`) |
| App data | `%USERPROFILE%\.plan-visual-planner\` |
| MCP | `http://127.0.0.1:3100/mcp` (only while app is open) |
| Distribution repo | `kimducanh27-cpu/flowplan-windows` (public, `main`) |
| Release tag pattern | `v<version>-win64` |

## Workflow

### 1. Determine the upstream version

```bash
git -C /d/FlowPlan fetch --tags origin
git -C /d/FlowPlan log -1 --oneline origin/master
node -e "console.log(require('/d/FlowPlan/package.json').version)"
```

Also check upstream releases if needed:
`https://api.github.com/repos/Bariskau/flowplan/releases/latest`

### 2. Update the source safely

Check `git -C /d/FlowPlan status --short` first. The clone may contain the two local patches below; never discard unknown changes.

Preferred for updates: make a fresh clone and build there, leaving the old source untouched:

```bash
git clone --depth 1 https://github.com/Bariskau/flowplan.git /d/FlowPlan-src-<version>
export FLOWPLAN_SRC=/d/FlowPlan-src-<version>
```

If reusing `/d/FlowPlan`, preserve local changes (stash/commit on a local branch) before pulling. Do not use `git reset --hard` without inspecting the worktree.

### 3. Reapply the two local patches (if upstream still lacks them)

**`src-tauri/Cargo.toml`** — ensure the `tauri` dependency enables the production custom protocol:

```toml
tauri = { version = "2", features = ["custom-protocol"] }
```

If upstream already lists other features, add `"custom-protocol"` to that array instead of replacing it.

**`src-tauri/src/main.rs`** — first line of the file:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```

Why: without `custom-protocol`, a direct production `cargo build` serves the dev URL (`localhost:5173`) and the window shows “can't reach this page”; without the subsystem attribute the release app opens a console window.

### 4. Build

```bash
bash "/c/Users/ducti/.qoder/skills/flowplan-windows/scripts/build-flowplan.sh" --check
bash "/c/Users/ducti/.qoder/skills/flowplan-windows/scripts/build-flowplan.sh"
```

The script validates prerequisites and patches, runs `npm ci && npm run build`, then:

```bash
export PATH="/d/msys64/mingw64/bin:$HOME/.cargo/bin:$PATH"
export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu
cd "$FLOWPLAN_SRC/src-tauri"
CARGO_TARGET_DIR="$FLOWPLAN_SRC/src-tauri/target-gnu" \
CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=x86_64-w64-mingw32-gcc \
  cargo build --release --target x86_64-pc-windows-gnu
```

Expect `Finished release` and a ~35 MB `FlowPlan.exe`.

### 5. Verify the binary

```bash
EXE="$FLOWPLAN_SRC/src-tauri/target-gnu/x86_64-pc-windows-gnu/release/FlowPlan.exe"
/d/msys64/mingw64/bin/objdump.exe -p "$EXE" | grep "Subsystem"
```

Expect `Windows GUI`. Only `WebView2Loader.dll` should be a non-system runtime dependency; copy it next to the exe:

```bash
DLL=$(find "$HOME/.cargo/registry/src" -path "*webview2-com-sys-*/x64/WebView2Loader.dll" | head -1)
cp "$DLL" "/c/Users/ducti/AppData/Local/Programs/FlowPlan/"
```

Install/update locally:

1. `taskkill //F //IM FlowPlan.exe` (close all instances).
2. Copy the new exe to `%LOCALAPPDATA%\Programs\FlowPlan\FlowPlan.exe`; keep `WebView2Loader.dll`.
3. `Unblock-File` both files if present.
4. Launch via the Desktop shortcut; wait 5–8 s.
5. `curl -s http://127.0.0.1:3100/health` must return `{"ok":true}`.
6. Run the MCP smoke test:

```bash
node "/c/Users/ducti/.qoder/skills/flowplan-windows/scripts/smoke-mcp.mjs"
```

It expects ≥12 tools, creates a temporary plan with two dependent cards, verifies it, then deletes it through the REST API.

For a visual check, use `PrintWindow` (see `references/troubleshooting.md`); `AppActivate` alone may fail when the app is behind other windows or on another virtual desktop.

### 6. Package

```bash
bash "/c/Users/ducti/.qoder/skills/flowplan-windows/scripts/package-flowplan.sh"
```

Output in `/d/FlowPlan/dist`:

- `FlowPlan-<version>-win64/` (exe, `WebView2Loader.dll`, `README.txt`, `LICENSE.txt`)
- `FlowPlan-<version>-windows-x64.zip`
- `FlowPlan-<version>-windows-x64.zip.sha256`

The zip's `README.txt` and the repo README are generated from `assets/` templates with the version/date/hash substituted.

### 7. Publish (only when the user asks to update the public release)

Repo: `kimducanh27-cpu/flowplan-windows`. Tag: `v<version>-win64`.

Read the cached GitHub token without echoing it, then run the publisher:

```bash
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
GH_TOKEN="$TOKEN" \
GH_REPO=kimducanh27-cpu/flowplan-windows \
VERSION=<version> TAG=v<version>-win64 \
ZIP_PATH=/d/FlowPlan/dist/FlowPlan-<version>-windows-x64.zip \
SHA_PATH=/d/FlowPlan/dist/FlowPlan-<version>-windows-x64.zip.sha256 \
README_PATH=/d/FlowPlan/dist/README-repo.md \
LICENSE_PATH=/d/FlowPlan/dist/LICENSE \
node "/c/Users/ducti/.qoder/skills/flowplan-windows/scripts/publish-release.mjs"
unset TOKEN
```

The paths above assume `FLOWPLAN_SRC=/d/FlowPlan`. If you built a fresh clone, use the paths printed by `package-flowplan.sh` (default `$FLOWPLAN_SRC/dist`).

The publisher:

- updates `README.md` / `LICENSE` via the Contents API (skips identical content);
- creates the release if the tag is missing;
- uploads the zip and `.sha256` asset (skips existing names);
- downloads the public asset and verifies its SHA256 against the local zip.

Use `DRY_RUN=1` to validate inputs without writing. If an existing asset has the wrong digest, do not silently overwrite; tell the user and delete/re-upload explicitly.

### 8. MCP connector in Qoder

The connector is user-scoped and normally persists across versions:

- Name: `flowplan`
- Type: `http` / Streamable HTTP
- URL: `http://127.0.0.1:3100/mcp`

Verify with the Qoder settings MCP tool (`list_tools`); expect 12 tools. A newly added server may only appear in a new chat session or after restarting Qoder.

## Definition of done

- [ ] Upstream version/commit recorded.
- [ ] Patches present (`custom-protocol`, GUI subsystem).
- [ ] GNU build succeeded; `Subsystem = Windows GUI`.
- [ ] `WebView2Loader.dll` present next to the exe.
- [ ] `/health` returns `{"ok":true}` and MCP smoke test passes.
- [ ] Zip + SHA256 created and verified.
- [ ] If publishing: public download hash matches; release URL reported.
- [ ] User told the version, local app path, checksum, and that the build is unsigned/community.

## Resources

- `scripts/build-flowplan.sh` — prerequisite/patch checks, frontend + GNU release build.
- `scripts/package-flowplan.sh` — portable folder, README/LICENSE, zip, SHA256.
- `scripts/smoke-mcp.mjs` — MCP handshake, 12-tool check, temp plan create/verify/delete.
- `scripts/publish-release.mjs` — README/LICENSE update, GitHub release, asset upload, public hash verification.
- `references/environment.md` — exact paths, versions, repo/release history, Qoder connector.
- `references/troubleshooting.md` — UAC/MSVC, `link.exe`, blank window, WebView2, hidden window, port 3100, publish blockers.
- `assets/` — README/release templates used by the scripts.
