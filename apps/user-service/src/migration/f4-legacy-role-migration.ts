export const F4_LEGACY_ROLES = ['user', 'admin', 'root-admin'] as const;
export type F4LegacyRole = (typeof F4_LEGACY_ROLES)[number];

export const F4_ROLE_COMPATIBILITY_MODES = [
  'LEGACY_PRIMARY',
  'SHADOW_COMPARE',
  'SCOPED_PRIMARY',
] as const;
export type F4RoleCompatibilityMode =
  (typeof F4_ROLE_COMPATIBILITY_MODES)[number];

export type F4LegacyRoleMigrationDecision = Readonly<{
  sourceRole: F4LegacyRole;
  platformRole?: 'PLATFORM_ADMIN';
  tenantRole?: 'TENANT_ADMIN';
  siteRole?: 'SITE_ADMIN' | 'USER';
}>;

const DECISIONS: Readonly<Record<F4LegacyRole, F4LegacyRoleMigrationDecision>> =
  Object.freeze({
    'root-admin': Object.freeze({
      sourceRole: 'root-admin',
      platformRole: 'PLATFORM_ADMIN',
      tenantRole: 'TENANT_ADMIN',
    }),
    admin: Object.freeze({
      sourceRole: 'admin',
      siteRole: 'SITE_ADMIN',
    }),
    user: Object.freeze({
      sourceRole: 'user',
      siteRole: 'USER',
    }),
  });

export function classifyF4LegacyRole(
  value: string,
): F4LegacyRoleMigrationDecision | null {
  return Object.prototype.hasOwnProperty.call(DECISIONS, value)
    ? DECISIONS[value as F4LegacyRole]
    : null;
}

export function canRollbackF4RoleCompatibility(input: {
  mode: F4RoleCompatibilityMode;
  persistentAuthorityPrimary: boolean;
  secondScopeExists: boolean;
}): boolean {
  if (input.mode === 'SCOPED_PRIMARY') return false;
  return !input.persistentAuthorityPrimary && !input.secondScopeExists;
}
