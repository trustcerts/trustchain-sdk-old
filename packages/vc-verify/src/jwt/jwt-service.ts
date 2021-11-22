import { JWTHeader, JWTPayload } from '@trustcerts/core';
import base64url from 'base64url';

export class JWT {
  private header: JWTHeader;
  private payload: JWTPayload;
  private signature: string;

  constructor(private jwt: string) {
    // const jwtHeader : JWTHeader = JSON.parse(Buffer.from(presentation.split('.')[0], 'base64url').toString('binary')) as JWTHeader;

    const jwtParts = jwt.split('.');

    this.header = this.decode(jwtParts[0]);
    this.payload = this.decode(jwtParts[1]);
    this.signature = jwtParts[2];
  }

  public getHeader(): JWTHeader {
    return this.header;
  }

  public getPayload(): JWTPayload {
    return this.payload;
  }

  public getSignature(): string {
    return this.signature;
  }

  public getJWT(): string {
    return this.jwt;
  }

  decode<T>(value: string): T {
    return JSON.parse(base64url.decode(value)) as T;
    //return JSON.parse(Buffer.from(value, 'base64url').toString('binary')) as T;
  }
}
