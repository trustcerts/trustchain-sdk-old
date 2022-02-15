import { DidResolver } from '@trustcerts/core';
import { InitDidManagerConfigValues } from '@trustcerts/core/dist/did/InitDidManagerConfigValues';
import { DidSchemaTransaction } from '@trustcerts/observer';
import { DidSchema } from './did-schema';

export class DidSchemaResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidSchemaTransaction>
  ): Promise<DidSchema> {
    const didID = id.split('#')[0];
    const config = this.setConfig<DidSchemaTransaction>(values);
    const did = new DidSchema(didID);
    await this.loadDid(did, config);
    return did;
  }
}
