import { exists, read, write } from '../../helpers';
import { Did } from '../did';
import { DidCache } from './did-cache';
export class DidCachedService {
  private static file = 'didCached';

  private static entires: Map<string, DidCache>;

  static load(): void {
    if (exists(this.file)) {
      this.entires = new Map(JSON.parse(read(this.file)));
    } else {
      this.entires = new Map<string, DidCache>();
    }
  }

  static save(): void {
    write(this.file, JSON.stringify(Array.from(this.entires.values())));
  }

  // TODO also add the version number to make sure the timestamp is not the only value that can be used.
  static add(did: Did, timestamp: string): void {
    if (!this.entires) {
      this.load();
    }
    const cached = this.entires.get(did.id);
    if (!(cached && cached.timestamp === timestamp)) {
      this.entires.set(did.id, { value: did, timestamp });
    }
  }

  static get(id: string, timestamp: string): DidCache | undefined {
    if (!this.entires) {
      this.load();
    }
    const did = this.entires.get(id);
    return did?.timestamp === timestamp ? did : undefined;
  }
}
