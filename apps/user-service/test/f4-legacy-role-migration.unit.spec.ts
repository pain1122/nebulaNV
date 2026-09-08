import { buildF4LegacyRoleAudit } from '../prisma/audit-f4-legacy-roles';
import {
  canRollbackF4RoleCompatibility,
  classifyF4LegacyRole,
} from '../src/migration/f4-legacy-role-migration';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const ROOT_ID = '33333333-3333-4333-8333-333333333333';

describe('F4 legacy role migration', () => {
  it('maps only the exact frozen legacy roles', () => {
    expect(classifyF4LegacyRole('user')).toEqual({
      sourceRole: 'user',
      siteRole: 'USER',
    });
    expect(classifyF4LegacyRole('admin')).toEqual({
      sourceRole: 'admin',
      siteRole: 'SITE_ADMIN',
    });
    expect(classifyF4LegacyRole('root-admin')).toEqual({
      sourceRole: 'root-admin',
      platformRole: 'PLATFORM_ADMIN',
      tenantRole: 'TENANT_ADMIN',
    });

    for (const invalid of ['Admin', ' admin', 'editor', '', 'root_admin']) {
      expect(classifyF4LegacyRole(invalid)).toBeNull();
    }
  });

  it('reports invalid values by hash without disclosing the raw value', () => {
    const audit = buildF4LegacyRoleAudit([
      { id: USER_ID, role: 'unexpected-private-value' },
    ]);
    const serialized = JSON.stringify(audit);

    expect(audit.backfillStatus).toBe('BLOCKED');
    expect(audit.invalidRoles[0]?.valueSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(serialized).not.toContain('unexpected-private-value');
    expect(audit.blockers).toContain('INVALID_LEGACY_ROLE');
  });

  it('requires exactly one legacy root administrator before backfill', () => {
    const ready = buildF4LegacyRoleAudit([
      { id: USER_ID, role: 'user' },
      { id: ADMIN_ID, role: 'admin' },
      { id: ROOT_ID, role: 'root-admin' },
    ]);
    const missing = buildF4LegacyRoleAudit([{ id: USER_ID, role: 'user' }]);
    const duplicate = buildF4LegacyRoleAudit([
      { id: ADMIN_ID, role: 'root-admin' },
      { id: ROOT_ID, role: 'root-admin' },
    ]);

    expect(ready.backfillStatus).toBe('READY');
    expect(ready.blockers).toEqual([]);
    expect(missing.blockers).toContain('EXACTLY_ONE_ROOT_ADMIN_REQUIRED');
    expect(duplicate.blockers).toContain('EXACTLY_ONE_ROOT_ADMIN_REQUIRED');
  });

  it('permits rollback only before scoped authority becomes persistent primary', () => {
    expect(
      canRollbackF4RoleCompatibility({
        mode: 'LEGACY_PRIMARY',
        persistentAuthorityPrimary: false,
        secondScopeExists: false,
      }),
    ).toBe(true);
    expect(
      canRollbackF4RoleCompatibility({
        mode: 'SHADOW_COMPARE',
        persistentAuthorityPrimary: false,
        secondScopeExists: false,
      }),
    ).toBe(true);
    expect(
      canRollbackF4RoleCompatibility({
        mode: 'SCOPED_PRIMARY',
        persistentAuthorityPrimary: false,
        secondScopeExists: false,
      }),
    ).toBe(false);
    expect(
      canRollbackF4RoleCompatibility({
        mode: 'SHADOW_COMPARE',
        persistentAuthorityPrimary: true,
        secondScopeExists: false,
      }),
    ).toBe(false);
    expect(
      canRollbackF4RoleCompatibility({
        mode: 'SHADOW_COMPARE',
        persistentAuthorityPrimary: false,
        secondScopeExists: true,
      }),
    ).toBe(false);
  });
});
