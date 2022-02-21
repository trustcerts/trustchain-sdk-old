import { InitDidManagerConfigValues } from '../InitDidManagerConfigValues';
import { DidId } from './did-id';
import { DidResolver } from '../did-resolver';
import { DidStructure } from '@trustcerts/observer';
import { DidIdStructure } from '@trustcerts/gateway';

export class DidIdResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidStructure>
  ): Promise<DidId> {
    const didID = id.split('#')[0];
    const config = this.setConfig<DidIdStructure>(values);
    const did = new DidId(didID);
    await this.loadDid(did, config);
    return did;
  }
}
