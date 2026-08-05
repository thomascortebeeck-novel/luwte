import { describe, expect, it } from 'vitest';
import { REACTIONS, shouldPostCompletion, whoToNotify, type NotifiableMember } from './feed';

describe('reactions', () => {
  /*
   * PRD 6.4 — warm only. Not because disapproval never happens, but because a
   * person recovering from psychosis reading a thumbs-down from their mother
   * at 2am is a harm this product will not create.
   */
  it('offers nothing negative', () => {
    expect(REACTIONS.map((r) => r.id)).toEqual(['heart', 'clap', 'proud']);
  });

  it('cannot grow a negative reaction without this test noticing', () => {
    const cold = ['thumbsdown', 'sad', 'angry', 'dislike', 'worried', 'concerned'];
    for (const id of REACTIONS.map((r) => r.id)) {
      expect(cold).not.toContain(id);
    }
  });
});

describe('shouldPostCompletion', () => {
  it('posts a planned activity when sharing is on', () => {
    expect(shouldPostCompletion({ sharingEnabled: true, activityId: 'act1' })).toBe(true);
  });

  /*
   * "Small things like pill completions should not be shared." A dose has no
   * activity id, so it fails here rather than relying on every caller to
   * remember.
   */
  it('never posts a dose, whatever the setting says', () => {
    expect(shouldPostCompletion({ sharingEnabled: true, activityId: null })).toBe(false);
    expect(shouldPostCompletion({ sharingEnabled: true, activityId: '' })).toBe(false);
  });

  it('posts nothing at all when the person turned sharing off', () => {
    expect(shouldPostCompletion({ sharingEnabled: false, activityId: 'act1' })).toBe(false);
  });
});

describe('whoToNotify', () => {
  const member = (overrides: Partial<NotifiableMember> = {}): NotifiableMember => ({
    uid: 'uid-sam',
    canSeeFeed: true,
    revoked: false,
    wantsSupportedActivity: true,
    ...overrides,
  });

  it('tells a member who was granted the feed and wants to hear', () => {
    expect(whoToNotify([member()])).toEqual(['uid-sam']);
  });

  /*
   * The patient's decision governs. A supporter cannot opt into hearing about
   * someone who did not share with them.
   */
  it('tells nobody who was not granted the feed', () => {
    expect(whoToNotify([member({ canSeeFeed: false })])).toEqual([]);
  });

  it('tells nobody whose access was stopped, even if the card still says feed', () => {
    expect(whoToNotify([member({ revoked: true })])).toEqual([]);
  });

  it('respects a supporter who turned this off', () => {
    expect(whoToNotify([member({ wantsSupportedActivity: false })])).toEqual([]);
  });

  it('tells several people at once, and only the ones who qualify', () => {
    expect(
      whoToNotify([
        member({ uid: 'a' }),
        member({ uid: 'b', canSeeFeed: false }),
        member({ uid: 'c', revoked: true }),
        member({ uid: 'd', wantsSupportedActivity: false }),
        member({ uid: 'e' }),
      ]),
    ).toEqual(['a', 'e']);
  });

  it('tells nobody when the circle is empty', () => {
    expect(whoToNotify([])).toEqual([]);
  });
});
