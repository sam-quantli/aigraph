/**
 * Ambient declarations so `tsc` can typecheck the React app without pulling in
 * the full Comfy litegraph TypeScript graph (which has upstream strictness gaps).
 * Vite still resolves `@/lib/litegraph/*` to real sources at build time.
 */
declare module '@/lib/litegraph/src/litegraph' {
  export class LGraph {
    constructor(o?: unknown)
    add(node: LGraphNode): void
    stop(): void
  }

  export class LGraphCanvas {
    static active_canvas: LGraphCanvas
    constructor(canvas: HTMLCanvasElement, graph: LGraph)
    resize(width?: number, height?: number): void
    setDirty(fg: boolean, bg?: boolean): void
    draw(fg?: boolean, bg?: boolean): void
    stopRendering(): void
    unbindEvents(): void
  }

  export class LGraphNode {
    constructor(title?: string, type?: string)
    pos: [number, number]
    properties: Record<string, unknown>
    addInput(name: string, type: string): void
    addOutput(name: string, type: string): void
    setOutputData(slot: number, data: unknown): void
    onExecute?(): void
  }

  export const LiteGraph: {
    registerNodeType(type: string, base: typeof LGraphNode): void
    createNode(type: string, title?: string): LGraphNode | null
  }
}
