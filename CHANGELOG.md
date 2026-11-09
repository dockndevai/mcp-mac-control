# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.6] - 2026-11-09

### Changed
- Routine dependency maintenance: `npm audit --audit-level=high` reported 0 high/critical advisories. The pre-existing moderate advisory (`@hono/node-server` static-path middleware bypass, GHSA-rmxm-3fg6-px4f) remains, transitive via `@modelcontextprotocol/sdk`'s own pinned `@hono/node-server`; still below this pass's high/critical action threshold and left as-is (fixing it would require forcing a dependency outside the SDK's declared range). Took in-range patch bump for `vitest` (5.0.5 → 5.1.0). No behavior change.

## [0.3.5] - 2026-11-02

### Changed
- Routine dependency maintenance: `npm audit --audit-level=high` reported 0 high/critical advisories. A pre-existing moderate advisory (`@hono/node-server` static-path middleware bypass, GHSA-rmxm-3fg6-px4f) remains, transitive via `@modelcontextprotocol/sdk`'s own pinned `@hono/node-server`; below this pass's high/critical action threshold and left as-is. Took in-range patch bump for `@types/node` (26.6.5 → 26.6.6). No behavior change.

## [0.3.4] - 2026-10-26

### Changed
- Dependency/security maintenance: ran `npm audit fix --force` to clear a high-severity `body-parser` DoS advisory (GHSA-27r3-jxmh-p828, body-parser 2.3.0 → 2.4.0), moderate `fast-uri` advisories (GHSA-w74x-v6f9-j3xg, GHSA-xhq7-xmqj-769h, GHSA-wjr9-j795-jxcr, GHSA-333x-w4r6-6crp, fast-uri 3.1.8 → 3.1.9), and a moderate `hono` static-path middleware bypass advisory (GHSA-5r4p-p66f-jhc7), all transitive. Took in-range patch bump for `@modelcontextprotocol/sdk` (1.32.1 → 1.32.2). `npm audit` now reports 0 vulnerabilities. No feature or behavior changes.

## [0.3.3] - 2026-10-19

### Changed
- Routine dependency maintenance: `npm audit --audit-level=high` reported 0 advisories (no high/critical vulnerabilities to fix this pass). Took in-range patch bumps for `vitest` (5.0.3 → 5.0.5) and `zod` (4.6.6 → 4.6.7). No feature or behavior changes.

## [0.3.2] - 2026-10-12

### Security
- Bumped `@modelcontextprotocol/sdk` to 1.32.1 (patch range), resolving a high-severity advisory
  where the OAuth client could send credentials to an authorization server chosen by the MCP server
  (GHSA-6qxp-vccf-f47h).
- Updated transitive dependencies (`proxy-addr`, `ip-address`, `fast-uri`, `source-map-js`) to clear
  one critical, two high, and two moderate advisories flagged by `npm audit`. `npm audit` now reports
  0 vulnerabilities.

### Changed
- Routine patch/minor bumps: `@types/node`, `tsx`, `vitest`, `zod` (all in-range, no behavior change).

## [0.3.1] - 2026-09-26

### Fixed
- Republish of 0.3.0, whose npm upload was accepted but left in npm's "staged" state and never
  committed to the registry (the version 404'd and could not be re-published). No code changes.

## [0.3.0] - 2026-09-26

### Added
- **Optional AI risk guard (laya-guard).** In a permissive mode, high-risk tools (`run_command`,
  `run_applescript`, `delete_path`) can consult a local [laya-guard](https://github.com/dockndevai/laya-guard)
  daemon before executing — deterministic rules plus the Laya decision model classify the command as
  allow / confirm / block. It runs **after** the deterministic `SecurityPolicy` and can only *tighten*
  (add a confirm/block), never grant. Off by default; `MACCTL_GUARD_MODE=monitor|enforce`,
  `MACCTL_GUARD_URL`, `MACCTL_GUARD_TIMEOUT_MS`, `MACCTL_GUARD_FAIL_CLOSED`. Fails closed when the
  daemon is unreachable in enforce mode.

### Security
- **Symlink path-escape fix.** `resolvePath()` only normalized a path (`path.resolve`); it never
  followed symlinks, so a symlink planted inside an allowlisted directory — or one that happened to
  point at a protected root — could silently escape both `MACCTL_PATH_ALLOWLIST` and
  `MACCTL_PROTECTED_PATHS`, since `fs.readFile`/`writeFile` follow symlinks but the policy check
  never saw where they actually pointed. Added `resolveRealPath()`, which resolves symlinks
  (`fs.realpathSync`) before the `guard()` allowlist/protected-path checks in `list_directory`,
  `read_file`, `write_file`, and `delete_path`, falling back to resolving the parent directory for a
  write target that doesn't exist yet. The configured allowlist/protected roots are now canonicalized
  the same way at load time, so both sides of the comparison agree.

## [0.2.1] - 2026-09-19

### Fixed
- Republish of 0.2.0. The 0.2.0 npm publish was accepted but left in npm's "staged" state and never
  committed to the registry (the version 404'd and could not be re-published). No code changes from
  0.2.0; this release makes the 0.2.0 contents actually installable.

## [0.2.0] - 2026-09-19

### Added
- **Multi-monitor screenshots with point-accurate coordinates.** `screenshot` now takes an optional
  `display` argument (omit to capture the display holding the frontmost window; `0` for the main
  display), and the returned image is downscaled to **points**, so it maps 1:1 to click coordinates.
  The caption explains how to convert an in-image pixel to a global click point by adding the
  display's origin.
- `get_screen_size` now returns every display's global point bounds (origin x/y, width, height,
  backing scale, and which is main), so an agent can reason about clicks across multiple monitors.

### Changed
- Bump `zod` to ^4.6.5.

### Added
- Initial release: an MCP server that gives an agent **full control of a Mac by default** —
  drive it like a person. 26 tools:
  - **Perceive**: `screenshot`, `get_screen_size`, `list_windows`, `get_frontmost_app`, `list_apps`,
    `system_info`, `list_directory`, `read_file`, `list_processes`, `get_clipboard`.
  - **Operate**: `move_mouse`, `click` (left/right/double), `drag`, `scroll`, `type_text`,
    `key_press` (with modifiers), `activate_app`, `quit_app`, `open`, `set_clipboard`, `notify`,
    `write_file`.
  - **Full power**: `run_command`, `run_applescript` (AppleScript/JXA), `delete_path` (→ Trash),
    `kill_process`.
- Full-control-by-default posture: starts in `admin` mode with exec, delete and GUI input enabled.
  `MACCTL_SAFE_MODE=true` inverts to safe-by-default (read-only, all gated, confirmations on).
- The same graduated policy engine as the rest of the suite (`src/security.ts`): access modes, path
  allowlist/protected paths, command allowlist, per-power flags, optional human confirmation via MCP
  elicitation, dry-run, and JSON audit logging — shipped wide open, restrictable via `MACCTL_*`.
- Human-like GUI over `cliclick` (move/click/drag) and CoreGraphics (`scroll`); AppleScript uses
  argv for user text (no injection), and `read_file` avoids a TOCTOU gap.
