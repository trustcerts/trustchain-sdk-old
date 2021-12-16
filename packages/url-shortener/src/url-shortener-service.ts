import {
  subtle,
  getRandomValues,
  base58Encode,
  base58Decode,
} from '@trustcerts/core';

interface Encryption {
  value: string;
  key: string;
  iv: string;
}

export class ShortService {
  private algo: AesKeyAlgorithm = {
    name: 'AES-CBC',
    length: 128, //can be  128, 192, or 256
  };

  constructor() {}
  async encode(value: string): Promise<Encryption> {
    const key = await subtle.generateKey(
      this.algo,
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ['encrypt', 'decrypt'] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );

    const iv = getRandomValues(new Uint8Array(16));
    const encrypted = await subtle.encrypt(
      {
        name: 'AES-CBC',
        iv,
      },
      key,
      new TextEncoder().encode(value)
    );
    return {
      value: base58Encode(new Uint8Array(encrypted)),
      iv: base58Encode(iv),
      key: base58Encode(new Uint8Array(await subtle.exportKey('raw', key))),
    };
  }

  async decode(values: Encryption): Promise<string> {
    const newKey = await subtle.importKey(
      'raw',
      base58Decode(values.key),
      this.algo,
      true,
      ['encrypt', 'decrypt']
    );

    const decrypted = await subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: base58Decode(values.iv),
      },
      newKey,
      base58Decode(values.value)
    );
    return new TextDecoder().decode(decrypted);
  }
}
