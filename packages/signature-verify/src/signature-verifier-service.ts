import {
  getHash,
  getHashFromFile,
  sortKeys,
  verifySignature,
  importKey,
  DidIdResolver,
  SignatureContent,
  VerifierService,
  DidManagerConfigValues,
} from '@trustcerts/core';
import {
  AxiosError,
  DidHashDocument,
  HashDocResponse,
  HashObserverApi,
  DidHashTransaction,
  TransactionType,
} from '@trustcerts/observer';

export class SignatureVerifierService extends VerifierService {
  protected apis: HashObserverApi[];

  constructor(protected observerUrls: string[], equalMin = 2) {
    super(observerUrls, equalMin);
    this.apis = this.apiConfigurations.map(
      config => new HashObserverApi(config)
    );
  }

  public async verifyString(
    value: string,
    config: DidManagerConfigValues<DidHashTransaction>
  ): Promise<DidHashDocument> {
    const hash = await getHash(value);
    return this.verify(hash, config);
  }

  public async verifyFile(
    file: string | File,
    config: DidManagerConfigValues<DidHashTransaction>
  ): Promise<DidHashDocument> {
    const hash = await getHashFromFile(file);
    return this.verify(hash, config);
  }

  public async verify(
    checksum: string,
    config: DidManagerConfigValues<DidHashTransaction>
  ): Promise<DidHashDocument> {
    const hashDocument = await this.getDidDocument(checksum, config);
    const usedKey = hashDocument.signatures[0].values[0].identifier;
    const time = hashDocument.metaData.created;
    const resolver = new DidIdResolver();
    const did = await resolver.load(usedKey, { time });
    const key = did.getKey(usedKey);
    if (
      await verifySignature(
        SignatureVerifierService.hash(hashDocument),
        hashDocument.signatures[0].values[0].signature,
        await importKey(key.publicKeyJwk, 'jwk', ['verify'])
      )
    ) {
      return Promise.resolve(hashDocument.document);
    } else {
      return Promise.reject('signature does not match');
    }
  }

  async getDidDocument(
    id: string,
    config: DidManagerConfigValues<DidHashTransaction>
  ): Promise<HashDocResponse> {
    for (const api of this.apis) {
      await api
        .observerHashControllerGetDoc(id, config.time, undefined, {
          timeout: 2000,
        })
        .then(
          res => Promise.resolve(res.data),
          (err: AxiosError) => {
            // TODO evaluate the error
            // got a response, validate it
            if (err.response) {
            } else {
              // got no response maybe a timeout
            }
          }
        );
    }
    return Promise.reject('no transactions found');
  }

  private static hash(hash: HashDocResponse): string {
    const content: SignatureContent = {
      date: hash.metaData.created,
      type: TransactionType.Hash,
      value: {
        algorithm: hash.document.algorithm,
        hash: hash.document.id,
      },
    };
    return JSON.stringify(sortKeys(content));
  }
}
