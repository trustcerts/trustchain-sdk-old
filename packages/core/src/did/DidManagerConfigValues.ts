import { DidTransaction } from '../bc/observer';
import { InitDidManagerConfigValues } from './InitDidManagerConfigValues';

export interface DidManagerConfigValues extends InitDidManagerConfigValues {
  validateChainOfTrust: boolean;
  transactions: DidTransaction[];
  time: string;
  doc: boolean;
}
