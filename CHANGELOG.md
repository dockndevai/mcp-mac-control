# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-16

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
