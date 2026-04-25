import { describe, it, expect } from 'vitest'
import { parsePostIdFromLink } from './notification-link'

describe('parsePostIdFromLink', () => {
  it('extracts a simple post ID', () => {
    expect(parsePostIdFromLink('/posts/abc-123')).toBe('abc-123')
  })

  it('extracts the post ID when extra path segments follow', () => {
    expect(parsePostIdFromLink('/posts/abc/comments/xyz')).toBe('abc')
  })

  it('extracts a UUID-style post ID', () => {
    expect(parsePostIdFromLink('/posts/550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    )
  })

  it('returns null for an empty string', () => {
    expect(parsePostIdFromLink('')).toBeNull()
  })

  it('returns null for a non-post link', () => {
    expect(parsePostIdFromLink('/inbox')).toBeNull()
  })

  it('returns null for a path with /posts/ but no ID after it', () => {
    expect(parsePostIdFromLink('/posts/')).toBeNull()
  })

  it('returns null for null', () => {
    expect(parsePostIdFromLink(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(parsePostIdFromLink(undefined)).toBeNull()
  })

  it('returns null for /digest/ link', () => {
    expect(parsePostIdFromLink('/digest/some-digest-id')).toBeNull()
  })
})
