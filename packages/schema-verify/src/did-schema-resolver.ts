import { DidResolver } from '@trustcerts/core';
import { InitDidManagerConfigValues } from '@trustcerts/core/dist/did/InitDidManagerConfigValues';
import { SchemaTransactionDto } from '@trustcerts/gateway';
import { DidSchema } from './did-schema';

export class DidSchemaResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<SchemaTransactionDto>
  ): Promise<DidSchema> {
    const didID = id.split('#')[0];
    const config = this.setConfig<SchemaTransactionDto>(values);
    const did = new DidSchema(didID);
    await this.loadDid(did, config);
    return did;
  }
}
