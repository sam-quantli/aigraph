/**
 * Contract for scripts loaded from SCRIPT_DATA_ROOT/scripts/*.js
 * Scripts must define: async function execute(input: ScriptExecuteInput): Promise<ScriptExecuteOutput>
 */
export type ExecutionJobContext = {
  jobId: string;
};

/** Input passed into sandboxed `execute` (structured-cloneable JSON). */
export type ScriptExecuteInput = {
  context: ExecutionJobContext;
  payload?: unknown;
};

/** Script return value (must be structured-cloneable). */
export type ScriptExecuteOutput = {
  data: unknown[];
  codes: number[];
  success: boolean;
};

export type RunScriptOptions = {
  scriptName: string;
  input: Omit<ScriptExecuteInput, "context"> & { payload?: unknown };
  jobId: string;
};

export type RunScriptSuccess = {
  jobId: string;
  output: ScriptExecuteOutput;
};

export type RunScriptFailure = {
  jobId: string;
  error: string;
};
