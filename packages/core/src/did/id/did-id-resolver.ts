import { InitDidManagerConfigValues } from '../InitDidManagerConfigValues';
import { DidId } from './did-id';
import { DidResolver } from '../did-resolver';
import { DidIdTransaction } from '@trustcerts/observer';

export class DidIdResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidIdTransaction>
  ): Promise<DidId> {
    const didID = id.split('#')[0];
    const config = this.setConfig<DidIdTransaction>(values);
    const did = new DidId(didID);
    await this.loadDid(did, config);
    return did;
  }
}
