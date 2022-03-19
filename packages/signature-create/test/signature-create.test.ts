import { existsSync, rmSync, readFileSync } from 'fs';
import {
  ConfigService,
  CryptoService,
  getRandomValues,
  VerificationRelationshipType,
  DidNetworks,
  Identifier,
  write,
  SignatureType,
  base58Encode,
} from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { WalletService } from '@trustcerts/wallet';
import { DidSignatureRegister, SignatureIssuerService } from '../src';
import { DidSignatureResolver } from '@trustcerts/signature-verify';

describe('test signature service', () => {
  let config: ConfigService;

  let cryptoService: CryptoService;

  let testFile = 'tmp/test';

  const testValues = JSON.parse(readFileSync('../../values-dev.json', 'utf-8'));

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

  it('sign string', async () => {
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
  }, 7000);

  it('sign string double', async () => {
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
    await didsignatureRegister
      .save(did, issuer)
      .catch(err =>
        expect(err.message.includes('hash already signed')).toBeTruthy()
      );
  }, 7000);

  it('sign buffer', async () => {
    const issuer = new SignatureIssuerService(
      testValues.network.gateways,
      cryptoService
    );
    const didsignatureRegister = new DidSignatureRegister();
    const resolver = new DidSignatureResolver();

    const did = await didsignatureRegister.signBuffer(new ArrayBuffer(8), [
      config.config.invite!.id,
    ]);
    await didsignatureRegister.save(did, issuer);
    // wait some time since the observer has to be synced.
    await new Promise(res => setTimeout(res, 2000));
    const loadedDid = await resolver.load(did.id);
    expect(loadedDid.id).toEqual(did.id);
  });

  it('sign file', async () => {
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
    const loadedDid = await resolver.load(did.id);
    expect(loadedDid.id).toEqual(did.id);
  });

  afterAll(() => {
    if (existsSync(testFile)) {
      rmSync(testFile);
    }
  });
});
