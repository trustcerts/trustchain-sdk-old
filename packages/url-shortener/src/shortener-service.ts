import { EncoderService } from './encoder-service';
import { Configuration, ShortenCreatorApi } from './creator';
import { base58Decode, base58Encode } from '@trustcerts/core';

/**
 * Shortes a url by upload the encrypted input on a server.
 */
export class ShortenerService {
  private api: ShortenCreatorApi;
  encoder: TextEncoder;
  decoder: TextDecoder;

  constructor(basePath: string, accessToken?: string) {
    const configuration = new Configuration({
      basePath,
      accessToken,
    });
    this.api = new ShortenCreatorApi(configuration);
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  /**
   * encrypt a string and uploads it to the service.
   * @param value
   * @returns id and password
   */
  public async shorten(value: string, email: string): Promise<string> {
    const encryption = await EncoderService.encode(this.encoder.encode(value));
    const id = await this.api
      .shortenControllerShorten({
        url: base58Encode(encryption.value),
        iv: encryption.iv,
        email,
      })
      .then(res => res.data.url);
    return `${id}#${encryption.key}`;
  }

  /**
   * Resolves a file where the identifier and the password is given.
   * @param id
   * @returns
   */
  public async resolve(id: string): Promise<string> {
    const elements = id.split('#');
    return this.api
      .shortenControllerResolve(elements[0])
      .then(res => res.data)
      .then(res => {
        return EncoderService.decode({
          iv: res.iv,
          key: elements[1],
          value: base58Decode(res.url),
        });
      })
      .then(decrypted => this.decoder.decode(decrypted));
  }
}
