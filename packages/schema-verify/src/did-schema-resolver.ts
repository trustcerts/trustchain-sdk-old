import { DidResolver, DidManagerConfigValues } from '@trustcerts/core';
import { InitDidManagerConfigValues } from '@trustcerts/core/dist/did/InitDidManagerConfigValues';
import { SchemaTransaction } from '../../core/node_modules/@trustcerts/gateway/dist';
import { DidSchema } from './did-schema';

export class DidSchemaResolver extends DidResolver {
  public static async load(
    id: string,
    values?: InitDidManagerConfigValues<SchemaTransaction>
  ): Promise<DidSchema> {
    const didID = id.split('#')[0];
    const config = this.setConfig(values);
    const did = new DidSchema(didID);
    await this.loadDid(did, config);
    return did;
  }

  protected static setConfig(
    values?: InitDidManagerConfigValues<SchemaTransaction>
  ): DidManagerConfigValues<SchemaTransaction> {
    return {
      validateChainOfTrust: values?.validateChainOfTrust ?? true,
      // TODO check if empty array is correct
      transactions: values?.transactions ?? [],
      time: values?.time ?? new Date().toISOString(),
      version: values?.version ?? undefined,
      doc: values?.doc ?? true,
    };
  }
}
