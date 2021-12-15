import { ConfigService } from '@trustcerts/core';
import { CloudService } from './cloud-service';

export interface CloudLogin {
  username: string;
  password: string;
  token?: string;
}

export class CloudConfigService extends ConfigService {
  constructor(private cloudService: CloudService) {
    super();
  }

  // check if service can be init. If there is an access token and an encryption token, service can be loaded. if not the username and password is required

  async init(): Promise<void> {
    return this.cloudService.init();
  }

  async loadConfig(): Promise<void> {
    this.config = await this.cloudService.getConfig();
  }

  async saveConfig(): Promise<void> {
    await this.cloudService.saveConfig(this.config);
  }
}
