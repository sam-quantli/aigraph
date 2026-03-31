import { readFile } from "node:fs/promises";
import ivm from "isolated-vm";
import type {
  RunScriptFailure,
  RunScriptOptions,
  RunScriptSuccess,
  ScriptExecuteOutput,
} from "./types.js";
import { installScriptHostBindings } from "./host/bindings.js";
import { resolveScriptPath } from "./paths.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeOutput(raw: unknown): ScriptExecuteOutput {
  if (!isRecord(raw)) {
    throw new Error("execute() return value must be a plain object.");
  }
  const { data, codes, success } = raw;
  if (!Array.isArray(data)) {
    throw new Error("execute() must return { data: array, ... }.");
  }
  if (!Array.isArray(codes) || !codes.every((c) => typeof c === "number" && Number.isFinite(c))) {
    throw new Error("execute() must return { codes: number[], ... }.");
  }
  if (typeof success !== "boolean") {
    throw new Error("execute() must return { success: boolean, ... }.");
  }
  return { data, codes, success };
}

const DEFAULT_ISOLATE_MEMORY_MB = 128;
const LOAD_TIMEOUT_MS = 5_000;
const RUN_TIMEOUT_MS = 30_000;

export async function runScriptFile(
  scriptRoot: string,
  options: RunScriptOptions
): Promise<RunScriptSuccess | RunScriptFailure> {
  const { scriptName, jobId } = options;
  const fullInput = {
    context: { jobId },
    ...(options.input.payload !== undefined ? { payload: options.input.payload } : {}),
  };

  let source: string;
  try {
    const filePath = resolveScriptPath(scriptRoot, scriptName);
    source = await readFile(filePath, "utf8");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    const msg =
      err?.code === "ENOENT"
        ? `Script not found: ${scriptName}`
        : err instanceof Error
          ? err.message
          : String(e);
    return { jobId, error: msg };
  }

  const isolate = new ivm.Isolate({
    memoryLimit: DEFAULT_ISOLATE_MEMORY_MB,
  });

  try {
    const context = await isolate.createContext();
    await installScriptHostBindings(context);
    const script = await isolate.compileScript(source, {
      filename: `file:///scripts/${scriptName}.js`,
    });
    await script.run(context, { timeout: LOAD_TIMEOUT_MS });

    const executeType = await context.eval("typeof globalThis.execute", {
      copy: true,
      timeout: LOAD_TIMEOUT_MS,
    });
    if (executeType !== "function") {
      return {
        jobId,
        error: "Script must define a global async function execute(input).",
      };
    }

    const rawResult = await context.evalClosure(
      "return execute($0)",
      [fullInput],
      {
        arguments: { copy: true },
        result: { promise: true, copy: true },
        timeout: RUN_TIMEOUT_MS,
      }
    );

    let output: ScriptExecuteOutput;
    try {
      output = normalizeOutput(rawResult);
    } catch (normErr) {
      return {
        jobId,
        error: normErr instanceof Error ? normErr.message : String(normErr),
      };
    }

    return { jobId, output };
  } catch (e) {
    return {
      jobId,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    isolate.dispose();
  }
}
