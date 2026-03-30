import type { NodeId } from '@/lib/litegraph/src/LGraphNode'
import { LayoutSource } from '@/renderer/core/layout/types'

export interface LayoutMutations {
  setSource(source: LayoutSource): void
  moveNode(nodeId: string, pos: { x: number; y: number }): void
  resizeNode(
    nodeId: string,
    size: { width: number; height: number }
  ): void
  createLink(
    linkId: number,
    originId: NodeId,
    originSlot: number,
    targetId: NodeId,
    targetSlot: number
  ): void
  deleteLink(linkId: number): void
  createReroute(
    rerouteId: number,
    pos: { x: number; y: number },
    parentId: number | undefined,
    linkIds: number[]
  ): void
  deleteReroute(rerouteId: number): void
  moveReroute(
    rerouteId: number,
    pos: { x: number; y: number },
    previousPos: { x: number; y: number }
  ): void
}

const noop: LayoutMutations = {
  setSource() {},
  moveNode() {},
  resizeNode() {},
  createLink() {},
  deleteLink() {},
  createReroute() {},
  deleteReroute() {},
  moveReroute() {}
}

export function useLayoutMutations(): LayoutMutations {
  return noop
}
