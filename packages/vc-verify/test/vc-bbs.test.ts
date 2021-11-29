import {
  BbsBlsSignatureProof2020,
  deriveProof,
} from '@mattrglobal/jsonld-signatures-bbs';
import {
  DecryptedKeyPair,
  VerificationRelationshipType,
  ConfigService,
  CryptoService,
  DidNetworks,
  DocumentLoader,
  Identifier,
  VerifiableCredentialBBS,
  logger,
  SignatureType,
} from '@trustcerts/core';
import { BbsVerifiableCredentialIssuerService } from '@trustcerts/vc-create';
import { BbsVerifiableCredentialVerifierService } from '../src/bbs';

import { createList, createCredential } from '@transmute/vc-status-rl-2020';
import { RevocationService } from '@trustcerts/vc-revocation';
import { purposes, verify } from 'jsonld-signatures';

import { WalletService } from '@trustcerts/wallet';
import { LocalConfigService } from '@trustcerts/config-local';

import { readFileSync } from 'fs';

//import { JWT } from '../src/jwt-service';
// import {
//   JWTPayloadVC,
//   JWTPayloadVP,
// } from '../src/vc/vc-jwt/credential.interface';
// import { VerifiableCredentialIssuerService } from '../src/vc/vc-jwt/verifiable-credential-issuer-service';
// import { VerifiableCredentialVerifierService } from '../src/vc/vc-jwt/verifiable-credential-verifier-service';

/**
 * Test vc class.
 */
