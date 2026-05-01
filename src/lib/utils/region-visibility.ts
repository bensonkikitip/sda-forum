/**
 * Pure function form of the SQL `user_can_see_forum()` rule, simplified to
 * the region/group dimension only. Useful for client-side filtering and as
 * the shared specification of forum-visibility behaviour that we test.
 *
 * NOTE: this does NOT cover the `is_admin` bypass — admins see every forum
 * regardless of restrictions, so callers should short-circuit before
 * consulting this helper.
 *
 * A forum is visible to a member when:
 *   - it has neither group nor region restrictions (open to everyone), OR
 *   - the member's church is in one of the forum's allowed groups, OR
 *   - the member's church's region is one of the forum's allowed regions.
 */

export type ForumVisibility = {
  /** Region IDs the forum is scoped to. Empty = no region restriction. */
  regionIds: string[]
  /** Group IDs the forum is scoped to. Empty = no group restriction. */
  groupIds: string[]
}

export type MemberContext = {
  /** Region the member's church belongs to. `null` if church has no region. */
  regionId: string | null
  /** Group IDs the member's church belongs to. */
  churchGroupIds: string[]
}

export function canMemberSeeForum(
  forum: ForumVisibility,
  member: MemberContext,
): boolean {
  // No restrictions of any kind → open forum
  if (forum.regionIds.length === 0 && forum.groupIds.length === 0) {
    return true
  }

  // Region match
  if (
    member.regionId !== null &&
    forum.regionIds.includes(member.regionId)
  ) {
    return true
  }

  // Group match
  for (const gid of member.churchGroupIds) {
    if (forum.groupIds.includes(gid)) {
      return true
    }
  }

  return false
}
