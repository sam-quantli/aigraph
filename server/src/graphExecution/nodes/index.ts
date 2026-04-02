import type { NodeDefinition, NodeExecutor } from "../types.js";
import type { NodePreviewFn } from "../preview/types.js";
import { startNode } from "./core/start.js";
import { ifElseNode } from "./control/ifElse.js";
import { switchNode } from "./control/switch.js";
import { delayNode } from "./control/delay.js";
import { logNode } from "./core/log.js";
import { setValueNode } from "./core/setValue.js";
import { quantliGetSymbolsNode } from "./quantli/getSymbols.js";
import { quantliGetSymbolNode } from "./quantli/getSymbol.js";
import { quantliGetCandlesNode } from "./quantli/getCandles.js";
import { quantliCandlesChartNode } from "./quantli/candlesChart.js";
import type { NodeRegistration } from "./shared.js";

const REGISTRY = new Map<string, NodeRegistration>([
  [startNode.definition.type, startNode],
  [ifElseNode.definition.type, ifElseNode],
  [switchNode.definition.type, switchNode],
  [delayNode.definition.type, delayNode],
  [quantliGetSymbolsNode.definition.type, quantliGetSymbolsNode],
  [quantliGetSymbolNode.definition.type, quantliGetSymbolNode],
  [quantliGetCandlesNode.definition.type, quantliGetCandlesNode],
  [quantliCandlesChartNode.definition.type, quantliCandlesChartNode],
  [logNode.definition.type, logNode],
  [setValueNode.definition.type, setValueNode],
]);

export function getNodeCatalog(): NodeDefinition[] {
  return Array.from(REGISTRY.values()).map((entry) => entry.definition);
}

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return REGISTRY.get(type)?.definition;
}

export function getNodeExecutor(type: string): NodeExecutor | undefined {
  return REGISTRY.get(type)?.execute;
}

export function getNodePreview(type: string): NodePreviewFn | undefined {
  return REGISTRY.get(type)?.getPreview;
}
