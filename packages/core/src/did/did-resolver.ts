import { DidCachedService } from './cache/did-cached-service';
import { Did } from './did';
import { DidIdVerifierService } from './id/did-id-verifier-service';
import { DidManagerConfigValues } from './DidManagerConfigValues';
import { InitDidManagerConfigValues } from './InitDidManagerConfigValues';
import { DidNetworks } from './network/did-networks';
import { Network } from './network/network';
import { DidStructure } from '@trustcerts/observer';

export abstract class DidResolver {
  constructor() {
    // TODO do not load it here
    DidCachedService.load();
  }

  protected async loadDid(
    did: Did,
    // TODO any is not the best type
    config: DidManagerConfigValues<DidStructure>
  ): Promise<void> {
    if (config.transactions?.length > 0) {
      did.parseTransactions(config.transactions);
    } else {
      // resolve the network based on the did string
      const network: Network = DidNetworks.resolveNetwork(did.id);
      if (!network) {
        throw new Error(`no networks found for ${did.id}`);
      }
      const verifier = new DidIdVerifierService(network.observers);
      if (config.doc) {
        const document = await verifier
          .getDidDocument(did.id, config)
          .catch((err: Error) => {
            throw new Error(`Could not resolve DID: ${err} (${did.id})`);
          });
        did.parseDocument(document);
      } else {
        config.transactions = await verifier
          .getDidTransactions(did.id, config.validateChainOfTrust, config.time)
          .catch((err: Error) => {
            throw new Error(`Could not resolve DID: ${err} (${did.id})`);
          });
        did.parseTransactions(config.transactions);
      }
    }

    // TODO also add the version number and more information from the metadata that the cache needs to find suitable cached entries
    DidCachedService.add(did, config.time);
  }

  protected setConfig<T extends DidStructure>(
    values?: InitDidManagerConfigValues<T>
  ): DidManagerConfigValues<T> {
    return {
      validateChainOfTrust: values?.validateChainOfTrust ?? true,
      // TODO check if empty array is correct
      transactions: values?.transactions ?? [],
      time: values?.time ?? new Date().toISOString(),
      version: values?.version ?? undefined,
      doc: values?.doc ?? true,
    };
  }

  abstract load(
    id: string,
    values?: InitDidManagerConfigValues<any>
  ): Promise<Did>;
}
