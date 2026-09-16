# Installing `mcp-mac-control` in your MCP client

`mcp-mac-control` is a **stdio** MCP server (macOS only). It is **full-control by default** — add
`MACCTL_SAFE_MODE=true` (or the individual `MACCTL_*` flags) to any config below to restrict it.

- **From npm (recommended):** `npx -y @dockndevai/mcp-mac-control`
- **From source:** `node /ABSOLUTE/PATH/TO/mcp-mac-control/dist/index.js` after `npm install && npm run build`.

> First-run macOS permissions (per host app): **Screen Recording** (screenshots), **Accessibility**
> (GUI input, window list), **Automation** (AppleScript/app control). Mouse needs `brew install cliclick`.

## Claude Code (CLI)

```bash
# Full control:
claude mcp add mac-control -- npx -y @dockndevai/mcp-mac-control

# Or restricted (safe-by-default):
claude mcp add mac-control -e MACCTL_SAFE_MODE=true -- npx -y @dockndevai/mcp-mac-control
```

List with `claude mcp list`, remove with `claude mcp remove mac-control`.

## Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mac-control": {
      "command": "npx",
      "args": ["-y", "@dockndevai/mcp-mac-control"],
      "env": {}
    }
  }
}
```

Add flags under `env` to restrict, e.g. `{ "MACCTL_CONFIRM": "true" }` to require approval on
destructive ops, or `{ "MACCTL_SAFE_MODE": "true" }` for read-only.

## Cursor

`.cursor/mcp.json` (or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mac-control": { "command": "npx", "args": ["-y", "@dockndevai/mcp-mac-control"], "env": {} }
  }
}
```

## OpenAI Codex CLI

`~/.codex/config.toml`:

```toml
[mcp_servers.mac-control]
command = "npx"
args = ["-y", "@dockndevai/mcp-mac-control"]
```

## VS Code (Copilot / Agent mode)

`.vscode/mcp.json` (top-level key is `servers`):

```json
{
  "servers": {
    "mac-control": { "type": "stdio", "command": "npx", "args": ["-y", "@dockndevai/mcp-mac-control"] }
  }
}
```

## Windsurf

`~/.codeium/windsurf/mcp_config.json` with the same `mcpServers` block as Cursor, then **Refresh**.

## Verify

On startup the server logs to **stderr**:

```
[mac-control] Starting in 'admin' mode [powers=exec+delete+input, confirm=false]. 26 tools enabled: …
```

Ask your agent to *"take a screenshot and tell me what's on screen"* to confirm it's wired up.
