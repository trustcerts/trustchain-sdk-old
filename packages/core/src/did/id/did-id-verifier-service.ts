import { DidManagerConfigValues } from '../DidManagerConfigValues';
import { VerifierService } from '../../verifierService';
import {
  DidObserverApi,
  DidIdTransaction,
  IdDocResponse,
  AxiosError,
  Configuration,
} from '@trustcerts/observer';
import { logger } from '../../logger';
import { DidIdStructure } from '@trustcerts/gateway';
import { Network } from '../network/network';
import { DidNetworks } from '../network/did-networks';

export class DidIdVerifierService extends VerifierService {
  protected apis!: DidObserverApi[];

  protected setEndpoints(id: string) {
    // resolve the network based on the did string
    const network: Network = DidNetworks.resolveNetwork(id);
    if (!network) {
      throw new Error(`no networks found for ${id}`);
    }
    this.apis = network.observers.map(
      url => new DidObserverApi(new Configuration({ basePath: url }))
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
    config: DidManagerConfigValues<DidIdStructure>
  ): Promise<IdDocResponse> {
    this.setEndpoints(id);
    return new Promise(async (resolve, reject) => {
      for (const api of this.apis) {
        await api
          .observerDidControllerGetDoc(id, config.time, undefined, {
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
  ): Promise<DidIdTransaction[]> {
    this.setEndpoints(id);
    return new Promise(async (resolve, reject) => {
      for (const api of this.apis) {
        await api
          .observerDidControllerGetTransactions(id, time, undefined, {
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
