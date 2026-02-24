import { EmailPayload } from '../types/email.types';

export abstract class BaseEmailTemplate<TData> {
  build(data: TData): Omit<EmailPayload, 'to'> {
    return {
      subject: this.buildSubject(data),
      text: this.buildText(data),
      html: this.buildHtml(data),
    };
  }

  protected abstract buildSubject(data: TData): string;
  protected abstract buildText(data: TData): string;
  protected abstract buildHtml(data: TData): string;
}
