import { logger, VerifierService } from '@trustcerts/core';
import { TemplateObserverApi, Template } from '@trustcerts/observer';

export class TemplateVerifierService extends VerifierService {
  protected apis: TemplateObserverApi[];

  constructor(protected observerUrls: string[], equalMin = 2) {
    super(observerUrls, equalMin);
    this.apis = this.apiConfigurations.map(
      config => new TemplateObserverApi(config)
    );
  }

  async get(id: string): Promise<Template> {
    const responses: { amount: number; value: Template }[] = [];
    for (const api of this.apis) {
      const res = await api
        .observerTemplateControllerGetTemplate(id, { timeout: 2000 })
        .catch(err => logger.warn(err));
      if (res) {
        const index = responses.findIndex(response => {
          return JSON.stringify(response.value) === JSON.stringify(res.data);
        });
        if (index >= 0) {
          responses[index].amount++;
          if (responses[index].amount === this.equalMin) {
            return Promise.resolve(responses[index].value);
          }
        } else {
          responses.push({ value: res.data, amount: 1 });
          if (this.equalMin === 1) {
            return Promise.resolve(responses[0].value);
          }
        }
      }
    }
    return Promise.reject('not enough matches');
  }
}
