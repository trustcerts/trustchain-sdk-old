import { readFileSync } from 'fs';
import {
  ConfigService,
  CryptoService,
  VerificationRelationshipType,
  DidNetworks,
  Identifier,
  SignatureType,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { WalletService } from '@trustcerts/wallet';
// import { SchemaIssuerService, DidSchemaRegister } from '../src';

describe('test signature service', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

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

  it('create schema', async () => {
    // const client = new SchemaIssuerService(
    //   testValues.network.gateways,
    //   cryptoService
    // );
    // const did = DidSchemaRegister.create();
    // did.setSchema('{}');
    // const res = await DidSchemaRegister.save(did, client);
  }, 7000);
});
