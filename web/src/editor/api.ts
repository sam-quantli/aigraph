export type GraphNodeDefinition = {
  type: string
  title: string
  category?: string
  description?: string
  inputs: Array<{ name: string; type?: string; kind?: 'flow' | 'data' }>
  outputs: Array<{ name: string; type?: string; kind?: 'flow' | 'data' }>
  defaultProperties?: Record<string, unknown>
  widgets?: Array<{
    type: 'text' | 'number' | 'combo' | 'toggle'
    name: string
    defaultValue?: unknown
    options?: Record<string, unknown>
  }>
}

export type GraphDefinition = {
  version?: number | string
  nodes: unknown[]
  links: unknown[]
}

export type GraphRecord = {
  id: string
  name: string
  description?: string
  graph: GraphDefinition
  createdAt: string
  updatedAt: string
  version: number
}

/** Response from POST /runs (202 Accepted). */
export type RunGraphEnqueueResult = {
  ok: true
  runId: string
  status: 'queued'
  queuePosition: number
  graphId?: string
}

export type RunRecordResponse = {
  ok: true
  run: {
    runId: string
    graphId?: string
    status: string
    enqueuedAt: string
    startedAt?: string
    endedAt?: string
    error?: string
    trace: Array<{ nodeId: string | number; nodeType: string; route: string[] }>
    logs: string[]
    nodeOutputKeys: Record<string, string[]>
    nodeOutputs: Record<string, Record<string, unknown>>
  }
}

export type RunGraphResult = RunGraphEnqueueResult

const API_BASE = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3031'

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T
  return body
}

export async function fetchNodeCatalog(): Promise<GraphNodeDefinition[]> {
  const response = await fetch(`${API_BASE}/nodes`)
  const body = await readJson<{ ok: boolean; nodes?: GraphNodeDefinition[]; error?: string }>(
    response
  )
  if (!response.ok || !body.ok || !body.nodes) {
    throw new Error(body.error ?? `Node fetch failed (${response.status}).`)
  }
  return body.nodes
}

export async function listGraphs(): Promise<GraphRecord[]> {
  const response = await fetch(`${API_BASE}/graphs`)
  const body = await readJson<{ ok: boolean; graphs?: GraphRecord[]; error?: string }>(response)
  if (!response.ok || !body.ok || !body.graphs) {
    throw new Error(body.error ?? `List graphs failed (${response.status}).`)
  }
  return body.graphs
}

export async function createGraph(input: {
  name: string
  description?: string
  graph: GraphDefinition
}): Promise<GraphRecord> {
  const response = await fetch(`${API_BASE}/graphs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  const body = await readJson<{ ok: boolean; graph?: GraphRecord; error?: string }>(response)
  if (!response.ok || !body.ok || !body.graph) {
    throw new Error(body.error ?? `Create graph failed (${response.status}).`)
  }
  return body.graph
}

export async function updateGraph(
  id: string,
  input: { name?: string; description?: string; graph?: GraphDefinition }
): Promise<GraphRecord> {
  const response = await fetch(`${API_BASE}/graphs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  const body = await readJson<{ ok: boolean; graph?: GraphRecord; error?: string }>(response)
  if (!response.ok || !body.ok || !body.graph) {
    throw new Error(body.error ?? `Update graph failed (${response.status}).`)
  }
  return body.graph
}

export async function runGraph(input: {
  jobId?: string
  graphId?: string
  graph?: GraphDefinition
  input?: unknown
}): Promise<RunGraphEnqueueResult> {
  const response = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  const body = await readJson<{ ok?: boolean; error?: string } & Partial<RunGraphEnqueueResult>>(
    response
  )
  if (!response.ok || body.ok !== true || body.status !== 'queued') {
    throw new Error(body.error ?? `Run graph failed (${response.status}).`)
  }
  if (response.status !== 202) {
    throw new Error(`Expected 202 from /runs, got ${response.status}.`)
  }
  return {
    ok: true,
    runId: body.runId!,
    status: 'queued',
    queuePosition: body.queuePosition!,
    graphId: body.graphId
  }
}

export async function fetchNodePreview(input: {
  runId: string
  nodeId: string | number
  /** Current editor graph (preferred so links match the canvas). */
  graph?: GraphDefinition
  graphId?: string
  signal?: AbortSignal
}): Promise<Record<string, unknown>> {
  const { runId, nodeId, graph, graphId, signal } = input
  const response = await fetch(`${API_BASE}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, nodeId, graph, graphId }),
    signal,
  })
  const body = await readJson<{ ok?: boolean; preview?: Record<string, unknown>; error?: string }>(
    response
  )
  if (!response.ok || body.ok !== true || !body.preview) {
    throw new Error(body.error ?? `Preview failed (${response.status}).`)
  }
  return body.preview
}

export async function fetchRunRecord(runId: string): Promise<RunRecordResponse['run']> {
  const response = await fetch(`${API_BASE}/runs/${encodeURIComponent(runId)}`)
  const body = await readJson<
    { ok?: boolean; error?: string } & Partial<RunRecordResponse>
  >(response)
  if (!response.ok || body.ok !== true || !body.run) {
    throw new Error(body.error ?? `Fetch run failed (${response.status}).`)
  }
  return body.run
}

