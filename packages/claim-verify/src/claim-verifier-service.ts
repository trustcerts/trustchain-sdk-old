import { ClaimValues } from './claim-values';
import { Compress, JsonCompressor, Proto } from './compress';
import { DidTemplateResolver } from '@trustcerts/template-verify';
import { DidSignatureResolver } from '@trustcerts/signature-verify';
import { getHash, Identifier, sortKeys } from '@trustcerts/core';
import { CompressionType } from '@trustcerts/observer';
import { DidSchemaResolver } from '@trustcerts/schema-verify';
import { Claim } from './claim';
import Ajv from 'ajv';

/**
 * Verifier to validate claims
 */
export class ClaimVerifierService {
  private didTemplateResolver = new DidTemplateResolver();
  private didSchemaResolver = new DidSchemaResolver();
  private didSignatureResolver = new DidSignatureResolver();

  constructor(private host: string) {}

  /**
   * Builds a claim object based on the given url and the template engine and verifier endpoints.
   * @param url
   * @param templateEngine
   * @param verifier
   * @returns
   */
  public async get(url: string): Promise<Claim> {
    // TODO right now the url only includes the parameter but not the host. evaluate if the whole url should be passed.
    const data = url.split('#');
    const did = data[0];
    const template = await this.didTemplateResolver.load(did);
    let compressor: Compress;
    if (
      template.compression.type === CompressionType.Proto &&
      template.compression.value
    ) {
      compressor = new Proto(JSON.parse(template.compression.value));
    } else {
      compressor = new JsonCompressor();
    }

    const values: ClaimValues = compressor.decompress<ClaimValues>(
      decodeURIComponent(data[1])
    );

    const schema = await this.didSchemaResolver.load(template.schemaId);
    // validate schema
    const avj = new Ajv();
    if (!avj.validate(JSON.parse(schema.schema), values)) {
      throw new Error('values do not match with schema');
    }

    // verify
    const hashValue = await ClaimVerifierService.getHash(values, did);
    const hash = await this.didSignatureResolver
      .load(Identifier.generate('hash', hashValue))
      .catch(() => {
        throw Error('failed to verify');
      });
    const claim = new Claim(values, template, this.host);
    claim.setValidation(hash);
    return claim;
  }

  /**
   * Calculates the hash of the values.
   * @param values
   */
  public static async getHash(
    values: ClaimValues,
    templateDid: string
  ): Promise<string> {
    return getHash(JSON.stringify(sortKeys(values)) + templateDid);
  }
}
