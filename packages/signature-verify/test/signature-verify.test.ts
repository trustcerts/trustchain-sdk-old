import { existsSync, rmSync, readFileSync } from 'fs';
import {
  ConfigService,
  CryptoService,
  getRandomValues,
  VerificationRelationshipType,
  DidNetworks,
  base58Encode,
  Identifier,
  Platform,
  logger,
  write,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { WalletService } from '@trustcerts/wallet';
import { SignatureIssuerService } from '@trustcerts/signature-create';
import { SignatureVerifierService } from '../src';

describe('test signature service', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

  let testFile = 'tmp/test';

  const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

  beforeAll(async () => {
    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);

    const wallet = new WalletService(config);
    await wallet.init();

    cryptoService = new CryptoService();

    let key = (
      await wallet.findOrCreate(
        VerificationRelationshipType.assertionMethod,
        Platform.SignatureType.Rsa
      )
    )[0];
    await cryptoService.init(key);
  });

  it('verify file', async () => {
    const issuer = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const verifier = new SignatureVerifierService(testValues.network.observers);
    write(testFile, getRandomValues(new Uint8Array(200)).toString());
    await issuer.signFile(testFile).catch(err => logger.error(err));
    // wait some time since the observer has to be synced.
    await setTimeout(() => Promise.resolve(), 2000);
    const transaction1 = await verifier.verifyFile(testFile);
    expect(transaction1).toBeDefined();
  }, 5000);

  it('verify string', async () => {
    const client = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const signature = base58Encode(getRandomValues(new Uint8Array(20)));
    await client.signString(signature).catch(err => logger.error(err));
    // wait some time since the observer has to be synced.
    await setTimeout(() => Promise.resolve(), 2000);
    const verifier = new SignatureVerifierService(testValues.network.observers);
    const transaction = await verifier.verifyString(signature);
    expect(transaction).toBeDefined();
  });

  it('revoke string', async () => {
    const issuerService = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const verifierService = new SignatureVerifierService(
      testValues.network.observers
    );
    const value = base58Encode(
      new Uint8Array(getRandomValues(new Uint8Array(20)))
    );
    await issuerService.signString(value);
    let transaction = await verifierService.verifyString(value);
    expect(transaction.revokedAt).toBeUndefined();

    await issuerService.revokeString(value);
    await setTimeout(() => Promise.resolve(), 2000);
    transaction = await verifierService.verifyString(value);
    expect(transaction.revokedAt).toBeDefined();
    expect(transaction.revokedAt! > transaction.createdAt).toBeTruthy();
  }, 10000);

  afterAll(() => {
    if (existsSync(testFile)) {
      rmSync(testFile);
    }
  });
});
