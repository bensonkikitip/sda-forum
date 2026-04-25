import { describe, it, expect } from 'vitest'
import { eventIdsEqual } from './event-ids'

describe('eventIdsEqual', () => {
  it('returns true for identical arrays in the same order', () => {
    expect(eventIdsEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true)
  })

  it('returns true for identical arrays in different order', () => {
    expect(eventIdsEqual(['c', 'a', 'b'], ['a', 'b', 'c'])).toBe(true)
  })

  it('returns true for two empty arrays', () => {
    expect(eventIdsEqual([], [])).toBe(true)
  })

  it('returns false when lengths differ', () => {
    expect(eventIdsEqual(['a', 'b'], ['a', 'b', 'c'])).toBe(false)
  })

  it('returns false when one ID is missing', () => {
    expect(eventIdsEqual(['a', 'b', 'c'], ['a', 'b', 'x'])).toBe(false)
  })

  it('returns false when one array is empty and the other is not', () => {
    expect(eventIdsEqual([], ['a'])).toBe(false)
  })

  it('does not mutate the input arrays', () => {
    const a = ['c', 'a', 'b']
    const b = ['b', 'c', 'a']
    eventIdsEqual(a, b)
    expect(a).toEqual(['c', 'a', 'b'])
    expect(b).toEqual(['b', 'c', 'a'])
  })
})
