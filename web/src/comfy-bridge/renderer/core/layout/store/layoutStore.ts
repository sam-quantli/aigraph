import type { Bounds } from '@/renderer/core/layout/types'
import type {
  LinkSegmentHit,
  NodeLayoutEntry,
  RerouteLayoutQueryResult,
  SlotLayoutEntry,
  SlotLayoutQueryResult
} from '@/renderer/core/layout/layoutQueryTypes'
import type { LayoutSource } from '@/renderer/core/layout/types'

function refBox<T>(initial: T): { value: T } {
  return { value: initial }
}

interface LinkLayoutRecord {
  id: number
  path: Path2D
  bounds: Bounds
  centerPos: { x: number; y: number }
  sourceNodeId: string
  targetNodeId: string
  sourceSlot: number
  targetSlot: number
}

interface LinkSegmentLayoutRecord {
  path: Path2D
  bounds: Bounds
  centerPos: { x: number; y: number }
}

function createLayoutStore() {
  const isDraggingVueNodes = refBox(false)
  let pendingSlotSync = false

  return {
    isDraggingVueNodes,
    get pendingSlotSync() {
      return pendingSlotSync
    },
    setPendingSlotSync(v: boolean) {
      pendingSlotSync = v
    },

    querySlotAtPoint(_point: {
      x: number
      y: number
    }): SlotLayoutQueryResult | null {
      return null
    },

    queryRerouteAtPoint(_point: {
      x: number
      y: number
    }): RerouteLayoutQueryResult | null {
      return null
    },

    queryLinkSegmentAtPoint(
      _point: { x: number; y: number },
      _ctx: CanvasRenderingContext2D | null
    ): LinkSegmentHit | null {
      return null
    },

    setSource(_source: LayoutSource) {},

    batchUpdateNodeBounds(
      _positions: Array<{ nodeId: string; bounds: Bounds }>
    ): void {},

    deleteLinkLayout(_linkId: number): void {},

    updateLinkLayout(_linkId: number, _data: LinkLayoutRecord): void {},

    updateLinkSegmentLayout(
      _linkId: number,
      _rerouteId: number | null,
      _data: LinkSegmentLayoutRecord
    ): void {},

    getSlotLayout(_key: string): SlotLayoutEntry | null {
      return null
    },

    getNodeLayoutRef(_nodeId: string): { value: NodeLayoutEntry | null } {
      return { value: null }
    }
  }
}

export const layoutStore = createLayoutStore()
