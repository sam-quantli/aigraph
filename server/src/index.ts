import dotenv from "dotenv";
import express from "express";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonGraphRepository } from "./graphs/repository.js";
import { GraphService } from "./graphs/service.js";
import { client } from "./quantli/generated/client.gen.js";
import { getIntegrationsV1SymbolsBySymbolCodeCandles } from "./quantli/generated/index.js";
import {
  createExecutionQueue,
  type ExecutionQueue,
} from "./graphExecution/executionQueue.js";
import { createRealtimeServer } from "./realtime/socketServer.js";
import { createGraphsRouter } from "./routes/graphs.js";
import { createNodesRouter } from "./routes/nodes.js";
import { createPreviewRouter } from "./routes/preview.js";
import { createRunsRouter } from "./routes/runs.js";
import { runScriptFile } from "./scriptExecution/runner.js";
import { getScriptDataRoot } from "./scriptExecution/scriptRoot.js";

const serverDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
dotenv.config({ path: path.join(serverDir, ".env") });

client.setConfig({
  headers: {
    "X-Api-Key":
      "qnt_ODO-UHCo1UGuxgg_vhnWUA.YL9Nga1WLNG88npNfHqUVAiK5WKQIbUaSkngbNw5B2Q",
  },
});

const app = express();
const port = Number(process.env.PORT) || 3031;
const graphDbPath =
  process.env.GRAPH_DB_FILE ??
  path.resolve(serverDir, "data", "graphs.mock-db.json");
const graphService = new GraphService(new JsonGraphRepository(graphDbPath));
const corsOrigin = process.env.CORS_ORIGIN?.trim() || "http://localhost:7000";
const httpServer = createServer(app);

const executionQueueRef: { current?: ExecutionQueue } = {};
const realtime = createRealtimeServer(httpServer, corsOrigin, {
  getExecutionQueueSnapshot: (graphId) =>
    executionQueueRef.current?.getQueueSnapshotForGraph(graphId) ?? {
      graphId,
      jobs: [],
    },
});
const executionQueue = createExecutionQueue(realtime);
executionQueueRef.current = executionQueue;

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, graphDbPath });
});

app.use("/nodes", createNodesRouter());
app.use("/graphs", createGraphsRouter(graphService));
app.use("/runs", createRunsRouter(graphService, realtime, executionQueue));
app.use("/preview", createPreviewRouter(graphService));

app.post("/execute", async (req, res) => {
  const scriptName = req.body?.scriptName;
  if (typeof scriptName !== "string" || !scriptName.length) {
    res
      .status(400)
      .json({ ok: false, error: "Body must include string scriptName." });
    return;
  }

  const jobId =
    typeof req.body?.jobId === "string" && req.body.jobId.length > 0
      ? req.body.jobId
      : randomUUID();
  let payload = req.body?.payload;

  const rawPayload = payload;
  if (
    rawPayload &&
    typeof rawPayload === "object" &&
    !Array.isArray(rawPayload) &&
    typeof (rawPayload as { symbolCode?: unknown }).symbolCode === "string"
  ) {
    const symbolCode = (rawPayload as { symbolCode: string }).symbolCode.trim();
    if (symbolCode.length > 0) {
      try {
        const { data: chartInsights } =
          await getIntegrationsV1SymbolsBySymbolCodeCandles<true>({
            throwOnError: true,
            path: { symbolCode },
            query: { timeRange: "5Y" },
            headers: { Accept: "application/json" },
          });
        payload = {
          ...(rawPayload as Record<string, unknown>),
          chartInsights,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        res.status(502).json({ ok: false, jobId, error: msg });
        return;
      }
    }
  }

  const result = await runScriptFile(getScriptDataRoot(), {
    scriptName,
    jobId,
    input: { payload },
  });

  if ("error" in result) {
    const status = result.error.startsWith("Script not found") ? 404 : 500;
    res
      .status(status)
      .json({ ok: false, jobId: result.jobId, error: result.error });
    return;
  }

  res.status(200).json({
    ok: true,
    jobId: result.jobId,
    data: result.output.data,
    codes: result.output.codes,
    success: result.output.success,
  });
});

httpServer.listen(port, () => {
  console.log(`aigraph server listening on http://localhost:${port}`);
});
