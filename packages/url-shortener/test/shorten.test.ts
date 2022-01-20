import { EncoderService } from '../src/encoder-service';
import { ShortenerService } from '../src/shortener-service';
describe('shorten', () => {
  const url = 'http://localhost:3222'

  beforeAll(async () => {});

  it('encode and decode', async () => {
    const input = 'hello world';
    const encoded = await EncoderService.encode(input);
    const decoded = await EncoderService.decode(encoded);
    expect(decoded).toEqual(input);
  });
  it('upload and download', async () => {
    const input = 'hello world';
    const mail = 'info@trustcerts.de';
    const shortenService = new ShortenerService(url);

    const encoded = await shortenService.shorten(input, mail);
    const decoded = await shortenService.resolve(encoded);
    expect(decoded).toEqual(input);
  });
});
