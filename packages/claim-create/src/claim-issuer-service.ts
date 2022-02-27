import {
  SignatureIssuerService,
  DidSignatureRegister,
} from '@trustcerts/signature-create';
import { DidSignatureResolver } from '@trustcerts/signature-verify';
import { DidTemplate } from '@trustcerts/template-verify';
import { DidSchemaResolver } from '@trustcerts/schema-verify';
import {
  ClaimValues,
  Claim,
  ClaimVerifierService,
} from '@trustcerts/claim-verify';
import Ajv from 'ajv';
import { Identifier } from '@trustcerts/core';

/**
 * service to creaton and revocation of claims
 */
export class ClaimIssuerService {
  private didSchemaResolver = new DidSchemaResolver();
  private didSignatureRegister = new DidSignatureRegister();
  private didSignatureResolver = new DidSignatureResolver();

  /**
   * create a claim.
   */
  async create(
    template: DidTemplate,
    values: ClaimValues,
    host: string,
    signatureIssuer: SignatureIssuerService,
    controllers: string[],
  ): Promise<Claim> {
    const ajv = new Ajv();
    const schema = await this.didSchemaResolver.load(template.schemaId);
    if (!ajv.validate(JSON.parse(schema.schema), values)) {
      throw Error('input does not match with schema');
    }
    const hash = await ClaimVerifierService.getHash(values, template.id);
    const didHash = await this.didSignatureRegister.create({
      id: Identifier.generate('hash', hash),
      algorithm: 'sha256',
      controllers,
    });
    this.didSignatureRegister.save(didHash, signatureIssuer);
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
    const didHash = await this.didSignatureResolver
      .load(Identifier.generate('hash', hash))
      .catch(() => {
        throw new Error('hash of claim not found');
      });
    didHash.revoked = new Date().toISOString();
    await this.didSignatureRegister.save(didHash, signatureIssuer);
  }
}
