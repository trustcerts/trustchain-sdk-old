import {
  VerifierService,
  DidManagerConfigValues,
  logger,
} from '@trustcerts/core';
import {
  AxiosError,
  SchemaDocResponse,
  SchemaObserverApi,
  DidSchemaTransaction,
} from '@trustcerts/observer';

export class SchemaVerifierService extends VerifierService {
  protected apis: SchemaObserverApi[];

  constructor(protected observerUrls: string[], equalMin = 2) {
    super(observerUrls, equalMin);
    this.apis = this.apiConfigurations.map(
      config => new SchemaObserverApi(config)
    );
  }

  async getDidDocument(
    id: string,
    config: DidManagerConfigValues<DidSchemaTransaction>
  ): Promise<SchemaDocResponse> {
    return new Promise(async (resolve, reject) => {
      for (const api of this.apis) {
        await api
          .observerSchemaControllerGetDoc(id, config.time, undefined, {
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
