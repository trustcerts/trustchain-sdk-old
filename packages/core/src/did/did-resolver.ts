import { DidCachedService } from './cache/did-cached-service';
import { Did } from './did';
import { DidVerifierService } from './did-verifier-service';
import { DidManagerConfigValues } from './id/DidManagerConfigValues';
import { DidNetworks } from './network/did-networks';
import { Network } from './network/network';

export class DidResolver {
  constructor() {
    // TODO do not load it here
    DidCachedService.load();
  }

  protected async loadDid(
    did: Did,
    // TODO any is not the best type
    config: DidManagerConfigValues<any>
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
          .catch(err => {
            throw new Error(`${did.id} not found: ${err}`);
          });
        did.parseDocument(document);
      } else {
        config.transactions = await verifier
          .getDidTransactions(did.id, config.validateChainOfTrust, config.time)
          .catch(() => {
            throw new Error(`${did.id} not found`);
          });
        did.parseTransaction(config.transactions);
      }
    }

    // TODO also add the version number and more information from the metadata that the cache needs to find suitable cached entries
    DidCachedService.add(did, config.time);
  }
}
