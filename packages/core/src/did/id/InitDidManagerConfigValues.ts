import { DidTransaction } from '../../bc/observer';

export interface InitDidManagerConfigValues {
  validateChainOfTrust?: boolean;
  transactions?: DidTransaction[];
  time?: string;
  version?: number;
  doc?: boolean;
}
