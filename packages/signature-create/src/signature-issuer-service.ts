import {
  IssuerService,
  CryptoService,
  getHash,
  getHashFromFile,
  sortKeys,
  SignatureContent,
} from '@trustcerts/core';
import { AxiosError } from 'axios';
import {
  HashGatewayApi,
  TransactionType,
  SignatureInfoTypeEnum,
  HashResponse,
  HashTransactionDto,
} from '@trustcerts/gateway';

export class SignatureIssuerService extends IssuerService {
  protected api: HashGatewayApi;

  public timeout = 10000;

  constructor(gateways: string[], cryptoService: CryptoService) {
    super(gateways, cryptoService);
    this.api = new HashGatewayApi(this.apiConfiguration);
  }

  /**
   * Signs a file
   *
   * @returns {Promise<void>}
   */
  async signFile(filePath: string): Promise<HashResponse> {
    const hash = await getHashFromFile(filePath);
    return this.create(hash);
  }

  /**
   * Signs a string.
   * @param value
   */
  async signString(value: string): Promise<HashResponse> {
    const hash = await getHash(value);
    return this.create(hash);
  }

  /**
   * Signs a hash.
   * @param hash
   * @private
   */
  public async create(
    hash: string,
    date = new Date().toISOString()
  ): Promise<HashResponse> {
    const transaction = await this.createTransaction(
      hash,
      TransactionType.Hash,
      date
    );
    return this.api
      .gatewayHashControllerCreate(transaction, {
        timeout: this.timeout,
      })
      .then(
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

  /**
   * Revokes a file
   *
   * @returns {Promise<void>}
   */
  async revokeFile(
    filePath: string,
    date = new Date().toISOString()
  ): Promise<HashResponse> {
    const hash = await getHashFromFile(filePath);
    return this.revoke(hash, date);
  }

  /**
   * Revokes a string.
   * @param value
   */
  async revokeString(
    value: string,
    date = new Date().toISOString()
  ): Promise<HashResponse> {
    const hash = await getHash(value);
    return this.revoke(hash, date);
  }

  /**
   * Revokes a string
   * @param hash
   * @private
   */
  private async revoke(hash: string, date: string) {
    const transaction = await this.createTransaction(
      hash,
      TransactionType.Hash,
      date
    );
    return this.api
      .gatewayHashControllerCreate(transaction, {
        timeout: this.timeout,
      })
      .then(
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

  /**
   * Creates a transaction to sign or revoke a hash.
   * @param hash
   * @param type
   * @private
   */
  private async createTransaction(
    hash: string,
    type: TransactionType,
    date: string
  ) {
    const transaction: HashTransactionDto = {
      version: 1,
      metadata: {
        version: 1,
      },
      body: {
        version: 1,
        date,
        type,
        value: {
          algorithm: 'sha256',
        },
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
    return transaction;
  }
}
