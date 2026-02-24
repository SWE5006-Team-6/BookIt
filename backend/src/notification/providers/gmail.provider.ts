import { Buffer } from 'node:buffer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { EmailProvider } from '../types/email-provider.types';
import { EmailPayload } from '../types/email.types';

@Injectable()
export class GmailProvider implements EmailProvider {
  private readonly logger = new Logger(GmailProvider.name);
  private readonly gmailUser: string;
  private readonly gmail: ReturnType<typeof google.gmail>;

  constructor(private readonly configService: ConfigService) {
    this.gmailUser = this.configService.getOrThrow<string>('GMAIL_USER');
    const clientId = this.configService.getOrThrow<string>('GMAIL_CLIENT_ID');
    const clientSecret =
      this.configService.getOrThrow<string>('GMAIL_CLIENT_SECRET');
    const refreshToken =
      this.configService.getOrThrow<string>('GMAIL_REFRESH_TOKEN');

    const oAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground',
    );
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    this.gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  }

  async send(payload: EmailPayload): Promise<void> {
    const rawMessage = this.buildRawMessage(this.gmailUser, payload);
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${payload.to}: ${message}`);
      throw new Error('Failed to send email through Gmail API');
    }
  }

  private buildRawMessage(from: string, payload: EmailPayload): string {
    return [
      `From: ${from}`,
      `To: ${payload.to}`,
      `Subject: ${this.encodeHeader(payload.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      payload.html || payload.text,
    ].join('\n');
  }

  private encodeHeader(value: string): string {
    return /[^\x00-\x7F]/.test(value)
      ? `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`
      : value;
  }
}
