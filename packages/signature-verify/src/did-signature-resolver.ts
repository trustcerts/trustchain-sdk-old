import {
  DidResolver,
  getHash,
  getHashFromArrayBuffer,
  getHashFromFile,
  Identifier,
  InitDidManagerConfigValues,
} from '@trustcerts/core';
import { DidHashStructure } from '@trustcerts/observer';
import { DidSignature } from './did-signature';
import { DidSignatureVerifierService } from './signature-verifier-service';

export class DidSignatureResolver extends DidResolver {
  protected verifier = new DidSignatureVerifierService();

  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidHashStructure>
  ): Promise<DidSignature> {
    if (!id.startsWith('did:trust')) {
      id = Identifier.generate('hash', id);
    }
    const didID = id.split('#')[0];
    const config = this.setConfig<DidHashStructure>(values);
    const did = new DidSignature(didID);
    await this.loadDid(did, config);
    return did;
  }

  public async verifyString(
    value: string,
    config?: InitDidManagerConfigValues<DidHashStructure>
  ): Promise<DidSignature> {
    const hash = await getHash(value);
    return this.load(hash, config);
  }

  public async verifyBuffer(
    value: ArrayBuffer,
    config?: InitDidManagerConfigValues<DidHashStructure>
  ): Promise<DidSignature> {
    const hash = await getHashFromArrayBuffer(value);
    return this.load(hash, config);
  }

  public async verifyFile(
    file: string | File,
    config?: InitDidManagerConfigValues<DidHashStructure>
  ): Promise<DidSignature> {
    const hash = await getHashFromFile(file);
    return this.load(hash, config);
  }
}
