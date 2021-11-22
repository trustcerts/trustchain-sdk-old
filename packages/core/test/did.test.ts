import {
  ConfigService,
  CryptoService,
  DidIdResolver,
  DidNetworks,
  Identifier,
  VerificationRelationshipType,
  Platform,
  logger,
  Observer,
} from '..';
import { LocalConfigService } from '@trustcerts/config-local';
import { DidIdIssuerService, DidIdRegister } from '@trustcerts/did-id-create';
import { WalletService } from '@trustcerts/wallet';
import { readFileSync } from 'fs';

describe('test local config serviceze', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

  const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

  beforeAll(async () => {
    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);

    try {
      const wallet = new WalletService(config);
      await wallet.init();

      cryptoService = new CryptoService();
      let key = (
        await wallet.findOrCreate(
          VerificationRelationshipType.assertionMethod,
          Platform.SignatureType.Rsa
        )
      )[0];
      await cryptoService.init(key);
    } catch (e) {
      console.log(e);
    }
  });

  it('read did', async () => {
    const did = DidIdRegister.create({
      controllers: [config.config.invite!.id],
    });
    did.addRole(Observer.RoleManageAddEnum.Client);
    const client = new DidIdIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    await DidIdRegister.save(did, client);
    console.log(did.id);
    const did1 = await DidIdResolver.load(did.id);
    expect(did.getDocument()).toEqual(did1.getDocument());
  }, 7000);

  it('read non existing did', async () => {
    const id = 'did:trust:tc:dev:id:QQQQQQQQQQQQQQQQQQQQQQ';
    const did = DidIdResolver.load(id, { doc: false });
    expect(did).rejects.toEqual(new Error(`${id} not found`));
  }, 7000);

  it('test did resolver', () => {
    DidNetworks.add('test:foo', { gateways: ['a'], observers: ['a'] });
    let network = DidNetworks.resolveNetwork('test:foo');
    logger.debug(network);
    DidNetworks.add('test:foo', { gateways: ['a', 'b'], observers: ['a'] });
    network = DidNetworks.resolveNetwork('test:foo');
    logger.debug(network);
  });
});
