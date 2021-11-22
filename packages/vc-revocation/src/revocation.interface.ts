export interface IRevocationListConfig {
    id: string;
    url: string;
    nextIndex: number;
    length: number;
}

export interface IRevocationListCredential {
    '@context': string[];
    id: string;
    type: string[];
    credentialSubject: {
        id: string;
        type: string;
        encodedList: any;
    };
}

// TODO: Code-Dopplung mit ../vc-bbs/credential.interface.ts
export interface ICredentialStatus {
    id: string;
    type: string;
    revocationListIndex: string;
    revocationListCredential: string;
}
