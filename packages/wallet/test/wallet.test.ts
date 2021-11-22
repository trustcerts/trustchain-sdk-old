import {
  generateKeyPair,
  VerificationRelationshipType,
  ConfigService,
  DidNetworks,
  Identifier,
  Platform,
} from '@trustcerts/core';
import { WalletService } from '../src';
import { LocalConfigService } from '@trustcerts/config-local';

import { readFileSync } from 'fs';

/**
 * Test vc class.
 */
describe('wallet', () => {
  let config: ConfigService;

  const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

  beforeAll(async () => {
    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);
  });

  it('add key', async () => {
    const walletService = new WalletService(config);
    await walletService.init();

    // Add a key for each SignatureType
    for (const signatureType of Object.values(Platform.SignatureType)) {
      // Add a key for each verification relationship
      const key = await walletService.addKey(
        Object.values(VerificationRelationshipType),
        signatureType
      );

      // Check if the key is found by its identifier
      expect(walletService.findKeyByID(key.identifier)).toBe(key);

      // Check if the key is found by vrType and signatureType
      Object.values(VerificationRelationshipType).forEach(vrType => {
        expect(walletService.find(vrType, signatureType)).toContain(key);
      });

      // Remove the key
      walletService.removeKeyByID(key.identifier);

      // Verify that the key is removed
      expect(walletService.findKeyByID(key.identifier)).toBeUndefined();
    }
  }, 15000);

  it('tidy up', async () => {
    const walletService = new WalletService(config);
    await walletService.init();

    // Push new key to local configService of wallet, but don't add it to the DID document
    const invalidKey = await generateKeyPair(
      walletService.did.id,
      Platform.SignatureType.Bbs
    );
    walletService.configService.config.keyPairs.push(invalidKey);

    expect(walletService.findKeyByID(invalidKey.identifier)).toBe(invalidKey);

    // Remove keys from local configSerive of wallet that don't exist in the DID document
    await walletService.tidyUp();

    expect(walletService.findKeyByID(invalidKey.identifier)).toBeUndefined();
  }, 15000);
});
