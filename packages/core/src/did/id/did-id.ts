import {
  DidPublicKey,
  DidPublicKeyType,
  DidService,
  DidIdStructure,
  RoleManageType,
  IdDocResponse,
  DidIdTransaction,
  DidIdDocument,
} from '@trustcerts/observer';
import { Did } from '../did';
import { Management } from '../management';

// Enum values müssen äquivalent zu DidStructure in api.ts (note: die gibt's doppelt, gateway & observer)
export enum VerificationRelationshipType {
  authentication = 'authentication',
  assertionMethod = 'assertionMethod',
  //keyAgreement = "keyAgreement",
  //capabilityInvocation = "capabilityInvocation",
  //capabilityDelegation = "capabilityDelegation",
  modification = 'modification',
}

export interface VerificationRelationship {
  keyID: string;
  type: VerificationRelationshipType;
}

export class DidId extends Did {
  private verificationMethod = new Management<DidPublicKey>();
  private verificationRelationships = new Map<
    VerificationRelationshipType,
    Management<string>
  >();

  private service = new Management<DidService>();

  private role = new Management<RoleManageType>();

  constructor(public id: string) {
    super(id);
    Object.values(VerificationRelationshipType).forEach(vrType => {
      this.verificationRelationships.set(vrType, new Management<string>());
    });
  }

  hasKey(id: string): boolean {
    return this.verificationMethod.current.has(this.getFullId(id));
  }

  getKey(id: string): DidPublicKey {
    const key = this.verificationMethod.current.get(this.getFullId(id));
    if (!key) {
      throw Error(`key not found: ${id}`);
    }
    return key;
  }

  addKey(id: string, publicKeyJwk: JsonWebKey): void {
    if (this.hasKey(id)) {
      throw Error('key already exists');
    }
    // TODO validate if given type matches to passed json web key
    const verificationMethod: DidPublicKey = {
      controller: this.id,
      id: this.getFullId(id),
      type: DidPublicKeyType.RsaVerificationKey2018,
      publicKeyJwk: publicKeyJwk,
    };

    this.verificationMethod.current.set(
      verificationMethod.id,
      verificationMethod
    );
    this.verificationMethod.add.set(verificationMethod.id, verificationMethod);
  }

  removeKey(id: string): void {
    if (!this.hasKey(id)) {
      throw Error('id not found');
    }

    this.verificationMethod.current.delete(this.getFullId(id));
    this.verificationMethod.remove.add(this.getFullId(id));
  }

  hasService(id: string): boolean {
    return this.service.current.has(this.getFullId(id));
  }

  getService(id: string): DidService {
    const service = this.service.current.get(this.getFullId(id));
    if (!service) {
      throw new Error('service not found');
    }
    return service;
  }

  addService(id: string, endpoint: string, type: string): void {
    if (this.hasService(id)) {
      throw Error('id already used');
    }
    const service: DidService = {
      id: this.getFullId(id),
      endpoint,
      type,
    };
    this.service.current.set(service.id, service);
    this.service.add.set(service.id, service);
  }

  removeService(id: string): void {
    if (!this.hasService(id)) {
      throw Error('id not found');
    }

    this.service.current.delete(this.getFullId(id));
    this.service.remove.add(this.getFullId(id));
  }

  hasRole(value: string): boolean {
    return this.role.current.has(value);
  }

  addRole(value: RoleManageType): void {
    if (this.hasRole(value)) {
      throw Error('role already set');
    }
    this.role.current.set(value, value);
    this.role.add.set(value, value);
  }

  removeRole(value: string): void {
    if (!this.hasRole(value)) {
      throw Error('role not found');
    }

    this.role.current.delete(value);
    this.role.remove.add(value);
  }

