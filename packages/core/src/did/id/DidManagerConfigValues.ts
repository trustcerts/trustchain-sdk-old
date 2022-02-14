import { InitDidManagerConfigValues } from './InitDidManagerConfigValues';

/*
 * statt string als Identifier -> nochmal custom Type als Identifier
 */

export interface DidManagerConfigValues<Type>
  extends InitDidManagerConfigValues<Type> {
  validateChainOfTrust: boolean;
  transactions: Type[];
  time: string;
  doc: boolean;
}
