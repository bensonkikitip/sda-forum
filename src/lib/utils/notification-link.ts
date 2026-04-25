/**
 * Extracts a post ID from a notification link such as "/posts/abc-123".
 * Returns null if the link is missing, empty, or doesn't contain a post path.
 */
export function parsePostIdFromLink(link: string | null | undefined): string | null {
  if (!link) return null
  const segment = link.split('/posts/')[1]
  if (!segment) return null
  return segment.split('/')[0] || null
}
