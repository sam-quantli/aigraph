import type { RealtimePublisher } from "../realtime/socketServer.js";
import type { ExecutionQueuePayload } from "../realtime/events.js";
import { runGraph, validateGraph } from "./runner.js";
import type { GraphDefinition } from "./types.js";
import {
  createRunRecordQueued,
  getRun,
  updateRun,
} from "./runStore.js";

type QueueJob = {
  runId: string;
  graphId?: string;
  graph: GraphDefinition;
  input: unknown;
};

export type EnqueueResult =
  | { ok: true; queuePosition: number }
  | { ok: false; error: string };

export type ExecutionQueue = {
  enqueue(payload: {
    runId: string;
    graphId?: string;
    graph: GraphDefinition;
    input: unknown;
  }): EnqueueResult;
  getQueueSnapshotForGraph(graphId: string): ExecutionQueuePayload;
};

function cloneGraph(graph: GraphDefinition): GraphDefinition {
  try {
    return structuredClone(graph);
  } catch {
    return JSON.parse(JSON.stringify(graph)) as GraphDefinition;
  }
}

export function createExecutionQueue(
  realtime: RealtimePublisher
): ExecutionQueue {
  const fifo: QueueJob[] = [];
  let current: QueueJob | null = null;

  function snapshotForGraph(graphId: string): ExecutionQueuePayload {
    const jobs: ExecutionQueuePayload["jobs"] = [];
    if (current?.graphId === graphId) {
      jobs.push({ runId: current.runId, status: "running", position: 0 });
    }
    let pos = 1;
    for (const job of fifo) {
      if (job.graphId === graphId) {
        jobs.push({ runId: job.runId, status: "queued", position: pos });
        pos += 1;
      }
    }
    return { graphId, jobs };
  }

  function renumberQueuedPositions(): void {
    fifo.forEach((job, i) => {
      updateRun(job.runId, { queuePosition: i + 1, status: "queued" });
    });
  }

  function publishAffectedGraphRooms(): void {
    const graphIds = new Set<string>();
    if (current?.graphId) graphIds.add(current.graphId);
    for (const j of fifo) {
      if (j.graphId) graphIds.add(j.graphId);
    }
    for (const graphId of graphIds) {
      realtime.publishExecutionQueue(graphId, snapshotForGraph(graphId));
    }
  }

  async function drain(): Promise<void> {
    while (fifo.length > 0) {
      const job = fifo.shift()!;
      current = job;
      renumberQueuedPositions();
      publishAffectedGraphRooms();

      updateRun(job.runId, {
        status: "running",
        startedAt: new Date().toISOString(),
        queuePosition: undefined,
      });

      const target = { runId: job.runId, graphId: job.graphId };
      const result = await runGraph(job.runId, job.graph, job.input, {
        onRunStarted: (p) => {
          realtime.publishRunStarted(target, { ...p, graphId: job.graphId });
        },
        onNodeStarted: (p) => {
          realtime.publishRunNodeStarted(target, { ...p, graphId: job.graphId });
        },
        onNodeCompleted: (p) => {
          realtime.publishRunNodeCompleted(target, {
            ...p,
            graphId: job.graphId,
          });
        },
        onLogs: (p) => {
          realtime.publishRunLogs(target, { ...p, graphId: job.graphId });
        },
        onRunCompleted: (p) => {
          realtime.publishRunCompleted(target, {
            ...p,
            graphId: job.graphId,
            success: true,
          });
        },
        onRunFailed: (p) => {
          realtime.publishRunFailed(target, {
            ...p,
            graphId: job.graphId,
            success: false,
          });
        },
      });

      updateRun(job.runId, {
        status: result.success ? "completed" : "failed",
        endedAt: new Date().toISOString(),
        nodeOutputs: result.nodeOutputs,
        trace: result.trace,
        logs: result.logs,
        error: result.success ? undefined : result.error,
      });

      current = null;
      renumberQueuedPositions();
      publishAffectedGraphRooms();
    }
  }

  let chain: Promise<void> = Promise.resolve();

  function scheduleDrain(): void {
    chain = chain
      .then(() => drain())
      .catch((e) => {
        console.error("execution queue drain error", e);
      });
  }

  return {
    enqueue({ runId, graphId, graph, input }) {
      const validationError = validateGraph(graph);
      if (validationError) {
        return { ok: false, error: validationError };
      }

      if (getRun(runId)) {
        return { ok: false, error: "Run id already exists." };
      }

      const snapshot = cloneGraph(graph);
      createRunRecordQueued(runId, snapshot, input, graphId, undefined);
      fifo.push({ runId, graphId, graph: snapshot, input });
      renumberQueuedPositions();
      publishAffectedGraphRooms();
      scheduleDrain();

      return { ok: true, queuePosition: fifo.length };
    },

    getQueueSnapshotForGraph(graphId: string): ExecutionQueuePayload {
      return snapshotForGraph(graphId);
    },
  };
}
