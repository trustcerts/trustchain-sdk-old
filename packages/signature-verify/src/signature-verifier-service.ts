import {
  VerifierService,
  logger,
  DidNetworks,
  Network,
  DidManagerConfigValues,
} from '@trustcerts/core';
import {
  AxiosError,
  DidHashDocument,
  HashDocResponse,
  HashObserverApi,
  DidHashStructure,
  DidSchemaTransaction,
  Configuration,
} from '@trustcerts/observer';

export class DidSignatureVerifierService extends VerifierService {
  protected apis!: HashObserverApi[];

  protected setEndpoints(id: string) {
    // resolve the network based on the did string
    const network: Network = DidNetworks.resolveNetwork(id);
    if (!network) {
      throw new Error(`no networks found for ${id}`);
    }
    this.apis = network.observers.map(
      url => new HashObserverApi(new Configuration({ basePath: url }))
    );
  }

  public async verify(
    checksum: string,
    config: DidManagerConfigValues<DidHashStructure>
  ): Promise<DidHashDocument> {
    return (await this.getDidDocument(checksum, config)).document;
    // TODO check if the validation is done in the getDidDocument function
    // const usedKey = hashDocument.signatures.values[0].identifier;
    // const time = hashDocument.metaData.created;
    // const resolver = new DidIdResolver();
    // const did = await resolver.load(usedKey, { time });
    // const key = did.getKey(usedKey);
    // if (
    //   await verifySignature(
    //     DidSignatureVerifierService.hash(hashDocument),
    //     hashDocument.signatures.values[0].signature,
    //     await importKey(key.publicKeyJwk, 'jwk', ['verify'])
    //   )
    // ) {
    //   return Promise.resolve(hashDocument.document);
    // } else {
    //   return Promise.reject('signature does not match');
    // }
  }

  async getDidDocument(
    id: string,
    config: DidManagerConfigValues<DidHashStructure>
  ): Promise<HashDocResponse> {
    this.setEndpoints(id);
    return new Promise(async (resolve, reject) => {
      for (const api of this.apis) {
        await api
          .observerHashControllerGetDoc(id, config.time, undefined, {
            timeout: this.timeout,
          })
          .then(
            async res =>
              this.validateDoc(res.data, config).then(
                () => resolve(res.data),
                err => logger.warn(err)
              ),
            (err: AxiosError) =>
              err.response ? logger.warn(err.response.data) : logger.warn(err)
          );
      }
      reject('no did doc found');
    });
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
  ): Promise<DidSchemaTransaction[]> {
    this.setEndpoints(id);
    return new Promise(async (resolve, reject) => {
      for (const api of this.apis) {
        await api
          .observerHashControllerGetTransactions(id, time, undefined, {
            timeout: this.timeout,
          })
          .then(async res => {
            if (validate) {
              for (const transaction of res.data) {
                await this.validateTransaction(transaction);
              }
              resolve(res.data);
            }
          })
          .catch(logger.warn);
      }
      reject('no transactions founds');
    });
  }
}
