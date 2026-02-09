import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from '../../../../src/auth/dto/login.dto';

describe('LoginDto', () => {
  function toDto(partial: Partial<LoginDto>): LoginDto {
    return plainToInstance(LoginDto, partial);
  }

  it('should pass with valid email and password', async () => {
    const dto = toDto({
      email: 'user@example.com',
      password: 'password123',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when email is invalid', async () => {
    const dto = toDto({
      email: 'not-an-email',
      password: 'password123',
    });

    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail when email is missing', async () => {
    const dto = toDto({
      password: 'password123',
    });

    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail when password is empty', async () => {
    const dto = toDto({
      email: 'user@example.com',
      password: '',
    });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
  });

  it('should fail when password is missing', async () => {
    const dto = toDto({
      email: 'user@example.com',
    });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
  });
});
