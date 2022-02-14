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
import { HashTransactionDto } from '@trustcerts/core/node_modules/@trustcerts/gateway';
import {
  AxiosError,
  DidHashDocument,
  HashDocResponse,
  HashObserverApi,
  HashTransaction,
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
    config: DidManagerConfigValues<HashTransactionDto>
  ): Promise<DidHashDocument> {
    const hash = await getHash(value);
    return this.verify(hash, config);
  }

  public async verifyFile(
    file: string | File,
    config: DidManagerConfigValues<HashTransactionDto>
  ): Promise<DidHashDocument> {
    const hash = await getHashFromFile(file);
    return this.verify(hash, config);
  }

  public async verify(
    checksum: string,
    config: DidManagerConfigValues<HashTransactionDto>
  ): Promise<DidHashDocument> {
    const hashDocument = await this.getDidDocument(checksum, config);
    const usedKey = hashDocument.signatures[0].identifier;
    const time = hashDocument.block.imported
      ? hashDocument.block.createdAt
      : hashDocument.createdAt;
    const resolver = new DidIdResolver();
    const did = await resolver.load(usedKey, { time });
    const key = did.getKey(usedKey);
    if (
      await verifySignature(
        SignatureVerifierService.hash(hashDocument),
        hashDocument.signature[0].signature,
        await importKey(key.publicKeyJwk, 'jwk', ['verify'])
      )
    ) {
      return Promise.resolve(hashDocument);
    } else {
      return Promise.reject('signature does not match');
    }
  }

  async getDidDocument(
    id: string,
    config: DidManagerConfigValues<HashTransactionDto>
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

  private static hash(hash: Hash): string {
    const content: SignatureContent = {
      date: hash.createdAt,
      // TODO TransactionType.HashCreation,
      type: TransactionType.Hash,
      value: {
        algorithm: hash.hashAlgorithm,
        hash: hash.id,
      },
    };
    return JSON.stringify(sortKeys(content));
  }
}
