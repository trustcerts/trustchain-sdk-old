import { DidResolver } from '@trustcerts/core';
import { InitDidManagerConfigValues } from '@trustcerts/core/dist/did/InitDidManagerConfigValues';
import { DidHashTransaction } from '@trustcerts/observer';
import { DidSignature } from './did-signature';

export class DidSignatureResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidHashTransaction>
  ): Promise<DidSignature> {
    const didID = id.split('#')[0];
    const config = this.setConfig<DidHashTransaction>(values);
    const did = new DidSignature(didID);
    await this.loadDid(did, config);
    return did;
  }
}
