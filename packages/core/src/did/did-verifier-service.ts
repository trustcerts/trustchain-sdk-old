import { DidManagerConfigValues } from './DidManagerConfigValues';
import { VerifierService } from '../verifierService';
import {
  DidObserverApi,
  DidTransaction,
  DocResponse,
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
    config: DidManagerConfigValues,
    timeout = 2000
  ): Promise<DocResponse> {
    for (const api of this.apis) {
      const res = await api.observerDidControllerGetDoc(
        id,
        config.time,
        undefined,
        { timeout: timeout }
      );
      if (res.data.document) {
        if (config.validateChainOfTrust) {
          await this.validateDoc(res.data, config);
        }
        return Promise.resolve(res.data);
      }
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
    time: string,
    timeout = 2000
  ): Promise<DidTransaction[]> {
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
    document: DocResponse,
    config: DidManagerConfigValues
  ) {
    //TODO implement validation of a document with recursive approach
    const issuer = document.signatures[0].identifier;
    if (document.document.id === issuer.split('#')[0]) {
      // TODO instead of self certified use the genesis block to build the chain of trust
    } else {
      if (document.metaData) {
        config.time = document.metaData.updated ?? document.metaData.created;
      }
      const did = await DidIdResolver.load(issuer, config);
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
  private async validate(transaction: DidTransaction) {
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

  private async getKey(transaction: DidTransaction): Promise<JsonWebKey> {
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
      const did = await DidIdResolver.load(transaction.signature[0].identifier);
      return did.getKey(transaction.signature[0].identifier).publicKeyJwk;
    }
  }
}
