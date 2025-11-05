import { SetMetadata, applyDecorators } from '@nestjs/common';

export type Role = 'user' | 'admin' | 'root-admin';

/** Keep the original key for backward-compat ANY-of semantics */
export const ROLES_KEY = 'roles';                 // ANY-of (legacy)
export const ROLES_ANY_KEY = 'roles:any';         // ANY-of (explicit)
export const ROLES_ALL_KEY = 'roles:all';         // ALL-of
export const ROLE_MIN_KEY  = 'roles:min';         // minimum role by hierarchy

/** Canonical list & simple hierarchy (user < admin < root-admin) */
export const ALL_ROLES: Role[] = ['user', 'admin', 'root-admin'] as const;
export const ROLE_RANK: Record<Role, number> = {
  user: 0,
  admin: 1,
  'root-admin': 2,
};

/** Utility: compare roles by hierarchy */
export function hasRoleAtLeast(actual: Role | undefined, requiredMin: Role): boolean {
  if (!actual) return false;
  return ROLE_RANK[actual] >= ROLE_RANK[requiredMin];
}

/** Backward-compat: ANY-of semantics */
export function Roles(...roles: Role[]) {
  return applyDecorators(SetMetadata(ROLES_KEY, roles), SetMetadata(ROLES_ANY_KEY, roles));
}

/** Explicit ANY-of */
export function RolesAny(...roles: Role[]) {
  return SetMetadata(ROLES_ANY_KEY, roles);
}

/** ALL-of (rare, but sometimes useful) */
export function RolesAll(...roles: Role[]) {
  return SetMetadata(ROLES_ALL_KEY, roles);
}

/** Minimum role by hierarchy, e.g., RoleAtLeast('admin') */
export function RoleAtLeast(minRole: Role) {
  return SetMetadata(ROLE_MIN_KEY, minRole);
}
