export interface InitDidManagerConfigValues<Type> {
  validateChainOfTrust?: boolean;
  transactions?: Type[];
  time?: string;
  version?: number;
  doc?: boolean;
}
