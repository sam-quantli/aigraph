import path from "node:path";

/** Safe script basename only — no directories or traversal. */
const SCRIPT_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function assertSafeScriptName(scriptName: string): void {
  if (!SCRIPT_NAME_RE.test(scriptName)) {
    throw new Error(
      "Invalid scriptName: use only letters, digits, dots, underscores, and hyphens (no path segments)."
    );
  }
}

export function resolveScriptPath(scriptRoot: string, scriptName: string): string {
  assertSafeScriptName(scriptName);
  const resolved = path.resolve(scriptRoot, "scripts", `${scriptName}.js`);
  const scriptsDir = path.resolve(scriptRoot, "scripts");
  const rel = path.relative(scriptsDir, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Resolved script path left scripts directory.");
  }
  return resolved;
}
