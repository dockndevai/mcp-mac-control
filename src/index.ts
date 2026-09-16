#!/usr/bin/env node
/**
 * MCP server for FULL macOS control — drive a Mac like a person.
 *
 * Observe (system info, files, processes, clipboard, apps, windows, screen size, screenshots) and
 * operate: write files, set the clipboard, notify, open/activate/quit apps, run any command or
 * AppleScript, delete to Trash, kill processes, and drive the GUI like a human — move, click,
 * double/right-click, drag, scroll, type, and press key combos.
 *
 * FULL CONTROL BY DEFAULT: starts in `admin` mode with exec, delete and GUI input all enabled, so
 * one install gives an agent complete control. This is powerful and dangerous — a prompt injection
 * in anything the agent reads could run arbitrary code on your Mac. Set MACCTL_SAFE_MODE=true to
 * invert to safe-by-default (read-only, every power gated, confirmations on), or use the individual
 * MACCTL_* flags / allowlists to scope it. Every guarded op emits a JSON audit line to stderr.
 * See src/security.ts and SECURITY.md.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    process.stderr.write(`[mac-control] Configuration error: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const { server, enabled } = buildServer(config);

  const s = config.security;
  const powers = [s.allowExec && "exec", s.allowDelete && "delete", s.allowInput && "input"].filter(Boolean).join("+") || "none";
  process.stderr.write(
    `[mac-control] Starting in '${s.mode}' mode` +
      `${s.dryRun ? " (DRY RUN)" : ""}` +
      ` [powers=${powers}, confirm=${s.confirmDestructive}]. ` +
      `${enabled.length} tools enabled: ${enabled.join(", ")}\n`,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`[mac-control] Fatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
