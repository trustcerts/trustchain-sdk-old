import { DidResolver } from '@trustcerts/core';
import { InitDidManagerConfigValues } from '@trustcerts/core/dist/did/InitDidManagerConfigValues';
import { DidSchemaStructure } from '@trustcerts/observer';
import { DidSchema } from './did-schema';
import { SchemaVerifierService } from './schema-verifier-service';

export class DidSchemaResolver extends DidResolver {
  protected verifier = new SchemaVerifierService();

  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidSchemaStructure>
  ): Promise<DidSchema> {
    const didID = id.split('#')[0];
    const config = this.setConfig<DidSchemaStructure>(values);
    const did = new DidSchema(didID);
    await this.loadDid(did, config);
    return did;
  }
}
