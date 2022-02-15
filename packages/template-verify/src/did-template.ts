import { Did } from '@trustcerts/core';
import {
  Compression,
  DidTemplateDocument,
  DidTemplateTransaction,
  TemplateDocResponse,
  TemplateStructure,
} from '@trustcerts/observer';

export class DidTemplate extends Did {
  public compression!: Compression;

  public template!: string;

  public schemaId!: string;

  constructor(public id: string) {
    super(id);
    // if the passed id value already has a prefix remove it.
    // TODO set correct regexp, normal did should have no type
    // TODO use method from Identifier.method
  }

  parseTransaction(transactions: DidTemplateTransaction[]): void {
    for (const transaction of transactions) {
      this.version++;
      // validate signature of transaction
      // parse it into the existing document
      this.parseTransactionControllers(transaction);

      this.schemaId = transaction.values.schemaId ?? this.schemaId;
      this.template = transaction.values.template ?? this.template;
      this.compression = transaction.values.compression ?? this.compression;
    }
  }
  parseDocument(docResponse: TemplateDocResponse): void {
    this.parseDocumentSuper(docResponse);
    this.schemaId = docResponse.document.schemaId;
    this.template = docResponse.document.template;
    this.compression = docResponse.document.compression;
  }

  getDocument(): DidTemplateDocument {
    return {
      '@context': this.context,
      id: this.id,
      controller: Array.from(this.controller.current.values()),
      compression: this.compression,
      template: this.template,
      schemaId: this.schemaId,
    };
  }
  resetChanges(): void {}

  getChanges(): TemplateStructure {
    const changes = this.getBasicChanges<TemplateStructure>();
    return changes;
  }
}
