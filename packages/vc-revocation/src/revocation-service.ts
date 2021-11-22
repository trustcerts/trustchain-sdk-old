import { read, write } from '@trustcerts/core';
import {
  createCredential,
  createList,
  decodeList,
} from '@transmute/vc-status-rl-2020';
import {
  ICredentialStatus,
  IRevocationListConfig,
  IRevocationListCredential,
} from './revocation.interface';

export class RevocationService {
  // TODO: better persistence than just a local file
  private revocationListConfigPath = './revocationListConfig.json';

  // temporarily store Credential locally instead of blockchain (until blockchain support is implemented)
  private revocationListCredentialPath = './revocationListCredential.json';

  private revocationListConfig!: IRevocationListConfig;

  private revocationListCredential!: IRevocationListCredential;

  private defaultConfig: IRevocationListConfig = {
    id: 'did:trust:tc:dev:id:TestRevocationListabcd',
    url: 'https://example.com/trustcerts/credentials/status/3',
    nextIndex: 0,
    length: 100000,
  };

  // private bbsAssertionKey: DecryptedKeyPair;
  // private bbsAuthenticationKey: DecryptedKeyPair;

  // private config: ConfigService;

  constructor() {
    // Ausgeklammert weil noch kein Blockchain-Support
    // DidNetworks.add('tc:dev', network);
    // Identifier.setNetwork('tc:dev');
    // this.config = new LocalConfigService(filePath);
  }

  public async init(): Promise<void> {
    await this.loadConfig();
    // Ausgeklammert weil noch kein Blockchain-Support

    // await this.config.init(configValues);

    // const walletService = new WalletService(this.config);
    // await walletService.init();

    // const cryptoServiceRSA = new CryptoService();

    // this.bbsAssertionKey = (
    //     await walletService.findOrCreate(VerificationRelationshipType.assertionMethod, SignatureType.Bbs)
    // )[0];
    // this.bbsAuthenticationKey = (
    //     await walletService.findOrCreate(VerificationRelationshipType.authentication, SignatureType.Bbs)
    // )[0];

    // if (!exists(this.revocationListConfigPath)) {
    //     this.createNewRevocationList();
    //     write(this.revocationListConfigPath, JSON.stringify({}, null, 4));
    // }
  }

  private async createNewRevocationListCredential(): Promise<
    IRevocationListCredential
  > {
    // TODO: Override DID document
    // Revocation List anlegen und an Blockchain senden
    // Config speichern

    const list = await createList({
      length: this.revocationListConfig.length,
    });
    const rlCredential = await createCredential({
      id: this.revocationListConfig.id,
      list,
    });

    return rlCredential;

    // Ausgeklammert weil noch kein Blockchain-Support
    // const bbsVcIssuerService = new BbsVerifiableCredentialIssuerService();

    // const vc = await bbsVcIssuerService.createBBSVerifiableCredential(
    //     {
    //         ...rlCredential,
    //         issuer: this.config.config.invite!.id
    //     },
    //     this.bbsAssertionKey,
    //     false
    // );
  }

  private async initConfig(): Promise<void> {
    this.revocationListConfig = this.defaultConfig;
    this.revocationListCredential = await this.createNewRevocationListCredential();

    this.saveConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      this.revocationListConfig = JSON.parse(
        read(this.revocationListConfigPath)
      ) as IRevocationListConfig;
      // eigentlich aus Blockchain laden
      this.revocationListCredential = JSON.parse(
        read(this.revocationListCredentialPath)
      ) as IRevocationListCredential;
    } catch (e) {
      await this.initConfig();
    }
  }

  private saveConfig(): void {
    write(
      this.revocationListConfigPath,
      JSON.stringify(this.revocationListConfig, null, 4)
    );
    // eigentlich in Blockchain speichern
    write(
      this.revocationListCredentialPath,
      JSON.stringify(this.revocationListCredential, null, 4)
    );
  }

  public async getNewCredentialStatus(): Promise<ICredentialStatus> {
    await this.reloadConfig();
    const index = this.revocationListConfig.nextIndex;
    this.revocationListConfig.nextIndex += 1;
    if (
      this.revocationListConfig.nextIndex >= this.revocationListConfig.length
    ) {
      // TODO: handle this case
      throw Error('revocation list is full!!!');
    }
    this.saveConfig();
    return {
      id: `${this.revocationListConfig.id}#${index}`,
      type: 'RevocationList2020Status',
      revocationListCredential: this.revocationListConfig.url,
      revocationListIndex: `${index}`,
    };
  }

  public async isRevoked(
    credentialStatus: ICredentialStatus
  ): Promise<boolean> {
    await this.reloadConfig();
    if (
      credentialStatus.revocationListCredential != this.revocationListConfig.url
    ) {
      // TODO: Handling mehrerer URLs?
      throw Error(
        'Revocation list URL in credentialStatus does not equal this revocation list URL'
      );
    }
    const index = Number(credentialStatus.revocationListIndex);
    if (index >= this.revocationListConfig.nextIndex) {
      throw Error('index is not used yet');
    }

    const list = await decodeList(
      this.revocationListCredential.credentialSubject
    );
    return list.isRevoked(index) as boolean;
  }

  public async setRevoked(
    credentialStatus: ICredentialStatus,
    revoked: boolean
  ): Promise<void> {
    await this.reloadConfig();
    if (
      credentialStatus.revocationListCredential != this.revocationListConfig.url
    ) {
      // TODO: Handling mehrerer URLs?
      throw Error(
        'Revocation list URL in credentialStatus does not equal this revocation list URL'
      );
    }
    const index = Number(credentialStatus.revocationListIndex);

    if (index >= this.revocationListConfig.nextIndex) {
      throw Error('index is not used yet');
    }

    const list = await decodeList(
      this.revocationListCredential.credentialSubject
    );
    list.setRevoked(index, revoked);

    this.revocationListCredential = await createCredential({
      id: this.revocationListConfig.id,
      list,
    });
    this.saveConfig();
  }

  private async reloadConfig(): Promise<void> {
    // method only needed as long as we cannot guarantee singleton (only *one* instance used across project)
    // TODO: reload config if file has been modified
    // temporary workaround: just reload every time

    await this.loadConfig();
  }
}
