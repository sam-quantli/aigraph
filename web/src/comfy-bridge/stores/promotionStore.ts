import type { NodeId } from '@/lib/litegraph/src/LGraphNode'

import type { PromotedWidgetSource } from '@/core/graph/subgraph/promotedWidgetTypes'

export function makePromotionEntryKey(entry: PromotedWidgetSource): string {
  return JSON.stringify([
    entry.sourceNodeId,
    entry.sourceWidgetName,
    entry.disambiguatingSourceNodeId ?? null
  ])
}

/** graphId -> nodeId -> promotions array (mutable ref for getPromotionsRef) */
const byGraph = new Map<string, Map<string, PromotedWidgetSource[]>>()

function innerKey(nodeId: NodeId): string {
  return String(nodeId)
}

function getOrCreateEntries(
  graphId: string,
  subgraphNodeId: NodeId
): PromotedWidgetSource[] {
  let g = byGraph.get(graphId)
  if (!g) {
    g = new Map()
    byGraph.set(graphId, g)
  }
  const k = innerKey(subgraphNodeId)
  let arr = g.get(k)
  if (!arr) {
    arr = []
    g.set(k, arr)
  }
  return arr
}

export function usePromotionStore() {
  return {
    clearGraph(graphId: string) {
      byGraph.delete(graphId)
    },

    /** Returns the live array (Pinia ref semantics) */
    getPromotionsRef(graphId: string, subgraphNodeId: NodeId) {
      return getOrCreateEntries(graphId, subgraphNodeId)
    },

    getPromotions(graphId: string, subgraphNodeId: NodeId) {
      return getOrCreateEntries(graphId, subgraphNodeId)
    },

    setPromotions(
      graphId: string,
      subgraphNodeId: NodeId,
      entries: PromotedWidgetSource[]
    ) {
      const g = byGraph.get(graphId)
      if (!g) {
        byGraph.set(graphId, new Map([[innerKey(subgraphNodeId), [...entries]]]))
        return
      }
      const arr = getOrCreateEntries(graphId, subgraphNodeId)
      arr.length = 0
      arr.push(...entries)
    },

    promote(
      graphId: string,
      subgraphNodeId: NodeId,
      entry: PromotedWidgetSource
    ) {
      const cur = getOrCreateEntries(graphId, subgraphNodeId)
      const k = makePromotionEntryKey(entry)
      if (cur.some((e) => makePromotionEntryKey(e) === k)) return
      cur.push(entry)
    },

    demote(
      graphId: string,
      subgraphNodeId: NodeId,
      source: PromotedWidgetSource | { sourceNodeId: string; sourceWidgetName: string }
    ) {
      const cur = getOrCreateEntries(graphId, subgraphNodeId)
      const next = cur.filter(
        (e) =>
          !(
            e.sourceNodeId === source.sourceNodeId &&
            e.sourceWidgetName === source.sourceWidgetName
          )
      )
      cur.length = 0
      cur.push(...next)
    },

    isPromoted(
      graphId: string,
      subgraphNodeId: NodeId,
      source: PromotedWidgetSource
    ) {
      const k = makePromotionEntryKey(source)
      return getOrCreateEntries(graphId, subgraphNodeId).some(
        (e) => makePromotionEntryKey(e) === k
      )
    },

    isPromotedByAny(
      graphId: string,
      query: { sourceNodeId: string; sourceWidgetName: string }
    ) {
      const g = byGraph.get(graphId)
      if (!g) return false
      for (const entries of g.values()) {
        for (const e of entries) {
          if (
            e.sourceNodeId === query.sourceNodeId &&
            e.sourceWidgetName === query.sourceWidgetName
          )
            return true
        }
      }
      return false
    }
  }
}
