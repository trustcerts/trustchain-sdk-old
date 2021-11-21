import { DidPublicKey, DidService, RoleManageAddEnum } from '../../bc/observer';
import { IDidDocument } from '../did-document';

export interface IDidIdDocument extends IDidDocument {
  verificationMethod: DidPublicKey[];
  authentication: string[];
  service: DidService[];
  assertionMethod: string[];
  role: RoleManageAddEnum[];
  modification: string[];
}
