import { describe, it, expect } from 'vitest'
import { canMemberSeeForum } from './region-visibility'

describe('canMemberSeeForum', () => {
  it('open forum (no restrictions) is visible to anyone', () => {
    const forum = { regionIds: [], groupIds: [] }
    const member = { regionId: null, churchGroupIds: [] }
    expect(canMemberSeeForum(forum, member)).toBe(true)
  })

  it('open forum visible even when member has a region and groups', () => {
    const forum = { regionIds: [], groupIds: [] }
    const member = { regionId: 'r-1', churchGroupIds: ['g-1', 'g-2'] }
    expect(canMemberSeeForum(forum, member)).toBe(true)
  })

  it('region-scoped forum: member in matching region sees it', () => {
    const forum = { regionIds: ['r-1', 'r-2'], groupIds: [] }
    const member = { regionId: 'r-2', churchGroupIds: [] }
    expect(canMemberSeeForum(forum, member)).toBe(true)
  })

  it('region-scoped forum: member in unrelated region does NOT see it', () => {
    const forum = { regionIds: ['r-1'], groupIds: [] }
    const member = { regionId: 'r-9', churchGroupIds: [] }
    expect(canMemberSeeForum(forum, member)).toBe(false)
  })

  it('region-scoped forum: member with no region does NOT see it', () => {
    const forum = { regionIds: ['r-1'], groupIds: [] }
    const member = { regionId: null, churchGroupIds: [] }
    expect(canMemberSeeForum(forum, member)).toBe(false)
  })

  it('group-scoped forum: member whose church is in group sees it', () => {
    const forum = { regionIds: [], groupIds: ['g-7'] }
    const member = { regionId: null, churchGroupIds: ['g-7'] }
    expect(canMemberSeeForum(forum, member)).toBe(true)
  })

  it('group-scoped forum: member without that group does NOT see it', () => {
    const forum = { regionIds: [], groupIds: ['g-7'] }
    const member = { regionId: null, churchGroupIds: ['g-1', 'g-2'] }
    expect(canMemberSeeForum(forum, member)).toBe(false)
  })

  it('forum scoped to BOTH a region and a group: region match alone is enough', () => {
    const forum = { regionIds: ['r-1'], groupIds: ['g-1'] }
    const member = { regionId: 'r-1', churchGroupIds: [] }
    expect(canMemberSeeForum(forum, member)).toBe(true)
  })

  it('forum scoped to BOTH a region and a group: group match alone is enough', () => {
    const forum = { regionIds: ['r-1'], groupIds: ['g-1'] }
    const member = { regionId: 'r-9', churchGroupIds: ['g-1'] }
    expect(canMemberSeeForum(forum, member)).toBe(true)
  })

  it('forum scoped to BOTH a region and a group: no match means not visible', () => {
    const forum = { regionIds: ['r-1'], groupIds: ['g-1'] }
    const member = { regionId: 'r-9', churchGroupIds: ['g-9'] }
    expect(canMemberSeeForum(forum, member)).toBe(false)
  })
})
