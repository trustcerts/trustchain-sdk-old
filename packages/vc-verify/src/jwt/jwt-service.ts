import { JWTHeader, JWTPayload } from '@trustcerts/core';
import base64url from 'base64url';

export class JWT {
  private header: JWTHeader;
  private payload: JWTPayload;
  private signature: string;

  /**
   * Creates a new JWT from the encoded JWT string
   * @param jwt The JWT as an encoded string
   */
  constructor(private jwt: string) {
    // const jwtHeader : JWTHeader = JSON.parse(Buffer.from(presentation.split('.')[0], 'base64url').toString('binary')) as JWTHeader;

    const jwtParts = jwt.split('.');

    this.header = this.decode(jwtParts[0]);
    this.payload = this.decode(jwtParts[1]);
    this.signature = jwtParts[2];
  }

  /**
   * @returns The header of the JWT
   */
  public getHeader(): JWTHeader {
    return this.header;
  }

  /**
   * @returns The payload of the JWT
   */
  public getPayload(): JWTPayload {
    return this.payload;
  }

  /**
   * @returns The signature of the JWT
   */
  public getSignature(): string {
    return this.signature;
  }

  /**
   * @returns The JWT encoded as a string
   */
  public getJWT(): string {
    return this.jwt;
  }

  /**
   * Decodes a base64url encoded payload
   * @param value The base64url encoded payload
   * @returns The decoded payload
   */
  decode<T>(value: string): T {
    return JSON.parse(base64url.decode(value)) as T;
    //return JSON.parse(Buffer.from(value, 'base64url').toString('binary')) as T;
  }
}
