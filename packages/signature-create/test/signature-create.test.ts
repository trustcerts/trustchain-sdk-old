import { existsSync, rmSync, readFileSync } from 'fs';
import {
  ConfigService,
  CryptoService,
  getRandomValues,
  VerificationRelationshipType,
  DidNetworks,
  Identifier,
  logger,
  write,
  SignatureType,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { WalletService } from '@trustcerts/wallet';
import { SignatureIssuerService } from '../src';

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
        SignatureType.Rsa
      )
    )[0];
    await cryptoService.init(key);
  }, 10000);

  it('sign string', async () => {
    const client = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const value = getRandomValues(new Uint8Array(200)).toString();
    const transaction = await client
      .signString(value)
      .catch(err => logger.error(err));
    expect(transaction).toBeDefined();
  }, 7000);

  it('sign string double', async () => {
    const client = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const value = getRandomValues(new Uint8Array(200)).toString();
    const transaction = await client
      .signString(value)
      .catch(err => logger.error(err));
    expect(transaction).toBeDefined();
    await client
      .signString(value)
      .catch(err =>
        expect(err.message.includes('hash already signed')).toBeTruthy()
      );
  }, 7000);

  it('sign file', async () => {
    const client = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    write(testFile, getRandomValues(new Uint8Array(200)).toString());
    const transaction = await client
      .signFile(testFile)
      .catch(err => logger.error(err));
    expect(transaction).toBeDefined();
  });

  afterAll(() => {
    if (existsSync(testFile)) {
      rmSync(testFile);
    }
  });
});
