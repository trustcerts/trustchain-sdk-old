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

import { VerifiableCredentialIssuerService } from '../src';
/**
 * Test vc class.
 */
describe('vc', () => {
  let config: ConfigService;

  let cryptoServiceRSA: CryptoService;

  let walletService: WalletService;

  beforeAll(async () => {

    const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
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

  async function createVp(): Promise<string> {
    const vcIssuerService = new VerifiableCredentialIssuerService();
    const vc1 = await createVc();
    const vc2 = await createVc();
    return await vcIssuerService.createPresentation(
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

  it('create vc', async () => {
    const vc = await createVc();
    logger.debug(vc);
  }, 15000);

  it('create vp', async () => {
    const vp = await createVp();
    logger.debug(JSON.stringify(vp, null, 4));
    //TODO expect(vp).to...;
  }, 15000);
});
