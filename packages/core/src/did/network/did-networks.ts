import { Identifier } from '../identity';
import { Network, Networks } from './network';

export class DidNetworks {
  private static nameSpaceNetworks: Networks;

  /**
   * Loads the network values by looping over them and adds them to an existing mapping.
   * @param networks
   */
  public static load(networks: Networks): void {
    for (const network in networks) {
      for (const subNetwork in networks[network]) {
        this.add(
          [network, subNetwork].join(':'),
          networks[network][subNetwork]
        );
      }
    }
  }

  /**
   * Adds a new network to the system.
   * @param network
   * @param subNetwork
   * @param values
   */
  public static add(value: string, values: Network): void {
    const network = value.split(':')[0];
    const subNetwork = value.split(':')[1];
    if (!this.nameSpaceNetworks) {
      this.nameSpaceNetworks = {};
    }
    if (!this.nameSpaceNetworks[network]) {
      this.nameSpaceNetworks[network] = {};
    }
    if (!this.nameSpaceNetworks[network][subNetwork]) {
      this.nameSpaceNetworks[network][subNetwork] = {
        gateways: [],
        observers: [],
      };
    }
    values.gateways.forEach(gateway => {
      if (
        this.nameSpaceNetworks[network][subNetwork].gateways.indexOf(
          gateway
        ) === -1
      ) {
        this.nameSpaceNetworks[network][subNetwork].gateways.push(gateway);
      }
    });
    values.observers.forEach(observer => {
      if (
        this.nameSpaceNetworks[network][subNetwork].observers.indexOf(
          observer
        ) === -1
      ) {
        this.nameSpaceNetworks[network][subNetwork].observers.push(observer);
      }
    });
  }

  /**
   * Resolves the network based on the did string. If there is no network found for the given parameter THE default one is chosen.
   * If there is no default configuration an error is thrown.
   * @param elements
   * @returns
   */
  public static resolveNetwork(id: string): Network {
    // replace the did method
    if (id.startsWith(`did:${Identifier.method}:`)) {
      id = id.replace(`did:${Identifier.method}:`, '');
    }
    if (!this.nameSpaceNetworks) {
      throw Error(`no networks defined for ${id}`);
    }
    const elements = id.split(':');
    try {
      return this.nameSpaceNetworks[elements[0]][elements[1]];
    } catch (e) {
      throw new Error(`no network found for id`);
    }
  }
}