describe('vc', () => {
  let config: ConfigService;

  let bbsAssertionKey: DecryptedKeyPair;
  let bbsAuthenticationKey: DecryptedKeyPair;

  let cryptoServiceRSA: CryptoService;

  let walletService: WalletService;

  //jest.setTimeout(20000000);
  beforeAll(async () => {
    // TODO: Zeile löschen
    //jest.setTimeout(20000000);

    const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);

    walletService = new WalletService(config);
    await walletService.init();

    cryptoServiceRSA = new CryptoService();

    /*
        const generateOptions: GenerateKeyPairOptions = {
        //id: '',
        // controller: 'did:trust:test'
        };

        const bbsKeyPair = await Bls12381G2KeyPair.generate(generateOptions);
        */

    bbsAssertionKey = (
      await walletService.findOrCreate(
        VerificationRelationshipType.assertionMethod,
        SignatureType.Bbs
      )
    )[0];
    bbsAuthenticationKey = (
      await walletService.findOrCreate(
        VerificationRelationshipType.authentication,
        SignatureType.Bbs
      )
    )[0];

    // await cryptoServiceBBS.init(bbsKey);

    const rsaKey = (
      await walletService.findOrCreate(
        VerificationRelationshipType.assertionMethod,
        SignatureType.Rsa
      )
    )[0];
    if (rsaKey !== undefined) {
      await cryptoServiceRSA.init(rsaKey);
    }
  }, 10000);

  // async function createVc() {
  //   const vcIssuerService = new VerifiableCredentialIssuerService();

  //   return await vcIssuerService.createVerifiableCredential(
  //     {
  //       '@context': [],
  //       type: ['TestCredential'],
  //       credentialSubject: { id: 'did:max:mustermann' },
  //       id: 'unique_id',
  //       issuer: config.config.invite!.id,
  //       // nonce: 'randomVC',
  //     },
  //     cryptoServiceRSA
  //   );
  // }

  // BBS+
  async function createVcBbs(): Promise<VerifiableCredentialBBS> {
    const bbsVcIssuerService = new BbsVerifiableCredentialIssuerService();

    return await bbsVcIssuerService.createBBSVerifiableCredential(
      {
        '@context': ['https://w3id.org/citizenship/v1'],
        type: ['PermanentResidentCard'],
        credentialSubject: {
          type: ['PermanentResident', 'Person'],
          id: 'did:max:mustermann',
          givenName: 'Max',
          familyName: 'Mustermann',
        },
        id: 'unique_id',
        issuer: config.config.invite!.id,
        nonce: 'randomVC',
      },
      bbsAssertionKey
    );
  }

  async function createVpBbs() {
    const vcIssuerService = new BbsVerifiableCredentialIssuerService();
    const vc1 = await createVcBbs();
    const vc2 = await createVcBbs();
    return await vcIssuerService.createPresentation(
      {
        '@context': [],
        type: [],
        verifiableCredential: [vc1, vc2],
        domain: 'domain',
        challenge: 'challenge',
        holder: 'did:max:mustermann',
      },
      bbsAuthenticationKey
    );
  }

  // async function createVp() {
  //   const vcIssuerService = new VerifiableCredentialIssuerService();
  //   const vc1 = await createVc();
  //   const vc2 = await createVc();
  //   return await vcIssuerService.createPresentation(
  //     {
  //       '@context': [],
  //       type: ['TestPresentation'],
  //       verifiableCredentials: [vc1, vc2],
  //       domain: 'domain',
  //       challenge: 'challenge',
  //       holder: 'did:max:mustermann',
  //       nonce: 'randomVP',
  //     },
  //     cryptoServiceRSA
  //   );
  // }

  it('revocation', async () => {
    // Klasse fürs RevocationList-Handling (gib mir eine Liste mit Index, setze revoked / nicht revoked, ...)
    // Müssen Methode machen fürs Erstellen eines revocationList-Credentials
    // welche id soll eine RevocationList haben? => did:trust:[...]
    // Welchen Index innerhalb einer Liste soll ein Credential haben?
    // -> wir brauchen einen API-Call, um einen Credential-Index für ein neues Credential zu bekommen
    // Müssen beim Erstellen eines VC auch den Credential-Status setzen in der revocationList
    // Müssen beim Verifien eine RevocationList über den docLoader resolven
    // -> können wir erstmal mocken und ein vorher erstelltes hardcoded revocationList-Credential resolven lassen

    // Todo Montag:
    // rausfinden id für credentialStatus und in issuerService anpassen
    // Tests anpassen
    // für JWT analog umsetzen

    const vcIssuerService = new BbsVerifiableCredentialIssuerService();
    const id = 'https://example.com/status/2';
    const length = 100000;
    const issuer = config.config.invite!.id;
    // const listCredential =
    await vcIssuerService.createRevocationListCredential(
      id,
      length,
      issuer,
      bbsAssertionKey
    );

    const list = await createList({ length: length });
    list.setRevoked(1234, true);
    const rlCredential = await createCredential({
      id: 'did:trust:tc:dev:REVOCATION_LIST_WITH_1234_REVOKED',
      list,
    });

    const bbsVcIssuerService = new BbsVerifiableCredentialIssuerService();

    const vc = await bbsVcIssuerService.createBBSVerifiableCredential(
      {
        ...rlCredential,
        issuer: issuer,
      },
      bbsAssertionKey,
      false
    );

    logger.debug(vc);
  });

  // it('create vc', async () => {
  //   const vc = await createVc();
  //   logger.debug(vc);
  // }, 15000);

  // BBS+
  it('create BBS vc', async () => {
    const vc = await createVcBbs();
    logger.debug(vc);
  }, 15000);

  it('BBS selective disclosure', async () => {
    const docLoader = new DocumentLoader().getLoader();
    const signedDocument = await createVcBbs();

    const revealDocument = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/citizenship/v1',
        'https://w3id.org/security/bbs/v1',
      ],
      type: ['VerifiableCredential', 'PermanentResidentCard'],
      credentialSubject: {
        '@explicit': true,
        type: ['PermanentResident', 'Person'],
        givenName: {},
      },
    };

    // Derive a proof
    const derivedProof = await deriveProof(signedDocument, revealDocument, {
      suite: new BbsBlsSignatureProof2020(),
      documentLoader: docLoader,
    });

    logger.debug(JSON.stringify(derivedProof, null, 2));

    // TODO: verify

    //Verify the derived proof
    const verified = await verify(derivedProof, {
      suite: new BbsBlsSignatureProof2020(),
      purpose: new purposes.AssertionProofPurpose(),
      documentLoader: docLoader,
    });

    logger.debug('Verification result');
    logger.debug(JSON.stringify(verified, null, 2));
  }, 15000);
  it('verify BBS vc', async () => {
    const vc = await createVcBbs();
    const vcVerifierService = new BbsVerifiableCredentialVerifierService();
    expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
  }, 15000);

  // it('verify vc', async () => {
  //   const vc = await createVc();
  //   const vcVerifierService = new VerifiableCredentialVerifierService();
  //   expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
  // }, 15000);

  it('create BBS vp', async () => {
    const vp = await createVpBbs();
    logger.debug(JSON.stringify(vp, null, 4));
  }, 15000);

  // it('create vp', async () => {
  //   const vp = await createVp();
  //   const vpJWT = new JWT(vp);
  //   const vpJWTPayload = vpJWT.getPayload() as JWTPayloadVP;
  //   const vp_ = vpJWTPayload.vp;
  //   logger.debug(JSON.stringify(vp, null, 4));
  //   logger.debug(vpJWT);
  // }, 15000);

  // it('verify vp', async () => {
  //   const vp = await createVp();
  //   logger.debug(vp);
  //   const vcVerifierService = new VerifiableCredentialVerifierService();
  //   expect(await vcVerifierService.verifyPresentation(vp)).toBe(true);
  // }, 15000);
  it('verify BBS vp', async () => {
    const vp = await createVpBbs();
    logger.debug(vp);
    const vcVerifierService = new BbsVerifiableCredentialVerifierService();
    expect(await vcVerifierService.verifyPresentation(vp)).toBe(true);
  }, 15000);

  // it('verify revocation JWT', async () => {
  //   const vc = await createVc();
  //   const vcJWT = new JWT(vc);
  //   const vcJWTPayload = vcJWT.getPayload() as JWTPayloadVC;
  //   const vcVerifierService = new VerifiableCredentialVerifierService();
  //   const revocationService = new RevocationService();
  //   await revocationService.init();

  //   // Expect credential to be valid
  //   expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
  //   // Expect credential to be not revoked
  //   expect(
  //     await revocationService.isRevoked(vcJWTPayload.vc.credentialStatus!)
  //   ).toBe(false);

  //   // Revoke credential
  //   revocationService.setRevoked(vcJWTPayload.vc.credentialStatus!, true);

  //   // Expect credential to be invalid
  //   expect(await vcVerifierService.verifyCredential(vc)).toBe(false);
  //   // Expect credential to be revoked
  //   expect(
  //     await revocationService.isRevoked(vcJWTPayload.vc.credentialStatus!)
  //   ).toBe(true);

  //   // Un-revoke credential
  //   revocationService.setRevoked(vcJWTPayload.vc.credentialStatus!, false);

  //   // Expect credential to be valid again
  //   expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
  //   // Expect credential to be not revoked again
  //   expect(
  //     await revocationService.isRevoked(vcJWTPayload.vc.credentialStatus!)
  //   ).toBe(false);
  // }, 15000);

  it('verify revocation BBS+', async () => {
    const vc = await createVcBbs();
    const vcVerifierService = new BbsVerifiableCredentialVerifierService();
    const revocationService = new RevocationService();
    await revocationService.init();

    // Expect credential to be valid
    expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
    // Expect credential to be not revoked
    expect(await revocationService.isRevoked(vc.credentialStatus!)).toBe(false);

    // Revoke credential
    revocationService.setRevoked(vc.credentialStatus!, true);

    // Expect credential to be invalid
    expect(await vcVerifierService.verifyCredential(vc)).toBe(false);
    // Expect credential to be revoked
    expect(await revocationService.isRevoked(vc.credentialStatus!)).toBe(true);

    // Un-revoke credential
    revocationService.setRevoked(vc.credentialStatus!, false);

    // Expect credential to be valid again
    expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
    // Expect credential to be not revoked again
    expect(await revocationService.isRevoked(vc.credentialStatus!)).toBe(false);
  }, 15000);

  // Beispiel, um Zugriff auf Properties der VC/VP zu demonstrieren
  // it('access example', async () => {
  //   const vpJWTString =
  //     'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRpZDp0cnVzdDp0YzpkZXY6aWQ6WEx6Qko2OXRxRWdxN29xcWRFc0hXI0Q4RVIxWEdIa3NLeUY4em5DQkFMZHZaZkRqRFBUMUVtR1dvdmNMdWFBUkZuIn0.eyJ2cCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImNvbnRleHQiXSwidHlwZSI6WyJUZXN0UHJlc2VudGF0aW9uIl0sInZlcmlmaWFibGVDcmVkZW50aWFscyI6WyJleUpoYkdjaU9pSlNVekkxTmlJc0ltdHBaQ0k2SW1ScFpEcDBjblZ6ZERwMFl6cGtaWFk2YVdRNldFeDZRa28yT1hSeFJXZHhOMjl4Y1dSRmMwaFhJMFE0UlZJeFdFZElhM05MZVVZNGVtNURRa0ZNWkhaYVprUnFSRkJVTVVWdFIxZHZkbU5NZFdGQlVrWnVJbjAuZXlKMll5STZleUpBWTI5dWRHVjRkQ0k2V3lKb2RIUndjem92TDNkM2R5NTNNeTV2Y21jdk1qQXhPQzlqY21Wa1pXNTBhV0ZzY3k5Mk1TSXNJbU52Ym5SbGVIUWlYU3dpZEhsd1pTSTZXeUpVWlhOMFEzSmxaR1Z1ZEdsaGJDSmRMQ0pqY21Wa1pXNTBhV0ZzVTNWaWFtVmpkQ0k2ZXlKcFpDSTZJbVJwWkRwdFlYZzZiWFZ6ZEdWeWJXRnViaUo5ZlN3aWJtOXVZMlVpT2lKeVlXNWtiMjBpTENKcFlYUWlPakUyTWpVMU56UTFPRElzSW1semN5STZJbVJwWkRwMGNuVnpkRHAwWXpwa1pYWTZhV1E2V0V4NlFrbzJPWFJ4UldkeE4yOXhjV1JGYzBoWElpd2ljM1ZpSWpvaVpHbGtPbTFoZURwdGRYTjBaWEp0WVc1dUlpd2lhblJwSWpvaWRXNXBjWFZsWDJsa0luMC5OX3RCYWFiNHRrQ0h2MjFaZUIyY21YTEkxUWJPLWhFakhFdk1hc0d6TGdQWlRDb0d4Wm5HbWFkMXJlLXh0OUJVb1BCOU5jMExFWWRud1dBOHF3akFySFc5ODEzV1dGRkVla2JsRXJWcUxYcGI4eWNMLXVjUXJ6eUlRM003WVRYbFFJZGMwWjhvTlJEMl9zVkR3N05qOXNxUHJ1TVQ2SDRFN0hOejZNS1dTYW5FaW8xZUVsTjlBTE44UWd0TkZJVHdmTHFIdkFqMEF2V2EwekNFU2tuamJYdDB6cHptRjItRjJERFhaMWtleEcxS2h5amRXN1Btcmp5eUVIR3V6elNKZU5NaEVORnNrWWJHWDFyWVpmTVJic29JalJsa2dlbV81UEF6N0tJX1hldnBQc1pWVk14ajY1NVhIandKZlVIczB1UFRmdElHbUJPMFFuRUNyVUdDOVEiLCJleUpoYkdjaU9pSlNVekkxTmlJc0ltdHBaQ0k2SW1ScFpEcDBjblZ6ZERwMFl6cGtaWFk2YVdRNldFeDZRa28yT1hSeFJXZHhOMjl4Y1dSRmMwaFhJMFE0UlZJeFdFZElhM05MZVVZNGVtNURRa0ZNWkhaYVprUnFSRkJVTVVWdFIxZHZkbU5NZFdGQlVrWnVJbjAuZXlKMll5STZleUpBWTI5dWRHVjRkQ0k2V3lKb2RIUndjem92TDNkM2R5NTNNeTV2Y21jdk1qQXhPQzlqY21Wa1pXNTBhV0ZzY3k5Mk1TSXNJbU52Ym5SbGVIUWlYU3dpZEhsd1pTSTZXeUpVWlhOMFEzSmxaR1Z1ZEdsaGJDSmRMQ0pqY21Wa1pXNTBhV0ZzVTNWaWFtVmpkQ0k2ZXlKcFpDSTZJbVJwWkRwdFlYZzZiWFZ6ZEdWeWJXRnViaUo5ZlN3aWJtOXVZMlVpT2lKeVlXNWtiMjBpTENKcFlYUWlPakUyTWpVMU56UTFPRElzSW1semN5STZJbVJwWkRwMGNuVnpkRHAwWXpwa1pYWTZhV1E2V0V4NlFrbzJPWFJ4UldkeE4yOXhjV1JGYzBoWElpd2ljM1ZpSWpvaVpHbGtPbTFoZURwdGRYTjBaWEp0WVc1dUlpd2lhblJwSWpvaWRXNXBjWFZsWDJsa0luMC5OX3RCYWFiNHRrQ0h2MjFaZUIyY21YTEkxUWJPLWhFakhFdk1hc0d6TGdQWlRDb0d4Wm5HbWFkMXJlLXh0OUJVb1BCOU5jMExFWWRud1dBOHF3akFySFc5ODEzV1dGRkVla2JsRXJWcUxYcGI4eWNMLXVjUXJ6eUlRM003WVRYbFFJZGMwWjhvTlJEMl9zVkR3N05qOXNxUHJ1TVQ2SDRFN0hOejZNS1dTYW5FaW8xZUVsTjlBTE44UWd0TkZJVHdmTHFIdkFqMEF2V2EwekNFU2tuamJYdDB6cHptRjItRjJERFhaMWtleEcxS2h5amRXN1Btcmp5eUVIR3V6elNKZU5NaEVORnNrWWJHWDFyWVpmTVJic29JalJsa2dlbV81UEF6N0tJX1hldnBQc1pWVk14ajY1NVhIandKZlVIczB1UFRmdElHbUJPMFFuRUNyVUdDOVEiXX0sIm5vbmNlIjoicmFuZG9tIiwianRpIjoiY2hhbGxlbmdlIiwiYXVkIjoiZG9tYWluIiwibmJmIjoxNjI1NTc0NTgyLCJpYXQiOjE2MjU1NzQ1ODIsImlzcyI6ImRpZDptYXg6bXVzdGVybWFubiJ9.BSykKbXj-_AmwJW4WqaNmh_EkuF95Lrud1_r2DhT7PVNUHDXjMtTDEluLoclDTrhtnFee8dUdTeVjqVOQo8WckFtQA-SHo6sNxKrSMhM_Gb_6pR4b5fghtY2I9I4HcndN8mOzdLG0RO6vziYkb0VEKtatxkkQYX1EXgwpInTKZqLTHXC07gMsKtLy8OfklVpI45hzHPna50g1ZOC6NnF6_I95g1Y3azsRYZRPmZhOFFHxJi-J3mgU4X42S2F6yVRXiuEIFmCj4m5eZq3LGGg9HF3K8jpCPSOup6VXsPKf4W5Tq5Aym-I4SW_dygsAYC-Eii_IX_D7jgk7otYfxoJ2A';

  //   const vpJWT = new JWT(vpJWTString);
  //   const vpJWTPayload = vpJWT.getPayload() as JWTPayloadVP;
  //   const vp = vpJWTPayload.vp;

  //   logger.debug(vp);

  //   // Zugriff auf erstes Credential innerhalb der VP
  //   const vcJWT = new JWT(vp.verifiableCredentials[0]);
  //   const vcJWTPayload = vcJWT.getPayload() as JWTPayloadVC;
  //   const vc = vcJWTPayload.vc;

  //   logger.debug(vc);
  // }, 15000);
});
