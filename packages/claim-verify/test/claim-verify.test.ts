import {
  CryptoService,
  VerificationRelationshipType,
  ConfigService,
  DidNetworks,
  Identifier,
  SignatureType,
} from '@trustcerts/core';
import { randomBytes } from 'crypto';
import { LocalConfigService } from '@trustcerts/config-local';
import { SignatureIssuerService } from '@trustcerts/signature-create';
import {
  DidTemplateRegister,
  TemplateIssuerService,
} from '@trustcerts/template-create';
import { ClaimIssuerService } from '@trustcerts/claim-create';
import { ClaimVerifierService, ClaimValues } from '../src';
import { Claim } from '../dist';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';
import { CompressionType } from '@trustcerts/gateway';
import {
  DidSchemaRegister,
  SchemaIssuerService,
} from '@trustcerts/schema-create';
import { promisify } from 'util';

/**
 * Test claim class.
 */
describe('claim', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

  // TODO required to fix error
  // @ts-ignore
  const schema: JSONSchemaType<any> = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      random: { type: 'string' },
    },
    required: ['name', 'random'],
    additionalProperties: false,
  };

  const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

  beforeAll(async () => {
    DidNetworks.add(testValues.network.namespace, testValues.network);
    Identifier.setNetwork(testValues.network.namespace);
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);

    const wallet = new WalletService(config);
    await wallet.init();

    cryptoService = new CryptoService();
    // TODO put this in an extra function
    // get a key for assertion and a specific type
    let key = (
      await wallet.findOrCreate(
        VerificationRelationshipType.assertionMethod,
        SignatureType.Rsa
      )
    )[0];
    // init crypto service for assertion
    await cryptoService.init(key);
  }, 10000);

  async function createClaim(val: ClaimValues): Promise<Claim> {
    const template = '<h1>hello</h1>';
    const host = 'localhost';

    const clientSchema = new SchemaIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const schemaDid = DidSchemaRegister.create({
      controllers: [config.config.invite!.id],
    });
    schemaDid.schema = JSON.stringify(schema);
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
    await promisify(setTimeout)(1000);
    const claimIssuer = new ClaimIssuerService();
    const signatureIssuer = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    return claimIssuer.create(templateDid, val, host, signatureIssuer, [
      config.config.invite!.id,
    ]);
  }

  it('read a claim', async () => {
    const val = {
      random: randomBytes(16).toString('hex'),
      name: 'Max Mustermann',
    };
    const claim = await createClaim(val);
    expect(claim.values).toEqual(val);
    await promisify(setTimeout)(2000);
    const service = new ClaimVerifierService('localhost');
    const claimLoaded = await service.get(
      claim
        .getUrl()
        .split('/')
        .slice(1)
        .join('/')
    );
    const validation = claimLoaded.getValidation();
    expect(validation!.revoked).toBeUndefined();
    expect(claim.getUrl()).toEqual(claimLoaded.getUrl());
    expect(await claim.getHtml()).toEqual(await claimLoaded.getHtml());
    expect(claim.values).toEqual(claimLoaded.values);
  }, 15000);
});
