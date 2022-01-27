import {
  ConfigService,
  CryptoService,
  DidIdResolver,
  DidNetworks,
  Identifier,
  VerificationRelationshipType,
  SignatureType,
} from '..';
import { LocalConfigService } from '@trustcerts/config-local';
import { DidIdIssuerService, DidIdRegister } from '@trustcerts/did-id-create';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';
import { RoleManageAddEnum } from '@trustcerts/observer';

describe('test local config service', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

  let resolver = new DidIdResolver();

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

  it('verify did chain of trust temporary test case', async () => {
    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    did.addRole(RoleManageAddEnum.Client);
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    await DidIdRegister.save(did, client);
    await new Promise(res => setTimeout(res, 2000));
    const did1 = await resolver.load(did.id);
    expect(did.getDocument()).toEqual(did1.getDocument());
  }, 7000);

  it('read did', async () => {
    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    did.addRole(RoleManageAddEnum.Client);
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    await DidIdRegister.save(did, client);
    await new Promise(res => setTimeout(res, 2000));
    const did1 = await resolver.load(did.id);
    expect(did.getDocument()).toEqual(did1.getDocument());
  }, 7000);

  it('read non existing did', async () => {
    const id = 'did:trust:tc:dev:id:QQQQQQQQQQQQQQQQQQQQQQ';
    const did = resolver.load(id, { doc: false });
    await expect(did).rejects.toEqual(new Error(`${id} not found`));
  }, 7000);

  it('test did resolver', () => {
    let exampleNetwork = { gateways: ['a'], observers: ['a'] };
    DidNetworks.add('test:foo', exampleNetwork);
    let resolvedNetwork = DidNetworks.resolveNetwork('test:foo');
    expect(resolvedNetwork).toEqual(exampleNetwork);

    exampleNetwork = { gateways: ['a', 'b'], observers: ['a'] };
    DidNetworks.add('test:foo', exampleNetwork);
    resolvedNetwork = DidNetworks.resolveNetwork('test:foo');
    expect(resolvedNetwork).toEqual(exampleNetwork);
  });
});
