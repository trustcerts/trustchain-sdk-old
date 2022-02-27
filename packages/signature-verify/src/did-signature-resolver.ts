import { DidResolver, InitDidManagerConfigValues } from '@trustcerts/core';
import { DidHashStructure } from '@trustcerts/observer';
import { DidSignature } from './did-signature';
import { DidSignatureVerifierService } from './signature-verifier-service';

export class DidSignatureResolver extends DidResolver {
  protected verifier = new DidSignatureVerifierService();

  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidHashStructure>
  ): Promise<DidSignature> {
    const didID = id.split('#')[0];
    const config = this.setConfig<DidHashStructure>(values);
    const did = new DidSignature(didID);
    await this.loadDid(did, config);
    return did;
  }
}
