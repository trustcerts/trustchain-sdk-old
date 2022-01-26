import { SignJWT } from 'jose';
import {
  IVerifiableCredentialPayload,
  IVerifiablePresentationPayload,
  IVerifiableCredentialArguments,
  IVerifiablePresentationArguments,
  CryptoService,
} from '@trustcerts/core';
import { RevocationService } from '@trustcerts/vc-revocation';

export class VerifiableCredentialIssuerService {
  /**
   * Creates a JWT-encoded verifiable credential
   *
   * @param vcArguments The arguments of the verifiable credential
   * @param cryptoService The Bls12381G2 keypair as JsonWebKeys
   * @param revokable If true, a credentialStatus property is added to the verifiable credential
   * @returns A JWT-encoded verifiable credential
   */
  async createVerifiableCredential(
    vcArguments: IVerifiableCredentialArguments,
    cryptoService: CryptoService,
    revokable = true
  ): Promise<string> {
    const vcPayload: IVerifiableCredentialPayload = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        ...vcArguments['@context'],
      ],
      type: vcArguments.type,
      credentialSubject: vcArguments.credentialSubject,
    };

    const nonce = vcArguments.nonce;

    const issuanceDate = new Date();

    if (revokable) {
      // // TODO: figure out what credential id needs to be set to
      // // ("[...] It MUST NOT be the URL for the revocation list.")
      // // https://w3c-ccg.github.io/vc-status-rl-2020/#revocationlist2020status
      // const credentialStatusId = "TODO";

      // // TODO: get credential index via API call
      // const revocationListIndex = "1235";

      // // TODO: set revocation list URL
      // const revocationListCredential = "did:trust:tc:dev:REVOCATION_LIST_WITH_1234_REVOKED";

      // const credentialStatus: ICredentialStatus = {
      //     id: credentialStatusId,
      //     type: "RevocationList2020Status", // "The type property MUST be RevocationList2020Status."
      //                                     // https://w3c-ccg.github.io/vc-status-rl-2020/#revocationlist2020status
      //     revocationListIndex: revocationListIndex,
      //     revocationListCredential: revocationListCredential
      // };

      // TODO: Als Instanzvariable
      const revocationService = new RevocationService();
      await revocationService.init();

      vcPayload.credentialStatus = await revocationService.getNewCredentialStatus();
      vcPayload['@context']?.push(
        'https://w3id.org/vc-revocation-list-2020/v1'
      );
    }

    /* Set values according to https://w3c.github.io/vc-data-model/#jwt-encoding

        The following rules apply to JOSE headers in the context of this specification:

            alg MUST be set for digital signatures. If only the proof property is needed for the chosen signature method (that is, if there is no choice of algorithm within that method), the alg header MUST be set to none.
            kid MAY be used if there are multiple keys associated with the issuer of the JWT. The key discovery is out of the scope of this specification. For example, the kid can refer to a key in a DID document, or can be the identifier of a key inside a JWKS.
            typ, if present, MUST be set to JWT.

        For backward compatibility with JWT processors, the following JWT-registered claim names MUST be used instead of, or in addition to, their respective standard verifiable credential counterparts:

            exp MUST represent the expirationDate property, encoded as a UNIX timestamp (NumericDate).
            iss MUST represent the issuer property of a verifiable credential or the holder property of a verifiable presentation.
            nbf MUST represent issuanceDate, encoded as a UNIX timestamp (NumericDate).
            jti MUST represent the id property of the verifiable credential or verifiable presentation.
            sub MUST represent the id property contained in the verifiable credential subject.
            aud MUST represent (i.e., identify) the intended audience of the verifiable presentation (i.e., the verifier intended by the presenting holder to receive and verify the verifiable presentation).

        */

    const jwt = new SignJWT({ vc: vcPayload, nonce: nonce })
      // map to https://datatracker.ietf.org/doc/html/rfc7518#section-3.1
      .setProtectedHeader({
        alg: this.getJWTAlgorithm(cryptoService.keyPair.privateKey!.algorithm),
        kid: cryptoService.fingerPrint,
      })
      .setIssuedAt(Math.floor(issuanceDate.getTime() / 1000))
      .setIssuer(String(vcArguments.issuer))
      .setSubject(vcArguments.credentialSubject.id)
      .setJti(vcArguments.id);

    if (vcArguments.expirationDate !== undefined) {
      jwt.setExpirationTime(vcArguments.expirationDate);
    }

    return await jwt.sign(cryptoService.keyPair.privateKey!);
  }

  /**
   * Creates a JWT-encoded verifiable presentation
   *
   * @param vpArguments The arguments of the verifiable presentation
   * @param cryptoService The Bls12381G2 keypair as JsonWebKeys
   * @returns A JWT-encoded verifiable presentation
   */
  async createVerifiablePresentation(
    vpArguments: IVerifiablePresentationArguments,
    cryptoService: CryptoService
  ): Promise<string> {
    const vpPayload: IVerifiablePresentationPayload = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        ...vpArguments['@context'],
      ],
      type: vpArguments.type,
      verifiableCredentials: vpArguments.verifiableCredentials,
    };

    const nonce = vpArguments.nonce;

    const issuanceDate = new Date();

    /* Set values according to https://w3c.github.io/vc-data-model/#jwt-encoding

        The following rules apply to JOSE headers in the context of this specification:

            alg MUST be set for digital signatures. If only the proof property is needed for the chosen signature method (that is, if there is no choice of algorithm within that method), the alg header MUST be set to none.
            kid MAY be used if there are multiple keys associated with the issuer of the JWT. The key discovery is out of the scope of this specification. For example, the kid can refer to a key in a DID document, or can be the identifier of a key inside a JWKS.
            typ, if present, MUST be set to JWT.

        For backward compatibility with JWT processors, the following JWT-registered claim names MUST be used instead of, or in addition to, their respective standard verifiable credential counterparts:

            exp MUST represent the expirationDate property, encoded as a UNIX timestamp (NumericDate).
            iss MUST represent the issuer property of a verifiable credential or the holder property of a verifiable presentation.
            nbf MUST represent issuanceDate, encoded as a UNIX timestamp (NumericDate).
            jti MUST represent the id property of the verifiable credential or verifiable presentation.
            sub MUST represent the id property contained in the verifiable credential subject.
            aud MUST represent (i.e., identify) the intended audience of the verifiable presentation (i.e., the verifier intended by the presenting holder to receive and verify the verifiable presentation).

        */

    /*
            challenge & domain
            https://www.w3.org/TR/vc-imp-guide/#presentations
            https://w3c-ccg.github.io/security-vocab/#challenge
            https://github.com/hyperledger/aries-rfcs/blob/master/features/0510-dif-pres-exch-attach/README.md#the-options-object
        */

    const jwt = new SignJWT({ vp: vpPayload, nonce: nonce })
      // map to https://datatracker.ietf.org/doc/html/rfc7518#section-3.1
      .setProtectedHeader({
        alg: this.getJWTAlgorithm(cryptoService.keyPair.privateKey!.algorithm),
        kid: cryptoService.fingerPrint,
      })
      .setJti(vpArguments.challenge)
      .setAudience(vpArguments.domain)
      .setNotBefore(Math.floor(issuanceDate.getTime() / 1000))
      .setIssuedAt(Math.floor(issuanceDate.getTime() / 1000))
      .setIssuer(vpArguments.holder);

    if (vpArguments.expirationDate !== undefined) {
      jwt.setExpirationTime(vpArguments.expirationDate);
    }

    return await jwt.sign(cryptoService.keyPair.privateKey!);
  }

  /**
   * Returns the corresponding key algorithm of a key for use in the JWT header
   * @param keyAlgorithm The key algorithm
   * @returns The key algorithm of the key for use in the JWT header
   */
  getJWTAlgorithm(keyAlgorithm: KeyAlgorithm): string {
    if (keyAlgorithm.name === 'ECDSA') {
      return 'ES256';
    } else {
      return 'RS256';
    }
  }
}
