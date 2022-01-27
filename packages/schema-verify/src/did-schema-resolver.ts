import { DidResolver } from '@trustcerts/core';
import { InitDidManagerConfigValues } from '@trustcerts/core/dist/did/InitDidManagerConfigValues';
import { SchemaTransaction } from '../../core/node_modules/@trustcerts/gateway/dist';
import { DidSchema } from './did-schema';

export class DidSchemaResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<SchemaTransaction>
  ): Promise<DidSchema> {
    const didID = id.split('#')[0];
    const config = this.setConfig<SchemaTransaction>(values);
    const did = new DidSchema(didID);
    await this.loadDid(did, config);
    return did;
  }
}
