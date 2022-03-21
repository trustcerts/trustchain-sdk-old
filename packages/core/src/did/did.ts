import { Management } from './management';
import {
  ControllerManage,
  DidDocument,
  DidDocumentMetaData,
  DidStructure,
  DocResponse,
  SignatureInfo,
} from '@trustcerts/observer';

export abstract class Did {
  public version = 0;

  protected controller = new Management<string>();

  protected context = ['https://www.w3.org/ns/did/v1'];

  protected metadata?: DidDocumentMetaData;

  protected signatures?: SignatureInfo;

  constructor(public id: string) {
    const result = new RegExp(this.getExp()).test(id);
    if (!result) {
      console.log(this.getExp());
      throw Error('wrong format for did: ' + id);
    }
  }

  // will not be overwritten by parent class.
  protected getExp() {
    return '^did:trust:[:a-z]*[1-9A-HJ-NP-Za-km-z]{22}$';
  }

  public getVersion(): number {
    return this.version;
  }

  public getMetaData() {
    if (!this.metadata) {
      throw Error(
        'no metadata found, perhaps document was loaded via transactions'
      );
    }
    return this.metadata;
  }

  public getSigntures() {
    if (!this.signatures) {
      throw Error(
        'no signatures found, perhaps document was loaded via transactions'
      );
    }
    return this.signatures;
  }

  protected getFullId(id: string): string {
    return id.includes('#') ? id : `${this.id}#${id}`;
  }

  getControllers(): string[] {
    return Array.from(this.controller.current.values());
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
  abstract parseTransactions(transactions: DidStructure[]): void;
  abstract parseDocument(document: any): void;
  abstract getDocument(): DidDocument;
  abstract resetChanges(): void;
  abstract getChanges(): any;

  protected parseDocumentSuper(docResponse: DocResponse) {
    this.version = docResponse.metaData.versionId;
    docResponse.document.controller.forEach(controller =>
      this.addController(controller)
    );
    this.metadata = docResponse.metaData;
    this.signatures = docResponse.signatures;
  }

  protected getBasicChanges<T>(): T {
    // TODO set DIDStrucutre
    const changes: any = {
      id: this.id,
    };

    if (this.controller.add.size > 0) {
      changes.controller = {
        add: Array.from(this.controller.add.values()),
      };
    }
    if (this.controller.remove.size > 0) {
      if (!changes.controller) {
        changes.controller = {};
      }
      changes.controller.remove = Array.from(this.controller.remove.values());
    }

    return changes;
  }

  /**
   * parse the controllers
   */
  protected parseTransactionControllers(transaction: DidStructure) {
    if (transaction.controller?.remove) {
      transaction.controller.remove.forEach(id =>
        this.controller.current.delete(id)
      );
    }
    if (transaction.controller?.add) {
      transaction.controller.add.forEach(controller =>
        this.controller.current.set(controller, controller)
      );
    }
  }

  /**
   * Get the changes for the controllers.
   */
  protected getChangesController(): ControllerManage | undefined {
    if (this.controller.add.size > 0 && this.controller.remove.size > 0) return;

    return {
      add:
        this.controller.add.size > 0
          ? Array.from(this.controller.add.values())
          : undefined,
      remove:
        this.controller.remove.size > 0
          ? Array.from(this.controller.remove.values())
          : undefined,
    };
  }
}
