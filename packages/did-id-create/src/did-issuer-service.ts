import { AxiosError } from 'axios';

import {
  DecryptedKeyPair,
  Invite,
  CryptoService,
  sortKeys,
  generateKeyPair,
  Identifier,
  SignatureContent,
  IssuerService,
  Gateway,
  IDidIdDocument,
  DidIdResolver,
  DidCreation,
  DidId,
  SignatureType,
} from '@trustcerts/core';
export class DidIdIssuerService extends IssuerService {
  protected api: Gateway.DidGatewayApi;

  constructor(gateways: string[], cryptoService: CryptoService) {
    super(gateways, cryptoService);
    this.api = new Gateway.DidGatewayApi(this.apiConfiguration);
  }

  async persistDid(
    value: Gateway.DidStructure,
    document: IDidIdDocument,
    version: number
  ): Promise<void> {
    const transaction: Gateway.DidTransactionDto = {
      version: 1,
      body: {
        date: new Date().toISOString(),
        value,
        didDocSignature: {
          type: Gateway.SignatureInfoTypeEnum.Single,
          values: [
            {
              signature: await this.cryptoService.sign(
                JSON.stringify(
                  sortKeys({
                    document,
                    version,
                  })
                )
              ),
              identifier: this.cryptoService.fingerPrint,
            },
          ],
        },
        type: Gateway.TransactionType.Did,
        version: 1,
      },
      metadata: {
        version: 1,
      },
      signature: {
        type: Gateway.SignatureInfoTypeEnum.Single,
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

export class DidIdRegister {
  private static defaultSignatureType = SignatureType.Rsa;

  /**
   * creates a fresh did with a unique identifier. Add controller when they are passed.
   */
  public static create(values?: DidCreation): DidId {
    // TODO check if a given id should be allowed
    const id = values?.id ?? Identifier.generate('id');
    const did = new DidId(id);
    values?.controllers?.forEach(controller => did.addController(controller));
    return did;
  }

  public static async createByInvite(
    invite: Invite
  ): Promise<{ did: DidId; keyPair: DecryptedKeyPair }> {
    if (!invite.secret) {
      throw new Error('no invite secret found');
    }
    // generate first key pair
    const newKey = await generateKeyPair(invite.id, this.defaultSignatureType);
    // set first keypair to manipularte did
    const inviteValues: Gateway.CreateDidDto = {
      identifier: invite.id,
      publicKey: newKey.publicKey,
      secret: invite.secret,
    };
    // register the key on the chain
    const configuration = new Gateway.Configuration({
      basePath: invite.endpoint,
    });
    const api = new Gateway.DidGatewayApi(configuration);
    await api.gatewayDidControllerCreate(inviteValues);
    // load own did document.
    return {
      did: await DidIdResolver.load(invite.id),
      keyPair: newKey,
    };
  }

  public static save(did: DidId, client: DidIdIssuerService): Promise<void> {
    const value = did.getChanges();

    const document = did.getDocument();
    did.version++;
    did.resetChanges();
    return client.persistDid(value, document, did.version);
  }
}
