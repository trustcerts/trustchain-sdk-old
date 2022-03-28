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
import { SchemaIssuerService, DidSchemaRegister } from '../src';

describe('test schema issuer service', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

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

  it('set wrong schema', () => {
    const did = DidSchemaRegister.create();
    did.setSchema({
      // TODO check what happens when schema is added
      // $schema: 'http://json-schema.org/draft-06/schema#',
      $ref: '#/definitions/Welhellocome',
      definitions: {
        Welcome: {
          type: 'object',
          additionalProperties: false,
          properties: {
            greeting: {
              type: 'string',
            },
            instructions: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['greeting', 'instructions'],
          title: 'Welcome',
        },
      },
    });
  });

  it('create schema', async () => {
    const client = new SchemaIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const did = DidSchemaRegister.create({
      controllers: [config.config.invite!.id],
    });
    did.setSchema({ foo: 'bar' });
    const res = await DidSchemaRegister.save(did, client);
    expect(res).toBeDefined();
  }, 7000);
});
