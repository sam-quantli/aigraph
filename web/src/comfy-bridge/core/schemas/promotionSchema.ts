export type ProxyWidgetTuple =
  | [string, string]
  | [string, string, string]

/** Parses serialized proxy widget entries from SubgraphNode.properties.proxyWidgets */
export function parseProxyWidgets(raw: unknown): ProxyWidgetTuple[] {
  if (!Array.isArray(raw)) return []
  const out: ProxyWidgetTuple[] = []
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 2) continue
    const a = String(row[0])
    const b = String(row[1])
    if (row.length >= 3) {
      out.push([a, b, String(row[2])])
    } else {
      out.push([a, b])
    }
  }
  return out
}
