import {
  Gateway,
  ConfigService,
  CryptoService,
  DidNetworks,
  Identifier,
  VerificationRelationshipType,
  SignatureType,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { TemplateIssuerService } from '../src';
import { JSONSchemaType } from 'ajv';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';
describe('test template service', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

  //@ts-ignore
  const schema: JSONSchemaType<any> = {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
    required: ['name'],
    additionalProperties: false,
  };

  const template = '<h1>Hello {{ name }}</h1>';

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

  it('create', async () => {
    const client = new TemplateIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const value: Gateway.TemplateStructure = {
      compression: {
        type: Gateway.CompressionTypeEnum.Json,
      },
      template,
      schema: JSON.stringify(schema),
      id: Identifier.generate('tmp'),
    };
    const transaction = await client.create(value);
    expect(transaction.transaction.body.value.template).toEqual(value.template);
  });
});
