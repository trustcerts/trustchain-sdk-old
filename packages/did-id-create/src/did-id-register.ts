import {
  DecryptedKeyPair,
  Invite,
  generateKeyPair,
  Identifier,
  DidIdResolver,
  DidCreation,
  DidId,
  SignatureType,
} from '@trustcerts/core';
import {
  Configuration,
  CreateDidIdDto,
  DidGatewayApi,
} from '@trustcerts/gateway';
import { AxiosError } from 'axios';
import { DidIdIssuerService } from './did-issuer-service';

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
    const inviteValues: CreateDidIdDto = {
      identifier: invite.id,
      publicKey: newKey.publicKey,
      secret: invite.secret,
    };
    // register the key on the chain
    const configuration = new Configuration({
      basePath: invite.endpoint,
    });
    const api = new DidGatewayApi(configuration);
    await api
      .gatewayDidControllerCreate(inviteValues)
      .catch((err: AxiosError) => {
        if (err.response) {
          throw Error(JSON.stringify(err.response.data));
        } else {
          throw Error('error');
        }
      });
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
