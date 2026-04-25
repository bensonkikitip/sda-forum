import { describe, it, expect, vi } from 'vitest'
import { fetchAuthorMap } from './posts'

// Minimal stub of the Supabase client's query builder for profiles
function makeSupabaseStub(returnData: { id: string; display_name: string; avatar_url: string | null }[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    in:     vi.fn().mockResolvedValue({ data: returnData }),
  }
  return {
    from: vi.fn().mockReturnValue(builder),
    _builder: builder,
  }
}

describe('fetchAuthorMap', () => {
  it('returns an empty object without querying when given an empty array', async () => {
    const supabase = makeSupabaseStub([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fetchAuthorMap(supabase as any, [])
    expect(result).toEqual({})
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns a map keyed by author ID', async () => {
    const profiles = [
      { id: 'user-1', display_name: 'Alice', avatar_url: null },
      { id: 'user-2', display_name: 'Bob',   avatar_url: 'http://example.com/bob.jpg' },
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fetchAuthorMap(makeSupabaseStub(profiles) as any, ['user-1', 'user-2'])
    expect(result).toEqual({
      'user-1': { id: 'user-1', display_name: 'Alice', avatar_url: null },
      'user-2': { id: 'user-2', display_name: 'Bob',   avatar_url: 'http://example.com/bob.jpg' },
    })
  })

  it('deduplicates author IDs before querying', async () => {
    const profiles = [{ id: 'user-1', display_name: 'Alice', avatar_url: null }]
    const supabase = makeSupabaseStub(profiles)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fetchAuthorMap(supabase as any, ['user-1', 'user-1', 'user-1'])
    // The `.in()` call should receive only one unique ID
    expect(supabase._builder.in).toHaveBeenCalledWith('id', ['user-1'])
  })

  it('handles a missing profile gracefully (returns only found profiles)', async () => {
    const profiles = [{ id: 'user-1', display_name: 'Alice', avatar_url: null }]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fetchAuthorMap(makeSupabaseStub(profiles) as any, ['user-1', 'user-2'])
    expect(result['user-1']).toBeDefined()
    expect(result['user-2']).toBeUndefined()
  })
})
