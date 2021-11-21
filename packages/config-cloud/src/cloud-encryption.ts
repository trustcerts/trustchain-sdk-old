import {
  getHash,
  exportKey,
  getBitsFromPassphrase,
  hashAlgorithm,
  subtle,
  base58Decode,
  base58Encode,
} from '@trustcerts/core';

export class CloudEncryption {
  private materKeyAlgorithm: AesKeyAlgorithm = {
    name: 'AES-CBC',
    length: 256, //can be  128, 192, or 256
  };
  /**
   * Key that is used for encryption of private attributes.
   */
  private masterKey!: CryptoKey;

  /**
   * Value the is required for salting and key generation.
   */
  private clientRandomValue!: ArrayBuffer;

  private derivedEncryptionKey!: CryptoKey;
  private derivedAuthenticationBits!: ArrayBuffer;

  /**
   * Returns the password that is required for authentication.
   */
  public async getAuthenticationPassword(): Promise<string> {
    return base58Encode(
      new Uint8Array(
        await subtle.digest(hashAlgorithm, this.derivedAuthenticationBits)
      )
    );
  }

  public exportRandomValue(): string {
    return base58Encode(new Uint8Array(this.clientRandomValue));
  }

  public importRadomValue(value: string): void {
    this.clientRandomValue = base58Decode(value);
  }

  /**
   * Sets random values for key usage and calculates keys for authentication and encryption.
   * @param randomValues
   * @param password
   */
  public async calcKeys(randomValues: string, password: string): Promise<void> {
    this.clientRandomValue = base58Decode(randomValues);
    await this.getKey(password);
  }

  /**
   * Encrypt the master key to safe it in the cloud.
   * @returns
   */
  public async encrypt(
    value: string,
    key: CryptoKey = this.masterKey
  ): Promise<string> {
    const encryptedValue = await subtle.encrypt(
      {
        name: 'AES-CBC',
        iv: this.clientRandomValue,
      },
      key,
      new TextEncoder().encode(value)
    );
    return base58Encode(new Uint8Array(encryptedValue));
  }

  public async createMasterKey(): Promise<void> {
    this.masterKey = (await subtle.generateKey(
      this.materKeyAlgorithm,
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ['encrypt', 'decrypt'] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    )) as CryptoKey;
  }

  /**
   * Sets the master key.
   * @param key
   */
  public async setMasterKey(key: JsonWebKey): Promise<void> {
    this.masterKey = await this.importMasterKey(key);
  }

  /**
   * Decrypts the master key.
   * @param encryptedMasterKey
   */
  public async decryptMasterKey(encryptedMasterKey: string): Promise<void> {
    const masterKey = await this.decrypt(
      encryptedMasterKey,
      this.derivedEncryptionKey
    );
    this.masterKey = await this.importMasterKey(JSON.parse(masterKey));
  }

  private importMasterKey(masterKey: JsonWebKey) {
    return subtle.importKey('jwk', masterKey, this.materKeyAlgorithm, true, [
      'encrypt',
      'decrypt',
    ]);
  }

  /**
   * Encrypts the master key with the derived encryption key.
   * @returns
   */
  public async getEncryptedMasterKey(): Promise<string> {
    if (!this.masterKey) {
      await this.createMasterKey();
    }
    const keyString = JSON.stringify(await exportKey(this.masterKey));
    return this.encrypt(keyString, this.derivedEncryptionKey);
  }

  /**
   * Encrypt the master key to safe it in the cloud.
   * @returns
   */
  public async decrypt(
    encryptedValue: string,
    key: CryptoKey = this.masterKey
  ): Promise<string> {
    const decryptedValue = await subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: this.clientRandomValue,
      },
      key,
      base58Decode(encryptedValue)
    );
    return new TextDecoder().decode(decryptedValue);
  }

  /**
   * Exports the master key as hex string
   */
  public async exportMasterKey(): Promise<JsonWebKey> {
    return exportKey(this.masterKey);
  }

  /**
   * Calculates the salt based on the random value.
   */
  private salt(): Promise<string> {
    const saltPrefix = 'trustcerts';
    // calculates how long should be the padding to get a fixed length for salt calculation.
    const paddingLength =
      200 -
      (saltPrefix + base58Encode(new Uint8Array(this.clientRandomValue)))
        .length;
    let padding = '';
    // required to prevent timing attacks since the calculation of the salt is always done with a string of 200 characters.
    for (let i = 0; i < paddingLength; i++) {
      padding += 'P';
    }
    return getHash(
      saltPrefix +
        padding +
        base58Encode(new Uint8Array(this.clientRandomValue))
    );
  }

  /**
   * Returns the keys that are required for authentication and encryption.
   */
  private async getKey(password: string, iterations = 100000, length = 256) {
    const salt = await this.salt();
    // create derived key
    const derivedKey = await getBitsFromPassphrase(
      password,
      salt,
      iterations,
      length
    );
    const derivedEncryptionKeyValue = await subtle.importKey(
      'raw',
      derivedKey.slice(0, derivedKey.byteLength / 2),
      {
        name: 'PBKDF2',
      },
      false,
      ['deriveKey']
    );
    this.derivedEncryptionKey = await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(salt),
        iterations,
        hash: 'SHA-512',
      },
      derivedEncryptionKeyValue,
      { name: 'AES-CBC', length },
      false,
      ['encrypt', 'decrypt']
    );
    this.derivedAuthenticationBits = derivedKey.slice(
      derivedKey.byteLength / 2
    );
  }
}
