/** Minimal stand-in for Vue's `toValue` (unwrap refs). No Vue runtime. */
export function toValue<T>(source: T | { value: T }): T {
  if (source !== null && typeof source === 'object' && 'value' in source) {
    return (source as { value: T }).value
  }
  return source as T
}
