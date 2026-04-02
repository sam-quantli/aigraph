import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { GraphService } from "../graphs/service.js";
import type { GraphDefinition } from "../graphExecution/types.js";
import type { RealtimePublisher } from "../realtime/socketServer.js";
import type { ExecutionQueue } from "../graphExecution/executionQueue.js";
import { getRun } from "../graphExecution/runStore.js";

function isGraphDefinition(value: unknown): value is GraphDefinition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const graph = value as Partial<GraphDefinition>;
  return Array.isArray(graph.nodes) && Array.isArray(graph.links);
}

export function createRunsRouter(
  graphService: GraphService,
  realtime: RealtimePublisher,
  executionQueue: ExecutionQueue
): Router {
  const router = Router();

  router.get("/:runId", (req, res) => {
    const runId = req.params.runId;
    const record = getRun(runId);
    if (!record) {
      res.status(404).json({ ok: false, error: "Run not found." });
      return;
    }
    const nodeOutputKeys: Record<string, string[]> = {};
    for (const [nid, outputs] of Object.entries(record.nodeOutputs)) {
      nodeOutputKeys[nid] = Object.keys(outputs);
    }
    res.status(200).json({
      ok: true,
      run: {
        runId: record.runId,
        graphId: record.graphId,
        status: record.status,
        enqueuedAt: record.enqueuedAt,
        startedAt: record.startedAt,
        endedAt: record.endedAt,
        error: record.error,
        trace: record.trace,
        logs: record.logs,
        nodeOutputKeys,
        nodeOutputs: record.nodeOutputs,
      },
    });
  });

  router.post("/", async (req, res) => {
    const runId =
      typeof req.body?.jobId === "string" && req.body.jobId.trim().length > 0
        ? req.body.jobId.trim()
        : randomUUID();

    const graphId =
      typeof req.body?.graphId === "string" && req.body.graphId.trim().length
        ? req.body.graphId.trim()
        : undefined;
    const target = { runId, graphId };

    let graph: GraphDefinition | null = null;
    if (graphId) {
      const existing = await graphService.getGraph(graphId);
      if (!existing) {
        realtime.publishRunFailed(target, {
          runId,
          graphId,
          success: false,
          error: "Graph not found.",
          endedAt: new Date().toISOString(),
        });
        res.status(404).json({ ok: false, runId, error: "Graph not found." });
        return;
      }
      graph = existing.graph;
    } else if (isGraphDefinition(req.body?.graph)) {
      graph = req.body.graph;
    } else {
      realtime.publishRunFailed(target, {
        runId,
        graphId,
        success: false,
        error: "Body must include graphId or graph definition.",
        endedAt: new Date().toISOString(),
      });
      res.status(400).json({
        ok: false,
        runId,
        error: "Body must include graphId or graph definition.",
      });
      return;
    }
    if (!graph) {
      realtime.publishRunFailed(target, {
        runId,
        graphId,
        success: false,
        error: "Graph payload required.",
        endedAt: new Date().toISOString(),
      });
      res.status(400).json({ ok: false, runId, error: "Graph payload required." });
      return;
    }

    const enqueued = executionQueue.enqueue({
      runId,
      graphId,
      graph,
      input: req.body?.input,
    });

    if (!enqueued.ok) {
      realtime.publishRunFailed(target, {
        runId,
        graphId,
        success: false,
        error: enqueued.error,
        endedAt: new Date().toISOString(),
      });
      res.status(400).json({ ok: false, runId, error: enqueued.error });
      return;
    }

    res.status(202).json({
      ok: true,
      runId,
      graphId,
      status: "queued",
      queuePosition: enqueued.queuePosition,
    });
  });

  return router;
}
