export interface Network {
  gateways: string[];
  observers: string[];
}

/**
 * Structure how to save networks.
 */
export interface Networks {
  [key: string]: {
    [key: string]: Network;
  };
}
