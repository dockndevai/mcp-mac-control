# mcp-mac-control

[![npm](https://img.shields.io/npm/v/@dockndevai/mcp-mac-control)](https://www.npmjs.com/package/@dockndevai/mcp-mac-control)
[![CI](https://github.com/dockndevai/mcp-mac-control/actions/workflows/ci.yml/badge.svg)](https://github.com/dockndevai/mcp-mac-control/actions/workflows/ci.yml)
[![licence](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives an AI agent **full control of a Mac — like a person sitting at it**. Shell, AppleScript, files, processes, and **human-like GUI control**: move, click, double/right-click, **drag**, **scroll**, type, and press key combos — with a screenshot + window/screen-size perception loop.

> ⚠️ **This server is full-control by default.** It starts in `admin` mode with command execution, deletes, and GUI input all enabled. That is powerful and dangerous: anything the agent reads (a web page, an email, a file) could contain a prompt injection that then runs arbitrary code on your Mac. Only connect it to an agent and content you trust. Set **`MACCTL_SAFE_MODE=true`** to flip the whole thing to safe-by-default. If you want safe-by-default as the baseline, use the sibling [`@dockndevai/mcp-macos`](https://github.com/dockndevai/mcp-macos) instead.

Part of the [dockndevai MCP server suite](https://dockndevai.github.io/).

## What it gives an agent (26 tools)

**Perceive** — `screenshot`, `get_screen_size`, `list_windows`, `get_frontmost_app`, `list_apps`, `system_info`, `list_directory`, `read_file`, `list_processes`, `get_clipboard`

**Operate the desktop like a human** — `move_mouse`, `click` (left/right/double), `drag`, `scroll`, `type_text`, `key_press` (with ⌘/⌥/⌃/⇧), `activate_app`, `quit_app`, `open`, `set_clipboard`, `notify`, `write_file`

**Full power** — `run_command` (any program, no shell unless you ask for one), `run_applescript` (AppleScript/JXA — drive any scriptable app), `delete_path` (→ Trash), `kill_process`

The classic loop: `screenshot` → decide → `click`/`type`/`drag`/`scroll` → `screenshot` again.

## Install

```bash
npx -y @dockndevai/mcp-mac-control
```

macOS only. You'll need to grant the host app (Terminal, your IDE, Claude Desktop, …) macOS permissions the first time each capability is used:

- **Screen Recording** → for `screenshot`
- **Accessibility** → for GUI input (`click`, `type_text`, `drag`, `scroll`, `key_press`) and `list_windows`
- **Automation** → for AppleScript / app control
- Mouse control uses **cliclick**: `brew install cliclick`

## Configure (Claude Code)

```bash
claude mcp add mac-control -- npx -y @dockndevai/mcp-mac-control
```

That's it — it's full-control by default. To scope it down, add env flags (see below). See [docs/CLIENTS.md](docs/CLIENTS.md) for Claude Desktop / Cursor / Codex / VS Code / Windsurf, and [.env.example](.env.example) for every variable.

## Dialing the control up or down

Full control needs no configuration. Everything below is about **restricting** it:

| Variable | Default | Effect |
|---|---|---|
| `MACCTL_SAFE_MODE` | `false` | `true` → read-only, every power gated, confirmations on (safe-by-default) |
| `MACCTL_MODE` | `admin` | `read-only` / `read-write` / `admin` — caps which tools are registered |
| `MACCTL_ALLOW_EXEC` | `true` | shell / AppleScript / kill |
| `MACCTL_ALLOW_DELETE` | `true` | delete to Trash |
| `MACCTL_ALLOW_INPUT` | `true` | GUI input (mouse/keyboard) |
| `MACCTL_CONFIRM` | `false` | `true` → destructive ops pause for human approval via MCP elicitation |
| `MACCTL_PATH_ALLOWLIST` | (empty = anywhere) | confine file ops to these roots |
| `MACCTL_PROTECTED_PATHS` | (empty) | roots readable but never modified/deleted |
| `MACCTL_COMMAND_ALLOWLIST` | (empty = any) | restrict `run_command` to these programs |
| `MACCTL_DRY_RUN` | `false` | validate + log writes without executing |
| `MACCTL_AUDIT_LOG` | `true` | JSON audit line per guarded op, to stderr |

The policy engine ([`src/security.ts`](src/security.ts)) is the same graduated model as the rest of the suite — this server just ships it wide open by default. See [SECURITY.md](SECURITY.md).

## Developing

```bash
npm install
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js   # list tools
npm test
```

## Licence

MIT
