import { Manage } from './manage';
export class Management<T> extends Manage<T> {
  current = new Map<string, T>();
}
