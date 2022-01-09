import { DidTransaction } from '@trustcerts/observer';

export interface InitDidManagerConfigValues {
  validateChainOfTrust?: boolean;
  transactions?: DidTransaction[];
  time?: string;
  version?: number;
  doc?: boolean;
}
