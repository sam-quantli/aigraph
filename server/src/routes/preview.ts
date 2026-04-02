import { Router } from "express";
import type { GraphService } from "../graphs/service.js";
import type { GraphDefinition, GraphNodeInstance } from "../graphExecution/types.js";
import { getRun } from "../graphExecution/runStore.js";
import { getNodePreview } from "../graphExecution/nodes/index.js";
import { resolveLinkedDataInput } from "../graphExecution/preview/resolveDataInput.js";

function isGraphDefinition(value: unknown): value is GraphDefinition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const graph = value as Partial<GraphDefinition>;
  return Array.isArray(graph.nodes) && Array.isArray(graph.links);
}

export function createPreviewRouter(graphService: GraphService): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const runId =
      typeof req.body?.runId === "string" && req.body.runId.trim().length > 0
        ? req.body.runId.trim()
        : undefined;
    const nodeIdRaw = req.body?.nodeId;
    const nodeId =
      typeof nodeIdRaw === "string" || typeof nodeIdRaw === "number"
        ? nodeIdRaw
        : undefined;

    if (!runId || nodeId === undefined) {
      res.status(400).json({
        ok: false,
        error: "Body must include runId and nodeId.",
      });
      return;
    }

    const record = getRun(runId);
    if (!record) {
      res.status(404).json({ ok: false, error: "Run not found." });
      return;
    }

    const graphId =
      typeof req.body?.graphId === "string" && req.body.graphId.trim().length
        ? req.body.graphId.trim()
        : undefined;

    let graph: GraphDefinition | null = null;
    if (isGraphDefinition(req.body?.graph)) {
      graph = req.body.graph;
    } else if (graphId) {
      const existing = await graphService.getGraph(graphId);
      graph = existing?.graph ?? null;
    }

    if (!graph) {
      res.status(400).json({
        ok: false,
        error: "Body must include graph or graphId for a stored graph.",
      });
      return;
    }

    const node = graph.nodes.find(
      (n) => String(n.id) === String(nodeId)
    ) as GraphNodeInstance | undefined;
    if (!node) {
      res.status(404).json({ ok: false, error: "Node not found in graph." });
      return;
    }

    const getPreview = getNodePreview(node.type);
    if (!getPreview) {
      res.status(501).json({
        ok: false,
        error: `Node type "${node.type}" does not support preview.`,
      });
      return;
    }

    const ctx = {
      runId,
      node,
      graph,
      nodeOutputs: record.nodeOutputs,
      resolveDataInput(inputName: string): unknown {
        return resolveLinkedDataInput(graph!, node, inputName, record.nodeOutputs);
      },
    };

    try {
      const preview = await Promise.resolve(getPreview(ctx));
      res.status(200).json({ ok: true, runId, nodeId, preview });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  return router;
}
