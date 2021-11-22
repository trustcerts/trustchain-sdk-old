import { Observer, logger, VerifierService } from '@trustcerts/core';

export class TemplateVerifierService extends VerifierService {
  protected apis: Observer.TemplateObserverApi[];

  constructor(protected observerUrls: string[], equalMin = 2) {
    super(observerUrls, equalMin);
    this.apis = this.apiConfigurations.map(
      config => new Observer.TemplateObserverApi(config)
    );
  }

  async get(id: string): Promise<Observer.Template> {
    const responses: { amount: number; value: Observer.Template }[] = [];
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
