import {
  VerificationRelationshipType,
  ConfigService,
  CryptoService,
  DidNetworks,
  Identifier,
  JWTPayloadVC,
  SignatureType,
} from '@trustcerts/core';

import { RevocationService } from '../src';

import { WalletService } from '@trustcerts/wallet';
import { LocalConfigService } from '@trustcerts/config-local';

import { readFileSync } from 'fs';

import {
  JWT,
  JWTVerifiableCredentialVerifierService,
} from '@trustcerts/vc-verify';
import { VerifiableCredentialIssuerService } from '@trustcerts/vc-create';

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

  it('verify revocation JWT', async () => {
    const vc = await createVc();
    const vcJWT = new JWT(vc);
    const vcJWTPayload = vcJWT.getPayload() as JWTPayloadVC;
    const vcVerifierService = new JWTVerifiableCredentialVerifierService();
    const revocationService = new RevocationService();
    await revocationService.init();

    // Expect credential to be valid
    expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
    // Expect credential to be not revoked
    expect(
      await revocationService.isRevoked(vcJWTPayload.vc.credentialStatus!)
    ).toBe(false);

    // Revoke credential
    await revocationService.setRevoked(vcJWTPayload.vc.credentialStatus!, true);

    // Expect credential to be invalid
    expect(await vcVerifierService.verifyCredential(vc)).toBe(false);
    // Expect credential to be revoked
    expect(
      await revocationService.isRevoked(vcJWTPayload.vc.credentialStatus!)
    ).toBe(true);

    // Un-revoke credential
    revocationService.setRevoked(vcJWTPayload.vc.credentialStatus!, false);

    // Expect credential to be valid again
    expect(await vcVerifierService.verifyCredential(vc)).toBe(true);
    // Expect credential to be not revoked again
    expect(
      await revocationService.isRevoked(vcJWTPayload.vc.credentialStatus!)
    ).toBe(false);
  }, 15000);
});
