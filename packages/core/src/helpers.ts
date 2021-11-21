import { encode, decode } from 'bs58';

let write: (path: string, value: string) => void;
let exists: (path: string) => boolean;
let read: (path: string) => string;

/**
 * Checks if code is run in browser
 */
function isBrowser(): boolean {
  return typeof process !== 'object';
}

function base58Encode(buffer: Buffer | number[] | Uint8Array): string {
  return encode(buffer);
}

function base58Decode(string: string): Buffer {
  return decode(string);
}

if (!isBrowser()) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
  const fs = require('fs');
  const getDirName = require('path').dirname;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  // TODO: writeFileSync is bad practive (synchronous): https://www.geeksforgeeks.org/node-js-fs-writefilesync-method/
  write = (path, contents) => {
    fs.mkdirSync(getDirName(path), { recursive: true });
    fs.writeFileSync(path, contents);
  };
  //write = fs.writeFileSync;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  exists = fs.existsSync;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  read = (path: string): string => fs.readFileSync(path, 'utf-8');
} else {
  write = (path: string, value: string): void => {
    window.localStorage.setItem(path, value);
  };
  exists = (path: string): boolean =>
    window.localStorage.getItem(path) !== null;
  read = (path: string): string => window.localStorage.getItem(path) as string;
}

export { write, exists, read, isBrowser, base58Encode, base58Decode };
