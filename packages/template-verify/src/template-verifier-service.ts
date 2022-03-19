import {
  DidManagerConfigValues,
  DidNetworks,
  logger,
  Network,
  VerifierService,
} from '@trustcerts/core';
import {
  TemplateObserverApi,
  TemplateDocResponse,
  DidTemplateTransaction,
  AxiosError,
  Configuration,
} from '@trustcerts/observer';

export class TemplateVerifierService extends VerifierService {
  protected apis!: TemplateObserverApi[];

  protected setEndpoints(id: string) {
    // resolve the network based on the did string
    const network: Network = DidNetworks.resolveNetwork(id);
    if (!network) {
      throw new Error(`no networks found for ${id}`);
    }
    this.apis = network.observers.map(
      url => new TemplateObserverApi(new Configuration({ basePath: url }))
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
    config: DidManagerConfigValues<DidTemplateTransaction>
  ): Promise<TemplateDocResponse> {
    this.setEndpoints(id);
    return new Promise(async (resolve, reject) => {
      for (const api of this.apis) {
        await api
          .observerTemplateControllerGetDoc(id, config.time, undefined, {
            timeout: this.timeout,
          })
          .then(
            async res =>
              await this.validateDoc(res.data, config).then(
                () => resolve(res.data),
                err => logger.warn(err)
              ),
            (err: AxiosError) => {
              logger.log(err);
              // TODO evaluate the error
              // got a response, validate it
              if (err.response) {
              } else {
                // got no response maybe a timeout
              }
            }
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
  ): Promise<DidTemplateTransaction[]> {
    this.setEndpoints(id);
    return new Promise(async (resolve, reject) => {
      for (const api of this.apis) {
        await api
          .observerTemplateControllerGetTransactions(id, time, undefined, {
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
