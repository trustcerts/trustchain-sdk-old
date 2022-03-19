import { Identifier, DidCreation } from '@trustcerts/core';
import { SchemaResponse } from '@trustcerts/gateway';
import { SchemaIssuerService } from './schema-issuer-service';
import { DidSchema } from '@trustcerts/schema-verify';

export class DidSchemaRegister {
  /**
   * creates a fresh did with a unique identifier. Add controller when they are passed.
   */
  public static create(values?: DidCreation): DidSchema {
    // TODO check if a given id should be allowed
    const id = values?.id ?? Identifier.generate('sch');
    const did = new DidSchema(id);
    values?.controllers?.forEach(controller => did.addController(controller));
    return did;
  }

  public static save(
    did: DidSchema,
    client: SchemaIssuerService
  ): Promise<SchemaResponse> {
    const value = did.getChanges();
    did.version++;
    did.resetChanges();
    return client.persistSchema(value);
  }
}
