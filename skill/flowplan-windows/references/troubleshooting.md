# FlowPlan Windows troubleshooting

## UAC / Visual Studio Build Tools

- `winget install Microsoft.VisualStudio.2022.BuildTools` fails with exit `1602` almost immediately when run by the agent. The UAC prompt cannot be approved from the agent session; retrying is pointless.
- Do not attempt privilege-escalation tricks. Use the GNU toolchain recipe instead.
- If the user manually runs the VS installer and approves UAC, MSVC becomes an option, but the GNU recipe is already validated and requires no admin.

## `link.exe` / host build-script failure

Symptom:

```
error: linking with `link.exe` failed: exit code: 1
link: extra operand '...rcgu.o'
```

Cause: the build used the MSVC host toolchain; build scripts compiled for `x86_64-pc-windows-msvc` call `link.exe`, which resolves to Git Bash's GNU coreutils `link` because MSVC is absent.

Fix: build with the GNU **host** toolchain:

```bash
export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu
```

Do not merely add the `x86_64-pc-windows-gnu` target to the MSVC toolchain. The target is for the app; the host toolchain is for build scripts/proc macros.

## `cargo: command not found`

Background shells may not inherit the exported PATH. Use absolute paths:

```bash
export PATH="/d/msys64/mingw64/bin:/c/Users/ducti/.cargo/bin:$PATH"
```

or call `/c/Users/ducti/.cargo/bin/cargo.exe` directly. `$USERPROFILE/.cargo/bin` contains backslashes and can break a POSIX PATH; use `$HOME/.cargo/bin` or `/c/Users/ducti/.cargo/bin`.

## Window shows “can't reach this page” / `localhost refused to connect`

Cause: the build lacks the `custom-protocol` feature; Tauri falls back to the dev URL `http://localhost:5173`.

Fix: ensure `tauri` has `features = ["custom-protocol"]` in `src-tauri/Cargo.toml` and rebuild. The Tauri CLI enables this automatically; a direct `cargo build` does not.

## Console window appears next to the app

Cause: missing GUI subsystem attribute. Add as the first line of `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```

Verify with `objdump -p FlowPlan.exe | grep Subsystem` → `Windows GUI`.

## Missing `WebView2Loader.dll`

The GNU build links `WebView2Loader.dll` (import lib) rather than the MSVC static lib. Copy the x64 DLL next to the exe:

```bash
find "$HOME/.cargo/registry/src" -path "*webview2-com-sys-*/x64/WebView2Loader.dll" | head -1
```

If it is missing, the app may start but the webview/window fails.

## Window exists but is not visible

- `Get-Process FlowPlan | Select MainWindowTitle,MainWindowHandle` can show a valid window that is behind other apps or on another virtual desktop.
- `WScript.Shell.AppActivate` may return without bringing it forward (Windows foreground lock).
- Use Win32 `ShowWindow(SW_RESTORE)` + `SetWindowPos(..., SWP_SHOWWINDOW)` and capture with `PrintWindow(hwnd, hdc, 2)` (`PW_RENDERFULLCONTENT`). A normal screen capture may only show the apps on top.
- If the captured window shows the localhost error, see the `custom-protocol` section above.

## Port 3100 / duplicate app instances

- The MCP + REST server binds `127.0.0.1:3100`. Only one FlowPlan instance can own it.
- `taskkill //F //IM FlowPlan.exe`, wait, then launch once (Desktop shortcut). Check:
  `netstat -ano | grep ":3100"` should show one LISTENING PID.
- If the app is closed, Qoder's connector shows offline; open FlowPlan first.

## Qoder does not show FlowPlan tools

1. Open FlowPlan (green MCP badge in the sidebar).
2. Restart Qoder or open a new chat session.
3. Settings → MCP → My Servers → `flowplan`; URL `http://127.0.0.1:3100/mcp`.
4. Verify with the settings MCP tool's `list_tools`; expect 12 tools.
5. The current chat may need a new session to load newly added MCP tools.

## npm / frontend build

- npm 11 may print “install scripts blocked” warnings for sharp/workerd/esbuild. The Vite/React build still succeeded in this environment.
- If `vite build` fails due to a missing esbuild binary, run `npm install` or approve the script and retry.
- The frontend must be rebuilt (`npm run build`) before the Rust build so the embedded `dist` is current.

## GitHub publish

- Do not `git remote`/`git push` the distribution repo from the source clone. The permission classifier may block a remote repoint; use the REST API scripts.
- The user must explicitly name the target repo before publishing. Releases are visible actions.
- Token: read from GCM via `git credential fill` inside the command; never echo it. Required scopes: `repo` (and `workflow` if touching workflows).
- If an existing release asset has a different `digest` than the new local SHA, the publisher warns and skips. Do not silently overwrite; ask the user and delete/re-upload the asset explicitly.
- Verify the public download's SHA256 after upload. GitHub's asset `digest` should also match.

## Upstream changes / patch drift

- If `custom-protocol` is renamed or removed, inspect the `tauri` crate's `Cargo.toml` (`grep custom-protocol`) and adapt.
- If upstream adds its own `windows_subsystem` attribute or a LICENSE file, use upstream's version; don't duplicate.
- If the app starts but MCP tools changed, update the smoke test's minimum tool count and the README tool list.
- Re-run `scripts/build-flowplan.sh --check` after every upstream update; it flags missing patches before a long build.
