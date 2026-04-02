import type {
  GraphDefinition,
  GraphTraceEntry,
  NodeOutputsSnapshot,
} from "./types.js";

export type RunStatus = "queued" | "running" | "completed" | "failed";

export type RunRecord = {
  runId: string;
  graphId?: string;
  graphSnapshot: GraphDefinition;
  status: RunStatus;
  input: unknown;
  /** Position in queue (1-based), only set while queued. */
  queuePosition?: number;
  enqueuedAt: string;
  startedAt?: string;
  endedAt?: string;
  nodeOutputs: NodeOutputsSnapshot;
  trace: GraphTraceEntry[];
  logs: string[];
  error?: string;
};

const MAX_RETAINED_RUNS = 100;

const byRunId = new Map<string, RunRecord>();
/** Insertion order for LRU-ish eviction */
const runOrder: string[] = [];

function touchRun(runId: string): void {
  const idx = runOrder.indexOf(runId);
  if (idx >= 0) {
    runOrder.splice(idx, 1);
  }
  runOrder.push(runId);
}

function trimTerminalRuns(): void {
  for (;;) {
    const terminals = [...byRunId.entries()].filter(
      ([, r]) => r.status === "completed" || r.status === "failed"
    );
    if (terminals.length <= MAX_RETAINED_RUNS) return;
    terminals.sort(
      (a, b) => (a[1].endedAt ?? "").localeCompare(b[1].endedAt ?? "")
    );
    const [oldestId] = terminals[0]!;
    byRunId.delete(oldestId);
    const idx = runOrder.indexOf(oldestId);
    if (idx >= 0) runOrder.splice(idx, 1);
  }
}

export function createRunRecordQueued(
  runId: string,
  graphSnapshot: GraphDefinition,
  input: unknown,
  graphId?: string,
  /** Set by execution queue after enqueue; omitted until renumbered. */
  queuePosition?: number
): RunRecord {
  const record: RunRecord = {
    runId,
    graphId,
    graphSnapshot,
    status: "queued",
    input,
    queuePosition,
    enqueuedAt: new Date().toISOString(),
    nodeOutputs: {},
    trace: [],
    logs: [],
  };
  byRunId.set(runId, record);
  touchRun(runId);
  return record;
}

export function getRun(runId: string): RunRecord | undefined {
  return byRunId.get(runId);
}

export function updateRun(runId: string, patch: Partial<RunRecord>): RunRecord | undefined {
  const current = byRunId.get(runId);
  if (!current) return undefined;
  const next = { ...current, ...patch };
  byRunId.set(runId, next);
  touchRun(runId);
  if (next.status === "completed" || next.status === "failed") {
    trimTerminalRuns();
  }
  return next;
}

export function deleteRun(runId: string): void {
  byRunId.delete(runId);
  const idx = runOrder.indexOf(runId);
  if (idx >= 0) runOrder.splice(idx, 1);
}

/** Runs that belong to this graph and are queued or running (for queue UI). */
export function listActiveRunsForGraph(graphId: string): RunRecord[] {
  const out: RunRecord[] = [];
  for (const record of byRunId.values()) {
    if (record.graphId !== graphId) continue;
    if (record.status !== "queued" && record.status !== "running") continue;
    out.push(record);
  }
  out.sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
  return out;
}
