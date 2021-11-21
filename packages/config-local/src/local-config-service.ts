import {
  exists,
  read,
  write,
  ConfigService,
  Config,
  DecryptedKeyPair,
} from '@trustcerts/core';

export class LocalConfigService extends ConfigService {
  constructor(private storagePath: string) {
    super();
  }

  async init(values?: Config): Promise<void> {
    if (exists(this.storagePath)) {
      await this.loadConfig();
      return;
    }
    if (values) {
      this.config = values;
    } else {
      throw Error('no config found');
    }
    // DidManager.verifier = new DidVerifierService(this.config.endPoints.observers);
    write(this.storagePath, JSON.stringify(this.config, null, 4));
  }

  async loadConfig(): Promise<void> {
    if (!exists(this.storagePath)) {
      throw Error('path does not exists');
    }
    this.config = JSON.parse(read(this.storagePath)) as Config;
    return Promise.resolve();
  }

  async saveKeys(): Promise<void> {
    write(this.storagePath, JSON.stringify(this.config, null, 4));
    return Promise.resolve();
  }

  async addKeyPair(keyPair: DecryptedKeyPair): Promise<void> {
    this.config.keyPairs?.push(keyPair);
    await this.saveKeys();
  }
}
