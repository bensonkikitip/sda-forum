/**
 * Returns true if both arrays contain exactly the same set of event IDs,
 * regardless of order. Used by sendDigest to detect stale previews.
 */
export function eventIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}
