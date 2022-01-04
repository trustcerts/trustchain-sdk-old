import { JsonWebKey } from '@mattrglobal/bls12381-key-pair/lib/types';
import { Bls12381G2KeyPair } from '@mattrglobal/jsonld-signatures-bbs';
import globalAxios from 'axios';
import { extendContextLoader } from 'jsonld-signatures';
import { logger } from '../logger';
import { exists, read, write } from '../helpers';
import { DidIdResolver } from '../did/id/did-id-resolver';

export interface LoaderResponse {
  contextUrl: string | null;
  document: any;
  documentUrl: string;
}
export class DocumentLoader {
  private cache: any;
  private cachePath = './tmp/docLoader.json';
  private MAX_LOADING_TIME = 5000;

  private revocationListWith1234Revoked = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/bbs/v1',
      'https://w3id.org/vc-revocation-list-2020/v1',
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/vc-revocation-list-2020/v1',
    ],
    type: ['VerifiableCredential', 'RevocationList2020Credential'],
    credentialSubject: {
      id: 'did:trust:tc:dev:REVOCATION_LIST_WITH_1234_REVOKED#list',
      type: 'RevocationList2020',
      encodedList:
        'H4sIAAAAAAAAA-3OMQ0AAAgDsB3414yKBY5WQZOv5joAAAAAAAAAAAAAAAAULV07dHbUMAAA',
    },
    issuanceDate: '2021-09-07T13:53:35.898Z',
    issuer: 'did:trust:tc:dev:id:XLzBJd69tqEgq7oqqdEsHW',
    id: 'did:trust:tc:dev:REVOCATION_LIST_WITH_1234_REVOKED',
    proof: {
      type: 'BbsBlsSignature2020',
      created: '2021-09-07T13:53:35Z',
      proofPurpose: 'assertionMethod',
      proofValue:
        'qQRRcD7bz9QAty4wBmBkiMyJb5HucVp3CPW3kKHv808kukva4ET9jrlbVB4mNSiOHMcVreX5+cuGtbw8Co51ripa94XefltJqtunxV76R9BFL/drzJOFHiyyEEdtWLq0mc22fkYs8LDIK/OWCKTucw==',
      verificationMethod:
        'did:trust:tc:dev:id:XLzBJd69tqEgq7oqqdEsHW#Eg83agN3BmSntP4Cbv1hXSJk7p6w2krfTvhvfeK4MjQd',
    },
  };

  constructor() {
    if (!exists(this.cachePath)) {
      write(this.cachePath, JSON.stringify({}, null, 4));
    }
    this.cache = JSON.parse(read(this.cachePath));
  }

  public resolveDocumentFromCache(url: string): any {
    if (this.cache[url]) {
      logger.debug('Returned cached ' + url);
      return this.cache[url];
    }
  }

  public saveDocumentToCache(url: string, doc: any): void {
    this.cache[url] = doc;
    write(this.cachePath, JSON.stringify(this.cache, null, 4));
  }

  private async loadResourceWithTimeout<T>(
    url: string,
    promise: Promise<T>
  ): Promise<any> {
    try {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Could not load resource ${url} in time (${this.MAX_LOADING_TIME} ms)`
            )
          );
        }, this.MAX_LOADING_TIME);
      });

      return await Promise.race<T>([promise, timeout]);
    } catch (e) {
      logger.warn(e);
    }
  }

  // TODO: is not async, but uses await. Problem?
  getLoader(): (url: string) => any {
    const docLoader = async (url: string): Promise<LoaderResponse> => {
      if (url.startsWith('did:')) {
        // TODO: check if TC did key id
        logger.debug('Resolving DID ' + url);

        if (url === 'did:trust:tc:dev:REVOCATION_LIST_WITH_1234_REVOKED') {
          return {
            contextUrl: null,
            document: this.revocationListWith1234Revoked,
            documentUrl: url,
          };
        }

        // is key? (Can you reference other parts via #?)
        if (url.indexOf('#') !== -1) {
          const did = await this.loadResourceWithTimeout(
            url,
            DidIdResolver.load(url.split('#')[0])
          );
          const doc = did.getKey(url);
          // Import as blsKey to extract publicKey as base58
          // TODO: directly encode as base58
          const blsKey = await this.loadResourceWithTimeout(
            url,
            Bls12381G2KeyPair.fromJwk({
              publicKeyJwk: doc.publicKeyJwk as JsonWebKey,
              id: url,
            })
          );
          return {
            contextUrl: null,
            document: {
              publicKeyBase58: blsKey.publicKey,
              id: blsKey.id,
              controller: did,
            },
            documentUrl: url,
          };
        } else {
          // is DID doc
          const did = await this.loadResourceWithTimeout(
            url,
            DidIdResolver.load(url)
          );
          return {
            contextUrl: null,
            document: did.getDocument(),
            documentUrl: url,
          };
        }
      } else {
        let resolvedDoc = this.resolveDocumentFromCache(url);
        if (!resolvedDoc) {
          logger.debug('Resolving URL ' + url);
          // assume it's an context URL and resolve
          const response = await this.loadResourceWithTimeout(
            url,
            globalAxios.get<string>(url)
          );
          const context = response.data;
          resolvedDoc = {
            contextUrl: null,
            document: context,
            documentUrl: url,
          };
          this.saveDocumentToCache(url, resolvedDoc);
        }
        return resolvedDoc;
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return extendContextLoader(docLoader) as (url: string) => any;
  }
}
