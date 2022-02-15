import { toDataURL } from 'qrcode';
import mustache from 'mustache';
import { ClaimValues } from './claim-values';
import { Compress, JsonCompressor, Proto } from './compress';
import { CompressionTypeEnum } from '@trustcerts/observer';
import { DidSignature } from '@trustcerts/signature-verify';
import { DidTemplate } from '@trustcerts/template-verify';
/**
 * Class object to handle a claim
 */
export class Claim {
  /**
   * Url of the claim.
   */
  private url: string;

  /**
   * Information about the validation.
   */
  private hash?: DidSignature;

  /**
   * Sets values based on compression algorithm.
   */
  constructor(
    public values: ClaimValues,
    private template: DidTemplate,
    host: string
  ) {
    let compressor: Compress;
    if (
      template.compression.type === CompressionTypeEnum.Proto &&
      template.compression.value
    ) {
      compressor = new Proto(JSON.parse(template.compression.value));
    } else {
      compressor = new JsonCompressor();
    }
    this.url = this.setUrl(
      host,
      template.id,
      compressor.compress<ClaimValues>(values)
    );
  }

  /**
   * Generates the qr code of a url.
   * @param url
   */
  private async getQRCode(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      toDataURL(
        url,
        {
          errorCorrectionLevel: 'L',
          color: {
            dark: '#000',
            light: '#0000',
          },
        },
        (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result);
        }
      );
    });
  }

  /**
   * returns the template id of the claim.
   * @returns
   */
  public getTemplateId(): string {
    return this.template.id;
  }

  /**
   * Builds the url of the element.
   * @param templateDid
   * @param values
   */
  private setUrl(host: string, templateDid: string, values: string): string {
    return `${host}/${templateDid}#${encodeURIComponent(values)}`;
  }

  /**
   * Returns the url including the host, template reference and values.
   * @returns
   */
  public getUrl(): string {
    return this.url;
  }

  /**
   * Generates the html representation of a claim.
   */
  public async getHtml(): Promise<string> {
    // generate the output file
    const qrCode = await this.getQRCode(this.url);
    return mustache.render(this.template.template, {
      ...this.values,
      qrCode,
    });
  }

  //TODO since this will not work in the browser this function is commented out
  // /**
  //  * Generates a pdf document and returns the content as buffer.
  //  * @param fileName
  //  * @param html
  //  */
  // public async getPdf(): Promise<Buffer> {
  //     const html = await this.getHtml();
  //     return new Promise((resolve, reject) => {
  //         pdf.create(html, { format: 'A4' }).toBuffer((err: Error, buffer: Buffer) => {
  //             if (err) {
  //                 reject(err);
  //             } else {
  //                 resolve(buffer);
  //             }
  //         });
  //     });
  // }

  /**
   * Sets the validation results of the claim
   * @param hash
   */
  public setValidation(hash: DidSignature): void {
    this.hash = hash;
  }

  /**
   * Returns the validation information about the claim.
   * @returns
   */
  public getValidation(): DidSignature | undefined {
    return this.hash;
  }
}
