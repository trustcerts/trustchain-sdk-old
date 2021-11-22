import { CloudService, CloudConfigService } from '../src';
import { Platform, logger } from '@trustcerts/core';

describe('test cloud functions', () => {
  const url = 'https://platform.dev.trustcerts.de';
  const username = 'root';
  const password = 'foo';
  it('register user', async () => {
    const api = new Platform.AuthorizePlatformApi(
      new Platform.Configuration({ basePath: url })
    );
    const res = await api
      .authControllerRegister({ username })
      .catch(err => logger.error(err.response.data));
    if (!res) {
      return;
    }
    //const cloud = new CloudService(url);
    // TODO normally the token will be send via email. Pass a parameter so this can be tested too.
    // const token = res.data.token;
    // await cloud.register(username, password, token).catch((err) => logger.error(err));
  });

  it('login', async () => {
    const cloud = new CloudService(url, 'tmp/login');
    await cloud.init().catch(() => {
      return cloud.login(username, password);
    });
  });

  it('test config', async () => {
    const cloud = new CloudService(url, 'tmp/login');
    await cloud.init().catch(() => {
      return cloud.login(username, password);
    });
    const configService = new CloudConfigService(cloud);
    await configService.init();
    await configService.loadConfig();
    logger.debug(await configService.config);
  });

  it('test change password', async () => {
    const cloud = new CloudService(url, 'tmp/login');
    await cloud.init();
    await cloud.login(username, password);
    await cloud.changePassword(password + 1, password);
    await cloud.login(username, password + 1);
    await cloud.changePassword(password, password + 1);
  });
});
