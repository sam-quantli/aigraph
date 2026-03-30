import type { NodeId } from '@/lib/litegraph/src/LGraphNode'
import type { TWidgetType } from '@/lib/litegraph/src/types/widgets'

export interface WidgetState {
  name: string
  type: TWidgetType
  value: unknown
  label?: string
  disabled: boolean
  serialize?: boolean
  options?: unknown
  nodeId?: NodeId
}

type WidgetKey = string

function key(graphId: string, nodeId: NodeId | string, widgetName: string): WidgetKey {
  return `${graphId}:${String(nodeId)}:${widgetName}`
}

const widgets = new Map<WidgetKey, WidgetState>()

export function stripGraphPrefix(nodeId: string): string {
  return nodeId.replace(/^graph:/, '')
}

export function useWidgetValueStore() {
  return {
    registerWidget(
      graphId: string,
      partial: Omit<WidgetState, 'nodeId'> & { nodeId?: NodeId }
    ): WidgetState {
      const nodeId = partial.nodeId
      if (nodeId === undefined) {
        return partial as WidgetState
      }
      const w: WidgetState = {
        ...partial,
        nodeId
      }
      widgets.set(key(graphId, nodeId, w.name), w)
      return w
    },

    getWidget(
      graphId: string,
      nodeId: NodeId | string,
      widgetName: string
    ): WidgetState | undefined {
      return widgets.get(key(graphId, nodeId, widgetName))
    },

    clearGraph(graphId: string) {
      const prefix = `${graphId}:`
      for (const k of widgets.keys()) {
        if (k.startsWith(prefix)) widgets.delete(k)
      }
    }
  }
}
