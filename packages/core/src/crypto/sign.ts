import { base58Decode, base58Encode } from '../helpers';
import { hashAlgorithm, subtle } from './values';

/**
 * Default values that are used for key generation.
 */
export const defaultAlgorithm: RsaHashedKeyGenParams = {
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: hashAlgorithm,
};

/**
 * Verifies a signature with the given public key and the signature.
 * @param value
 * @param signature
 * @param key
 */
export async function verifySignature(
  value: string,
  signature: string,
  key: CryptoKey
): Promise<boolean> {
  const encoder = new TextEncoder();
  return subtle.verify(
    defaultAlgorithm.name,
    key,
    base58Decode(signature),
    encoder.encode(value)
  );
}

/**
 * Signs a given signature with the passed private key.
 * @param value
 * @param privateKey
 */
export async function signInput(
  value: string,
  privateKey: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await subtle.sign(
    defaultAlgorithm.name,
    privateKey,
    encoder.encode(value)
  );
  return base58Encode(new Uint8Array(signature));
}
