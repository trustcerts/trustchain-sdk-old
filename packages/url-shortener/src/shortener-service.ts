import { EncoderService } from './encoder-service';
import { Configuration, ShortenPlatformApi } from './platform';

/**
 * Shortes a url by upload the encrypted input on a server.
 */
export class ShortenerService {
  private api: ShortenPlatformApi;

  constructor(basePath: string, accessToken?: string) {
    const configuration = new Configuration({
      basePath,
      accessToken,
    });
    this.api = new ShortenPlatformApi(configuration);
  }

  /**
   * encrypt a string and uploads it to the service.
   * @param value
   * @returns id and password
   */
  public async shorten(value: string): Promise<string> {
    const encryption = await EncoderService.encode(value);
    const id = await this.api
      .shortenControllerShorten({ url: encryption.value, iv: encryption.iv })
      .then(res => res.data.url);
    return `${id}#${encryption.key}`;
  }

  public async resolve(id: string): Promise<string> {
    const elements = id.split('#');
    const res = await this.api
      .shortenControllerResolve(elements[0])
      .then(res => res.data);
    return await EncoderService.decode({
      iv: res.iv,
      key: elements[1],
      value: res.url,
    });
  }
}
