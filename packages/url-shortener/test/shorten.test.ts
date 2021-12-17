import { CloudService } from '@trustcerts/config-cloud';
import { EncoderService } from '../src/encoder-service';
import { ShortenerService } from '../src/shortener-service';
describe('shorten', () => {
  const url = 'https://platform.dev.trustcerts.de';
  const username = 'root';
  const password = 'foo';

  beforeAll(async () => {});

  it('encode and decode', async () => {
    const input = 'hello world';
    const encoded = await EncoderService.encode(input);
    const decoded = await EncoderService.decode(encoded);
    expect(decoded).toEqual(input);
  });
  it('upload and download', async () => {
    const input = 'hello world';

    const cloud = new CloudService(url, 'tmp/login');
    await cloud.login(username, password);
    const token = cloud.getAccessToken();
    const shortenService = new ShortenerService(url, token);

    const encoded = await shortenService.shorten(input);
    const decoded = await shortenService.resolve(encoded);
    expect(decoded).toEqual(input);
  });
});
