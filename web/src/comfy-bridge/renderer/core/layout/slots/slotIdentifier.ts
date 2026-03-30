export function getSlotKey(
  nodeId: string,
  slotIndex: number,
  isInput: boolean
): string {
  return `${nodeId}:${isInput ? 'in' : 'out'}:${slotIndex}`
}
