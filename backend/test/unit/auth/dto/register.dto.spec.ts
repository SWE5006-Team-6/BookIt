import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from '../../../../src/auth/dto/register.dto';

describe('RegisterDto', () => {
  function toDto(partial: Partial<RegisterDto>): RegisterDto {
    return plainToInstance(RegisterDto, partial);
  }

  it('should pass with valid NCS email, password, and displayName', async () => {
    const dto = toDto({
      email: 'user@ncs.com.sg',
      password: 'password123',
      displayName: 'Test User',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass without displayName (optional field)', async () => {
    const dto = toDto({
      email: 'user@ncs.com.sg',
      password: 'password123',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when email is not an NCS domain', async () => {
    const dto = toDto({
      email: 'user@gmail.com',
      password: 'password123',
    });

    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
    expect(emailError!.constraints).toHaveProperty('matches');
  });

  it('should fail when email is invalid', async () => {
    const dto = toDto({
      email: 'not-an-email',
      password: 'password123',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);

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

  it('should fail when password is shorter than 8 characters', async () => {
    const dto = toDto({
      email: 'user@ncs.com.sg',
      password: 'short',
    });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError!.constraints).toHaveProperty('minLength');
  });

  it('should fail when password is missing', async () => {
    const dto = toDto({
      email: 'user@ncs.com.sg',
    });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
  });

  it('should fail when password is empty string', async () => {
    const dto = toDto({
      email: 'user@ncs.com.sg',
      password: '',
    });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
  });
});
