import {
  logger,
  importKey,
  DidIdResolver,
  ICredentialStatus,
  JWTPayloadVC,
  JWTPayloadVP,
  DidId,
} from '@trustcerts/core';
import { jwtVerify } from 'jose';
import { JWT } from './jwt-service';
import { RevocationService } from '@trustcerts/vc-revocation';

export class JWTVerifiableCredentialVerifierService {
  private resolver = new DidIdResolver();

  /**
   * Verifies a given verifiable credential, e.g. by checking its signature and revocation status
   *
   * @param credential The verifiable credential to be verified
   * @returns True if the verifiable credential is valid
   */
  async verifyCredential(credential: string): Promise<boolean> {
    const jwt = new JWT(credential);
    const kid = jwt.getHeader().kid;

    const did = await this.resolver.load(kid);

    const key = await importKey(did.getKey(kid).publicKeyJwk, 'jwk', [
      'verify',
    ]);

    try {
      await jwtVerify(credential, key);

      // Check revocation status
      const vcPayload = jwt.getPayload() as JWTPayloadVC;
      if (vcPayload.vc.credentialStatus) {
        const revoked = await this.isRevoked(vcPayload.vc.credentialStatus);
        if (revoked) {
          logger.debug('Credential verification failed: Credential is revoked');
          return false;
        }
      }

      logger.debug('Credential verification succeeded');
      return true;
    } catch (e) {
      logger.debug('Credential verification failed');
      logger.debug(e);
      return false;
    }
  }

  // TODO: Code-Dopplung mit BBS
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
  async verifyPresentation(presentation: string): Promise<boolean> {
    const jwt = new JWT(presentation);

    const jwtPayload = jwt.getPayload() as JWTPayloadVP;

    const kid = jwt.getHeader().kid;

    const did = await this.resolver.load(kid);

    const key = await importKey(did.getKey(kid).publicKeyJwk, 'jwk', [
      'verify',
    ]);

    const credentials = jwtPayload.vp.verifiableCredentials;

    for (const credential of credentials) {
      if (!(await this.verifyCredential(credential))) {
        logger.debug('Verifiable Credential is invalid:');
        logger.debug(credential);
        return false;
      }
    }

    try {
      await jwtVerify(presentation, key);
      logger.debug('Presentation verification succeeded');
      return true;
    } catch (e) {
      logger.debug('Presentation verification failed');
      logger.debug(e);
      return false;
    }
  }
}
