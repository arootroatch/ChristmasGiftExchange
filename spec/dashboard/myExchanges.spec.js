import {describe, it, expect, beforeEach, vi} from 'vitest';
import {loadMyExchanges, _resetMyExchanges} from '../../src/dashboard/myExchanges.js';

describe('loadMyExchanges', () => {
  beforeEach(() => {
    _resetMyExchanges();
  });

  it('fetches once and shares the result between callers', async () => {
    const exchanges = [{exchangeId: 'a'}];
    globalThis.fetch = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => exchanges});

    const [first, second] = await Promise.all([loadMyExchanges(), loadMyExchanges()]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/.netlify/functions/api-my-exchanges-get',
      expect.objectContaining({method: 'GET'})
    );
    expect(first).toEqual(exchanges);
    expect(second).toBe(first);
  });

  it('retries after a failed load', async () => {
    const exchanges = [{exchangeId: 'a'}];
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ok: false, status: 400, json: async () => ({error: 'Nope'})})
      .mockResolvedValueOnce({ok: true, status: 200, json: async () => exchanges});

    await expect(loadMyExchanges()).rejects.toThrow('Nope');
    await expect(loadMyExchanges()).resolves.toEqual(exchanges);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
