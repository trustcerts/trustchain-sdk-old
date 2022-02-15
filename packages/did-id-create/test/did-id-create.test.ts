import {
  ConfigService,
  CryptoService,
  DidIdResolver,
  DidNetworks,
  Identifier,
  generateKeyPair,
  VerificationRelationshipType,
  SignatureType,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { DidIdIssuerService, DidIdRegister } from '../src';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';
import { RoleManageType } from '@trustcerts/observer';

describe('test local config service', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

  let didIdResolver: DidIdResolver;

  const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

  beforeAll(async () => {
    DidNetworks.add(testValues.network.namespace, testValues.network);
    Identifier.setNetwork(testValues.network.namespace);
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);

    const wallet = new WalletService(config);
    await wallet.init();
    cryptoService = new CryptoService();
    didIdResolver = new DidIdResolver();
    let key = (
      await wallet.findOrCreate(
        VerificationRelationshipType.assertionMethod,
        SignatureType.Rsa
      )
    )[0];
    await cryptoService.init(key).catch(console.log);
  }, 10000);

  it('add did', async () => {
    // init the did
    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    // generate a keypair and add it to the did
    const keyPair = await generateKeyPair(did.id);
    await did.addKey(keyPair.identifier, keyPair.publicKey);

    did.addService('service1', 'https://example.com', 'webpage');
    did.addRole(RoleManageType.Client);
    did.addVerificationRelationship(
      keyPair.identifier,
      VerificationRelationshipType.authentication
    );
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );

    await DidIdRegister.save(did, client);
    await new Promise(resolve =>
      setTimeout(() => {
        resolve(true);
      }, 2000)
    );
    const did1 = await didIdResolver.load(did.id);
    expect(did1).toEqual(did);
  }, 7000);

  it('update did', async () => {
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );

    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    did.addService('service1', 'https://example.com', 'webpage');
    did.addRole(RoleManageType.Client);

    await DidIdRegister.save(did, client);
    expect(
      did.getDocument().service.find(service => service.id.includes('service1'))
    ).toBeDefined();

    did.removeService('service1');
    await DidIdRegister.save(did, client);
    expect(
      did.getDocument().service.find(service => service.id.includes('service1'))
    ).toBeUndefined();
  }, 7000);

  it('revoke did', async () => {
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );

    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    const keyPair = await generateKeyPair(did.id);
    await did.addKey(keyPair.identifier, keyPair.publicKey);
    did.addRole(RoleManageType.Client);
    did.addVerificationRelationship(
      keyPair.identifier,
      VerificationRelationshipType.authentication
    );

    await expect(DidIdRegister.save(did, client)).resolves.toBeDefined();

    did.removeVerificationRelationship(
      keyPair.identifier,
      VerificationRelationshipType.authentication
    );

    await expect(DidIdRegister.save(did, client)).resolves.toBeDefined();
  }, 7000);
});
