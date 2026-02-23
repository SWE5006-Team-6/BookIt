import { BadRequestException } from '@nestjs/common';

export interface BookingRequestContext {
  startAt: Date;
  endAt: Date;
  userId: string;
}

export abstract class BookingPolicyHandler {
  private nextHandler: BookingPolicyHandler | null = null;

  setNext(handler: BookingPolicyHandler): BookingPolicyHandler {
    this.nextHandler = handler;
    return handler;
  }

  async handle(context: BookingRequestContext): Promise<void> {
    await this.check(context);
    if (this.nextHandler) {
      await this.nextHandler.handle(context);
    }
  }

  protected abstract check(context: BookingRequestContext): Promise<void>;

  protected reject(message: string): never {
    throw new BadRequestException(message);
  }
}
