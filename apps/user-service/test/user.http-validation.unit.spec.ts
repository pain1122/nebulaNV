import 'reflect-metadata';

import {
  BadRequestException,
  type ArgumentMetadata,
  ValidationPipe,
} from '@nestjs/common';
import { createHttpValidationPipe } from '@packages/config';
import { UpdateProfileDto } from '../src/dto/update-profile.dto';

const updateMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: UpdateProfileDto,
};

function createLegacyUserPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}

async function transformBoth(
  value: unknown,
): Promise<{ legacy: unknown; shared: unknown }> {
  const legacy: unknown = await createLegacyUserPipe().transform(
    value,
    updateMetadata,
  );
  const shared: unknown = await createHttpValidationPipe().transform(
    value,
    updateMetadata,
  );
  return { legacy, shared };
}

async function bothReject(value: unknown): Promise<void> {
  await expect(
    createLegacyUserPipe().transform(value, updateMetadata),
  ).rejects.toBeInstanceOf(BadRequestException);
  await expect(
    createHttpValidationPipe().transform(value, updateMetadata),
  ).rejects.toBeInstanceOf(BadRequestException);
}

describe('user HTTP validation migration', () => {
  it('preserves a valid email update', async () => {
    const result = await transformBoth({ email: 'next@example.com' });

    expect(result.shared).toEqual(result.legacy);
    expect(result.shared).toBeInstanceOf(UpdateProfileDto);
  });

  it('preserves the current empty-update behavior', async () => {
    const result = await transformBoth({});

    expect(result.shared).toEqual(result.legacy);
    expect(result.shared).toBeInstanceOf(UpdateProfileDto);
  });

  it('preserves a valid password update pair', async () => {
    const result = await transformBoth({
      currentPassword: 'CurrentPass1!',
      newPassword: 'Replacement1!',
    });

    expect(result.shared).toEqual(result.legacy);
  });

  it('preserves rejection when the current password is missing', async () => {
    await bothReject({ newPassword: 'Replacement1!' });
  });

  it('preserves unknown-field rejection', async () => {
    await bothReject({
      email: 'next@example.com',
      role: 'root-admin',
    });
  });

  it('preserves wrong-type rejection without implicit conversion', async () => {
    await bothReject({ email: 42 });
  });
});
