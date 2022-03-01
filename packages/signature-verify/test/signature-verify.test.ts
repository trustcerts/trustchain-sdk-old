import { existsSync, rmSync, readFileSync } from 'fs';
import {
  ConfigService,
  CryptoService,
  getRandomValues,
  VerificationRelationshipType,
  DidNetworks,
  base58Encode,
  Identifier,
  write,
  SignatureType,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { WalletService } from '@trustcerts/wallet';
import {
  DidSignatureRegister,
  SignatureIssuerService,
} from '@trustcerts/signature-create';
import { DidSignatureResolver } from '../src';

describe('test signature service', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

  let testFile = 'tmp/test';

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

  it('verify file', async () => {
    const issuer = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const didsignatureRegister = new DidSignatureRegister();
    const resolver = new DidSignatureResolver();

    write(testFile, getRandomValues(new Uint8Array(200)).toString());
    const did = await didsignatureRegister.signFile(testFile, [
      config.config.invite!.id,
    ]);
    await didsignatureRegister.save(did, issuer);
    // wait some time since the observer has to be synced.
    await new Promise(res => setTimeout(res, 2000));
    console.log(did.id);
    const loadedDid = await resolver.load(did.id);
    expect(loadedDid.id).toEqual(did.id);
  }, 10000);

  it('verify string', async () => {
    const issuer = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const signature = base58Encode(getRandomValues(new Uint8Array(20)));

    const didsignatureRegister = new DidSignatureRegister();
    const resolver = new DidSignatureResolver();

    const did = await didsignatureRegister.signString(signature, [
      config.config.invite!.id,
    ]);
    await didsignatureRegister.save(did, issuer);
    // wait some time since the observer has to be synced.
    await new Promise(res => setTimeout(res, 2000));
    const loadedDid = await resolver.load(did.id);
    expect(loadedDid.id).toEqual(did.id);
  });

  it('revoke string', async () => {
    const issuer = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const signature = base58Encode(getRandomValues(new Uint8Array(20)));

    const didsignatureRegister = new DidSignatureRegister();
    const resolver = new DidSignatureResolver();

    const did = await didsignatureRegister.signString(signature, [
      config.config.invite!.id,
    ]);
    await didsignatureRegister.save(did, issuer);
    // wait some time since the observer has to be synced.
    await new Promise(res => setTimeout(res, 2000));
    let loadedDid = await resolver.load(did.id);

    expect(loadedDid.revoked).toBeUndefined();
    loadedDid.revoked = new Date().toISOString();
    await didsignatureRegister.save(loadedDid, issuer);

    await new Promise(res => setTimeout(res, 2000));
    loadedDid = await resolver.load(did.id);
    expect(loadedDid.revoked).toBeDefined();
    // expect(loadedDid.revoked! > loadedDid.).toBeTruthy();
  }, 10000);

  afterAll(() => {
    if (existsSync(testFile)) {
      rmSync(testFile);
    }
  });
});
