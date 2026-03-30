import type { LGraphNode } from '@/lib/litegraph/src/LGraphNode'
import type { LGraph } from '@/lib/litegraph/src/LGraph'

export function forEachNode(
  graph: LGraph,
  callback: (node: LGraphNode) => void
): void {
  for (const node of graph._nodes) {
    callback(node)
  }
}
