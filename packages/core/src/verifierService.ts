import { Configuration, BaseAPI } from '@trustcerts/observer';

export abstract class VerifierService {
  protected apis!: BaseAPI[];

  protected apiConfigurations: Configuration[];

  protected timeout = 2000;

  constructor(
    protected observerUrls: string[],
    protected equalMin: number = 2
  ) {
    if (this.observerUrls.length === 1) {
      this.equalMin = 1;
    }
    this.apiConfigurations = observerUrls.map(
      url => new Configuration({ basePath: url })
    );
  }
}

export interface SignatureContent {
  date: string;
  value: any;
  type: string;
}
