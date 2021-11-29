import { SignatureType } from '../crypto/key';

export class DecryptedKeyPair {
  privateKey!: JsonWebKey;

  publicKey!: JsonWebKey;

  /**
   * unique identifier for the public key, in most cases the fingerprint.
   */
  identifier!: string;

  signatureType!: SignatureType;
}
export class Invite {
  /**
   * Identifier that was added to the chain for this did.
   */
  id!: string;
  /**
   * Pre shared secret
   */
  secret?: string;
  /**
   * Endpoint where the secret is stored
   */
  endpoint?: string;
}

export class Config {
  /**
   * Human readable name
   */
  name?: string;

  /**
   * Invite secret to add a did or to update it.
   */
  invite?: Invite;

  /**
   * Keypair that is connected with the did.
   */
  keyPairs!: DecryptedKeyPair[];
}
