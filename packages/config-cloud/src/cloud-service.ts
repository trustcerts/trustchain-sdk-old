import {
  Config,
  DecryptedKeyPair,
  Platform,
  exists,
  read,
  write,
} from '@trustcerts/core';
import { AxiosError, AxiosPromise } from 'axios';
import { CloudEncryption } from './cloud-encryption';

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
  private authApi!: Platform.AuthorizePlatformApi;
  private settingsApi!: Platform.SettingsPlatformApi;
  private cloudEncryption: CloudEncryption;

  constructor(private url: string, private persistName = 'login') {
    const configuration = new Platform.Configuration({ basePath: url });
    this.authApi = new Platform.AuthorizePlatformApi(configuration);
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
      return Promise.reject();
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
  requestReset(username: string): Promise<any> {
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
    const configuration = new Platform.Configuration({
      basePath: this.url,
      accessToken: this.accessToken,
    });
    const authApi = new Platform.AuthorizePlatformApi(configuration);
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
    const configuration = new Platform.Configuration({
      basePath: this.url,
      accessToken: this.accessToken,
    });
    this.settingsApi = new Platform.SettingsPlatformApi(configuration);
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

  private async decryptWallet(
    wallet: Platform.KeyPair[]
  ): Promise<DecryptedKeyPair[]> {
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

  /**
   * Encrypts the config and uploads it to the server.
   * @param config
   */
  async saveConfig(config: Config): Promise<void> {
    const wallet: Platform.KeyPair[] = await Promise.all(
      config.keyPairs.map(async keypair => {
        return {
          identifier: keypair.identifier,
          publicKey: keypair.publicKey,
          privateKey: await this.cloudEncryption.encrypt(
            JSON.stringify(keypair.privateKey)
          ),
          // TODO remove
          signatureType: (keypair.signatureType as unknown) as Platform.SignatureType,
        };
      })
    );
    await this.settingsApi.settingsControllerSetWallet({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: config.invite!.id,
      wallet: wallet ?? [],
    });
  }
}
