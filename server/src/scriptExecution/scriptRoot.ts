import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Default: repo `data/` when running from `server/src` or `server/dist`.
 * Override with SCRIPT_DATA_ROOT (e.g. `/data` in production).
 */
export function getScriptDataRoot(): string {
  const fromEnv = process.env.SCRIPT_DATA_ROOT?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.resolve(here, "..", "..", "..", "data");
}
