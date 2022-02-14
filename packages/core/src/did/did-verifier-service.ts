import { DidManagerConfigValues } from './DidManagerConfigValues';
import { VerifierService } from '../verifierService';
import {
  DidObserverApi,
  DidIdTransaction,
  IdDocResponse,
  AxiosError,
} from '@trustcerts/observer';
import { sortKeys } from '../crypto/hash';
import { verifySignature } from '../crypto/sign';
import { importKey } from '../crypto/key';
import { DidIdResolver } from './id/did-id-resolver';

export class DidVerifierService extends VerifierService {
  protected apis: DidObserverApi[];

  constructor(protected observerUrls: string[], equalMin = 2) {
    super(observerUrls, equalMin);
    this.apis = this.apiConfigurations.map(
      config => new DidObserverApi(config)
    );
  }

  /**
   * Resolve a DID document by returning the first valid response of a observer of the network
   * @param id The DID of the DID document
   * @param config The config for the DID request
   * @param timeout Timeout for each observer that is queried
   * @returns The resolved DID document
   */
  async getDidDocument(
    id: string,
    config: DidManagerConfigValues<DidIdTransaction>
  ): Promise<IdDocResponse> {
    for (const api of this.apis) {
      await api
        .observerDidControllerGetDoc(id, config.time, undefined, {
          timeout: 2000,
        })
        .then(
          async res => {
            console.log('got res');
            await this.validateDoc(res.data, config);
            Promise.resolve(res.data);
          },
          (err: AxiosError) => {
            console.log('error');
            console.log(err);
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

  /**
   * Resolve a DID document's transactions by returning the first valid response of a observer of the network
   * @param id The DID of the DID document
   * @param validate Whether to validate the response
   * @param time The time of the DID document that shall be queried
   * @param timeout Timeout for each observer that is queried
   * @returns The DID document's transactions
   */
  async getDidTransactions(
    id: string,
    validate = true,
    time: string
  ): Promise<DidIdTransaction[]> {
    const responses: {
      amount: number;
      value: DidIdTransaction[];
    }[] = [];
    for (const api of this.apis) {
      const res = await api.observerDidControllerGetTransactions(
        id,
        time,
        undefined,
        { timeout: timeout }
      );
      if (res.data.length > 0) {
        if (validate) {
          for (const transaction of res.data) {
            await this.validate(transaction);
          }
        }
        return Promise.resolve(res.data);
      }
    }
    return Promise.reject('no transactions found');
  }

  private async validateDoc(
    document: IdDocResponse,
    config: DidManagerConfigValues<DidIdTransaction>
  ) {
    //TODO implement validation of a document with recursive approach
    const issuer = document.signatures[0].identifier;
    if (document.document.id === issuer.split('#')[0]) {
      // TODO instead of self certified use the genesis block to build the chain of trust
    } else {
      if (document.metaData) {
        config.time = document.metaData.updated ?? document.metaData.created;
      }
      const resolver = new DidIdResolver();
      const did = await resolver.load(issuer, config);
      const key = did.getKey(issuer).publicKeyJwk;
      const value = JSON.stringify(
        sortKeys({
          document: document.document,
          version: document.metaData.versionId,
        })
      );
      const valid = await verifySignature(
        value,
        document.signatures[0].signature,
        await importKey(key, 'jwk', ['verify'])
      );
      if (!valid) {
        throw Error(`signature is wrong for ${document.document.id}`);
      }
    }
  }

  /**
   * Validates the signature of a given transaction.
   * @param transaction
   * @private
   */
  private async validate(transaction: DidIdTransaction) {
    const key: JsonWebKey = await this.getKey(transaction);
    const value = JSON.stringify(
      sortKeys({
        value: transaction.values,
        date: transaction.createdAt,
      })
    );
    const valid = await verifySignature(
      value,
      transaction.signature[0].signature,
      await importKey(key, 'jwk', ['verify'])
    );
    if (!valid) {
      throw Error('signature is wrong');
    }
  }

  private async getKey(transaction: DidIdTransaction): Promise<JsonWebKey> {
    if (
      transaction.signature[0].identifier.split('#')[0] ===
      transaction.values.id
    ) {
      // TODO instead of searching for self certified, use the genesis block.
      if (
        transaction.values.verificationMethod &&
        transaction.values.verificationMethod.add
      ) {
        const element = transaction.values.verificationMethod.add.find(
          value => value.id === transaction.signature[0].identifier
        );
        if (element) {
          return element.publicKeyJwk;
        } else {
          throw Error('element not found');
        }
      } else {
        throw Error('verification element does not exist');
      }
    } else {
      // TODO design how the system will load and validate the information. Since newer transactions are based on older a client can not validate before having all information.
      const resolver = new DidIdResolver();
      const did = await resolver.load(transaction.signature[0].identifier);
      return did.getKey(transaction.signature[0].identifier).publicKeyJwk;
    }
  }
}
