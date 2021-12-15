//https://app.quicktype.io/

export interface IVerifiableCredentialArguments {
  '@context': string[];
  type: string[];
  credentialSubject: ICredentialSubject;
  id: string;
  issuer: IIssuer | string;
  expirationDate?: string;
  nonce?: string; // Hatten wir zuvor bei JWT nicht optional definiert. Muss eine nonce definitiv gesetzt werden bei einem JWT VC?
}
export interface ICredentialSubject {
  [key: string]: any;
}
export interface IIssuer {
  id: string;
  name: string;
}

export interface IVerifiablePresentationArguments {
  '@context': string[];
  type: string[];
  verifiableCredentials: string[];
  holder: string;
  challenge: string;
  domain: string;
  expirationDate?: string;
  nonce: string;
}

export interface JWTHeader {
  alg: string;
  kid: string;
}
export interface JWTPayload {
  iss: string;
  jti: string;
  aud: string;
  nbf: string;
  iat: string;
  exp?: string;
  nonce?: string;
}
export interface JWTPayloadVC extends JWTPayload {
  vc: IVerifiableCredentialPayload;
}
export interface IVerifiableCredentialPayload {
  '@context': string[];
  type: string[];
  credentialSubject: ICredentialSubject;
  credentialStatus?: ICredentialStatus;
}

export interface JWTPayloadVP extends JWTPayload {
  vp: IVerifiablePresentationPayload;
}
export interface IVerifiablePresentationPayload {
  '@context': string[];
  type: string[];
  verifiableCredentials: string[];
}

export interface ICredentialStatus {
  id: string;
  type: string;
  revocationListIndex: string;
  revocationListCredential: string;
}

export interface IVerifiablePresentationArgumentsBBS {
  '@context': string[];
  type: string[];
  verifiableCredential: VerifiableCredentialBBS[];
  holder: string;
  challenge: string;
  domain: string;
  expirationDate?: string;
  // nonce: string;  // not supported by jsonld-signatures(-bbs) (yet)?
}
export interface VerifiableCredentialBBS {
  '@context': string[];
  id: string;
  type: string[];
  credentialSubject: ICredentialSubject;
  credentialStatus?: ICredentialStatus;
  issuer: IIssuer | string;
  issuanceDate: string;
  nonce?: string;
  proof: VerifiableCredentialBBSProof;
}

export interface VerifiableCredentialBBSProof {
  '@context'?: string | string[];
  type: ProofType;
  created: string;
  verificationMethod: string;
  proofPurpose: ProofPurpose;
  proofValue: string;
}

export interface BBSVerificationResult {
  verified: boolean;
  results: BBSVerificationProofResult[];
}
export interface BBSVerificationProofResult {
  proof: VerifiableCredentialBBSProof;
  verified: boolean;
}

export interface IVerifiablePresentationBBS {
  '@context': string[];
  type: string[];
  verifiableCredential: VerifiableCredentialBBS[];
  proof: VerifiablePresentationBBSProof;
}

export interface VerifiablePresentationBBSProof {
  '@context'?: string | string[];
  type: ProofType;
  created: string;
  verificationMethod: string;
  proofPurpose: ProofPurpose;
  proofValue: string;
  challenge: string;
  domain: string;
  // nonce: string;  // not supported by jsonld-signatures(-bbs) (yet)?
}

export enum ProofType {
  BbsBlsSignature2020 = 'BbsBlsSignature2020',
}

export enum ProofPurpose {
  AssertionMethod = 'assertionMethod',
  Authentication = 'authentication',
}
