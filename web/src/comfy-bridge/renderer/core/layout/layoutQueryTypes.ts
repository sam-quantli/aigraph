/** Return shapes for layoutStore spatial queries (Comfy layout tree integration). */

export interface SlotLayoutQueryResult {
  nodeId: string
  type: 'input' | 'output'
  index: number
  position: { x: number; y: number }
}

export interface RerouteLayoutQueryResult {
  id: number
}

export type LinkSegmentHit =
  | { rerouteId: number; linkId?: number }
  | { linkId: number; rerouteId?: number }

export interface SlotLayoutEntry {
  position: { x: number; y: number }
}

export interface NodeLayoutEntry {
  position: { x: number; y: number }
  size: { width: number; height: number }
}
