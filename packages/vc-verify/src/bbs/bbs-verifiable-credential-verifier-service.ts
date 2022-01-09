import { BbsBlsSignature2020 } from '@mattrglobal/jsonld-signatures-bbs';
import { purposes, verify } from 'jsonld-signatures';
import {
  DocumentLoader,
  logger,
  BBSVerificationResult,
  ICredentialStatus,
  IVerifiablePresentationBBS,
  VerifiableCredentialBBS,
} from '@trustcerts/core';
import { RevocationService } from '@trustcerts/vc-revocation';

export class BbsVerifiableCredentialVerifierService {
  private docLoader = new DocumentLoader().getLoader();

  /**
   * Verifies a given verifiable credential, e.g. by checking its signature and revocation status
   *
   * @param credential The verifiable credential to be verified
   * @returns True if the verifiable credential is valid
   */
  async verifyCredential(
    credential: VerifiableCredentialBBS
  ): Promise<boolean> {
    const verified: BBSVerificationResult = await verify(credential, {
      suite: new BbsBlsSignature2020(),
      purpose: new purposes.AssertionProofPurpose(),
      documentLoader: this.docLoader,
    });

    logger.debug(JSON.stringify(verified, null, 2));

    if (credential.credentialStatus) {
      const revoked = await this.isRevoked(credential.credentialStatus);
      if (revoked) {
        logger.debug('Credential verification failed: Credential is revoked');
        return false;
      }
    }

    if (verified.verified) {
      logger.debug('Credential verification succeeded');
    } else {
      logger.debug('Credential verification failed');
    }

    return verified.verified;
  }

  /**
   * Checks whether the given credential status has been revoked
   *
   * @param credentialStatus The credential status to be checked
   * @returns True if the given credential status has been revoked
   */
  async isRevoked(credentialStatus: ICredentialStatus): Promise<boolean> {
    const revocationService = new RevocationService();
    await revocationService.init();

    return revocationService.isRevoked(credentialStatus);

    // const revocationList = (await this.docLoader(credentialStatus.revocationListCredential)).document;
    // const encodedList = revocationList['credentialSubject']['encodedList'];
    // const decodedList = await decodeList({encodedList: encodedList});
    // return decodedList.isRevoked(Number(credentialStatus.revocationListIndex));
  }

  /**
   * Verifies a given verifiable presentation by verifying its signature and each of its credentials
   *
   * @param presentation The verifiable presentation to be verified
   * @returns True if the verifiable presentation is valid
   */
  async verifyPresentation(
    presentation: IVerifiablePresentationBBS
  ): Promise<boolean> {
    for (const credential of presentation.verifiableCredential) {
      if (!(await this.verifyCredential(credential))) {
        logger.debug('Verifiable Credential is invalid:');
        logger.debug(credential);
        return false;
      }
    }

    const verified: BBSVerificationResult = await verify(presentation, {
      suite: new BbsBlsSignature2020(),
      purpose: new purposes.AuthenticationProofPurpose({
        challenge: presentation.proof.challenge,
        domain: presentation.proof.domain,
      }),
      documentLoader: this.docLoader,
    });

    logger.debug(JSON.stringify(verified, null, 2));

    if (verified.verified) {
      logger.debug('Credential verification succeeded');
    } else {
      logger.debug('Credential verification failed');
    }

    return verified.verified;
  }
}
