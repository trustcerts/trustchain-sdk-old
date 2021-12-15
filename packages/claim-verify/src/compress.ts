import { Root } from 'protobufjs';
import { base58Decode, base58Encode } from '@trustcerts/core';

/**
 * Information about the proto file
 */
interface ProtoFile {
  nested: any;
}

export abstract class Compress {
  abstract compress<T>(value: T): string;

  abstract decompress<T>(value: string): T;
}

export class JsonCompressor implements Compress {
  compress<T>(value: T): string {
    // base64 suits better than uri encode for shorter values.
    return JSON.stringify(value);
  }
  decompress<T>(value: string): T {
    return JSON.parse(value) as T;
  }
}

/**
 * Proto implementation so it can be used as a compression algorithm.
 */
export class Proto implements Compress {
  /**
   * Root element
   */
  root: Root;

  /**
   * Default path to the entry.
   */
  type = 'a.a';

  /**
   * Loads the structure
   * @param structure
   */
  constructor(private structure: ProtoFile) {
    this.root = Root.fromJSON(this.structure);
    this.setType();
  }

  /**
   * Sets the type by parsing the protobuf json file.
   */
  setType(): void {
    const namespaces = Object.keys(this.structure.nested);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const messages = Object.keys(this.structure.nested[namespaces[0]].nested);
    this.type = `${namespaces[0]}.${messages[0]}`;
  }

  /**
   * Compresses the values with the set proto information.
   * @param values
   * @returns
   */
  compress<T>(values: T): string {
    const claim = this.root.lookupType(this.type);
    const message = claim.create(values);
    const buffer = claim.encode(message).finish();
    return base58Encode(buffer);
  }

  /**
   * Decompresses the values with the set proto information.
   * @param value
   * @returns
   */
  decompress<T>(value: string): T {
    const claim = this.root.lookupType(this.type);
    const buffer = base58Decode(value);
    const message = claim.decode(buffer);
    return claim.toObject(message) as T;
  }
}
