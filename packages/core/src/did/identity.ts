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
   * Generate the did based on the type. If a id is passed it will be used.
   * @param type
   * @param id
   */
  public static generate(type: string, id?: string): string {
    id = id ?? encode(getRandomValues()).slice(0, 22);
    return `did:${this.method}:${this.tcNamespace}:${
      type ? type + ':' : ''
    }${id}`;
  }
}
