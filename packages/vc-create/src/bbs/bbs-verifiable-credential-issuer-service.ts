import { JsonWebKey } from '@mattrglobal/bls12381-key-pair/lib/types';
import {
  BbsBlsSignature2020,
  Bls12381G2KeyPair,
} from '@mattrglobal/jsonld-signatures-bbs';
import { purposes, sign } from 'jsonld-signatures';
// import { stringify } from 'ajv';
import { DocumentLoader } from '@trustcerts/core';
import {
  IVerifiableCredentialArguments,
  IVerifiablePresentationArgumentsBBS,
  IVerifiablePresentationBBS,
  VerifiableCredentialBBS,
  logger,
  DecryptedKeyPair,
} from '@trustcerts/core';

import { createList, createCredential } from '@transmute/vc-status-rl-2020';
import { RevocationService } from '@trustcerts/vc-revocation';
export class BbsVerifiableCredentialIssuerService {
  async createBBSVerifiableCredential(
    vcArguments: IVerifiableCredentialArguments,
    keyPair: DecryptedKeyPair,
    revokable = true
  ): Promise<VerifiableCredentialBBS> {
    // nonce?!

    const issuanceDate = new Date();

    const bbsKeyPair = await Bls12381G2KeyPair.fromJwk({
      publicKeyJwk: keyPair.publicKey as JsonWebKey,
      privateKeyJwk: keyPair.privateKey as JsonWebKey,
      id: keyPair.identifier,
    });

    const docLoader = new DocumentLoader().getLoader();

    // Add VerifiableCredential as type if not present yet
    const vcTypes = [...vcArguments.type];
    if (!vcTypes.find(vcType => vcType == 'VerifiableCredential')) {
      vcTypes.unshift('VerifiableCredential');
    }

    const vc: Partial<VerifiableCredentialBBS> = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/bbs/v1',
        ...vcArguments['@context'],
      ],
      type: vcTypes,
      credentialSubject: vcArguments.credentialSubject,
      issuanceDate: issuanceDate.toISOString(),
      issuer: String(vcArguments.issuer),
      id: vcArguments.id,
    };

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

      const revocationService = new RevocationService();
      await revocationService.init();

      vc.credentialStatus = await revocationService.getNewCredentialStatus();
      vc['@context']?.push('https://w3id.org/vc-revocation-list-2020/v1');
    }

    // TODO: Warum sind diese 3 Zeilen auskommentiert? Warum hat das Interface kein expirationDate?
    // if (vcArguments.expirationDate !== undefined) {
    //     vc['expirationDate'] = vcArguments.expirationDate;
    // }

    const signedCredential: VerifiableCredentialBBS = await sign(vc, {
      suite: new BbsBlsSignature2020({ key: bbsKeyPair }),
      purpose: new purposes.AssertionProofPurpose(),
      documentLoader: docLoader,
    });

    logger.debug(signedCredential);

    return signedCredential;
  }

  async createPresentation(
    vpArguments: IVerifiablePresentationArgumentsBBS,
    keyPair: DecryptedKeyPair
  ): Promise<IVerifiablePresentationBBS> {
    const verifiablePresentation: Partial<IVerifiablePresentationBBS> = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/bbs/v1',
        ...vpArguments['@context'],
      ],
      type: ['VerifiablePresentation', ...vpArguments.type],
      verifiableCredential: vpArguments.verifiableCredential,
    };

    const bbsKeyPair = await Bls12381G2KeyPair.fromJwk({
      publicKeyJwk: keyPair.publicKey as JsonWebKey,
      privateKeyJwk: keyPair.privateKey as JsonWebKey,
      id: keyPair.identifier,
    });

    const docLoader = new DocumentLoader().getLoader();

    const signedPresentation: IVerifiablePresentationBBS = (await sign(
      verifiablePresentation,
      {
        suite: new BbsBlsSignature2020({ key: bbsKeyPair }),
        purpose: new purposes.AuthenticationProofPurpose({
          challenge: vpArguments.challenge,
          domain: vpArguments.domain,
        }),
        documentLoader: docLoader,
      }
    )) as IVerifiablePresentationBBS;

    logger.debug(signedPresentation);

    return signedPresentation;
  }

  async createRevocationListCredential(
    id: string,
    length: number,
    issuer: string,
    keyPair: DecryptedKeyPair
  ): Promise<VerifiableCredentialBBS> {
    // TODO: Möglichkeiten implementieren, Indices in einem bestehenden List-Credential zu verwalten
    // TODO: Method entfernen, da Aufgaben von Revocation Service übernommen werden?
    const list = await createList({ length: length });
    const rlCredential = await createCredential({ id, list });

    const bbsVcIssuerService = new BbsVerifiableCredentialIssuerService();

    const vc = await bbsVcIssuerService.createBBSVerifiableCredential(
      {
        ...rlCredential,
        issuer: issuer,
      },
      keyPair,
      false
    );

    return vc;
  }
}
