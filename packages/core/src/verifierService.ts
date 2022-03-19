import {
  BaseAPI,
  DocResponse,
  DidStructure,
  DidTransaction,
  DidIdTransaction,
} from '@trustcerts/observer';
import { sortKeys } from './crypto/hash';
import { importKey } from './crypto/key';
import { verifySignature } from './crypto/sign';
import { DidManagerConfigValues } from './did/DidManagerConfigValues';
import { DidIdResolver } from './did/id/did-id-resolver';

export abstract class VerifierService {
  protected apis!: BaseAPI[];

  protected timeout = 2000;

  protected async validateDoc(
    document: DocResponse,
    config: DidManagerConfigValues<DidStructure>
  ) {
    //TODO implement validation of a document with recursive approach
    // TODO validate if signatureinfo is better than signaturedto to store more information
    const issuer = document.signatures.values[0].identifier;
    if (document.document.id === issuer.split('#')[0]) {
      // TODO instead of self certified use the genesis block to build the chain of trust
    } else {
      if (document.metaData) {
        config.time = document.metaData.updated ?? document.metaData.created;
      }
      const did = await new DidIdResolver().load(issuer, config);
      const key = did.getKey(issuer).publicKeyJwk;
      const value = JSON.stringify(
        sortKeys({
          document: document.document,
          version: document.metaData.versionId,
        })
      );
      // TODO validate all signatures
      const valid = await verifySignature(
        value,
        document.signatures.values[0].signature,
        await importKey(key, 'jwk', ['verify'])
      );
      if (!valid) {
        throw Error(`signature is wrong for ${document.document.id}`);
      }
    }
  }

  /**
   * Validates the signature of a given transaction.
   * @param transaction
   * @private
   */
  protected async validateTransaction(
    transaction: DidTransaction
  ): Promise<void> {
    await this.getKey(transaction).then((key: JsonWebKey) => {
      const value = JSON.stringify(
        sortKeys({
          value: transaction.values,
          date: transaction.createdAt,
        })
      );
      importKey(key, 'jwk', ['verify']).then(key => {
        verifySignature(
          value,
          transaction.signature.values[0].signature,
          key
        ).then(valid => {
          if (!valid) {
            throw Error('signature is wrong');
          }
        });
      });
    });
  }

  private async getKey(transaction: DidTransaction): Promise<JsonWebKey> {
    if (
      transaction.signature.values[0].identifier.split('#')[0] ===
      transaction.values.id
    ) {
      // TODO instead of searching for self certified, use the genesis block.
      if ((transaction as DidIdTransaction).values.verificationMethod?.add) {
        const element = (transaction as DidIdTransaction).values.verificationMethod!.add!.find(
          value => value.id === transaction.signature.values[0].identifier
        );
        if (element) {
          return element.publicKeyJwk;
        } else {
          throw Error('element not found');
        }
      } else {
        throw Error('verification element does not exist');
      }
    } else {
      // TODO design how the system will load and validate the information. Since newer transactions are based on older a client can not validate before having all information.
      const did = await new DidIdResolver().load(
        transaction.signature.values[0].identifier
      );
      return did.getKey(transaction.signature.values[0].identifier)
        .publicKeyJwk;
    }
  }

  protected abstract setEndpoints(id: string): void;

  abstract getDidDocument(
    id: string,
    config: DidManagerConfigValues<DidStructure>
  ): Promise<DocResponse>;

  abstract getDidTransactions(
    id: string,
    validate: boolean,
    time: string
  ): Promise<DidTransaction[]>;
}

export interface SignatureContent {
  date: string;
  value: any;
  type: string;
}