  addVerificationRelationship(
    id: string,
    verificationRelationshipType: VerificationRelationshipType
  ): void {
    if (!this.hasKey(id)) {
      throw Error("key doesn't exist in verification method");
    }

    // TODO: Prüfen, ob der Key überhaupt bereits in verificationMethod existiert?
    if (this.hasVerificationRelationship(id, verificationRelationshipType)) {
      throw Error('id already used');
    }

    this.verificationRelationships
      .get(verificationRelationshipType)
      ?.current.set(this.getFullId(id), this.getFullId(id));
    this.verificationRelationships
      .get(verificationRelationshipType)
      ?.add.set(this.getFullId(id), this.getFullId(id));
  }

  // TOOD set correct response type
  /**
   * Return all relationships of a key
   */
  getVerificationRelationship(id: string): VerificationRelationshipType[] {
    return Object.values(VerificationRelationshipType).filter(
      verificationRelationShipKey => {
        return this.hasVerificationRelationship(
          id,
          verificationRelationShipKey
        );
      }
    );
  }

  hasVerificationRelationship(
    id: string,
    verificationRelationshipType: VerificationRelationshipType
  ): boolean {
    return (
      this.verificationRelationships
        .get(verificationRelationshipType)
        ?.current.has(id) ?? false
    );
  }

  removeVerificationRelationship(
    id: string,
    verificationRelationshipType: VerificationRelationshipType
  ): void {
    if (!this.hasVerificationRelationship(id, verificationRelationshipType)) {
      throw Error('verificationRelationship not found');
    }

    this.verificationRelationships
      .get(verificationRelationshipType)
      ?.current.delete(this.getFullId(id));
    this.verificationRelationships
      .get(verificationRelationshipType)
      ?.remove.add(this.getFullId(id));
  }

  findByVerificationRelationship(
    value: VerificationRelationshipType
  ): string[] {
    const relations = this.verificationRelationships.get(value);
    if (relations) {
      return Array.from(relations.current.keys());
    }
    return [];
  }

  removeAllVerificationRelationships(keyId: string): void {
    this.getVerificationRelationship(
      keyId
    ).forEach(verificationRelationShipKey =>
      this.removeVerificationRelationship(keyId, verificationRelationShipKey)
    );
  }

  getChanges(): DidIdStructure {
    const changes: DidIdStructure = {
      id: this.id,
    };

    changes.controller = this.getChangesController();

    if (this.role.add.size > 0) {
      changes.role = {
        add: Array.from(this.role.add.values()),
      };
    }
    if (this.role.remove.size > 0) {
      if (!changes.role) {
        changes.role = {};
      }
      changes.role.remove = Array.from(this.role.remove.values());
    }

    if (this.service.add.size > 0) {
      changes.service = {
        add: Array.from(this.service.add.values()),
      };
    }
    if (this.service.remove.size > 0) {
      if (!changes.service) {
        changes.service = {};
      }
      changes.service.remove = Array.from(this.service.remove.values());
    }

    if (this.verificationMethod.add.size > 0) {
      changes.verificationMethod = {
        add: Array.from(this.verificationMethod.add.values()),
      };
    }
    if (this.verificationMethod.remove.size > 0) {
      if (!changes.verificationMethod) {
        changes.verificationMethod = {};
      }
      changes.verificationMethod.remove = Array.from(
        this.verificationMethod.remove.values()
      );
    }

    Object.values(VerificationRelationshipType).forEach(vrType => {
      const vrTypeManagement = this.verificationRelationships.get(vrType);
      if (vrTypeManagement === undefined) return;

      if (vrTypeManagement.add.size > 0) {
        changes[vrType] = {
          add: Array.from(vrTypeManagement.add.values()),
        };
      }

      if (vrTypeManagement.remove.size > 0) {
        if (!changes[vrType]) {
          changes[vrType] = {};
        }
        // use vrManage const as workaround because direct access simply does not work. (Object possibly undefined)
        const vrManage = changes[vrType];
        if (vrManage) {
          vrManage.remove = Array.from(vrTypeManagement.remove.values());
        }
      }
    });

    return changes;
  }

