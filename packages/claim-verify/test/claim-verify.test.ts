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
import { TemplateIssuerService } from '@trustcerts/template-create';
import { ClaimIssuerService } from '@trustcerts/claim-create';
import { ClaimVerifierService, ClaimValues, Claim } from '../src';
import { SignatureVerifierService } from '@trustcerts/signature-verify';
import { TemplateVerifierService } from '@trustcerts/template-verify';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';
import { TemplateStructure, CompressionTypeEnum } from '@trustcerts/gateway';

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
    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
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
    const host = 'localhost';

    const templateIssuer = new TemplateIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const template: TemplateStructure = {
      compression: {
        type: CompressionTypeEnum.Json,
      },
      template: '<h1>Hello {{ name }}</h1>',
      schema: JSON.stringify(schema),
      id: Identifier.generate('tmp'),
    };
    await templateIssuer.create(template);
    const verifier = new TemplateVerifierService(testValues.network.observers);
    const loadedTemplate = await verifier.get(template.id);

    const claimIssuer = new ClaimIssuerService();
    const signatureIssuer = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    return (claimIssuer.create(
      loadedTemplate,
      val,
      host,
      signatureIssuer
    ) as unknown) as Promise<Claim>;
  }

  it('read a claim', async () => {
    const value = {
      random: randomBytes(16).toString('hex'),
      name: 'Max Mustermann',
    };
    const claim = await createClaim(value);
    const verifier = new SignatureVerifierService(testValues.network.observers);
    const service = new ClaimVerifierService(
      new TemplateVerifierService(testValues.network.observers),
      verifier,
      'localhost'
    );
    await new Promise(resolve =>
      setTimeout(() => {
        resolve(true);
      }, 2000)
    );
    const claimLoaded = await service.get(
      claim
        .getUrl()
        .split('/')
        .slice(1)
        .join('/')
    );
    expect(claim.getUrl()).toEqual(claimLoaded.getUrl());
    expect(await claim.getHtml()).toEqual(await claimLoaded.getHtml());
    expect(claim.values).toEqual(claimLoaded.values);
  }, 15000);
});
