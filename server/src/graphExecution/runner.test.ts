import test from "node:test";
import assert from "node:assert/strict";
import { runGraph } from "./runner.js";
import type { GraphDefinition } from "./types.js";

test("runGraph executes if/else branch", async () => {
  const graph: GraphDefinition = {
    nodes: [
      { id: 1, type: "core/start", outputs: [{ name: "next" }, { name: "payload" }] },
      {
        id: 2,
        type: "control/if_else",
        properties: { condition: true },
        inputs: [{ name: "flow" }, { name: "condition" }],
        outputs: [{ name: "true" }, { name: "false" }],
      },
      {
        id: 3,
        type: "core/log",
        properties: { message: "TRUE_PATH" },
        inputs: [{ name: "flow" }, { name: "message" }],
        outputs: [{ name: "next" }],
      },
      {
        id: 4,
        type: "core/log",
        properties: { message: "FALSE_PATH" },
        inputs: [{ name: "flow" }, { name: "message" }],
        outputs: [{ name: "next" }],
      },
    ],
    links: [
      [1, 1, 0, 2, 0, "flow"],
      [2, 2, 0, 3, 0, "flow"],
      [3, 2, 1, 4, 0, "flow"],
    ],
  };

  const result = await runGraph("run-if", graph, {});
  assert.equal(result.success, true);
  assert.equal(result.trace.length, 3);
  assert.deepEqual(result.trace.map((entry) => entry.nodeType), [
    "core/start",
    "control/if_else",
    "core/log",
  ]);
  assert.deepEqual(result.logs, ["TRUE_PATH"]);
});

test("runGraph executes switch branch case_1", async () => {
  const graph: GraphDefinition = {
    nodes: [
      { id: 1, type: "core/start", outputs: [{ name: "next" }, { name: "payload" }] },
      {
        id: 2,
        type: "control/switch",
        properties: { cases: "A,B,C" },
        inputs: [{ name: "flow" }, { name: "value" }],
        outputs: [
          { name: "case_0" },
          { name: "case_1" },
          { name: "case_2" },
          { name: "default" },
        ],
      },
      {
        id: 3,
        type: "core/set_value",
        properties: { value: "B" },
        inputs: [{ name: "flow" }, { name: "value" }],
        outputs: [{ name: "next" }, { name: "value" }],
      },
      {
        id: 4,
        type: "core/log",
        properties: { message: "CASE_1" },
        inputs: [{ name: "flow" }, { name: "message" }],
        outputs: [{ name: "next" }],
      },
      {
        id: 5,
        type: "core/log",
        properties: { message: "DEFAULT" },
        inputs: [{ name: "flow" }, { name: "message" }],
        outputs: [{ name: "next" }],
      },
    ],
    links: [
      [1, 1, 0, 3, 0, "flow"],
      [2, 3, 0, 2, 0, "flow"],
      [3, 3, 1, 2, 1, "data"],
      [4, 2, 1, 4, 0, "flow"],
      [5, 2, 3, 5, 0, "flow"],
    ],
  };

  const result = await runGraph("run-switch", graph, {});
  assert.equal(result.success, true);
  assert.deepEqual(result.logs, ["CASE_1"]);
});
