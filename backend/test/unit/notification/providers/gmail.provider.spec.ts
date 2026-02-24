import { Buffer } from 'node:buffer';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GmailProvider } from '../../../../src/notification/providers/gmail.provider';

var mockSend: jest.Mock;
var mockGmailFactory: jest.Mock;
var mockSetCredentials: jest.Mock;
var mockOAuth2Ctor: jest.Mock;

jest.mock('googleapis', () => {
  mockSend = jest.fn();
  mockSetCredentials = jest.fn();
  mockGmailFactory = jest.fn().mockReturnValue({
    users: {
      messages: {
        send: mockSend,
      },
    },
  });
  mockOAuth2Ctor = jest.fn().mockImplementation(() => ({
    setCredentials: mockSetCredentials,
  }));

  return {
    google: {
      auth: { OAuth2: mockOAuth2Ctor },
      gmail: mockGmailFactory,
    },
  };
});

function decodeBase64Url(raw: string): string {
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(`${base64}${padding}`, 'base64').toString('utf8');
}

describe('GmailProvider', () => {
  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        GMAIL_USER: 'sender@example.com',
        GMAIL_CLIENT_ID: 'client-id',
        GMAIL_CLIENT_SECRET: 'client-secret',
        GMAIL_REFRESH_TOKEN: 'refresh-token',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize OAuth and gmail client in constructor', () => {
    new GmailProvider(mockConfig);

    expect(mockOAuth2Ctor).toHaveBeenCalledWith(
      'client-id',
      'client-secret',
      'https://developers.google.com/oauthplayground',
    );
    expect(mockSetCredentials).toHaveBeenCalledWith({
      refresh_token: 'refresh-token',
    });
    expect(mockGmailFactory).toHaveBeenCalledWith({
      version: 'v1',
      auth: expect.any(Object),
    });
  });

  it('should throw when required config value is missing', () => {
    const brokenConfig = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'GMAIL_USER') {
          throw new Error('Missing GMAIL_USER');
        }
        return 'value';
      }),
    } as unknown as ConfigService;

    expect(() => new GmailProvider(brokenConfig)).toThrow('Missing GMAIL_USER');
  });

  it('should send email with html body and ascii subject', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = new GmailProvider(mockConfig);

    await provider.send({
      to: 'user@example.com',
      subject: 'Booking Confirmed',
      text: 'fallback text',
      html: '<p>Hello</p>',
    });

    expect(mockSend).toHaveBeenCalledWith({
      userId: 'me',
      requestBody: { raw: expect.any(String) },
    });

    const callArg = mockSend.mock.calls[0][0];
    const decoded = decodeBase64Url(callArg.requestBody.raw);
    expect(decoded).toContain('From: sender@example.com');
    expect(decoded).toContain('To: user@example.com');
    expect(decoded).toContain('Subject: Booking Confirmed');
    expect(decoded).toContain('<p>Hello</p>');
  });

  it('should fallback to text body and encode non-ascii subject', async () => {
    mockSend.mockResolvedValueOnce({});
    const provider = new GmailProvider(mockConfig);

    await provider.send({
      to: 'user@example.com',
      subject: '预约确认',
      text: 'Plain text body',
      html: '',
    });

    const callArg = mockSend.mock.calls[0][0];
    const decoded = decodeBase64Url(callArg.requestBody.raw);

    expect(decoded).toContain('Subject: =?UTF-8?B?');
    expect(decoded).toContain('Plain text body');
  });

  it('should log and throw when gmail send fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('invalid_grant'));
    const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const provider = new GmailProvider(mockConfig);

    await expect(
      provider.send({
        to: 'user@example.com',
        subject: 'Subject',
        text: 'Text',
        html: '<p>Text</p>',
      }),
    ).rejects.toThrow('Failed to send email through Gmail API');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send email to user@example.com: invalid_grant'),
    );
  });

  it('should log unknown error message when thrown value is not Error', async () => {
    mockSend.mockRejectedValueOnce('boom');
    const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const provider = new GmailProvider(mockConfig);

    await expect(
      provider.send({
        to: 'user@example.com',
        subject: 'Subject',
        text: 'Text',
        html: '<p>Text</p>',
      }),
    ).rejects.toThrow('Failed to send email through Gmail API');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send email to user@example.com: Unknown error'),
    );
  });
});
