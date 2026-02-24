import { EmailPayload } from './email.types';

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}
