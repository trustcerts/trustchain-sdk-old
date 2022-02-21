import {
  CryptoService,
  sortKeys,
  SignatureContent,
  IssuerService,
} from '@trustcerts/core';
import {
  TemplateGatewayApi,
  TemplateStructure,
  TemplateCreationResponse,
  TemplateTransactionDto,
  TransactionType,
  SignatureInfoTypeEnum,
  AxiosError,
} from '@trustcerts/gateway';

export class TemplateIssuerService extends IssuerService {
  protected api: TemplateGatewayApi;

  constructor(gateways: string[], cryptoService: CryptoService) {
    super(gateways, cryptoService);
    this.api = new TemplateGatewayApi(this.apiConfiguration);
  }

  async create(value: TemplateStructure): Promise<TemplateCreationResponse> {
    const transaction: TemplateTransactionDto = {
      version: 1,
      metadata: {
        version: 1,
      },
      body: {
        version: 1,
        date: new Date().toISOString(),
        type: TransactionType.Template,
        value,
      },
      signature: {
        type: SignatureInfoTypeEnum.Single,
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
    return await this.api.gatewayTemplateControllerCreate(transaction).then(
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
