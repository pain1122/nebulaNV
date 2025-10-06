import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type Role = 'user' | 'admin' | 'root-admin';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
