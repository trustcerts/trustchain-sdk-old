import { Identifier, DidCreation } from '@trustcerts/core';
import { TemplateResponse } from '@trustcerts/gateway';
import { DidTemplate } from '@trustcerts/template-verify';
import { TemplateIssuerService } from './template-issuer-service';

export class DidTemplateRegister {
  /**
   * creates a fresh did with a unique identifier. Add controller when they are passed.
   */
  public static create(values?: DidCreation): DidTemplate {
    // TODO check if a given id should be allowed
    const id = values?.id ?? Identifier.generate('tmp');
    const did = new DidTemplate(id);
    values?.controllers?.forEach(controller => did.addController(controller));
    return did;
  }

  public static save(
    did: DidTemplate,
    client: TemplateIssuerService
  ): Promise<TemplateResponse> {
    const value = did.getChanges();
    did.version++;
    did.resetChanges();
    return client.persistTemplate(value);
  }
}
