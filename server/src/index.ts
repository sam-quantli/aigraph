import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { randomUUID } from "node:crypto";

const serverDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
dotenv.config({ path: path.join(serverDir, ".env") });
import { runScriptFile } from "./execution/runner.js";
import { getScriptDataRoot } from "./execution/scriptRoot.js";
import { getCandlesData } from "./quantly/client.js";
import { getQuantlyConfig } from "./quantly/config.js";

const app = express();
const port = Number(process.env.PORT) || 3031;

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

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
      const cfg = getQuantlyConfig();
      if (!cfg) {
        res.status(503).json({
          ok: false,
          jobId,
          error:
            "Quantly is not configured: set QUANTLY_URL and QUANTLI_API_KEY.",
        });
        return;
      }
      try {
        const candleRes = await getCandlesData(cfg, symbolCode);
        payload = {
          ...(rawPayload as Record<string, unknown>),
          symbolCode: candleRes.symbolCode,
          candleTimeRange: candleRes.timeRange,
          candles: candleRes.candles,
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

app.listen(port, () => {
  console.log(`aigraph server listening on http://localhost:${port}`);
});
