/**
 * Vendored from ComfyUI_frontend pathRenderer — pure Canvas2D (no framework).
 */
export interface Point {
  x: number
  y: number
}

export type Direction = 'left' | 'right' | 'up' | 'down' | 'none'
export type RenderMode = 'spline' | 'straight' | 'linear'
export type ArrowShape = 'triangle' | 'circle' | 'square'

export interface LinkRenderData {
  id: string
  startPoint: Point
  endPoint: Point
  startDirection: Direction
  endDirection: Direction
  color?: string
  type?: string
  controlPoints?: Point[]
  flow?: boolean
  disabled?: boolean
  segments?: Array<{
    start: Point
    end: Point
    controlPoints?: Point[]
  }>
  centerPos?: Point
  centerAngle?: number
}

interface RenderStyle {
  mode: RenderMode
  connectionWidth: number
  borderWidth?: number
  arrowShape?: ArrowShape
  showArrows?: boolean
  lowQuality?: boolean
  showCenterMarker?: boolean
  centerMarkerShape?: 'circle' | 'arrow'
  highQuality?: boolean
}

interface RenderColors {
  default: string
  byType: Record<string, string>
  highlighted: string
}

export interface RenderContext {
  style: RenderStyle
  colors: RenderColors
  patterns?: {
    disabled?: CanvasPattern | null
  }
  animation?: {
    time: number
  }
  scale?: number
  highlightedIds?: Set<string>
}

interface DragLinkData {
  fixedPoint: Point
  fixedDirection: Direction
  dragPoint: Point
  dragDirection?: Direction
  color?: string
  type?: string
  disabled?: boolean
  fromInput?: boolean
}

export class CanvasPathRenderer {
  drawLink(
    ctx: CanvasRenderingContext2D,
    link: LinkRenderData,
    context: RenderContext
  ): Path2D {
    const path = new Path2D()
    const isHighlighted = context.highlightedIds?.has(link.id) ?? false
    const color = this.determineLinkColor(link, context, isHighlighted)

    ctx.save()

    if (link.disabled && context.patterns?.disabled) {
      ctx.strokeStyle = context.patterns.disabled
    } else {
      ctx.strokeStyle = color
    }

    ctx.lineWidth = context.style.connectionWidth
    ctx.lineJoin = 'round'

    if (context.style.borderWidth && !context.style.lowQuality) {
      this.drawLinkPath(
        ctx,
        path,
        link,
        context,
        context.style.connectionWidth + context.style.borderWidth,
        'rgba(0,0,0,0.5)'
      )
    }

    this.drawLinkPath(
      ctx,
      path,
      link,
      context,
      context.style.connectionWidth,
      color
    )

    this.calculateCenterPoint(link, context)

    if (context.style.showArrows) {
      this.drawArrows(ctx, link, context, color)
    }

    if (
      context.style.showCenterMarker &&
      context.scale &&
      context.scale >= 0.6 &&
      context.style.highQuality
    ) {
      this.drawCenterMarker(ctx, link, context, color)
    }

    if (link.flow && context.animation) {
      this.drawFlowAnimation(ctx, path, link, context)
    }

    ctx.restore()

    return path
  }

  private determineLinkColor(
    link: LinkRenderData,
    context: RenderContext,
    isHighlighted: boolean
  ): string {
    if (isHighlighted) {
      return context.colors.highlighted
    }
    if (link.color) {
      return link.color
    }
    if (link.type && context.colors.byType[link.type]) {
      return context.colors.byType[link.type]
    }
    return context.colors.default
  }

  private drawLinkPath(
    ctx: CanvasRenderingContext2D,
    path: Path2D,
    link: LinkRenderData,
    context: RenderContext,
    lineWidth: number,
    color: string
  ): void {
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth

    const start = link.startPoint
    const end = link.endPoint

    if (context.style.mode === 'linear') {
      this.buildLinearPath(
        path,
        start,
        end,
        link.startDirection,
        link.endDirection
      )
    } else if (context.style.mode === 'straight') {
      this.buildStraightPath(
        path,
        start,
        end,
        link.startDirection,
        link.endDirection
      )
    } else {
      this.buildSplinePath(
        path,
        start,
        end,
        link.startDirection,
        link.endDirection,
        link.controlPoints
      )
    }

    ctx.stroke(path)
  }

