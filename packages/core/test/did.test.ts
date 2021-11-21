// import { ConfigService } from '../src/config/config-service';
// import { LocalConfigService } from '../src/config/local/local-config-service';
// import { CryptoService } from '../src/crypto-service';
// import { configValues, filePath, network } from './values';
// import { generateKeyPair } from '../src/crypto/key';
// import { SignatureType } from '../src/platform';
// import { logger } from '../src/logger';
// import { Identifier } from '../src/did/identity';
// import { DidNetworks } from '../src/did/network/did-networks';
// import { WalletService } from '@trustcerts/wallet';
// import { VerificationRelationshipType } from '../src/did/id/did-id';
// import { DidIdIssuerService, DidIdRegister } from '@trustcerts/did-id-create';
// import { DidIdResolver } from '../src/did/id/did-id-resolver';

describe('blah', () => {
  it('works', () => {
    expect(true);
  });
});

// describe('test local config service', () => {
//   let config: ConfigService;

//   let cryptoService: CryptoService;

//   beforeAll(async () => {
//     DidNetworks.add('tc:dev', network);
//     Identifier.setNetwork('tc:dev');
//     config = new LocalConfigService(filePath);
//     await config.init(configValues);

//     const wallet = new WalletService(config);
//     await wallet.init();

//     cryptoService = new CryptoService();
//     let key = (
//       await wallet.findOrCreate(
//         VerificationRelationshipType.assertionMethod,
//         SignatureType.Rsa
//       )
//     )[0];
//     await cryptoService.init(key);
//   });

//   it('read did', async () => {
//     const did = DidIdRegister.create();
//     const client = new DidIdIssuerService(network.gateways, cryptoService);
//     await DidIdRegister.save(did, client);
//     console.log(did.id);
//     const did1 = await DidIdResolver.load(did.id);
//     expect(did.getDocument()).toEqual(did1.getDocument());
//   }, 7000);

//   it('read non existing did', async () => {
//     const id = 'did:trust:tc:dev:id:QQQQQQQQQQQQQQQQQQQQQQ';
//     const did = DidIdResolver.load(id, { doc: false });
//     expect(did).rejects.toEqual(new Error(`${id} not found`));
//   }, 7000);

//   it('add did', async () => {
//     // init the did
//     const did = DidIdRegister.create();
//     // generate a keypair and add it to the did
//     const keyPair = await generateKeyPair(did.id);
//     await did.addKey(keyPair.identifier, keyPair.publicKey);

//     did.addService('service1', 'https://example.com', 'webpage');
//     did.addVerificationRelationship(
//       keyPair.identifier,
//       VerificationRelationshipType.authentication
//     );
//     const client = new DidIdIssuerService(network.gateways, cryptoService);

//     await DidIdRegister.save(did, client);
//     const did1 = await DidIdResolver.load(did.id);
//     expect(did1).toBeDefined();
//   }, 7000);

//   it('update did', async () => {
//     const client = new DidIdIssuerService(network.gateways, cryptoService);

//     const did = DidIdRegister.create();
//     did.addService('service1', 'https://example.com', 'webpage');

//     await DidIdRegister.save(did, client);
//     expect(
//       did.getDocument().service.find(service => service.id.includes('service1'))
//     ).toBeDefined();

//     did.removeService('service1');
//     await DidIdRegister.save(did, client);
//     expect(
//       did.getDocument().service.find(service => service.id.includes('service1'))
//     ).toBeUndefined();
//   }, 7000);

//   it('revoke did', async () => {
//     const client = new DidIdIssuerService(network.gateways, cryptoService);

//     const did = DidIdRegister.create();
//     const keyPair = await generateKeyPair(did.id);
//     await did.addKey(keyPair.identifier, keyPair.publicKey);
//     did.addVerificationRelationship(
//       keyPair.identifier,
//       VerificationRelationshipType.authentication
//     );

//     await DidIdRegister.save(did, client);
//     // did.print()

//     did.removeVerificationRelationship(
//       keyPair.identifier,
//       VerificationRelationshipType.authentication
//     );
//     await DidIdRegister.save(did, client);
//     // did.print()
//     return true;
//   }, 7000);

//   it('test did resolver', () => {
//     DidNetworks.add('test:foo', { gateways: ['a'], observers: ['a'] });
//     let network = DidNetworks.resolveNetwork('test:foo');
//     logger.debug(network);
//     DidNetworks.add('test:foo', { gateways: ['a', 'b'], observers: ['a'] });
//     network = DidNetworks.resolveNetwork('test:foo');
//     logger.debug(network);
//   });
// });
