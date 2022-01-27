import { InitDidManagerConfigValues } from './InitDidManagerConfigValues';

export interface DidManagerConfigValues<Type>
  extends InitDidManagerConfigValues<Type> {
  validateChainOfTrust: boolean;
  transactions: Type[];
  time: string;
  doc: boolean;
}
