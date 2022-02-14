import { Did } from '@trustcerts/core';
import { SchemaDocResponse, SchemaStructure } from '@trustcerts/observer';
import { SchemaTransactionDto } from '@trustcerts/gateway';
import { IDidSchemaDocument } from './did-schema-document';

export class DidSchema extends Did {
  protected schema: any;
  private schemaChanges = false;

  constructor(public id: string) {
    super(id);
    // if the passed id value already has a prefix remove it.
    // TODO set correct regexp, normal did should have no type
    // TODO use method from Identifier.method
  }

  parseTransaction(_transactions: SchemaTransactionDto[]): void {
    throw new Error('Method not implemented.');
  }
  parseDocument(_document: SchemaDocResponse): void {
    throw new Error('Method not implemented.');
  }

  getDocument(): IDidSchemaDocument {
    return {
      '@context': this.context,
      id: this.id,
      controller: Array.from(this.controller.current.values()),
      value: this.schema,
    };
  }
  resetChanges(): void {
    this.schemaChanges = false;
  }

  setSchema(schema: string) {
    this.schema = schema;
    this.schemaChanges = true;
  }

  getChanges(): SchemaStructure {
    // TODO maybe throw an error if the changes are requested, but the version is 0 so there is no did to update.
    const changes = this.getBasicChanges<SchemaStructure>();
    if (this.schemaChanges) {
      changes.schema;
    }
    return changes;
  }
}
