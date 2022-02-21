import globalAxios from 'axios';
import { extendContextLoader } from 'jsonld-signatures';
import { logger } from '../logger';
import { exists, read, write, base58Encode } from '../helpers';
import { DidIdResolver } from '../did/id/did-id-resolver';
import base64url from 'base64url';

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

  // TODO: is not async, but uses await. Problem?
  getLoader(): (url: string) => any {
    const docLoader = async (url: string): Promise<LoaderResponse> => {
      const resolver = new DidIdResolver();
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
          const did = await resolver.load(url.split('#')[0]);
          const doc = did.getKey(url) as any;

          if (!doc.publicKeyJwk.x) {
            // TODO: implement RSA key? (but not needed yet since documentLoader is only used by BBS library)
            throw new Error(
              `${url} does not contain a Bls12381G2KeyPair: ${doc.publicKeyJwk}`
            );
          }
          return {
            contextUrl: null,
            document: {
              publicKeyBase58: base58Encode(
                base64url.toBuffer(doc.publicKeyJwk.x)
              ),
              id: url,
              controller: did,
            },
            documentUrl: url,
          };
        } else {
          // is DID doc
          const did = await resolver.load(url);
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
          const response = await globalAxios.get<string>(url, {
            timeout: this.MAX_LOADING_TIME,
          });
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
