import { DidCachedService } from './cache/did-cached-service';
import { Did } from './did';
import { DidVerifierService } from './did-verifier-service';
import { DidManagerConfigValues } from './id/DidManagerConfigValues';
import { DidNetworks } from './network/did-networks';
import { Network } from './network/network';

export class DidResolver {
  public static init() {
    // TODO do not load it here
    DidCachedService.load();
  }

  protected static async loadDid(
    did: Did,
    config: DidManagerConfigValues
  ): Promise<void> {
    if (config.transactions?.length > 0) {
      did.parseTransaction(config.transactions);
    } else {
      // resolve the network based on the did string
      const network: Network = DidNetworks.resolveNetwork(did.id);
      if (!network) {
        throw new Error(`no networks found for ${did.id}`);
      }
      const verifier = new DidVerifierService(network.observers);
      if (config.doc) {
        const document = await verifier
          .getDidDocument(did.id, config)
          .catch((err: Error) => {
            throw new Error(
              `Could not resolve DID: ${err.message} (${did.id})`
            );
          });
        did.parseDocument(document);
      } else {
        config.transactions = await verifier
          .getDidTransactions(did.id, config.validateChainOfTrust, config.time)
          .catch((err: Error) => {
            throw new Error(
              `Could not resolve DID: ${err.message} (${did.id})`
            );
          });
        did.parseTransaction(config.transactions);
      }
    }

    // TODO also add the version number and more information from the metadata that the cache needs to find suitable cached entries
    DidCachedService.add(did, config.time);
  }
}
