import { Configuration, ShortenPlatformApi } from './platform';

/**
 * Shortes a url
 */
export class ShortenerService {
  private api: ShortenPlatformApi;

  constructor(url: string) {
    const configuration = new Configuration({
      basePath: url,
    });
    this.api = new ShortenPlatformApi(configuration);
  }

  public shorten(url: string, iv: string): Promise<string> {
    return this.api
      .shortenControllerShorten({ url, iv })
      .then(res => res.data.url);
  }

  public resolve(id: string) {
    return this.api.shortenControllerResolve(id).then(res => res.data);
  }
}
