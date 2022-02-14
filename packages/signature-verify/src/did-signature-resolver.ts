import { DidResolver } from '@trustcerts/core';
import { InitDidManagerConfigValues } from '@trustcerts/core/dist/did/InitDidManagerConfigValues';
import { HashTransactionDto } from '@trustcerts/core/node_modules/@trustcerts/gateway';
import { SignatureSchema } from './did-signature';

export class DidSignatureResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<HashTransactionDto>
  ): Promise<SignatureSchema> {
    const didID = id.split('#')[0];
    const config = this.setConfig<HashTransactionDto>(values);
    const did = new SignatureSchema(didID);
    await this.loadDid(did, config);
    return did;
  }
}
