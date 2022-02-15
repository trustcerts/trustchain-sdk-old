import {
  DidManagerConfigValues,
  logger,
  VerifierService,
} from '@trustcerts/core';
import {
  TemplateObserverApi,
  TemplateDocResponse,
  DidTemplateTransaction,
  AxiosError,
} from '@trustcerts/observer';

export class TemplateVerifierService extends VerifierService {
  protected apis: TemplateObserverApi[];

  constructor(protected observerUrls: string[], equalMin = 2) {
    super(observerUrls, equalMin);
    this.apis = this.apiConfigurations.map(
      config => new TemplateObserverApi(config)
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
}
