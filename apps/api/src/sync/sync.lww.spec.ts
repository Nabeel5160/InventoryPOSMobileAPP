import { resolveUnitPrice } from '@iq/shared';

/** Pure helper used by sync conflict UI — prefer newer timestamp. */
export function pickLwwWinner<T extends { updatedAt: string }>(
  local: T,
  server: T,
): { winner: T; source: 'local' | 'server' } {
  const localTs = Date.parse(local.updatedAt);
  const serverTs = Date.parse(server.updatedAt);
  if (localTs > serverTs) return { winner: local, source: 'local' };
  return { winner: server, source: 'server' };
}

describe('sync LWW helper', () => {
  it('picks newer local', () => {
    const result = pickLwwWinner(
      { updatedAt: '2026-07-27T12:00:00.000Z', qty: 5 },
      { updatedAt: '2026-07-27T11:00:00.000Z', qty: 3 },
    );
    expect(result.source).toBe('local');
    expect(result.winner.qty).toBe(5);
  });

  it('picks server on tie or older local', () => {
    const result = pickLwwWinner(
      { updatedAt: '2026-07-27T10:00:00.000Z', qty: 1 },
      { updatedAt: '2026-07-27T10:00:00.000Z', qty: 9 },
    );
    expect(result.source).toBe('server');
  });
});

describe('resolveUnitPrice for orders', () => {
  it('works with empty tiers', () => {
    expect(resolveUnitPrice({ basePrice: 42, priceTiers: [] }, 3)).toBe(42);
  });
});
