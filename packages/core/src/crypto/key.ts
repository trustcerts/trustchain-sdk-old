import { defaultAlgorithm } from './sign';
import { hashAlgorithm, subtle } from './values';
import { Bls12381G2KeyPair } from '@mattrglobal/jsonld-signatures-bbs';
import { DecryptedKeyPair } from '../config/config.dto';
import { base58Encode } from '../helpers';
import { Platform } from '..';

/**
 * Type of a key.
 */
export enum KeyType {
  RSA = 'RSA',
  EC = 'EC',
}

/**
 * Imports the crypto key object from a json web key.
 * @param keyValue
 * @param format
 * @param algorithm
 * @param keyUsages
 * @private
 */
export function importKey(
  keyValue: JsonWebKey,
  format: 'jwk' = 'jwk',
  keyUsages: KeyUsage[],
  algorithm = defaultAlgorithm
): Promise<CryptoKey> {
  // TODO map keyValue field to find out the correct algorithm
  /*
    let algorithm: RsaHashedImportParams | EcKeyImportParams;
    switch(keyValue.kty) {
        case 'EC':
            algorithm = {
                name: "BBS+", //"BBS+" korrekt?
                namedCurve: keyValue.crv!
            };
            break;
        case 'RSA':
            algorithm = defaultAlgorithmRSA;
            break;
        default:
            throw new Error('key type not supported');
    }
    */
  return subtle.importKey(
    format,
    keyValue,
    algorithm,
    true,
    keyUsages
  ) as Promise<CryptoKey>;
}

/**
 * Generates a new asymmetric key pair.
 * @param algorithm
 */
export function generateCryptoKeyPair(
  algorithm = defaultAlgorithm
): Promise<CryptoKeyPair> {
  return subtle.generateKey(algorithm, true, ['sign', 'verify']) as Promise<
    CryptoKeyPair
  >;
}

/**
 * generates a new key pair
 * @param id
 * @param signatureType
 * @returns
 */
export async function generateKeyPair(
  id: string,
  signatureType: Platform.SignatureType = Platform.SignatureType.Rsa
): Promise<DecryptedKeyPair> {
  if (signatureType == Platform.SignatureType.Rsa) {
    const keys = await generateCryptoKeyPair(defaultAlgorithm);
    if (keys.privateKey && keys.publicKey) {
      return {
        privateKey: await exportKey(keys.privateKey),
        publicKey: await exportKey(keys.publicKey),
        identifier: `${id}#${await getFingerPrint(keys.publicKey)}`,
        signatureType,
      };
    } else {
      throw Error('faild to generate keys');
    }
  } else if (signatureType == Platform.SignatureType.Bbs) {
    const bbsKeyPair = await Bls12381G2KeyPair.generate();
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      privateKey: bbsKeyPair.privateKeyJwk!,
      publicKey: bbsKeyPair.publicKeyJwk,
      identifier: `${id}#${await getFingerPrint(bbsKeyPair.publicKeyJwk)}`,
      signatureType,
    };
  } else {
    throw new Error('unknown key algorithm');
  }
}

/**
 *
 * @param passphrase
 * @param salt
 * @param iterations
 * @param length
 * @returns
 */
export async function getBitsFromPassphrase(
  passphrase: string,
  salt: string,
  iterations = 100000,
  length = 256
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const passwordKey = await subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  );
  return subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations,
      hash: 'SHA-512',
    },
    passwordKey,
    length
  );
}

/**
 * Get the fingerprint according to JSON Web Key (JWK) Thumbprint (https://tools.ietf.org/html/rfc7638), but id is encoded as hex
 * @private
 * @param key
 */
export async function getFingerPrint(
  key: JsonWebKey | CryptoKey
): Promise<string> {
  const jwk: JsonWebKey = (key as JsonWebKey).kty
    ? (key as JsonWebKey)
    : await subtle.exportKey('jwk', key as CryptoKey);
  let values: any;
  switch (jwk.kty) {
    case 'EC':
      // check if curve is bls since it has no y value: https://w3c-ccg.github.io/ldp-bbs2020/#bls-12-381-g2-public-key
      switch (jwk.crv) {
        case 'BLS12381_G1':
        case 'BLS12381_G2':
          values = {
            crv: jwk.crv,
            kty: jwk.kty,
            x: jwk.x,
          };
          break;
        default:
          values = {
            crv: jwk.crv,
            kty: jwk.kty,
            x: jwk.x,
            y: jwk.y,
          };
          break;
      }
      break;
    case 'RSA':
      values = {
        e: jwk.e,
        kty: jwk.kty,
        n: jwk.n,
      };
      break;
    default:
      throw new Error('key type not supported');
  }
  const message = new TextEncoder().encode(JSON.stringify(values));
  const hash = new Uint8Array(await subtle.digest(hashAlgorithm, message));
  return base58Encode(new Uint8Array(hash));
}

/**
 * Returns the public key as a json web key.
 * @param key
 * @param format
 */
export function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return subtle.exportKey('jwk', key) as Promise<JsonWebKey>;
}
