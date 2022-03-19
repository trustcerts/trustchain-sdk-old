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

import { purposes, verify } from 'jsonld-signatures';

import { WalletService } from '@trustcerts/wallet';
import { LocalConfigService } from '@trustcerts/config-local';

import { readFileSync } from 'fs';

/**
 * Test vc class.
 */
describe('vc', () => {
  let config: ConfigService;

  let bbsAssertionKey: DecryptedKeyPair;
  let bbsAuthenticationKey: DecryptedKeyPair;

  let cryptoServiceRSA: CryptoService;

  let walletService: WalletService;

  beforeAll(async () => {
    const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

    DidNetworks.add(testValues.network.namespace, testValues.network);
    Identifier.setNetwork(testValues.network.namespace);
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);

    walletService = new WalletService(config);
    await walletService.init();

    cryptoServiceRSA = new CryptoService();

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

  /**
   * Creates an example BBS+ signed verifiable credential for testing
   * @returns A BBS+ signed verifiable credential with example data
   */
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

  /**
   * Creates an example BBS+ signed verifiable presentation for testing
   * @returns A BBS+ signed verifiable presentation with example data
   */
  async function createVpBbs() {
    const vcIssuerService = new BbsVerifiableCredentialIssuerService();
    const vc1 = await createVcBbs();
    const vc2 = await createVcBbs();
    return await vcIssuerService.createVerifiablePresentation(
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

    //Verify the derived proof
    const verified = await verify(derivedProof, {
      suite: new BbsBlsSignatureProof2020(),
      purpose: new purposes.AssertionProofPurpose(),
      documentLoader: docLoader,
    });

    logger.debug('Verification result');
    logger.debug(JSON.stringify(verified, null, 2));

    expect(verified).toEqual(
      expect.objectContaining({
        verified: true,
      })
    );
  }, 15000);
  it('verify BBS vc', async () => {
    const vc = await createVcBbs();
    const vcVerifierService = new BbsVerifiableCredentialVerifierService();
    expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
  }, 15000);

  it('verify BBS vp', async () => {
    const vp = await createVpBbs();
    logger.debug(vp);
    const vcVerifierService = new BbsVerifiableCredentialVerifierService();
    expect(await vcVerifierService.verifyPresentation(vp)).toBe(true);
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
