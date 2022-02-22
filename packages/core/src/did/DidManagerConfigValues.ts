import { DidStructure } from '@trustcerts/observer';
import { InitDidManagerConfigValues } from './InitDidManagerConfigValues';

/*
 * statt string als Identifier -> nochmal custom Type als Identifier
 */

export interface DidManagerConfigValues<Type extends DidStructure>
  extends InitDidManagerConfigValues<Type> {
  validateChainOfTrust: boolean;
  transactions: Type[];
  time: string;
  doc: boolean;
}
