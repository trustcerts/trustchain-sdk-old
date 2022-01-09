import {
  getHash,
  getHashFromFile,
  sortKeys,
  verifySignature,
  importKey,
  DidIdResolver,
  SignatureContent,
  VerifierService,
  logger,
} from '@trustcerts/core';
import { Hash, HashObserverApi } from '@trustcerts/observer';

export class SignatureVerifierService extends VerifierService {
  protected apis: HashObserverApi[];

  constructor(protected observerUrls: string[], equalMin = 2) {
    super(observerUrls, equalMin);
    this.apis = this.apiConfigurations.map(
      config => new HashObserverApi(config)
    );
  }

  public async verifyString(value: string): Promise<Hash> {
    const hash = await getHash(value);
    return this.verify(hash);
  }

  public async verifyFile(file: string | File): Promise<Hash> {
    const hash = await getHashFromFile(file);
    return this.verify(hash);
  }

  public async verify(checksum: string): Promise<Hash> {
    const hash = await this.getHash(checksum);
    const usedKey = hash.signature[0].identifier;
    const time = hash.block.imported ? hash.block.createdAt : hash.createdAt;
    const did = await DidIdResolver.load(usedKey, { time });
    const key = did.getKey(usedKey);
    if (
      await verifySignature(
        SignatureVerifierService.hash(hash),
        hash.signature[0].signature,
        await importKey(key.publicKeyJwk, 'jwk', ['verify'])
      )
    ) {
      return Promise.resolve(hash);
    } else {
      return Promise.reject('signature does not match');
    }
  }

  /**
   * Request status from all urls. Timeout if there is no response.
   * @param hash
   */
  public async getHash(hash: string): Promise<Hash> {
    const responses: { amount: number; value: Hash }[] = [];
    // TODO refactor this! only request the endpoint if there is a timeout. Since the chain of trust is build a wrong response is not the problem.
    for (const api of this.apis) {
      const res = await api
        .observerHashControllerGetHash(hash, { timeout: 2000 })
        .catch(err => logger.warn(err));
      if (res) {
        const index = responses.findIndex(response => {
          return JSON.stringify(response.value) === JSON.stringify(res.data);
        });
        if (index >= 0) {
          responses[index].amount++;
          if (responses[index].amount === this.equalMin) {
            return Promise.resolve(responses[index].value);
          }
        } else {
          responses.push({ value: res.data, amount: 1 });
          if (this.equalMin === 1) {
            return Promise.resolve(responses[0].value);
          }
        }
      }
    }
    return Promise.reject('not enough matches');
  }

  private static hash(hash: Hash): string {
    const content: SignatureContent = {
      date: hash.createdAt,
      // TODO TransactionType.HashCreation,
      type: 'HashCreation',
      value: {
        algorithm: hash.hashAlgorithm,
        hash: hash.hash,
      },
    };
    return JSON.stringify(sortKeys(content));
  }
}
