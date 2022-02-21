import {
  CryptoService,
  sortKeys,
  SignatureContent,
  IssuerService,
} from '@trustcerts/core';
import {
  DidGatewayApi,
  DidIdTransactionDto,
  TransactionType,
  AxiosError,
  SignatureType,
} from '@trustcerts/gateway';
import { DidIdStructure } from '@trustcerts/observer';
export class DidIdIssuerService extends IssuerService {
  protected api: DidGatewayApi;

  constructor(gateways: string[], cryptoService: CryptoService) {
    super(gateways, cryptoService);
    this.api = new DidGatewayApi(this.apiConfiguration);
  }

  async persistDid(value: DidIdStructure): Promise<void> {
    const transaction: DidIdTransactionDto = {
      version: 1,
      body: {
        date: new Date().toISOString(),
        value,
        type: TransactionType.Did,
        version: 1,
      },
      metadata: {
        version: 1,
      },
      signature: {
        type: SignatureType.single,
        values: [],
      },
    };
    const content: SignatureContent = {
      date: transaction.body.date,
      type: transaction.body.type,
      value: transaction.body.value,
    };
    transaction.signature.values.push({
      signature: await this.cryptoService.sign(
        JSON.stringify(sortKeys(content))
      ),
      identifier: this.cryptoService.fingerPrint,
    });
    console.log(transaction);

    return await this.api.gatewayDidControllerStore(transaction).then(
      res => res.data,
      (err: AxiosError) => {
        if (err.response) {
          return Promise.reject(err.response.data);
        } else {
          return Promise.reject(err);
        }
      }
    );
  }
}
