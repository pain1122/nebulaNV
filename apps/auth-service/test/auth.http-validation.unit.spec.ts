import 'reflect-metadata';

import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { createHttpValidationPipe } from '@packages/config';
import { CreateUserDto } from '../src/auth/dto/create-user.dto';
import { LoginUserDto } from '../src/auth/dto/login-user.dto';
import { LogoutDto } from '../src/auth/dto/logout.dto';

async function rejectsBadRequest(
  value: unknown,
  metadata: ArgumentMetadata,
): Promise<void> {
  await expect(
    createHttpValidationPipe().transform(value, metadata),
  ).rejects.toBeInstanceOf(BadRequestException);
}

describe('auth HTTP validation migration', () => {
  it('accepts valid typed registration input', async () => {
    const result: unknown = await createHttpValidationPipe().transform(
      {
        email: 'user@example.com',
        password: 'secret-password',
      },
      {
        type: 'body',
        metatype: CreateUserDto,
      },
    );

    expect(result).toBeInstanceOf(CreateUserDto);
    expect(result).toMatchObject({
      email: 'user@example.com',
      password: 'secret-password',
    });
  });

  it('rejects missing and unknown registration fields', async () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateUserDto,
    };

    await rejectsBadRequest({ email: 'user@example.com' }, metadata);
    await rejectsBadRequest(
      {
        email: 'user@example.com',
        password: 'secret-password',
        role: 'root-admin',
      },
      metadata,
    );
  });

  it('rejects a non-string login identifier', async () => {
    await rejectsBadRequest(
      {
        identifier: 42,
        password: 'secret-password',
      },
      {
        type: 'body',
        metatype: LoginUserDto,
      },
    );
  });

  it('rejects implicit boolean conversion for logout', async () => {
    await rejectsBadRequest(
      { allDevices: 'false' },
      {
        type: 'body',
        metatype: LogoutDto,
      },
    );
  });

  it('rejects unsupported device-scoped logout input', async () => {
    await rejectsBadRequest(
      { deviceId: 'device-without-an-owned-session-contract' },
      {
        type: 'body',
        metatype: LogoutDto,
      },
    );
  });
});
