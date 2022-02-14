import { Configuration, BaseAPI } from '@trustcerts/gateway';
import { CryptoService } from './crypto-service';

/**
 * Service to sign files.
 */
export abstract class IssuerService {
  protected api!: BaseAPI;

  protected apiConfiguration: Configuration;

  constructor(
    gateways: string[],
    protected readonly cryptoService: CryptoService
  ) {
    // TODO check if keypair exists and init the crypto service with it
    this.apiConfiguration = new Configuration({
      basePath: gateways[0],
    });
  }
}
