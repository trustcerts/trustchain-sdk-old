import { logger } from '../../logger';
import { jwtVerify } from 'jose/jwt/verify';
import { importKey } from '../../crypto/key';
import { DidResolver } from '../../did/did-verifier-service';
import { ICredentialStatus, JWTPayloadVC, JWTPayloadVP } from './credential.interface';
import { JWT } from '../../jwt-service';
import { DocumentLoader } from '../../documentLoader';
import { RevocationService } from '../../revocation/revocation-service';

export class VerifiableCredentialVerifierService {
    private docLoader = new DocumentLoader().getLoader();

    async verifyCredential(credential: string): Promise<boolean> {
        const jwt = new JWT(credential);
        const kid = jwt.getHeader().kid;

        const did = await DidResolver.load(kid);

        const key = await importKey(did.getKey(kid).publicKeyJwk, 'jwk', ['verify']);

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
    async isRevoked(credentialStatus: ICredentialStatus): Promise<boolean> {
        const revocationService = new RevocationService();
        await revocationService.init();

        return revocationService.isRevoked(credentialStatus);

        // const revocationList = (await this.docLoader(credentialStatus.revocationListCredential)).document;
        // const encodedList = revocationList['credentialSubject']['encodedList'];
        // const decodedList = await decodeList({encodedList: encodedList});
        // return decodedList.isRevoked(Number(credentialStatus.revocationListIndex));
    }

    async verifyPresentation(presentation: string): Promise<boolean> {
        const jwt = new JWT(presentation);

        const jwtPayload = jwt.getPayload() as JWTPayloadVP;

        const kid = jwt.getHeader().kid;

        const did = await DidResolver.load(kid);

        const key = await importKey(did.getKey(kid).publicKeyJwk, 'jwk', ['verify']);

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
