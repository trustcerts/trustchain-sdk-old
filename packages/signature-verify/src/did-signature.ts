import { Did } from '@trustcerts/core';
import { HashDocResponse, HashStructure } from '@trustcerts/observer';
import { HashTransactionDto } from '@trustcerts/gateway';
import { IDidSignatureDocument } from './did-signature-document';

export class SignatureSchema extends Did {
  constructor(public id: string) {
    super(id);
    // if the passed id value already has a prefix remove it.
    // TODO set correct regexp, normal did should have no type
    // TODO use method from Identifier.method
  }

  parseTransaction(_transactions: HashTransactionDto[]): void {
    throw new Error('Method not implemented.');
  }
  parseDocument(_document: HashDocResponse): void {
    throw new Error('Method not implemented.');
  }

  getDocument(): IDidSignatureDocument {
    return {
      '@context': this.context,
      id: this.id,
      controller: Array.from(this.controller.current.values()),
    };
  }
  resetChanges(): void {}

  getChanges(): HashStructure {
    const changes = this.getBasicChanges<HashStructure>();
    return changes;
  }
}
