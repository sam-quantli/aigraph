import ivm from "isolated-vm";
import { mockHostGetData } from "./mockGetData.js";

type IsolateContext = Awaited<ReturnType<ivm.Isolate["createContext"]>>;

/** Forwards isolate `debug(...)` to the host process stdout (scripts have no `console`). */
function scriptHostDebug(...args: unknown[]): void {
  console.log(...args);
}

/**
 * Registers host-callable globals on the isolate (e.g. `getData`, `debug`).
 * Callback bodies must return plain JSON synchronously when using `{ async: true }`
 * (returning a host Promise breaks isolated-vm's copy step).
 */
export async function installScriptHostBindings(
  context: IsolateContext
): Promise<void> {
  await context.global.set(
    "debug",
    new ivm.Callback(scriptHostDebug)
  );
  await context.global.set(
    "getData",
    new ivm.Callback(mockHostGetData, { async: true })
  );
}
