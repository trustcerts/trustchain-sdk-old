/**
 * Values of a user template.
 */
export interface ClaimValues {
  /**
   * Random value to make input more dynamic.
   */
  random: Buffer | string;
  
  /**
   * Allow for further custom properties.
   */
  [key: string]: any;
}
