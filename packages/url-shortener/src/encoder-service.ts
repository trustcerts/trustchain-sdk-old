import {
  subtle,
  getRandomValues,
  base58Encode,
  base58Decode,
} from '@trustcerts/core';

export interface Encryption {
  value: Uint8Array;
  key: string;
  iv: string;
}

export class EncoderService {
  /**
   * Algorithm that is used for encryption.
   */
  private static algo: AesKeyAlgorithm = {
    name: 'AES-CBC',
    length: 128, //can be  128, 192, or 256
  };

  // TODO when setting the length, the decode option needs to be informed. E.g add a parameter to the url.
  /**
   * Sets the bit length of the
   * @param length
   */
  static setPasswordLength(length: 128 | 192 | 256) {
    this.algo.length = length;
  }

  /**
   * Generates a key for encryption
   */
  static async generateKey(): Promise<CryptoKey> {
    return subtle.generateKey(
      this.algo,
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ['encrypt', 'decrypt'] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    ) as Promise<CryptoKey>;
  }

  /**
   * Encodes a value with a generated password.
   * @param value
   * @returns encrypted value, password
   */
  static async encode(value: Uint8Array, key?: CryptoKey): Promise<Encryption> {
    if (!key) {
      key = await this.generateKey();
    }

    // TODO check if the array size has impact on the security
    const iv = getRandomValues(new Uint8Array(16));
    const encrypted = await subtle.encrypt(
      {
        name: 'AES-CBC',
        iv,
      },
      key,
      value
    );
    return {
      value: new Uint8Array(encrypted),
      iv: base58Encode(iv),
      key: base58Encode(new Uint8Array(await subtle.exportKey('raw', key))),
    };
  }

  /**
   * Returns a value
   * @param values
   * @returns
   */
  static async decode(values: Encryption): Promise<Uint8Array> {
    const newKey = await subtle
      .importKey('raw', base58Decode(values.key), this.algo, true, [
        'encrypt',
        'decrypt',
      ])
      .then(
        key => key,
        () => {
          throw new Error('Wrong encoding for key');
        }
      );

    return subtle
      .decrypt(
        {
          name: 'AES-CBC',
          iv: base58Decode(values.iv),
        },
        newKey,
        values.value
      )
      .then(
        value => new Uint8Array(value),
        () => {
          throw new Error('failed to decrypt');
        }
      );
  }
}
