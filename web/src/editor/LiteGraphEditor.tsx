import { useEffect, useRef } from 'react'

import { LGraph, LGraphCanvas, LiteGraph } from '@/lib/litegraph/src/litegraph'

import {
  registerAigraphTestNodes,
  sampleTestNodeLayout
} from './testNodes'

export function LiteGraphEditor() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphCanvasRef = useRef<LGraphCanvas | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    registerAigraphTestNodes()

    const graph = new LGraph()
    const graphCanvas = new LGraphCanvas(canvas, graph)
    graphCanvasRef.current = graphCanvas
    LGraphCanvas.active_canvas = graphCanvas

    for (const spec of sampleTestNodeLayout()) {
      const n = LiteGraph.createNode(spec.type)
      if (n) {
        n.pos = spec.pos
        graph.add(n)
      }
    }

    graphCanvas.resize(wrap.clientWidth, wrap.clientHeight)
    graphCanvas.setDirty(true, true)
    graphCanvas.draw(true, true)

    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !graphCanvasRef.current) return
      const w = wrapRef.current.clientWidth
      const h = wrapRef.current.clientHeight
      graphCanvasRef.current.resize(w, h)
      graphCanvasRef.current.setDirty(true, true)
      graphCanvasRef.current.draw(true, true)
    })
    ro.observe(wrap)

    return () => {
      ro.disconnect()
      graphCanvas.stopRendering()
      graphCanvas.unbindEvents()
      graphCanvasRef.current = null
      graph.stop()
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        position: 'relative',
        background: '#1e1e1e'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}
