import { Router } from "express";
import type { GraphService } from "../graphs/service.js";
import type { GraphDefinition } from "../graphExecution/types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGraph(value: unknown): GraphDefinition | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.links)) return null;
  return value as GraphDefinition;
}

export function createGraphsRouter(graphService: GraphService): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const graphs = await graphService.listGraphs();
    res.status(200).json({ ok: true, graphs });
  });

  router.get("/:id", async (req, res) => {
    const graph = await graphService.getGraph(req.params.id);
    if (!graph) {
      res.status(404).json({ ok: false, error: "Graph not found." });
      return;
    }
    res.status(200).json({ ok: true, graph });
  });

  router.post("/", async (req, res) => {
    const body = req.body;
    const name = typeof body?.name === "string" ? body.name : "";
    const description =
      typeof body?.description === "string" ? body.description : undefined;
    const graph = parseGraph(body?.graph);
    if (!graph) {
      res
        .status(400)
        .json({ ok: false, error: "Body must include a valid graph object." });
      return;
    }
    try {
      const created = await graphService.createGraph({ name, description, graph });
      res.status(201).json({ ok: true, graph: created });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.put("/:id", async (req, res) => {
    const body = req.body;
    const payload: {
      name?: string;
      description?: string;
      graph?: GraphDefinition;
    } = {};
    if (typeof body?.name === "string") payload.name = body.name;
    if (typeof body?.description === "string") payload.description = body.description;
    const graph = parseGraph(body?.graph);
    if (body?.graph !== undefined && !graph) {
      res
        .status(400)
        .json({ ok: false, error: "If provided, graph must be valid." });
      return;
    }
    if (graph) payload.graph = graph;
    try {
      const updated = await graphService.updateGraph(req.params.id, payload);
      if (!updated) {
        res.status(404).json({ ok: false, error: "Graph not found." });
        return;
      }
      res.status(200).json({ ok: true, graph: updated });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.delete("/:id", async (req, res) => {
    const removed = await graphService.deleteGraph(req.params.id);
    if (!removed) {
      res.status(404).json({ ok: false, error: "Graph not found." });
      return;
    }
    res.status(200).json({ ok: true });
  });

  return router;
}

