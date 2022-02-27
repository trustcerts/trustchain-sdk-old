import {
  CryptoService,
  generateKeyPair,
  DidId,
  VerificationRelationshipType,
  DidIdResolver,
  DidNetworks,
  logger,
  ConfigService,
  DecryptedKeyPair,
  SignatureType,
} from '@trustcerts/core';
import { DidIdIssuerService, DidIdRegister } from '@trustcerts/did-id-create';
export class WalletService {
  public did!: DidId;

  protected resolver = new DidIdResolver();

  // give my id to get public keys (and to update it)
  // give my private keys for signing
  constructor(public configService: ConfigService) {}

  /**
   * Loads own did. If it does not exist, it is created using the invite.
   */
  public async init(): Promise<void> {
    if (!this.configService.config.invite) {
      throw new Error('no id found');
    }
    this.did = await this.resolver
      .load(this.configService.config.invite.id)
      .catch(async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return DidIdRegister.createByInvite(
          this.configService.config.invite!
        ).then(
          async values => {
            // save the key that way used.
            this.configService.config.keyPairs.push(values.keyPair);
            await this.configService.saveConfig();
            return values.did;
          },
          (err: Error) => {
            throw new Error(`Could not create DID by invite: ${err.message}`);
          }
        );
      });
  }

  /**
   * Returns a list of stored keys.
   * @returns An array of DecryptedKeyPairs
   */
  listKeys(): DecryptedKeyPair[] {
    return this.configService.config.keyPairs;
  }

  /**
   * Returns a key by its id.
   * @param id The id of the key
   * @returns A DecryptedKeyPair
   */
  findKeyByID(id: string): DecryptedKeyPair | undefined {
    return this.configService.config.keyPairs.find(
      keyPair => keyPair.identifier === id
    );
  }

  /**
   * Removes a key with a certain key id.
   * @param keyId The id of the key that shall be removed
   */
  async removeKeyByID(keyId: string): Promise<void> {
    const keyPosition = this.configService.config.keyPairs.findIndex(
      keyPair => keyPair.identifier === keyId
    );
    if (keyPosition > -1) {
      this.configService.config.keyPairs.splice(keyPosition, 1);
    }
    await this.configService.saveConfig();
    this.did.removeKey(keyId);
    // remove verification relationship
    this.did.removeAllVerificationRelationships(keyId);
  }

  find(
    verificationRelationshipType: VerificationRelationshipType,
    signatureType: SignatureType
  ): DecryptedKeyPair[] {
    const allowedIds = this.did.findByVerificationRelationship(
      verificationRelationshipType
    );
    const foundKeys = this.configService.config.keyPairs.filter(keyPair => {
      return (
        keyPair.signatureType === signatureType &&
        allowedIds.includes(keyPair.identifier)
      );
    });
    return foundKeys;
  }

  async findOrCreate(
    verificationRelationshipType: VerificationRelationshipType,
    signatureType: SignatureType
  ): Promise<DecryptedKeyPair[]> {
    const allowedIds = this.did.findByVerificationRelationship(
      verificationRelationshipType
    );
    const keys = this.configService.config.keyPairs.filter(keyPair => {
      return (
        keyPair.signatureType === signatureType &&
        allowedIds.includes(keyPair.identifier)
      );
    });
    if (keys.length === 0) {
      if (
        verificationRelationshipType ===
        VerificationRelationshipType.modification
      ) {
        // no chance to self control the did, add a new key via an invite
        keys.push(await this.createModificationKeyByInvite());
      } else {
        keys.push(
          await this.createAndPersistKey(
            verificationRelationshipType,
            signatureType
          )
        );
      }
    }
    return keys;
  }

  createModificationKeyByInvite(): Promise<DecryptedKeyPair> {
    // set modification key by invite
    const invite = this.configService.config.invite;
    if (!invite) {
      throw new Error('no invite present');
    }
    return DidIdRegister.createByInvite(invite).then(async values => {
      // save the key that way used.
      this.configService.config.keyPairs.push(values.keyPair);
      await this.configService.saveConfig();
      //update the did in the wallet
      this.did = values.did;
      return values.keyPair;
    });
  }

  /**
   * This method add as new key via addKey and persists it in the DID document by using or creating a modificaton key.
   *
   * @param {VerificationRelationshipType} verificationRelationshipType The verification relationships it shall be added to
   * @param {SignatureType} signatureType The signature type of the key
   * @returns {Promise<DecryptedKeyPair>} The newly created key pair
   * @memberof WalletService
   */
  async createAndPersistKey(
    verificationRelationshipType: VerificationRelationshipType,
    signatureType: SignatureType
  ): Promise<DecryptedKeyPair> {
    // get key to update the did
    const cryptoDid = new CryptoService();
    const modificationKey = (
      await this.findOrCreate(
        VerificationRelationshipType.modification,
        SignatureType.Rsa
      )
    )[0];
    // init crypto key
    await cryptoDid.init(modificationKey);
    const didIdIssuerService = new DidIdIssuerService(
      DidNetworks.resolveNetwork(this.did.id).gateways,
      cryptoDid
    );
    // if there is no key with such specification add it to the did
    const key = await this.addKey(
      [verificationRelationshipType],
      signatureType
    );
    // add new created assertion key to did
    await DidIdRegister.save(this.did, didIdIssuerService);
    return key;
  }

  /**
   * Generates a new key pair for the given signature type and persists
   * it in the DID document in the specified verification relationships.
   * @param verificationRelationships The verification relationships it shall be added to
   * @param signatureType The signature type of the key
   * @returns The newly generated key pair
   */
  async addKey(
    verificationRelationships: VerificationRelationshipType[] = [],
    signatureType: SignatureType
  ): Promise<DecryptedKeyPair> {
    const newKey = await generateKeyPair(this.did.id, signatureType);
    // persist in config
    this.configService.config.keyPairs.push(newKey);
    await this.configService.saveConfig();
    this.did.addKey(newKey.identifier, newKey.publicKey);
    // adds relationships when passed
    verificationRelationships.forEach(verificationRelationship =>
      this.did.addVerificationRelationship(
        newKey.identifier,
        verificationRelationship
      )
    );
    return newKey;
  }

  /**
   * Remove all keys from local config service that do not exist in the corresponding DID document
   *
   * @returns {Promise <void>}
   * @memberof WalletService
   */
  public async tidyUp(): Promise<void> {
    const keyList = this.listKeys();
    const invalidKeys: string[] = [];
    const promises: Promise<void | number>[] = [];
    keyList.forEach(keyPair => {
      const promise = this.validateKey(keyPair).catch(() =>
        invalidKeys.push(keyPair.identifier)
      );
      promises.push(promise);
    });
    await Promise.all(promises);

    for (const keyPairID of invalidKeys) {
      logger.debug(
        'Removing key ' +
          keyPairID +
          ' because it was not found in the remote wallet'
      );
      const keyPosition = this.configService.config.keyPairs.findIndex(
        keyPair => keyPair.identifier === keyPairID
      );
      if (keyPosition > -1) {
        this.configService.config.keyPairs.splice(keyPosition, 1);
      }
      await this.configService.saveConfig();
    }
  }

  /**
   * Checks if the given key pair can be used by checking if it is present in a DID document.
   * It will only be checked if the key is present in the verification method.
   *
   * @param keyPair The id of the key
   * @returns True if it is present in the DID document
   */
  private async validateKey(keyPair: DecryptedKeyPair) {
    return this.resolver.load(keyPair.identifier).then(
      did => {
        if (!did.hasKey(keyPair.identifier)) {
          return Promise.reject('Key not found in remote DID document');
        } else {
          return Promise.resolve();
        }
      },
      (err: Error) => {
        return Promise.reject(`DID not found: ${err.message}`);
      }
    );
  }
}
