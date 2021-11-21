import { InitDidManagerConfigValues } from '../InitDidManagerConfigValues';
import { DidId } from './did-id';
import { DidManagerConfigValues } from '../DidManagerConfigValues';
import { DidResolver } from '../did-resolver';

export class DidIdResolver extends DidResolver {
  public static async load(
    id: string,
    values?: InitDidManagerConfigValues
  ): Promise<DidId> {
    const didID = id.split('#')[0];
    const config = this.setConfig(values);
    const did = new DidId(didID);
    await this.loadDid(did, config);
    return did;
  }

  protected static setConfig(
    values?: InitDidManagerConfigValues
  ): DidManagerConfigValues {
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
