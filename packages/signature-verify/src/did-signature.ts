import { Did } from '@trustcerts/core';
import {
  HashDocResponse,
  DidHashStructure,
  DidHashTransaction,
  DidHashDocument,
} from '@trustcerts/observer';

export class DidSignature extends Did {
  algorithm!: string;
  revoked?: string | undefined;

  constructor(public id: string) {
    super(id);
    // if the passed id value already has a prefix remove it.
    // TODO set correct regexp, normal did should have no type
    // TODO use method from Identifier.method
  }

  parseTransaction(transactions: DidHashTransaction[]): void {
    for (const transaction of transactions) {
      this.version++;
      // validate signature of transaction
      // parse it into the existing document
      this.parseTransactionControllers(transaction);

      this.algorithm = transaction.values.algorithm;
      this.revoked = transaction.values.revoked;
    }
  }

  parseDocument(docResponse: HashDocResponse): void {
    this.parseDocumentSuper(docResponse);
    this.algorithm = docResponse.document.algorithm;
    this.revoked = docResponse.document.revoked;
  }

  getDocument(): DidHashDocument {
    return {
      '@context': this.context,
      id: this.id,
      controller: Array.from(this.controller.current.values()),
      algorithm: this.algorithm,
    };
  }
  resetChanges(): void {}

  getChanges(): DidHashStructure {
    const changes = this.getBasicChanges<DidHashStructure>();
    return changes;
  }
}