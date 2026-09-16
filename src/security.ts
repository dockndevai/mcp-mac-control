/**
 * Policy engine for mcp-mac-control.
 *
 * This is a FULL-CONTROL server: by default every power is on so an agent can operate the Mac like a
 * person. The very same engine, however, still implements graduated control — an access mode gates
 * which tools are registered; a path allowlist and protected-path list can confine filesystem
 * mutations; and command/AppleScript execution, deletes, and GUI input each have their own flag.
 * With `MACCTL_SAFE_MODE=true` the defaults invert to safe-by-default (read-only, all gated), so the
 * exact same code path can run wide open or fully locked down. Pure logic — no I/O — fully testable.
 */

export type Capability = "read" | "write" | "admin";
export type AccessMode = "read-only" | "read-write" | "admin";

const MODE_RANK: Record<AccessMode, number> = { "read-only": 0, "read-write": 1, admin: 2 };
const CAPABILITY_RANK: Record<Capability, number> = { read: 0, write: 1, admin: 2 };

export interface SecurityConfig {
  mode: AccessMode;
  /** Absolute path roots the agent may touch. Empty = anywhere (protected paths still apply). */
  pathAllowlist: string[];
  /** Absolute path roots that may be read but never written to or deleted (system + secrets). */
  protectedPaths: string[];
  /** Arbitrary command / AppleScript execution and process termination require this. */
  allowExec: boolean;
  /** If set, `run_command` may only invoke these program names (basename of argv[0]). */
  commandAllowlist: string[];
  /** Deleting files/paths requires this (on top of admin mode). */
  allowDelete: boolean;
  /** GUI input injection (click / type / key / scroll) requires this (on top of admin mode). */
  allowInput: boolean;
  /** When true, destructive ops pause for a human to approve via MCP elicitation. */
  confirmDestructive: boolean;
  /** Validate + log mutating operations without executing them. */
  dryRun: boolean;
  auditLog: boolean;
}

export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyError";
  }
}

export interface GuardContext {
  tool: string;
  capability: Capability;
  /** Absolute, normalized filesystem path the op targets, when it names one. */
  path?: string;
  /** Whether this op writes to / deletes `path` (vs. only reads it). */
  pathMutation?: boolean;
  /** Program name this op will execute (basename of argv[0]), for the command allowlist. */
  command?: string;
  destructive?: boolean;
  /** Op needs `allowExec` (run_command / run_applescript / kill_process). */
  requiresExec?: boolean;
  /** Op deletes and needs `allowDelete`. */
  requiresDelete?: boolean;
  /** Op injects GUI input and needs `allowInput`. */
  requiresInput?: boolean;
}

/** True when `p` is `root` or lives under it (segment-boundary aware). */
export function isUnder(p: string, root: string): boolean {
  if (root === "/") return p === "/" || p.startsWith("/");
  return p === root || p.startsWith(root.endsWith("/") ? root : `${root}/`);
}

export class SecurityPolicy {
  constructor(private readonly config: SecurityConfig) {}

  get mode(): AccessMode {
    return this.config.mode;
  }

  isCapabilityEnabled(capability: Capability): boolean {
    return CAPABILITY_RANK[capability] <= MODE_RANK[this.config.mode];
  }

  get execEnabled(): boolean {
    return this.config.allowExec;
  }
  get inputEnabled(): boolean {
    return this.config.allowInput;
  }
  get confirmDestructive(): boolean {
    return this.config.confirmDestructive;
  }

  isPathAllowed(path: string): boolean {
    if (this.config.pathAllowlist.length === 0) return true;
    return this.config.pathAllowlist.some((root) => isUnder(path, root));
  }
  isPathProtected(path: string): boolean {
    return this.config.protectedPaths.some((root) => isUnder(path, root));
  }
  isCommandAllowed(command: string): boolean {
    if (this.config.commandAllowlist.length === 0) return true;
    return this.config.commandAllowlist.includes(command);
  }

  guard(ctx: GuardContext): { dryRun: boolean } {
    if (!this.isCapabilityEnabled(ctx.capability)) {
      this.audit(ctx, "DENY", `capability '${ctx.capability}' exceeds mode '${this.config.mode}'`);
      throw new PolicyError(
        `Operation '${ctx.tool}' requires '${ctx.capability}' access but the server runs in '${this.config.mode}' mode. Set MACCTL_MODE to grant it.`,
      );
    }

    if (ctx.requiresExec && !this.config.allowExec) {
      this.audit(ctx, "DENY", "exec not enabled");
      throw new PolicyError(
        `Operation '${ctx.tool}' runs arbitrary code or kills a process; it is disabled. Set MACCTL_ALLOW_EXEC=true to enable it.`,
      );
    }

    if (ctx.command !== undefined && !this.isCommandAllowed(ctx.command)) {
      this.audit(ctx, "DENY", `command '${ctx.command}' not in allowlist`);
      throw new PolicyError(
        `Program '${ctx.command}' is not in the configured allowlist (MACCTL_COMMAND_ALLOWLIST).`,
      );
    }

    if (ctx.requiresInput && !this.config.allowInput) {
      this.audit(ctx, "DENY", "input not enabled");
      throw new PolicyError(
        `Operation '${ctx.tool}' injects GUI input; it is disabled. Set MACCTL_ALLOW_INPUT=true to enable it.`,
      );
    }

    if (ctx.requiresDelete && !this.config.allowDelete) {
      this.audit(ctx, "DENY", "delete not enabled");
      throw new PolicyError(
        `Destructive operation '${ctx.tool}' is disabled. Set MACCTL_ALLOW_DELETE=true to enable it.`,
      );
    }

    if (ctx.path !== undefined && ctx.path !== "") {
      if (!this.isPathAllowed(ctx.path)) {
        this.audit(ctx, "DENY", `path '${ctx.path}' not in allowlist`);
        throw new PolicyError(
          `Path '${ctx.path}' is outside the configured allowlist (MACCTL_PATH_ALLOWLIST).`,
        );
      }
      if (ctx.pathMutation && this.isPathProtected(ctx.path)) {
        this.audit(ctx, "DENY", `path '${ctx.path}' is protected`);
        throw new PolicyError(
          `Path '${ctx.path}' is protected (MACCTL_PROTECTED_PATHS); it can be read but not modified or deleted.`,
        );
      }
    }

    const dryRun = ctx.capability !== "read" && this.config.dryRun;
    this.audit(ctx, dryRun ? "DRY_RUN" : "ALLOW");
    return { dryRun };
  }

  private audit(ctx: GuardContext, decision: string, reason?: string): void {
    if (!this.config.auditLog) return;
    const line = {
      ts: new Date().toISOString(),
      audit: "mac-control",
      decision,
      tool: ctx.tool,
      capability: ctx.capability,
      path: ctx.path ?? null,
      command: ctx.command ?? null,
      destructive: ctx.destructive ?? false,
      ...(reason ? { reason } : {}),
    };
    process.stderr.write(`${JSON.stringify(line)}\n`);
  }
}
