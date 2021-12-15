import {
  DecryptedKeyPair,
  VerificationRelationshipType,
  ConfigService,
  DidNetworks,
  Identifier,
  VerifiableCredentialBBS,
  SignatureType,
} from '@trustcerts/core';
import { BbsVerifiableCredentialIssuerService } from '@trustcerts/vc-create';
import { BbsVerifiableCredentialVerifierService } from '@trustcerts/vc-verify';

import { RevocationService } from '../src';

import { WalletService } from '@trustcerts/wallet';
import { LocalConfigService } from '@trustcerts/config-local';

import { readFileSync } from 'fs';

/**
 * Test vc class.
 */
describe('vc', () => {
  let config: ConfigService;

  let bbsAssertionKey: DecryptedKeyPair;

  let walletService: WalletService;

  beforeAll(async () => {

    const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);

    walletService = new WalletService(config);
    await walletService.init();

    bbsAssertionKey = (
      await walletService.findOrCreate(
        VerificationRelationshipType.assertionMethod,
        SignatureType.Bbs
      )
    )[0];
  }, 10000);

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
});
