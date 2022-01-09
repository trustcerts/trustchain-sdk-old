import { ClaimValues } from './claim-values';
import { Compress, JsonCompressor, Proto } from './compress';
import { TemplateVerifierService } from '@trustcerts/template-verify';
import { SignatureVerifierService } from '@trustcerts/signature-verify';
import { getHash, sortKeys } from '@trustcerts/core';
import { CompressionTypeEnum } from '@trustcerts/observer';
import { Claim } from './claim';
import Ajv from 'ajv';

/**
 * Verifier to validate claims
 */
export class ClaimVerifierService {
  constructor(
    private templateEngine: TemplateVerifierService,
    private signatureVerifier: SignatureVerifierService,
    private host: string
  ) {}

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
    const template = await this.templateEngine.get(did);
    let compressor: Compress;
    if (
      template.compression.type === CompressionTypeEnum.Proto &&
      template.compression.value
    ) {
      compressor = new Proto(JSON.parse(template.compression.value));
    } else {
      compressor = new JsonCompressor();
    }

    const values: ClaimValues = compressor.decompress<ClaimValues>(
      decodeURIComponent(data[1])
    );

    // validate schema
    const avj = new Ajv();
    if (!avj.validate(JSON.parse(template.schema), values)) {
      throw new Error('values do not match with schema');
    }

    // verify
    const hashValue = await ClaimVerifierService.getHash(values, did);
    const hash = await this.signatureVerifier
      .verifyString(hashValue)
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
