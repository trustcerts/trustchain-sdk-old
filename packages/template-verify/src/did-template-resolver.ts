import { DidResolver } from '@trustcerts/core';
import { InitDidManagerConfigValues } from '@trustcerts/core/dist/did/InitDidManagerConfigValues';
import { DidSchemaTransaction } from '@trustcerts/observer';
import { DidTemplate } from './did-template';

export class DidTemplateResolver extends DidResolver {
  public async load(
    id: string,
    values?: InitDidManagerConfigValues<DidSchemaTransaction>
  ): Promise<DidTemplate> {
    const didID = id.split('#')[0];
    const config = this.setConfig<DidSchemaTransaction>(values);
    const did = new DidTemplate(didID);
    await this.loadDid(did, config);
    return did;
  }
}
