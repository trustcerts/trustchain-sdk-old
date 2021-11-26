import { exportKey, importKey } from './crypto/key';
import { signInput } from './crypto/sign';
import { DecryptedKeyPair } from './config/config.dto';

/**
 * Service to handle actions that include the own keypair that is loaded into the service.
 */
export class CryptoService {
  /**
   * key pair to sign and verify.
   * @private
   */
  public keyPair!: CryptoKeyPair;

  /**
   * unique fingerprint of the key.
   * @private
   */
  public fingerPrint!: string;

  /**
   * Loads keys if passed. If not one keypair is generated.
   */
  public async init(keyPair: DecryptedKeyPair): Promise<void> {
    console.log(keyPair);
    this.keyPair = {
      privateKey: await importKey(keyPair.privateKey, 'jwk', ['sign']),
      publicKey: await importKey(keyPair.publicKey, 'jwk', ['verify']),
    };
    console.log(this.keyPair);
    this.fingerPrint = keyPair.identifier;
  }

  /**
   * Signs a given signature.
   * @param value
   */
  public async sign(value: string): Promise<string> {
    return signInput(value, this.keyPair.privateKey!);
  }

  /**
   * Returns the public key as an json web token.
   */
  getPublicKey(): Promise<JsonWebKey> {
    return exportKey(this.keyPair.publicKey!);
  }

  /**
   * Saved the keys in the config service.
   */
  // async save(): Promise<DecryptedKeyPair> {
  //     return {
  //         publicKey: await exportKey(this.keyPair.publicKey),
  //         privateKey: await exportKey(this.keyPair.privateKey),
  //         identifier: this.fingerPrint,
  //     };
  // }
}
