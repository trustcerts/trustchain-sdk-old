import {
  ConfigService,
  DidNetworks,
  Identifier,
  generateKeyPair,
  SignatureType,
} from '@trustcerts/core';

import { readFileSync } from 'fs';

import { LocalConfigService } from '../src';

describe('config-local', () => {
  let config: ConfigService;

  const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

  beforeAll(async () => {
    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);
  }, 10000);

  it('test save and load key', async () => {
    const newKey = await generateKeyPair(
      config.config.invite!.id,
      SignatureType.Rsa
    );
    config.config.keyPairs.push(newKey);

    await config.saveConfig();

    // Reload config
    await config.loadConfig();

    expect(config.config.keyPairs).toContainEqual(newKey);

    const keyPosition = config!.config!.keyPairs.findIndex(
      keyPair => keyPair.identifier === newKey.identifier
    );
    config.config.keyPairs.splice(keyPosition, 1);
    await config.saveConfig();
  });
});
