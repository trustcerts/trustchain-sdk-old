import {
  ConfigService,
  CryptoService,
  DidIdResolver,
  DidNetworks,
  Identifier,
  generateKeyPair,
  VerificationRelationshipType,
  Platform,
  Observer,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { DidIdIssuerService, DidIdRegister } from '../src';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';

describe('test local config service', () => {
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
    console.log('get key');
    cryptoService = new CryptoService();
    let key = (
      await wallet.findOrCreate(
        VerificationRelationshipType.assertionMethod,
        Platform.SignatureType.Rsa
      )
    )[0];
    console.log('keys');
    console.log(key);
    await cryptoService.init(key);
  });

  it('add did', async () => {
    console.log('add', new Date().getTime());
    // init the did
    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    // generate a keypair and add it to the did
    const keyPair = await generateKeyPair(did.id);
    await did.addKey(keyPair.identifier, keyPair.publicKey);

    did.addService('service1', 'https://example.com', 'webpage');
    did.addRole(Observer.RoleManageAddEnum.Client);
    did.addVerificationRelationship(
      keyPair.identifier,
      VerificationRelationshipType.authentication
    );
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );

    await DidIdRegister.save(did, client);
    await setTimeout(() => Promise.resolve(), 2000);
    const did1 = await DidIdResolver.load(did.id);
    expect(did1).toBeDefined();
    console.log('added', new Date().getTime());
  }, 7000);

  it('update did', async () => {
    console.log('update', new Date().getTime());
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );

    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    did.addService('service1', 'https://example.com', 'webpage');
    did.addRole(Observer.RoleManageAddEnum.Client);

    await DidIdRegister.save(did, client);
    expect(
      did.getDocument().service.find(service => service.id.includes('service1'))
    ).toBeDefined();

    did.removeService('service1');
    await DidIdRegister.save(did, client);
    expect(
      did.getDocument().service.find(service => service.id.includes('service1'))
    ).toBeUndefined();
    console.log('update end', new Date().getTime());
  }, 7000);

  it('revoke did', async () => {
    console.log('revoke', new Date().getTime());
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );

    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    const keyPair = await generateKeyPair(did.id);
    await did.addKey(keyPair.identifier, keyPair.publicKey);
    did.addRole(Observer.RoleManageAddEnum.Client);
    did.addVerificationRelationship(
      keyPair.identifier,
      VerificationRelationshipType.authentication
    );

    await DidIdRegister.save(did, client);
    // did.print()

    did.removeVerificationRelationship(
      keyPair.identifier,
      VerificationRelationshipType.authentication
    );
    await DidIdRegister.save(did, client);
    // did.print()
    console.log('revoke end', new Date().getTime());
    return true;
  }, 7000);
});
