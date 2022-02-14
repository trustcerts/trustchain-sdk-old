import { ConfigService, DidNetworks, Identifier } from '@trustcerts/core';
import { LocalConfigService } from '@trustcerts/config-local';
import { DidIdRegister } from '../src';
import { readFileSync } from 'fs';

describe('test local config service', () => {
  let config: ConfigService;

  const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));

  beforeAll(async () => {
    DidNetworks.add('tc:dev', testValues.network);
    Identifier.setNetwork('tc:dev');
    config = new LocalConfigService(testValues.filePath);
    await config.init(testValues.configValues);
  }, 10000);

  it('add by invite', async () => {
    const keypair = await DidIdRegister.createByInvite(
      testValues.configValues.invite
    );
    expect(keypair).toBeDefined();
  }, 7000);
});