  private buildLinearPath(
    path: Path2D,
    start: Point,
    end: Point,
    startDir: Direction,
    endDir: Direction
  ): void {
    const l = 15
    const innerA = { x: start.x, y: start.y }
    const innerB = { x: end.x, y: end.y }

    switch (startDir) {
      case 'left':
        innerA.x -= l
        break
      case 'right':
        innerA.x += l
        break
      case 'up':
        innerA.y -= l
        break
      case 'down':
        innerA.y += l
        break
      case 'none':
        break
    }

    switch (endDir) {
      case 'left':
        innerB.x -= l
        break
      case 'right':
        innerB.x += l
        break
      case 'up':
        innerB.y -= l
        break
      case 'down':
        innerB.y += l
        break
      case 'none':
        break
    }

    path.moveTo(start.x, start.y)
    path.lineTo(innerA.x, innerA.y)
    path.lineTo(innerB.x, innerB.y)
    path.lineTo(end.x, end.y)
  }

  private buildStraightPath(
    path: Path2D,
    start: Point,
    end: Point,
    startDir: Direction,
    endDir: Direction
  ): void {
    const l = 10
    const innerA = { x: start.x, y: start.y }
    const innerB = { x: end.x, y: end.y }

    switch (startDir) {
      case 'left':
        innerA.x -= l
        break
      case 'right':
        innerA.x += l
        break
      case 'up':
        innerA.y -= l
        break
      case 'down':
        innerA.y += l
        break
      case 'none':
        break
    }

    switch (endDir) {
      case 'left':
        innerB.x -= l
        break
      case 'right':
        innerB.x += l
        break
      case 'up':
        innerB.y -= l
        break
      case 'down':
        innerB.y += l
        break
      case 'none':
        break
    }

    const midX = (innerA.x + innerB.x) * 0.5

    path.moveTo(start.x, start.y)
    path.lineTo(innerA.x, innerA.y)
    path.lineTo(midX, innerA.y)
    path.lineTo(midX, innerB.y)
    path.lineTo(innerB.x, innerB.y)
    path.lineTo(end.x, end.y)
  }

  private buildSplinePath(
    path: Path2D,
    start: Point,
    end: Point,
    startDir: Direction,
    endDir: Direction,
    controlPoints?: Point[]
  ): void {
    path.moveTo(start.x, start.y)

    const controls =
      controlPoints || this.calculateControlPoints(start, end, startDir, endDir)

    if (controls.length >= 2) {
      path.bezierCurveTo(
        controls[0].x,
        controls[0].y,
        controls[1].x,
        controls[1].y,
        end.x,
        end.y
      )
    } else if (controls.length === 1) {
      path.quadraticCurveTo(controls[0].x, controls[0].y, end.x, end.y)
    } else {
      path.lineTo(end.x, end.y)
    }
  }

  private calculateControlPoints(
    start: Point,
    end: Point,
    startDir: Direction,
    endDir: Direction
  ): Point[] {
    const dist = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    )
    const controlDist = Math.max(30, dist * 0.25)

    const startControl = this.getDirectionOffset(startDir, controlDist)
    const endControl = this.getDirectionOffset(endDir, controlDist)