  /**
   * Removes the values from add and remove. Normally called after the changes were put in a transaction.
   */
  resetChanges(): void {
    this.role.add.clear();
    this.role.remove.clear();
    this.controller.add.clear();
    this.controller.remove.clear();
    this.service.add.clear();
    this.service.remove.clear();
    this.verificationMethod.add.clear();
    this.verificationMethod.remove.clear();
    Object.values(VerificationRelationshipType).forEach(vrType => {
      const vrTypeManagement = this.verificationRelationships.get(vrType);
      vrTypeManagement?.add.clear();
      vrTypeManagement?.remove.clear();
    });
  }

  parseDocument(docResponse: IdDocResponse): void {
    this.parseDocumentSuper(docResponse);

    docResponse.document.service.forEach(service =>
      this.addService(service.id, service.endpoint, service.type)
    );
    docResponse.document.verificationMethod.forEach(verificationMethod =>
      this.addKey(verificationMethod.id, verificationMethod.publicKeyJwk)
    );

    Object.values(VerificationRelationshipType).forEach(vrType => {
      docResponse.document[vrType]?.forEach(id =>
        this.addVerificationRelationship(id, vrType)
      );
    });

    docResponse.document.role.forEach(role =>
      this.addRole((role as unknown) as RoleManageType)
    );
    // required since the this.add... calls will fill the add fields.
    this.resetChanges();
  }

  parseTransaction(transactions: DidIdTransaction[]): void {
    for (const transaction of transactions) {
      this.version++;
      // validate signature of transaction
      // parse it into the existing document
      this.parseTransactionControllers(transaction);

      if (transaction.values.service?.remove) {
        transaction.values.service.remove.forEach(id =>
          this.service.current.delete(id)
        );
      }
      if (transaction.values.service?.add) {
        transaction.values.service.add.forEach(service =>
          this.service.current.set(service.id, service)
        );
      }

      if (transaction.values.verificationMethod?.remove) {
        transaction.values.verificationMethod.remove.forEach(id =>
          this.verificationMethod.current.delete(id)
        );
      }
      if (transaction.values.verificationMethod?.add) {
        transaction.values.verificationMethod.add.forEach(verificationMethod =>
          this.verificationMethod.current.set(
            verificationMethod.id,
            verificationMethod
          )
        );
      }

      Object.values(VerificationRelationshipType).forEach(vrType => {
        transaction.values[vrType]?.remove?.forEach(id => {
          this.verificationRelationships.get(vrType)?.current.delete(id);
        });
        transaction.values[vrType]?.add?.forEach(id => {
          this.verificationRelationships.get(vrType)?.current.set(id, id);
        });
      });

      if (transaction.values.role?.remove) {
        transaction.values.role.remove.forEach(role =>
          this.role.current.delete(role)
        );
      }
      if (transaction.values.role?.add) {
        transaction.values.role.add.forEach(role =>
          this.role.current.set(role, role)
        );
      }
    }
  }

  getDocument(): DidIdDocument {
    const didDoc: Partial<DidIdDocument> = {
      '@context': this.context,
      id: this.id,
      controller: Array.from(this.controller.current.values()),
      verificationMethod: Array.from(this.verificationMethod.current.values()),
      service: Array.from(this.service.current.values()),
      //authentication: Array.from(this.verificationRelationships.get(VerificationRelationshipType.authentication).current.values()),
      //assertionMethod: Array.from(this.verificationRelationships.get(VerificationRelationshipType.assertionMethod).current.values()),
      role: Array.from(this.role.current.values()),
    };

    // TODO move them before initing the didDoc to remove the Partial call
    // Add all vrTypes from Enum VerificationRelationshipType (should also be present in blockchain / IDidIdDocument)
    Object.values(VerificationRelationshipType).forEach(vrType => {
      const vrTypeManagement = this.verificationRelationships.get(vrType);
      if (vrTypeManagement) {
        // always true
        didDoc[vrType] = Array.from(vrTypeManagement.current.values());
      }
    });

    return didDoc as DidIdDocument;
  }
}
