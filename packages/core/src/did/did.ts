import { IDidDocument } from './did-document';
import { Management } from './management';

export abstract class Did {
  public version = 0;

  protected controller = new Management<string>();

  protected context = ['https://www.w3.org/ns/did/v1'];

  constructor(public id: string) {}

  public getVersion(): number {
    return this.version;
  }

  protected getFullId(id: string): string {
    return id.includes('#') ? id : `${this.id}#${id}`;
  }

  abstract parseTransaction(transactions: any): void;
  abstract parseDocument(document: any): void;
  abstract getDocument(): IDidDocument;
  abstract resetChanges(): void;
}
