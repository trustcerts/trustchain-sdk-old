import {
  DidPublicKey,
  DidService,
  RoleManageAddEnum,
} from '@trustcerts/observer';
import { IDidDocument } from '../did-document';

export interface IDidIdDocument extends IDidDocument {
  verificationMethod: DidPublicKey[];
  authentication: string[];
  service: DidService[];
  assertionMethod: string[];
  role: RoleManageAddEnum[];
  modification: string[];
}
