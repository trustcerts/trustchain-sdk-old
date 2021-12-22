import { SignatureIssuerService } from '@trustcerts/signature-create';
import { Template } from '@trustcerts/observer';
import {
  ClaimValues,
  Claim,
  ClaimVerifierService,
} from '@trustcerts/claim-verify';
import Ajv from 'ajv';

/**
 * service to creaton and revocation of claims
 */
export class ClaimIssuerService {
  /**
   * create a claim.
   */
  async create(
    template: Template,
    values: ClaimValues,
    host: string,
    signatureIssuer: SignatureIssuerService
  ): Promise<Claim> {
    const ajv = new Ajv();
    if (!ajv.validate(JSON.parse(template.schema), values)) {
      throw Error('input does not match with schema');
    }
    const hash = await ClaimVerifierService.getHash(values, template.id);
    await signatureIssuer.signString(hash);
    return new Claim(values, template, host);
  }

  /**
   * revokes a claim.
   * @param claim
   * @param signatureIssuer
   */
  async revoke(
    claim: Claim,
    signatureIssuer: SignatureIssuerService
  ): Promise<void> {
    const hash = await ClaimVerifierService.getHash(
      claim.values,
      claim.getTemplateId()
    );
    await signatureIssuer.revokeString(hash);
  }
}
