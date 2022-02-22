import {
  Configuration,
  BaseAPI,
  DocResponse,
  DidStructure,
} from '@trustcerts/observer';
import { sortKeys } from './crypto/hash';
import { importKey } from './crypto/key';
import { verifySignature } from './crypto/sign';
import { DidManagerConfigValues } from './did/DidManagerConfigValues';
import { DidIdResolver } from './did/id/did-id-resolver';

export abstract class VerifierService {
  protected apis!: BaseAPI[];

  protected apiConfigurations: Configuration[];

  protected timeout = 2000;

  protected resolver = new DidIdResolver();

  constructor(
    protected observerUrls: string[],
    protected equalMin: number = 2
  ) {
    if (this.observerUrls.length === 1) {
      this.equalMin = 1;
    }
    this.apiConfigurations = observerUrls.map(
      url => new Configuration({ basePath: url })
    );
  }

  protected async validateDoc(
    document: DocResponse,
    config: DidManagerConfigValues<DidStructure>
  ) {
    //TODO implement validation of a document with recursive approach
    // TODO validate if signatureinfo is better than signaturedto to store more information
    const issuer = document.signatures[0].values[0].identifier;
    if (document.document.id === issuer.split('#')[0]) {
      // TODO instead of self certified use the genesis block to build the chain of trust
    } else {
      if (document.metaData) {
        config.time = document.metaData.updated ?? document.metaData.created;
      }
      const did = await this.resolver.load(issuer, config);
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
        document.signatures[0].values[0].signature,
        await importKey(key, 'jwk', ['verify'])
      );
      console.log(valid);
      if (!valid) {
        console.log(document.document);
        throw Error(`signature is wrong for ${document.document.id}`);
      }
    }
  }
}

export interface SignatureContent {
  date: string;
  value: any;
  type: string;
}
