import { DidTransaction } from '../../bc/observer';
import { InitDidManagerConfigValues } from './InitDidManagerConfigValues';

/*
 * statt string als Identifier -> nochmal custom Type als Identifier
 */

export interface DidManagerConfigValues extends InitDidManagerConfigValues {
  validateChainOfTrust: boolean;
  transactions: DidTransaction[];
  time: string;
  doc: boolean;
}
