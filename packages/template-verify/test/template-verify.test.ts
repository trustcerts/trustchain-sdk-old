import {
  ConfigService,
  CryptoService,
  DidNetworks,
  Identifier,
  VerificationRelationshipType,
  SignatureType,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import {
  DidTemplateRegister,
  TemplateIssuerService,
} from '@trustcerts/template-create';
import { DidTemplateResolver } from '../src/did-template-resolver';
import { JSONSchemaType } from 'ajv';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';
import { CompressionType } from '@trustcerts/gateway';
import {
  DidSchemaRegister,
  SchemaIssuerService,
} from '@trustcerts/schema-create';

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
    DidNetworks.add(testValues.network.namespace, testValues.network);
    Identifier.setNetwork(testValues.network.namespace);
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
    const clientSchema = new SchemaIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const schemaDid = DidSchemaRegister.create({
      controllers: [config.config.invite!.id],
    });
    schemaDid.schema = '{foo: bar}';
    await DidSchemaRegister.save(schemaDid, clientSchema);
    const client = new TemplateIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const templateDid = DidTemplateRegister.create({
      controllers: [config.config.invite!.id],
    });
    templateDid.schemaId = schemaDid.id;
    templateDid.template = template;
    templateDid.compression = {
      type: CompressionType.JSON,
    };
    await DidTemplateRegister.save(templateDid, client);
    const loadedTemplate = await new DidTemplateResolver().load(templateDid.id);

    expect(loadedTemplate.template).toEqual(template);
  });
});
