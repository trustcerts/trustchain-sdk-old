import { IDidDocument } from './did-document';
import { Management } from './management';

export abstract class Did {
  public version = 0;

  protected idLength = 22;

  protected controller = new Management<string>();

  protected context = ['https://www.w3.org/ns/did/v1'];

  constructor(public id: string) {
    const result = new RegExp(
      `did:trust:[:a-z]*[1-9A-HJ-NP-Za-km-z]{${this.idLength}}`
    ).test(id);
    if (!result) {
      throw Error('wrong format for did: ' + id);
    }
  }

  public getVersion(): number {
    return this.version;
  }

  protected getFullId(id: string): string {
    return id.includes('#') ? id : `${this.id}#${id}`;
  }

  hasController(value: string): boolean {
    return this.controller.current.has(value);
  }

  addController(value: string): void {
    if (this.hasController(value)) {
      throw Error('controller already set');
    }
    this.controller.current.set(value, value);
    this.controller.add.set(value, value);
  }

  removeController(value: string): void {
    if (!this.hasController(value)) {
      throw Error('controller not found');
    }

    this.controller.current.delete(value);
    this.controller.remove.add(value);
  }

  // TODO instead of any pass the didtransaction attribte. Has to be imported in another way since it is an extended class from the open-api spec
  abstract parseTransaction(transactions: any): void;
  abstract parseDocument(document: any): void;
  abstract getDocument(): IDidDocument;
  abstract resetChanges(): void;
  abstract getChanges(): any;
}
