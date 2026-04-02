export type MockHostGetDataRow = {
  id: number;
  table: string;
  label: string;
};

export type MockHostGetDataResult = {
  source: string;
  rows: MockHostGetDataRow[];
};

/** Mock DB read on the host. Arguments and return value must be structured-cloneable JSON. */
export function mockHostGetData(request: unknown): MockHostGetDataResult {
  const table =
    typeof request === "object" &&
    request !== null &&
    "table" in request &&
    typeof (request as { table: unknown }).table === "string"
      ? (request as { table: string }).table
      : "default";
  const limitRaw =
    typeof request === "object" &&
    request !== null &&
    "limit" in request &&
    typeof (request as { limit: unknown }).limit === "number"
      ? (request as { limit: number }).limit
      : 10;
  const limit = Math.max(1, Math.min(100, Math.floor(limitRaw)));

  const rows = Array.from({ length: Math.min(3, limit) }, (_, i) => ({
    id: i + 1,
    table,
    label: `Mock row ${i + 1} (${table})`,
  }));

  return { source: "host-mock-database", rows };
}
