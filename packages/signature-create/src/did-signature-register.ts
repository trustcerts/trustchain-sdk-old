import {
  Identifier,
  DidCreation,
  getHash,
  getHashFromFile,
} from '@trustcerts/core';
import { SchemaResponse } from '@trustcerts/gateway';
import { SignatureIssuerService } from './signature-issuer-service';
import {
  DidSignature,
  DidSignatureResolver,
} from '@trustcerts/signature-verify';

export class DidSignatureRegister {
  private didSignatrueResolver = new DidSignatureResolver();

  /**
   * creates a fresh did with a unique identifier. Add controller when they are passed.
   */
  public create(values?: DidCreation): DidSignature {
    // TODO check if a given id should be allowed
    const id = values?.id ?? Identifier.generate('hash');
    const did = new DidSignature(id);
    values?.controllers?.forEach(controller => did.addController(controller));
    return did;
  }

  public save(
    did: DidSignature,
    client: SignatureIssuerService
  ): Promise<SchemaResponse> {
    const value = did.getChanges();
    did.version++;
    did.resetChanges();
    return client.persistSchema(value);
  }

  /**
   * Signs a file
   *
   * @returns {Promise<void>}
   */
  async signFile(filePath: string): Promise<DidSignature> {
    const hash = await getHashFromFile(filePath);
    return this.create({
      id: Identifier.generate('hash', hash),
      controllers: [],
    });
  }

  /**
   * Signs a string.
   * @param value
   */
  async signString(value: string): Promise<DidSignature> {
    const hash = await getHash(value);
    return this.create({
      id: Identifier.generate('hash', hash),
      controllers: [],
    });
  }

  /**
   * Revokes a file
   *
   * @returns {Promise<void>}
   */
  async revokeFile(
    filePath: string,
    date = new Date().toISOString()
  ): Promise<DidSignature> {
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
  ): Promise<DidSignature> {
    const hash = await getHash(value);
    return this.revoke(hash, date);
  }

  /**
   * Revokes a string
   * @param hash
   * @private
   */
  private async revoke(hash: string, date: string) {
    const did = await this.didSignatrueResolver.load(
      Identifier.generate('hash', hash)
    );
    did.revoked = date;
    return did;
  }
}
