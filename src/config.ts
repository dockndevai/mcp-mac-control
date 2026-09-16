import os from "node:os";
import path from "node:path";
import type { AccessMode, SecurityConfig } from "./security.js";

export interface RuntimeLimits {
  /** Max bytes returned when reading a file. */
  maxFileBytes: number;
  /** Max bytes of stdout/stderr returned from a command. */
  maxOutputBytes: number;
  /** Default timeout for shell / AppleScript execution (ms). */
  commandTimeoutMs: number;
}

export interface AppConfig {
  security: SecurityConfig;
  limits: RuntimeLimits;
}

const HOME = os.homedir();

/** Expand a leading `~` and resolve to an absolute, normalized path. */
export function resolvePath(p: string): string {
  let s = p.trim();
  if (s === "~") s = HOME;
  else if (s.startsWith("~/")) s = path.join(HOME, s.slice(2));
  return path.resolve(s);
}

function csv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function bool(name: string, dflt = false): boolean {
  const v = process.env[name];
  if (v === undefined) return dflt;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

function num(name: string, dflt: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : dflt;
}

/**
 * This is a FULL-CONTROL server: it defaults to `admin` mode with every power on, so an agent can
 * operate the Mac like a person from a single install. Set `MACCTL_SAFE_MODE=true` to flip the whole
 * thing back to safe-by-default (read-only, everything gated) — the same posture as the sibling
 * `@dockndevai/mcp-macos`.
 */
function parseMode(safeMode: boolean): AccessMode {
  const raw = (process.env.MACCTL_MODE ?? (safeMode ? "read-only" : "admin")).toLowerCase();
  if (raw === "read-only" || raw === "read-write" || raw === "admin") return raw;
  throw new Error(`Invalid MACCTL_MODE '${raw}'. Expected one of: read-only, read-write, admin.`);
}

/** Sensitive roots protected only in safe mode (or when the operator names their own). */
const SAFE_PROTECTED = [
  "/System",
  "/usr",
  "/bin",
  "/sbin",
  "/private",
  "/Library",
  path.join(HOME, ".ssh"),
  path.join(HOME, ".aws"),
  path.join(HOME, ".gnupg"),
  path.join(HOME, "Library", "Keychains"),
];

export function loadConfig(): AppConfig {
  const safeMode = bool("MACCTL_SAFE_MODE", false);
  const protectedRaw = csv("MACCTL_PROTECTED_PATHS");
  const security: SecurityConfig = {
    mode: parseMode(safeMode),
    pathAllowlist: csv("MACCTL_PATH_ALLOWLIST").map(resolvePath),
    // Full control = nothing protected unless the operator opts in; safe mode protects system+secrets.
    protectedPaths: (protectedRaw.length ? protectedRaw : safeMode ? SAFE_PROTECTED : []).map(resolvePath),
    allowExec: bool("MACCTL_ALLOW_EXEC", !safeMode),
    commandAllowlist: csv("MACCTL_COMMAND_ALLOWLIST"),
    allowDelete: bool("MACCTL_ALLOW_DELETE", !safeMode),
    allowInput: bool("MACCTL_ALLOW_INPUT", !safeMode),
    // Human-in-the-loop confirmation on destructive ops. Off by default (full control); safe mode turns it on.
    confirmDestructive: bool("MACCTL_CONFIRM", safeMode),
    dryRun: bool("MACCTL_DRY_RUN", false),
    auditLog: bool("MACCTL_AUDIT_LOG", true),
  };
  const limits: RuntimeLimits = {
    maxFileBytes: num("MACCTL_MAX_FILE_BYTES", 1_000_000),
    maxOutputBytes: num("MACCTL_MAX_OUTPUT_BYTES", 100_000),
    commandTimeoutMs: num("MACCTL_COMMAND_TIMEOUT_MS", 30_000),
  };
  return { security, limits };
}
