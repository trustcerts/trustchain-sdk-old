import { VerifierService, DidManagerConfigValues } from '@trustcerts/core';
import {
  AxiosError,
  SchemaDocResponse,
  SchemaObserverApi,
  SchemaTransaction,
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
    config: DidManagerConfigValues<SchemaTransaction>
  ): Promise<SchemaDocResponse> {
    for (const api of this.apis) {
      await api
        .observerSchemaControllerGetDoc(id, config.time, undefined, {
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
}
