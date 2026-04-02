import { Router } from "express";
import { getNodeCatalog } from "../graphExecution/nodes/index.js";

export function createNodesRouter(): Router {
  const router = Router();
  router.get("/", (_req, res) => {
    res.status(200).json({ ok: true, nodes: getNodeCatalog() });
  });
  return router;
}

