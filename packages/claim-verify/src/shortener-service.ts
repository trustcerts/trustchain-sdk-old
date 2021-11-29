import { Platform } from '@trustcerts/core';

/**
 * Shortes a url
 */
export class ShortenerService {
  private api: Platform.ShortenPlatformApi;

  constructor(url: string) {
    const configuration = new Platform.Configuration({
      basePath: url,
    });
    this.api = new Platform.ShortenPlatformApi(configuration);
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
