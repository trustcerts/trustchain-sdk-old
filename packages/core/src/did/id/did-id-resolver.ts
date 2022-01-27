import { InitDidManagerConfigValues } from '../InitDidManagerConfigValues';
import { DidId } from './did-id';
import { DidManagerConfigValues } from '../DidManagerConfigValues';
import { DidResolver } from '../did-resolver';
import { DidIdTransaction } from '@trustcerts/observer';

export class DidIdResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidIdTransaction>
  ): Promise<DidId> {
    const didID = id.split('#')[0];
    const config = this.setConfig(values);
    const did = new DidId(didID);
    await this.loadDid(did, config);
    return did;
  }

  protected setConfig(
    values?: InitDidManagerConfigValues<DidIdTransaction>
  ): DidManagerConfigValues<DidIdTransaction> {
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
