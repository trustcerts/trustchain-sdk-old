export interface DidCreation {
  /**
   * if passed the id will be used
   */
  id?: string;
  /**
   * controllers that should be set for this did.
   */
  controllers?: string[];
}
