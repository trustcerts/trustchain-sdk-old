import { CloudService } from '../src';
import { readFileSync } from 'fs';

describe('test cloud functions', () => {
  const testValues = JSON.parse(readFileSync('../../values.json', 'utf-8'));
  const url = testValues.cloud;

  // TODO token is not passed when registered. Get another way to get the token.
  // it('register user', async () => {
  //   //register user
  //   const cloud = new CloudService(url, 'tmp/login');
  //   const response = await cloud.register(username);
  //   const token = (response.data as any).token;
  //   // verify user and add password
  //   await cloud.verify(username, password, token);
  //   await cloud.login(username, password);

  //   // const cloud = new CloudService(url);
  //   // // TODO normally the token will be send via email. Pass a parameter so this can be tested too.
  //   // const token = res.data.token;
  //   // await cloud.register(username, password, token).catch((err) => logger.error(err));
  // });

  // it('login with valid credentials', async () => {
  //   const cloud = new CloudService(url, 'tmp/login');
  //   cloud.deleteLoginInformation();
  //   await expect(cloud.login(username, password)).resolves.toBeUndefined();
  // });

  it('login with invalid credentials', async () => {
    const cloud = new CloudService(url, 'tmp/login');
    await expect(
      cloud.login(Math.random().toString(), Math.random().toString())
    ).rejects.toThrow('failed to log in');
  });

  // it('login and init with access token', async () => {
  //   const cloud = new CloudService(url, 'tmp/login');

  //   // Login to create a new access token
  //   await expect(cloud.login(username, password)).resolves.toBeUndefined();

  //   // Expect init to resolve successfully
  //   await expect(cloud.init()).resolves.toBeUndefined();
  // });

  // it('init with invalid access token', async () => {
  //   const cloud = new CloudService(url, 'tmp/login');

  //   // Delete access token and expect init to fail
  //   cloud.deleteLoginInformation();
  //   await expect(cloud.init()).rejects.toBeDefined();
  // });

  // it('test config', async () => {
  //   const cloud = new CloudService(url, 'tmp/login');
  //   const configService = new CloudConfigService(cloud);
  //   await configService.init().catch(() => {
  //     return cloud.login(username, password);
  //   });
  //   await configService.loadConfig();
  //   logger.debug(await configService.config);
  //   expect(configService.config).toBeDefined();
  //   // TODO: Pr??fen, ob config.keyPairs auch nicht leer ist?
  // });

  // it('test change password', async () => {
  //   const cloud = new CloudService(url, 'tmp/login');

  //   // Login
  //   await expect(cloud.login(username, password)).resolves.toBeUndefined();

  //   // Change password
  //   const newPassword = password + 'new';
  //   await expect(
  //     cloud.changePassword(newPassword, password)
  //   ).resolves.toBeUndefined();

  //   // Login with new password
  //   await expect(cloud.login(username, newPassword)).resolves.toBeUndefined();

  //   // Revert to old password
  //   await expect(
  //     cloud.changePassword(password, newPassword)
  //   ).resolves.toBeUndefined();
  // });
});
