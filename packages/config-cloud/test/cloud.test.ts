import { CloudService, CloudConfigService } from '../src';
import { logger } from '@trustcerts/core';
import { AuthorizePlatformApi, Configuration } from '../src/platform';

describe('test cloud functions', () => {
  const url = 'https://platform.dev.trustcerts.de';
  const username = 'root';
  const password = 'foo';

  it('register user', async () => {
    const api = new AuthorizePlatformApi(new Configuration({ basePath: url }));

    await expect(api.authControllerRegister({ username })).rejects.toThrow('Request failed with status code 422');
    
    
    //const cloud = new CloudService(url);
    // TODO normally the token will be send via email. Pass a parameter so this can be tested too.
    // const token = res.data.token;
    // await cloud.register(username, password, token).catch((err) => logger.error(err));
  });

  it('login with valid credentials', async () => {
    const cloud = new CloudService(url, 'tmp/login');
    cloud.deleteLoginInformation();
    await expect(cloud.login(username, password)).resolves.toBeUndefined();
  });

  it('login with invalid credentials', async () => {
    const cloud = new CloudService(url, 'tmp/login');
    await expect(cloud.login(Math.random().toString(), Math.random().toString())).rejects.toThrow("failed to log in");
  });

  it('login and init with access token', async () => {
    const cloud = new CloudService(url, 'tmp/login');

    // Login to create a new access token
    await expect(cloud.login(username, password)).resolves.toBeUndefined();

    // Expect init to resolve successfully
    await expect(cloud.init()).resolves.toBeUndefined();
  });

  it('init with invalid access token', async () => {
    const cloud = new CloudService(url, 'tmp/login');

    // Delete access token and expect init to fail
    cloud.deleteLoginInformation();
    await expect(cloud.init()).rejects.toBeDefined();
  });

  it('test config', async () => {
    const cloud = new CloudService(url, 'tmp/login');
    const configService = new CloudConfigService(cloud);
    await configService.init().catch(() => {
      return cloud.login(username, password);
    });
    await configService.loadConfig();
    logger.debug(await configService.config);
    expect(configService.config).toBeDefined();
    // TODO: Prüfen, ob config.keyPairs auch nicht leer ist?
  });

  it('test change password', async () => {
    const cloud = new CloudService(url, 'tmp/login');

    // Login
    await expect(cloud.login(username, password)).resolves.toBeUndefined();

    // Change password
    const newPassword = password+"new";
    await expect(cloud.changePassword(newPassword, password)).resolves.toBeUndefined();

    // Login with new password
    await expect(cloud.login(username, newPassword)).resolves.toBeUndefined();

    // Revert to old password
    await expect(cloud.changePassword(password, newPassword)).resolves.toBeUndefined();
  });
});
