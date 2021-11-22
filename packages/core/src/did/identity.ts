import { encode } from 'bs58';
import { getRandomValues } from '../crypto/values';

/**
 * Class to generate identifiers for different types of objects.
 */
export class Identifier {
  /**
   * Value of the did method.
   */
  public static method = 'trust';

  /**
   * Value of the namespace. Can include a sub network like staging
   */
  private static tcNamespace: string;

  /**
   * Sets the network of the did.
   * @param network
   */
  public static setNetwork(network: string): void {
    this.tcNamespace = network;
  }

  /**
   * Returns the current network
   * @returns
   */
  public static getNetwork(): string {
    return this.tcNamespace;
  }

  /**
   * Generate the did based on the type.
   * @param type
   */
  public static generate(type: string): string {
    const id = encode(getRandomValues()).slice(0, 22);
    // if (!this.tcNamespace) {
    //     throw Error('namespace not set yet');
    // }
    return `did:${this.method}:${this.tcNamespace}:${
      type ? type + ':' : ''
    }${id}`;
  }
}
