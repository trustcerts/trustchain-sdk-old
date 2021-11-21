import { isBrowser } from '../helpers';

/**
 * Define the required objects based on the environment (if browser or nodejs)
 */
let subtle: SubtleCrypto;
let getRandomValues: (array?: Uint8Array) => Uint8Array;

if (!isBrowser()) {
  // TODO use import to remove require
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  const {
    subtle: crypto,
    getRandomValues: random,
  } = require('crypto').webcrypto;
  if (crypto) {
    subtle = crypto as SubtleCrypto;
  }
  getRandomValues = (array: Uint8Array = new Uint8Array(32)): Uint8Array => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return random(array);
  };
} else {
  console.log('Halloooooooooooooooooooooooooooooooooooooooooo');
  console.log(window);
  console.log('Halloooooooooooooooooooooooooooooooooooooooooo');
  subtle = window.crypto.subtle;
  getRandomValues = (array: Uint8Array = new Uint8Array(32)): Uint8Array => {
    return window.crypto.getRandomValues(array);
  };
}

/**
 * Defaults hash algorithm that is used for signatures and hashing.
 */
const hashAlgorithm = 'SHA-256';

export { hashAlgorithm, getRandomValues, subtle };
