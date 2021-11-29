import { ShortenerService } from '../src/shortener-service';
import { getRandomValues, base58Encode } from '@trustcerts/core';

/**
 * Test shorten class.
 */
describe('shorten', () => {
  it('shorten', async () => {
    const url = 'https://platform.dev.trustcerts.de';
    const short = new ShortenerService(url);
    const link = base58Encode(getRandomValues(new Uint8Array(16)));
    const iv = 'foo';
    const res = await short.shorten(link, iv);
    expect(res).toBeDefined();
    const resolve = await short.resolve(res);
    expect(resolve.url).toBe(link);
    expect(resolve.iv).toBe(iv);
  }, 5000);
});