    return [
      { x: start.x + startControl.x, y: start.y + startControl.y },
      { x: end.x + endControl.x, y: end.y + endControl.y }
    ]
  }

  private getDirectionOffset(direction: Direction, distance: number): Point {
    switch (direction) {
      case 'left':
        return { x: -distance, y: 0 }
      case 'right':
        return { x: distance, y: 0 }
      case 'up':
        return { x: 0, y: -distance }
      case 'down':
        return { x: 0, y: distance }
      case 'none':
      default:
        return { x: 0, y: 0 }
    }
  }

  private drawArrows(
    ctx: CanvasRenderingContext2D,
    link: LinkRenderData,
    context: RenderContext,
    color: string
  ): void {
    if (!context.style.showArrows) return

    const positions = [0.25, 0.75]

    for (const t of positions) {
      const posA = this.computeConnectionPoint(link, t, context)
      const posB = this.computeConnectionPoint(link, t + 0.01, context)

      const angle = Math.atan2(posB.y - posA.y, posB.x - posA.x)

      const transform = ctx.getTransform()
      ctx.translate(posA.x, posA.y)
      ctx.rotate(angle)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(-5, -3)
      ctx.lineTo(0, +7)
      ctx.lineTo(+5, -3)
      ctx.fill()
      ctx.setTransform(transform)
    }
  }

  private computeConnectionPoint(
    link: LinkRenderData,
    t: number,
    _context: RenderContext
  ): Point {
    const { startPoint, endPoint, startDirection, endDirection } = link

    const dist = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) +
        Math.pow(endPoint.y - startPoint.y, 2)
    )
    const factor = 0.25

    const pa = { x: startPoint.x, y: startPoint.y }
    const pb = { x: endPoint.x, y: endPoint.y }

    switch (startDirection) {
      case 'left':
        pa.x -= dist * factor
        break
      case 'right':
        pa.x += dist * factor
        break
      case 'up':
        pa.y -= dist * factor
        break
      case 'down':
        pa.y += dist * factor
        break
      case 'none':
        break
    }

    switch (endDirection) {
      case 'left':
        pb.x -= dist * factor
        break
      case 'right':
        pb.x += dist * factor
        break
      case 'up':
        pb.y -= dist * factor
        break
      case 'down':
        pb.y += dist * factor
        break
      case 'none':
        break
    }

    const c1 = (1 - t) * (1 - t) * (1 - t)
    const c2 = 3 * ((1 - t) * (1 - t)) * t
    const c3 = 3 * (1 - t) * (t * t)
    const c4 = t * t * t

    return {
      x: c1 * startPoint.x + c2 * pa.x + c3 * pb.x + c4 * endPoint.x,
      y: c1 * startPoint.y + c2 * pa.y + c3 * pb.y + c4 * endPoint.y
    }
  }

  private drawFlowAnimation(
    ctx: CanvasRenderingContext2D,
    _path: Path2D,
    link: LinkRenderData,
    context: RenderContext
  ): void {
    if (!context.animation) return

    const time = context.animation.time
    const linkColor = this.determineLinkColor(link, context, false)

    ctx.save()
    ctx.fillStyle = linkColor

    for (let i = 0; i < 5; ++i) {
      const f = (time + i * 0.2) % 1
      const flowPos = this.computeConnectionPoint(link, f, context)

      ctx.beginPath()
      ctx.arc(flowPos.x, flowPos.y, 5, 0, 2 * Math.PI)
      ctx.fill()
    }

    ctx.restore()
  }

  findPointOnBezier(
    t: number,
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point
  ): Point {
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const t2 = t * t
    const t3 = t2 * t

    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    }
  }

  drawDraggingLink(
    ctx: CanvasRenderingContext2D,
    dragData: DragLinkData,
    context: RenderContext
  ): Path2D {
    const linkData: LinkRenderData = dragData.fromInput
      ? {
          id: 'dragging',
          startPoint: dragData.dragPoint,
          endPoint: dragData.fixedPoint,
          startDirection:
            dragData.dragDirection ||
            this.getOppositeDirection(dragData.fixedDirection),
          endDirection: dragData.fixedDirection,
          color: dragData.color,
          type: dragData.type,
          disabled: dragData.disabled
        }
      : {
          id: 'dragging',
          startPoint: dragData.fixedPoint,
          endPoint: dragData.dragPoint,
          startDirection: dragData.fixedDirection,
          endDirection:
            dragData.dragDirection ||
            this.getOppositeDirection(dragData.fixedDirection),
          color: dragData.color,
          type: dragData.type,
          disabled: dragData.disabled
        }

    return this.drawLink(ctx, linkData, context)
  }

  private getOppositeDirection(direction: Direction): Direction {
    switch (direction) {
      case 'left':
        return 'right'
      case 'right':
        return 'left'
      case 'up':
        return 'down'
      case 'down':
        return 'up'
      case 'none':
      default:
        return 'none'
    }
  }

  getLinkCenter(link: LinkRenderData): Point {
    return {
      x: (link.startPoint.x + link.endPoint.x) / 2,
      y: (link.startPoint.y + link.endPoint.y) / 2
    }
  }

  private calculateCenterPoint(
    link: LinkRenderData,
    context: RenderContext
  ): void {
    const { startPoint, endPoint, controlPoints } = link

    if (
      context.style.mode === 'spline' &&
      controlPoints &&
      controlPoints.length >= 2
    ) {
      const centerPos = this.findPointOnBezier(
        0.5,
        startPoint,
        controlPoints[0],
        controlPoints[1],
        endPoint
      )
      link.centerPos = centerPos

      if (context.style.centerMarkerShape === 'arrow') {
        const justPastCenter = this.findPointOnBezier(
          0.51,
          startPoint,
          controlPoints[0],
          controlPoints[1],
          endPoint
        )
        link.centerAngle = Math.atan2(
          justPastCenter.y - centerPos.y,
          justPastCenter.x - centerPos.x
        )
      }
    } else if (context.style.mode === 'linear') {
      const l = 15
      const innerA = { x: startPoint.x, y: startPoint.y }
      const innerB = { x: endPoint.x, y: endPoint.y }

      switch (link.startDirection) {
        case 'left':
          innerA.x -= l
          break
        case 'right':
          innerA.x += l
          break
        case 'up':
          innerA.y -= l
          break
        case 'down':
          innerA.y += l
          break
      }

      switch (link.endDirection) {
        case 'left':
          innerB.x -= l
          break
        case 'right':
          innerB.x += l
          break
        case 'up':
          innerB.y -= l
          break
        case 'down':
          innerB.y += l
          break
      }

      link.centerPos = {
        x: (innerA.x + innerB.x) * 0.5,
        y: (innerA.y + innerB.y) * 0.5
      }

      if (context.style.centerMarkerShape === 'arrow') {
        link.centerAngle = Math.atan2(innerB.y - innerA.y, innerB.x - innerA.x)
      }
    } else if (context.style.mode === 'straight') {
      const l = 10
      const innerA = { x: startPoint.x, y: startPoint.y }
      const innerB = { x: endPoint.x, y: endPoint.y }

      switch (link.startDirection) {
        case 'left':
          innerA.x -= l
          break
        case 'right':
          innerA.x += l
          break
        case 'up':
          innerA.y -= l
          break
        case 'down':
          innerA.y += l
          break
      }

      switch (link.endDirection) {
        case 'left':
          innerB.x -= l
          break
        case 'right':
          innerB.x += l
          break
        case 'up':
          innerB.y -= l
          break
        case 'down':
          innerB.y += l
          break
      }

      const midX = (innerA.x + innerB.x) * 0.5
      link.centerPos = {
        x: midX,
        y: (innerA.y + innerB.y) * 0.5
      }

      if (context.style.centerMarkerShape === 'arrow') {
        const diff = innerB.y - innerA.y
        if (Math.abs(diff) < 4) {
          link.centerAngle = 0
        } else if (diff > 0) {
          link.centerAngle = Math.PI * 0.5
        } else {
          link.centerAngle = -(Math.PI * 0.5)
        }
      }
    } else {
      link.centerPos = this.getLinkCenter(link)
      if (context.style.centerMarkerShape === 'arrow') {
        link.centerAngle = Math.atan2(
          endPoint.y - startPoint.y,
          endPoint.x - startPoint.x
        )
      }
    }
  }

  private drawCenterMarker(
    ctx: CanvasRenderingContext2D,
    link: LinkRenderData,
    context: RenderContext,
    color: string
  ): void {
    if (!link.centerPos) return

    ctx.beginPath()

    if (
      context.style.centerMarkerShape === 'arrow' &&
      link.centerAngle !== undefined
    ) {
      const transform = ctx.getTransform()
      ctx.translate(link.centerPos.x, link.centerPos.y)
      ctx.rotate(link.centerAngle)
      ctx.moveTo(-3.2, -5)
      ctx.lineTo(7, 0)
      ctx.lineTo(-3.2, 5)
      ctx.setTransform(transform)
    } else {
      ctx.arc(link.centerPos.x, link.centerPos.y, 5, 0, Math.PI * 2)
    }

    if (link.disabled && context.patterns?.disabled) {
      const { fillStyle, globalAlpha } = ctx
      ctx.fillStyle = context.patterns.disabled
      ctx.globalAlpha = 0.75
      ctx.fill()
      ctx.globalAlpha = globalAlpha
      ctx.fillStyle = fillStyle
    } else {
      ctx.fillStyle = color
      ctx.fill()
    }
  }
}
