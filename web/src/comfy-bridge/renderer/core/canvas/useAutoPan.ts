import type { DragAndScale } from '@/lib/litegraph/src/DragAndScale'

const EDGE_THRESHOLD = 50

interface AutoPanOptions {
  canvas: HTMLCanvasElement
  ds: DragAndScale
  maxPanSpeed: number
  onPan: (canvasDeltaX: number, canvasDeltaY: number) => void
}

export function calculateEdgePanSpeed(
  pointerPos: number,
  minBound: number,
  maxBound: number,
  scale: number,
  maxPanSpeed: number
): number {
  if (maxPanSpeed <= 0) return 0

  const distFromMin = pointerPos - minBound
  const distFromMax = maxBound - pointerPos

  if (distFromMin < 0) return -maxPanSpeed / scale

  if (distFromMax < 0) return maxPanSpeed / scale

  if (distFromMin < EDGE_THRESHOLD) {
    return (-maxPanSpeed * (1 - distFromMin / EDGE_THRESHOLD)) / scale
  }

  if (distFromMax < EDGE_THRESHOLD) {
    return (maxPanSpeed * (1 - distFromMax / EDGE_THRESHOLD)) / scale
  }

  return 0
}

export class AutoPanController {
  private pointerX = 0
  private pointerY = 0
  private readonly canvas: HTMLCanvasElement
  private readonly ds: DragAndScale
  private readonly maxPanSpeed: number
  private readonly onPan: (dx: number, dy: number) => void
  private rafId: number | null = null
  private running = false

  constructor(options: AutoPanOptions) {
    this.canvas = options.canvas
    this.ds = options.ds
    this.maxPanSpeed = options.maxPanSpeed
    this.onPan = options.onPan
  }

  updatePointer(screenX: number, screenY: number) {
    this.pointerX = screenX
    this.pointerY = screenY
  }

  start() {
    if (this.running) return
    this.running = true
    const tick = () => {
      if (!this.running) return
      this.tick()
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  stop() {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private tick() {
    const rect = this.canvas.getBoundingClientRect()
    const scale = this.ds.scale

    const panX = calculateEdgePanSpeed(
      this.pointerX,
      rect.left,
      rect.right,
      scale,
      this.maxPanSpeed
    )
    const panY = calculateEdgePanSpeed(
      this.pointerY,
      rect.top,
      rect.bottom,
      scale,
      this.maxPanSpeed
    )

    if (panX === 0 && panY === 0) return

    this.ds.offset[0] -= panX
    this.ds.offset[1] -= panY

    this.onPan(panX, panY)
  }
}
