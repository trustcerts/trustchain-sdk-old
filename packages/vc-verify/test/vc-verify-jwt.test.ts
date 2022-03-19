import {
  VerificationRelationshipType,
  ConfigService,
  CryptoService,
  DidNetworks,
  Identifier,
  logger,
  SignatureType,
} from '@trustcerts/core';

import { WalletService } from '@trustcerts/wallet';
import { LocalConfigService } from '@trustcerts/config-local';

import { readFileSync } from 'fs';

import { VerifiableCredentialIssuerService } from '@trustcerts/vc-create';
import { JWTVerifiableCredentialVerifierService } from '../src/jwt';

/**
 * Test vc class.
 */
describe('vc', () => {
  let config: ConfigService;

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
   * Creates an example JWT-encoded verifiable credential for testing
   * @returns A JWT-encoded verifiable credential with example data
   */
  async function createVc(): Promise<string> {
    const vcIssuerService = new VerifiableCredentialIssuerService();

    return await vcIssuerService.createVerifiableCredential(
      {
        '@context': [],
        type: ['TestCredential'],
        credentialSubject: { id: 'did:max:mustermann' },
        id: 'unique_id',
        issuer: config.config.invite!.id,
        // nonce: 'randomVC',
      },
      cryptoServiceRSA
    );
  }

  /**
   * Creates an example JWT-encoded verifiable presentation for testing
   * @returns A JWT-encoded verifiable presentation with example data
   */
  async function createVp(): Promise<string> {
    const vcIssuerService = new VerifiableCredentialIssuerService();
    const vc1 = await createVc();
    const vc2 = await createVc();
    return await vcIssuerService.createVerifiablePresentation(
      {
        '@context': [],
        type: ['TestPresentation'],
        verifiableCredentials: [vc1, vc2],
        domain: 'domain',
        challenge: 'challenge',
        holder: 'did:max:mustermann',
        nonce: 'randomVP',
      },
      cryptoServiceRSA
    );
  }

  it('verify vc', async () => {
    const vc = await createVc();
    const vcVerifierService = new JWTVerifiableCredentialVerifierService();
    expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
  }, 15000);

  it('verify vp', async () => {
    const vp = await createVp();
    logger.debug(vp);
    const vcVerifierService = new JWTVerifiableCredentialVerifierService();
    expect(await vcVerifierService.verifyPresentation(vp)).toBe(true);
  }, 15000);

  // //Beispiel, um Zugriff auf Properties der VC/VP zu demonstrieren
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
