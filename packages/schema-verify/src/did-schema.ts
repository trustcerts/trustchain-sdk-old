import { Did } from '@trustcerts/core';
import {
  DidSchemaDocument,
  DidSchemaStructure,
  SchemaDocResponse,
} from '@trustcerts/observer';

export class DidSchema extends Did {
  public schema!: string;

  constructor(public id: string) {
    super(id);
    // if the passed id value already has a prefix remove it.
    // TODO set correct regexp, normal did should have no type
    // TODO use method from Identifier.method
  }

  parseTransactions(transactions: DidSchemaStructure[]): void {
    for (const transaction of transactions) {
      this.version++;
      // validate signature of transaction
      // parse it into the existing document
      this.parseTransactionControllers(transaction);

      this.schema = transaction.schema ?? this.schema;
    }
  }
  parseDocument(docResponse: SchemaDocResponse): void {
    this.parseDocumentSuper(docResponse);
    this.schema = docResponse.document.value ?? this.schema;
  }

  resetChanges(): void {}

  getDocument(): DidSchemaDocument {
    return {
      '@context': this.context,
      id: this.id,
      controller: Array.from(this.controller.current.values()),
      value: this.schema,
    };
  }

  getChanges(): DidSchemaStructure {
    // TODO maybe throw an error if the changes are requested, but the version is 0 so there is no did to update.
    const changes = this.getBasicChanges<DidSchemaStructure>();
    changes.schema = this.schema;
    return changes;
  }
}
