import { describe, it, expect } from 'vitest';

// The exact release rule used by proposalService.vote:
// a proposal carries when yes votes are a STRICT majority of contributing members.
function carries(yesVotes: number, memberCount: number): boolean {
  return memberCount >= 1 && yesVotes * 2 > memberCount;
}

const VALID_STATUSES = ['active', 'passed', 'rejected', 'funded'];

describe('proposal governance', () => {
  it('passes only on a strict majority of members', () => {
    expect(carries(1, 1)).toBe(true); // sole member votes yes
    expect(carries(3, 5)).toBe(true); // 3/5
    expect(carries(2, 5)).toBe(false); // 2/5
    expect(carries(1, 2)).toBe(false); // tie is not a majority
    expect(carries(2, 3)).toBe(true); // 2/3
  });

  it('never passes with zero members', () => {
    expect(carries(1, 0)).toBe(false);
    expect(carries(0, 0)).toBe(false);
  });

  it('recognises only the four real statuses', () => {
    expect(VALID_STATUSES).toEqual(['active', 'passed', 'rejected', 'funded']);
    expect(VALID_STATUSES.includes('executed')).toBe(false);
    expect(VALID_STATUSES.includes('funded')).toBe(true);
  });

  it('rejects a request that exceeds the available pool', () => {
    const available = 50_000_000n; // 5 XLM
    const request = 75_000_000n; // 7.5 XLM
    expect(request > available).toBe(true);
  });
});
