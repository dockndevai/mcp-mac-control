import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePath, resolveRealPath } from "../src/config.js";
import { SecurityPolicy, type SecurityConfig } from "../src/security.js";

function makePolicy(overrides: Partial<SecurityConfig> = {}): SecurityPolicy {
  return new SecurityPolicy({
    mode: "admin",
    pathAllowlist: [],
    protectedPaths: [],
    allowExec: false,
    commandAllowlist: [],
    allowDelete: true,
    allowInput: false,
    confirmDestructive: false,
    dryRun: false,
    auditLog: false,
    ...overrides,
  });
}

describe("resolvePath (no symlink resolution)", () => {
  it("expands ~ and normalizes, but does not follow symlinks", () => {
    expect(resolvePath("~")).toBe(os.homedir());
    expect(resolvePath("/a/b/../c")).toBe("/a/c");
  });
});

describe("resolveRealPath (symlink-aware)", () => {
  let root: string;
  let inside: string; // an allowlisted directory
  let outside: string; // a directory outside the allowlist
  let realFile: string; // a real file living outside the allowlist
  let escapeLink: string; // a symlink inside `inside` pointing at `realFile`

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "macctl-test-"));
    inside = path.join(root, "inside");
    outside = path.join(root, "outside");
    fs.mkdirSync(inside);
    fs.mkdirSync(outside);
    realFile = path.join(outside, "secret.txt");
    fs.writeFileSync(realFile, "sensitive");
    escapeLink = path.join(inside, "escape.txt");
    fs.symlinkSync(realFile, escapeLink);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("resolves an existing symlink to its real target", () => {
    expect(resolveRealPath(escapeLink)).toBe(fs.realpathSync(realFile));
  });

  it("falls back to resolving the parent dir for a not-yet-existing target", () => {
    const newFile = path.join(inside, "brand-new.txt");
    expect(resolveRealPath(newFile)).toBe(path.join(fs.realpathSync(inside), "brand-new.txt"));
  });

  it("falls back to the plain resolved path when even the parent doesn't exist", () => {
    const deep = path.join(root, "does", "not", "exist", "file.txt");
    expect(resolveRealPath(deep)).toBe(path.resolve(deep));
  });

  it("a symlink escaping the allowlist is denied once resolved before guard()", () => {
    // Naive resolvePath (the pre-fix behavior) never follows the symlink, so it's confined to
    // `inside`'s own path string and the allowlist check is fooled into passing it.
    const naivePolicy = makePolicy({ pathAllowlist: [resolvePath(inside)] });
    const naive = resolvePath(escapeLink);
    expect(naive.startsWith(resolvePath(inside))).toBe(true);
    expect(naivePolicy.isPathAllowed(naive)).toBe(true);

    // resolveRealPath follows the symlink out to `outside`, which correctly fails the check —
    // both the target and the allowlist root must be canonicalized the same way.
    const fixedPolicy = makePolicy({ pathAllowlist: [resolveRealPath(inside)] });
    const real = resolveRealPath(escapeLink);
    expect(real.startsWith(resolveRealPath(inside))).toBe(false);
    expect(fixedPolicy.isPathAllowed(real)).toBe(false);
    expect(() => fixedPolicy.guard({ tool: "read_file", capability: "read", path: real })).toThrow(/allowlist/);
  });

  it("a symlink pointing into a protected root is refused for mutation once resolved", () => {
    const protectedDir = path.join(root, "protected");
    fs.mkdirSync(protectedDir);
    const protectedTarget = path.join(protectedDir, "keychain.db");
    fs.writeFileSync(protectedTarget, "keys");
    const linkInAllowlist = path.join(inside, "innocuous-name.db");
    fs.symlinkSync(protectedTarget, linkInAllowlist);

    const policy = makePolicy({
      pathAllowlist: [resolveRealPath(inside), resolveRealPath(protectedDir)],
      protectedPaths: [resolveRealPath(protectedDir)],
    });
    const real = resolveRealPath(linkInAllowlist);
    expect(() =>
      policy.guard({ tool: "write_file", capability: "write", path: real, pathMutation: true }),
    ).toThrow(/protected/);
  });
});
