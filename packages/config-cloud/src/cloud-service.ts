import {
  Config,
  DecryptedKeyPair,
  exists,
  read,
  write,
  remove,
} from '@trustcerts/core';
import { AxiosError, AxiosPromise } from 'axios';
import { CloudEncryption } from './cloud-encryption';
import {
  AuthorizePlatformApi,
  Configuration,
  KeyPair,
  SettingsPlatformApi,
} from '@trustcerts/platform';

interface Credentials {
  accessToken: string;
  encryption: JsonWebKey;
  iv: string;
}

/**
 * Service to interact with a cloud where the credentials are stored.
 */
export class CloudService {
  private accessToken!: string;
  private authApi!: AuthorizePlatformApi;
  private settingsApi!: SettingsPlatformApi;
  private cloudEncryption: CloudEncryption;

  constructor(private url: string, private persistName = 'login') {
    const configuration = new Configuration({ basePath: url });
    this.authApi = new AuthorizePlatformApi(configuration);
    this.cloudEncryption = new CloudEncryption();
  }

  /**
   * Returns the access token of the user.
   * @returns
   */
  public getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Checks if there is an access token to log in into the system or if credentials for login are required.
   * @returns
   */
  async init(): Promise<void> {
    if (!exists(this.persistName)) {
      return Promise.reject('Access token does not exist');
    }
    await this.getLoginInformation();
    return Promise.resolve();
  }

  /**
   * Registers a new account to the platform
   */
  public async register(username: string): Promise<AxiosPromise<void>> {
    return this.authApi.authControllerRegister({ username });
  }

  /**
   * Verifies an account with the token.
   */
  public async verify(
    username: string,
    password: string,
    token: string
  ): Promise<void> {
    const clientRandomValue = (await this.authApi.authControllerSalt(username))
      .data.value;
    await this.cloudEncryption.calcKeys(clientRandomValue, password);
    await this.authApi.authControllerVerify({
      username,
      password: await this.cloudEncryption.getAuthenticationPassword(),
      key: await this.cloudEncryption.getEncryptedMasterKey(),
      token,
    });
  }

  /**
   * Login into the cloud to get an access token.
   * @param username
   * @param password
   */
  public async login(username: string, password: string): Promise<void> {
    const clientRandomValue = (await this.authApi.authControllerSalt(username))
      .data.value;
    await this.cloudEncryption.calcKeys(clientRandomValue, password);

    const res = await this.authApi
      .authControllerLogin({
        username,
        password: await this.cloudEncryption.getAuthenticationPassword(),
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 401) {
          throw new Error('failed to log in');
        }
        throw new Error(err.response?.data);
      });
    this.accessToken = res.data.access_token;
    await this.cloudEncryption.decryptMasterKey(res.data.key);
    this.persistLoginInformation({
      accessToken: this.accessToken,
      encryption: await this.cloudEncryption.exportMasterKey(),
      iv: this.cloudEncryption.exportRandomValue(),
    });
  }

  /**
   * Requests a token to reset the password.
   * @param username
   * @returns
   */
  public requestReset(username: string): Promise<any> {
    return this.authApi.authControllerRequestLink({ username });
  }

  /**
   * Sets the access token and the master key
   */
  public async getLoginInformation(): Promise<void> {
    if (exists(this.persistName)) {
      const values: Credentials = JSON.parse(
        read(this.persistName)
      ) as Credentials;
      this.accessToken = values.accessToken;
      await this.cloudEncryption.setMasterKey(values.encryption);
      this.cloudEncryption.importRadomValue(values.iv);
    }
  }

  /**
   * Saves the login information to a persisted storage.
   */
  public persistLoginInformation(values: Credentials): void {
    write(this.persistName, JSON.stringify(values, null, 4));
  }

  /**
   * Deletes the login information from persisted storage.
   */
  public deleteLoginInformation(): void {
    if (exists(this.persistName)) {
      remove(this.persistName);
    }
  }

  /**
   * updates the encrypted information on the cloud side. If old password is passed it will be used to make the check against the server
   * @param newPassword
   */
  public async changePassword(
    newPassword: string,
    oldPasswordConfirm?: string
  ): Promise<void> {
    if (oldPasswordConfirm) {
      await this.cloudEncryption.calcKeys(
        this.cloudEncryption.exportRandomValue(),
        oldPasswordConfirm
      );
    }
    const oldPassword = await this.cloudEncryption.getAuthenticationPassword();
    // calculate new keys for the client.
    await this.cloudEncryption.calcKeys(
      this.cloudEncryption.exportRandomValue(),
      newPassword
    );
    const configuration = new Configuration({
      basePath: this.url,
      accessToken: this.accessToken,
    });
    const authApi = new AuthorizePlatformApi(configuration);
    // update password and encryption key
    await authApi
      .authControllerChangePassword({
        newPassword: await this.cloudEncryption.getAuthenticationPassword(),
        oldPassword,
        key: await this.cloudEncryption.getEncryptedMasterKey(),
      })
      .catch(err => {
        throw Error(err);
      });
  }

  /**
   * Requests the encrypted values from the server and decrypts them.
   */
  public async getConfig(): Promise<Config> {
    const configuration = new Configuration({
      basePath: this.url,
      accessToken: this.accessToken,
    });
    this.settingsApi = new SettingsPlatformApi(configuration);
    const configResponse = await this.settingsApi
      .settingsControllerGetWallet()
      .catch((err: AxiosError) => {
        throw new Error(err?.response?.data);
      });
    // TODO inform the user that key decryption failed.
    const keyPair = await this.decryptWallet(
      configResponse.data.wallet
    ).catch(() => []);
    return {
      keyPairs: keyPair,
      invite: {
        id: configResponse.data.id,
      },
    };
  }

  /**
   * Encrypts the config and uploads it to the server.
   * @param config
   */
  public async saveConfig(config: Config): Promise<void> {
    const wallet: KeyPair[] = await Promise.all(
      config.keyPairs.map(async (keypair: any) => {
        return {
          identifier: keypair.identifier,
          publicKey: keypair.publicKey,
          privateKey: await this.cloudEncryption.encrypt(
            JSON.stringify(keypair.privateKey)
          ),
          // TODO remove
          signatureType: keypair.signatureType,
        };
      })
    );
    await this.settingsApi.settingsControllerSetWallet({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: config.invite!.id,
      wallet: wallet ?? [],
    });
  }

  /**
   * Delete the account from the system.
   * @returns
   */
  public delete() {
    return this.authApi.authControllerDeleteAccount();
  }

  private async decryptWallet(wallet: KeyPair[]): Promise<DecryptedKeyPair[]> {
    const keys: DecryptedKeyPair[] = [];
    for (const keypair of wallet) {
      const key: JsonWebKey = JSON.parse(
        await this.cloudEncryption.decrypt(keypair.privateKey)
      ) as JsonWebKey;
      keys.push({
        identifier: keypair.identifier,
        privateKey: key,
        publicKey: keypair.publicKey,
        signatureType: keypair.signatureType,
      });
    }
    return keys;
  }
}
