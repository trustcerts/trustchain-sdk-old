import { VerifierService } from '@trustcerts/core';
import {} from '@trustcerts/observer';

export class SchemaVerifierService extends VerifierService {
  // protected apis: SchemaObserverApi[];

  constructor(protected observerUrls: string[], equalMin = 2) {
    super(observerUrls, equalMin);
    // this.apis = this.apiConfigurations
    //   .map
    // config => new SchemaObserverApi(config)
    // ();
  }

  // get(id: string): Promise<Schema> {}
}
