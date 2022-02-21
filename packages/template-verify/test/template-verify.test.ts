import {
  ConfigService,
  CryptoService,
  DidNetworks,
  Identifier,
  VerificationRelationshipType,
  SignatureType,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { TemplateIssuerService } from '@trustcerts/template-create';
import { TemplateVerifierService } from '../src/template-verifier-service';
import { JSONSchemaType } from 'ajv';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';
import { TemplateStructure, CompressionType } from '@trustcerts/gateway';
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

  it('verify', async () => {
    const client = new TemplateIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const value: TemplateStructure = {
      compression: {
        type: CompressionType.Json,
      },
      template,
      schema: JSON.stringify(schema),
      id: Identifier.generate('tmp'),
    };
    const transaction = await client.create(value);
    const verifier = new TemplateVerifierService(testValues.network.observers);
    await new Promise(res => setTimeout(res, 2000));
    const transaction2 = await verifier.get(
      transaction.transaction.body.value.id
    );
    expect(transaction2.template).toEqual(value.template);
    expect(transaction2.compression).toEqual(value.compression);
    expect(transaction2.schema).toEqual(value.schema);
  });
});
